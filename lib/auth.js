"use strict";
const crypto = require("crypto");
const { parseCookies } = require("./util");

const SESSION_COOKIE = "orders_admin_session";

function getSecret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}
function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "netusha-orders-2026";
}

function sign(value) {
  const h = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${h}`;
}
function verify(signed) {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  try {
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return value;
  } catch (e) { /* אורך לא תואם */ }
  return null;
}

function checkPassword(input) {
  const expected = getAdminPassword();
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const value = verify(token);
  return value === "admin-ok";
}

function loginCookie() {
  const token = sign("admin-ok");
  const maxAge = 60 * 60 * 24 * 30; // חודש — כלי עבודה יומיומי, לא צריך להתנתק כל שבוע
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
function logoutCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

module.exports = { isAuthenticated, checkPassword, loginCookie, logoutCookie, SESSION_COOKIE };
