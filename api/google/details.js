"use strict";

const {
  json, requireMethod, requireSameOrigin, sessionForRequest, healthFetch, allPages, zoneKey, parseDuration
} = require("../../lib/google-health");

module.exports = async (req, res) => {
  if (!requireMethod(req, res, "POST") || !requireSameOrigin(req, res)) return;
  try {
    const session = await sessionForRequest(req);
    if (!session) return json(res, 401, { error: "google_health_not_connected" });
    const { name: rawName, key: rawKey } = req.body || {};
    const name = String(rawName || "");
    const key = String(rawKey || "");
    let point;
    if (/^users\/[A-Za-z0-9_-]+\/dataTypes\/exercise\/dataPoints\/[A-Za-z0-9_-]+$/.test(name)) {
      point = await healthFetch(session, name);
    } else {
      const parts = key.split("|");
      const startGuess = Date.parse(parts[0] || "");
      const endGuess = Date.parse(parts[1] || "");
      if (parts.length !== 3 || !Number.isFinite(startGuess) || !Number.isFinite(endGuess) || endGuess <= startGuess) return json(res, 400, { error: "invalid_session_id" });
      const day = new Date(startGuess).toISOString().slice(0, 10);
      const previous = new Date(`${day}T12:00:00Z`);previous.setUTCDate(previous.getUTCDate()-1);
      const next = new Date(`${day}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+2);
      const filter = `exercise.interval.civil_start_time >= "${previous.toISOString().slice(0,10)}" AND exercise.interval.civil_start_time < "${next.toISOString().slice(0,10)}"`;
      const points = await allPages(session, "users/me/dataTypes/exercise/dataPoints", { filter, dataSourceFamily: "users/me/dataSourceFamilies/google-wearables" });
      point = points.find((candidate) => {
        const exercise = candidate.exercise || {}, interval = exercise.interval || {};
        return interval.startTime === parts[0] && interval.endTime === parts[1] && (exercise.exerciseType || "") === parts[2];
      });
      if (!point) return json(res, 404, { error: "google_session_no_longer_available" });
    }
    const exercise = point.exercise || {};
    const interval = exercise.interval || {};
    const start = Date.parse(interval.startTime || "");
    const end = Date.parse(interval.endTime || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return json(res, 502, { error: "invalid_google_session" });

    const filter = `active_zone_minutes.interval.start_time >= "${new Date(start).toISOString()}" AND active_zone_minutes.interval.start_time < "${new Date(end).toISOString()}"`;
    const zonePoints = await allPages(session, "users/me/dataTypes/active-zone-minutes/dataPoints:reconcile", { filter, dataSourceFamily: "users/me/dataSourceFamilies/google-wearables" });
    const minutesByZone = { fatBurn: 0, cardio: 0, peak: 0, unspecified: 0 };
    const weightedMinutesByZone = { fatBurn: 0, cardio: 0, peak: 0, unspecified: 0 };
    for (const row of zonePoints) {
      const sample = row.activeZoneMinutes || {};
      const key = zoneKey(sample.heartRateZone);
      const intervalStart = Date.parse(sample.interval && sample.interval.startTime || "");
      const intervalEnd = Date.parse(sample.interval && sample.interval.endTime || "");
      const elapsed = Number.isFinite(intervalStart) && Number.isFinite(intervalEnd) && intervalEnd > intervalStart
        ? (Math.min(intervalEnd, end) - Math.max(intervalStart, start)) / 60_000
        : 0;
      minutesByZone[key] += Math.max(0, elapsed);
      weightedMinutesByZone[key] += Number(sample.activeZoneMinutes) || 0;
    }
    const sum = (values) => Object.values(values).reduce((total, value) => total + value, 0);
    const recorded = Number(exercise.metricsSummary && exercise.metricsSummary.activeZoneMinutes) || null;
    const telemetryTotal = sum(weightedMinutesByZone);
    return json(res, 200, {
      provider: "google-health",
      sessionName: point.name,
      displayName: exercise.displayName || "Workout",
      exerciseType: exercise.exerciseType || "EXERCISE_TYPE_UNSPECIFIED",
      startTime: interval.startTime,
      endTime: interval.endTime,
      elapsedSeconds: Math.round((end - start) / 1000),
      activeDurationSeconds: parseDuration(exercise.activeDuration),
      activeZoneMinutes: recorded === null ? telemetryTotal : recorded,
      minutesByZone,
      weightedMinutesByZone,
      telemetryAvailable: zonePoints.length > 0,
      importedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Google Health session details failed", error.message);
    return json(res, error.status || 502, { error: error.status === 401 ? "google_reconnect_required" : "google_session_details_failed" });
  }
};
