"use strict";

const { json, requireMethod, requireSameOrigin, sessionForRequest, allPages, parseDuration } = require("../../lib/google-health");

function dateInZone(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (!requireMethod(req, res, "POST") || !requireSameOrigin(req, res)) return;
  try {
    const session = await sessionForRequest(req);
    if (!session) return json(res, 401, { error: "google_health_not_connected" });
    const { startedAt, completedAt, timeZone } = req.body || {};
    const start = Date.parse(startedAt);
    const finish = Date.parse(completedAt);
    if (!Number.isFinite(start) || !Number.isFinite(finish) || finish <= start || finish - start > 12 * 60 * 60 * 1000) {
      return json(res, 400, { error: "invalid_workout_window" });
    }
    const zone = typeof timeZone === "string" && timeZone.length < 80 ? timeZone : "Europe/Berlin";
    const firstDay = shiftDate(dateInZone(start, zone), -1);
    const lastDay = shiftDate(dateInZone(finish, zone), 2);
    const filter = `exercise.interval.civil_start_time >= "${firstDay}" AND exercise.interval.civil_start_time < "${lastDay}"`;
    const points = await allPages(session, "users/me/dataTypes/exercise/dataPoints", {
      filter,
      dataSourceFamily: "users/me/dataSourceFamilies/google-wearables"
    });
    const candidates = points.map((point) => {
      const exercise = point.exercise || {};
      const interval = exercise.interval || {};
      const begins = Date.parse(interval.startTime || "");
      const ends = Date.parse(interval.endTime || "");
      if (!Number.isFinite(begins) || !Number.isFinite(ends)) return null;
      const startDistance = Math.abs(begins - start);
      const overlap = Math.max(0, Math.min(ends, finish) - Math.max(begins, start));
      if (startDistance > 3 * 60 * 60 * 1000 && overlap === 0) return null;
      return {
        name: point.name || "",
        key: `${interval.startTime}|${interval.endTime}|${exercise.exerciseType || ""}`,
        displayName: exercise.displayName || "Workout",
        exerciseType: exercise.exerciseType || "EXERCISE_TYPE_UNSPECIFIED",
        startTime: interval.startTime,
        endTime: interval.endTime,
        activeDurationSeconds: parseDuration(exercise.activeDuration),
        elapsedSeconds: Math.round((ends - begins) / 1000),
        summaryActiveZoneMinutes: Number(exercise.metricsSummary && exercise.metricsSummary.activeZoneMinutes) || null,
        timeDifferenceSeconds: Math.round((begins - start) / 1000),
        score: overlap ? overlap - startDistance / 3 : -startDistance
      };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8)
      .map(({ score, ...candidate }) => candidate);
    return json(res, 200, { candidates });
  } catch (error) {
    console.error("Google Health workout lookup failed", error.message);
    return json(res, error.status || 502, { error: error.status === 401 ? "google_reconnect_required" : "google_workout_lookup_failed" });
  }
};
