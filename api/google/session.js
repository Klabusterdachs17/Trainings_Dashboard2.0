"use strict";

const {
  SESSION_COOKIE, cookies, cookieOptions, json, requireMethod, requireSameOrigin,
  sessionForRequest, deleteSession
} = require("../../lib/google-health");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const session = await sessionForRequest(req);
      return json(res, 200, { connected: !!session });
    } catch (error) {
      console.error("Google Health session check failed", error.message);
      return json(res, 503, { error: "health_storage_unavailable" });
    }
  }
  if (!requireMethod(req, res, "DELETE") || !requireSameOrigin(req, res)) return;
  try {
    await deleteSession(cookies(req)[SESSION_COOKIE]);
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieOptions(0)}`);
    return json(res, 200, { connected: false });
  } catch (error) {
    console.error("Google Health disconnect failed", error.message);
    return json(res, 503, { error: "health_storage_unavailable" });
  }
};
