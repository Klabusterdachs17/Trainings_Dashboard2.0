"use strict";

const { json, requireMethod, requireSameOrigin, sessionForRequest, healthFetch, parseDuration } = require("../../lib/google-health");

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftDate(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (!requireMethod(req, res, "POST") || !requireSameOrigin(req, res)) return;
  try {
    const session = await sessionForRequest(req);
    if (!session) return json(res, 401, { error: "google_health_not_connected" });
    const { startDate, endDate } = req.body || {};
    if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) {
      return json(res, 400, { error: "invalid_date_range" });
    }
    const spanDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
    if (spanDays > 365) return json(res, 400, { error: "date_range_too_large" });

    const filter = `exercise.interval.civil_start_time >= "${startDate}" AND exercise.interval.civil_start_time < "${shiftDate(endDate, 1)}"`;
    const points = [];
    let pageToken = "";
    let truncated = false;
    for (let page = 0; page < 10; page++) {
      const result = await healthFetch(session, "users/me/dataTypes/exercise/dataPoints:reconcile", {
        filter,
        dataSourceFamily: "users/me/dataSourceFamilies/google-wearables",
        pageSize: "25",
        ...(pageToken ? { pageToken } : {})
      });
      points.push(...(result.dataPoints || []));
      pageToken = result.nextPageToken || "";
      if (!pageToken) break;
      if (page === 9 || points.length >= 250) {
        truncated = true;
        break;
      }
    }

    const candidates = points.map((point) => {
      const exercise = point.exercise || {};
      const interval = exercise.interval || {};
      const start = Date.parse(interval.startTime || "");
      const end = Date.parse(interval.endTime || "");
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      const activeZoneMinutes = Number(exercise.metricsSummary && exercise.metricsSummary.activeZoneMinutes);
      return {
        name: point.name || "",
        key: `${interval.startTime}|${interval.endTime}|${exercise.exerciseType || ""}`,
        displayName: exercise.displayName || "Workout",
        exerciseType: exercise.exerciseType || "EXERCISE_TYPE_UNSPECIFIED",
        startTime: interval.startTime,
        endTime: interval.endTime,
        elapsedSeconds: Math.round((end - start) / 1000),
        activeDurationSeconds: parseDuration(exercise.activeDuration),
        summaryActiveZoneMinutes: Number.isFinite(activeZoneMinutes) ? activeZoneMinutes : null
      };
    }).filter(Boolean).sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));

    return json(res, 200, { candidates, truncated, pageLimit: 250 });
  } catch (error) {
    console.error("Google Health historical workout lookup failed", error.message);
    return json(res, error.status || 502, { error: error.status === 401 ? "google_reconnect_required" : "google_history_lookup_failed" });
  }
};

