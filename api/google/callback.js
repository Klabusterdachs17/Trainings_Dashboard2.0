"use strict";

const { randomBytes, timingSafeEqual } = require("node:crypto");
const {
  HEALTH_SCOPE, SESSION_COOKIE, cookies, cookieOptions, json, saveSession, healthFetch
} = require("../../lib/google-health");

module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });
  const jar = cookies(req);
  const query = req.query || {};
  const state = String(query.state || "");
  const expected = String(jar["__Host-health_oauth_state"] || "");
  const verifier = String(jar["__Host-health_oauth_verifier"] || "");
  const clear = [
    `__Host-health_oauth_state=; ${cookieOptions(0)}`,
    `__Host-health_oauth_verifier=; ${cookieOptions(0)}`
  ];
  const fail = (reason) => {
    res.setHeader("Set-Cookie", clear);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(303, `/?googleHealth=${encodeURIComponent(reason)}#more`);
  };
  if (!state || !expected || !verifier || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected))) return fail("oauth_cancelled");
  if (query.error || !query.code) return fail("oauth_cancelled");

  try {
    const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(query.code),
        client_id: process.env.GOOGLE_HEALTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier
      }),
      cache: "no-store"
    });
    const token = await response.json();
    if (!response.ok || !token.access_token || !token.refresh_token) return fail("oauth_failed");

    const sessionId = randomBytes(32).toString("hex");
    const session = {
      refreshToken: token.refresh_token,
      accessToken: token.access_token,
      expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
      scope: HEALTH_SCOPE,
      connectedAt: new Date().toISOString()
    };
    const identity = await healthFetch({ id: sessionId, data: session }, "users/me/identity");
    if (!identity || !identity.name) return fail("google_account_not_linked");
    await saveSession(sessionId, session);
    res.setHeader("Set-Cookie", [
      ...clear,
      `${SESSION_COOKIE}=${sessionId}; ${cookieOptions(60 * 60 * 24 * 180)}`
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(303, "/?googleHealth=connected#more");
  } catch (error) {
    console.error("Google Health OAuth callback failed", error.message);
    fail(error.googleReason === "ACCOUNT_NOT_LINKED" ? "google_account_not_linked" : "oauth_failed");
  }
};
