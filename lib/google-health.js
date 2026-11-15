"use strict";

const { createCipheriv, createDecipheriv, randomBytes } = require("node:crypto");

const HEALTH_SCOPE = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";
const SESSION_COOKIE = "__Host-health_session";

function config(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Missing Upstash Redis REST configuration");
  return { url, token };
}

function cookieOptions(maxAge) {
  return `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function requireMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  json(res, 405, { error: "method_not_allowed" });
  return false;
}

function requireSameOrigin(req, res) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  if (!origin || !host || origin !== `${proto}://${host}`) {
    json(res, 403, { error: "origin_rejected" });
    return false;
  }
  return true;
}

function encrypt(value) {
  const key = Buffer.from(config("HEALTH_TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("HEALTH_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function decrypt(value) {
  const key = Buffer.from(config("HEALTH_TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("HEALTH_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  const packed = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8"));
}

async function redis(command) {
  const credentials = redisConfig();
  const response = await fetch(credentials.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error("Health session storage unavailable");
  return payload.result;
}

async function saveSession(id, data) {
  await redis(["SET", `google-health:session:${id}`, encrypt(data), "EX", 60 * 60 * 24 * 180]);
}

async function loadSession(id) {
  if (!/^[a-f0-9]{64}$/.test(String(id || ""))) return null;
  const value = await redis(["GET", `google-health:session:${id}`]);
  return value ? decrypt(value) : null;
}

async function deleteSession(id) {
  if (/^[a-f0-9]{64}$/.test(String(id || ""))) await redis(["DEL", `google-health:session:${id}`]);
}

async function sessionForRequest(req) {
  const id = cookies(req)[SESSION_COOKIE];
  if (!id) return null;
  const data = await loadSession(id);
  return data ? { id, data } : null;
}

async function refreshAccessToken(session) {
  if (session.data.accessToken && session.data.expiresAt > Date.now() + 60_000) return session.data.accessToken;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config("GOOGLE_HEALTH_CLIENT_ID"),
      client_secret: config("GOOGLE_HEALTH_CLIENT_SECRET"),
      refresh_token: session.data.refreshToken,
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new Error("Google authorization expired; reconnect the account");
  session.data.accessToken = token.access_token;
  session.data.expiresAt = Date.now() + Number(token.expires_in || 3600) * 1000;
  if (token.refresh_token) session.data.refreshToken = token.refresh_token;
  await saveSession(session.id, session.data);
  return token.access_token;
}

async function healthFetch(session, path, query) {
  const token = await refreshAccessToken(session);
  const url = new URL(`https://health.googleapis.com/v4/${path}`);
  if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "Google authorization expired; reconnect the account" : "Google Health request failed");
    error.status = response.status;
    error.googleReason = body.error && body.error.details && body.error.details.find((item) => item.reason)?.reason;
    throw error;
  }
  return body;
}

function parseDuration(value) {
  const match = String(value || "").match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  return match ? Number(match[1]) : null;
}

function zoneKey(zone) {
  if (zone === "FAT_BURN") return "fatBurn";
  if (zone === "CARDIO") return "cardio";
  if (zone === "PEAK") return "peak";
  return "unspecified";
}

async function allPages(session, path, query) {
  const rows = [];
  let pageToken = "";
  do {
    const result = await healthFetch(session, path, { ...query, pageSize: "25", ...(pageToken ? { pageToken } : {}) });
    rows.push(...(result.dataPoints || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken && rows.length < 250);
  return rows;
}

module.exports = {
  HEALTH_SCOPE, SESSION_COOKIE, cookieOptions, cookies, json, requireMethod, requireSameOrigin,
  saveSession, loadSession, deleteSession, sessionForRequest, healthFetch, allPages,
  parseDuration, zoneKey
};
