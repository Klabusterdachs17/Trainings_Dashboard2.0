"use strict";

const { randomBytes, createHash } = require("node:crypto");
const { HEALTH_SCOPE, cookieOptions, json } = require("../../lib/google-health");

module.exports = (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });
  try {
    const state = randomBytes(32).toString("hex");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
    const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
    if (!redirectUri || !clientId) throw new Error("OAuth not configured");
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: HEALTH_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256"
    });
    res.setHeader("Set-Cookie", [
      `__Host-health_oauth_state=${state}; ${cookieOptions(600)}`,
      `__Host-health_oauth_verifier=${verifier}; ${cookieOptions(600)}`
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${query}`);
  } catch (error) {
    json(res, 503, { error: "google_health_not_configured" });
  }
};
