"use strict";
const crypto = require("crypto");

function uid(prefix) {
  const id = crypto.randomBytes(6).toString("hex");
  return prefix ? `${prefix}_${id}` : id;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(num) {
  const n = Number(num) || 0;
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    // בונים תאריך מקומי מ-YYYY-MM-DD כדי לא להיפגע מהיסט אזור-זמן
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
  } catch (e) { return iso; }
}

function formatDateShort(iso) {
  if (!iso) return "";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch (e) { return iso; }
}

// היום כמחרוזת YYYY-MM-DD לפי שעון מקומי (לא UTC — כדי שלא "יקפוץ" יום ליד חצות)
function todayISO() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// הפרש ימים בין שני תאריכי YYYY-MM-DD (b - a)
function daysDiff(aISO, bISO) {
  const [ay, am, ad] = aISO.split("-").map(Number);
  const [by, bm, bd] = bISO.split("-").map(Number);
  const a = Date.UTC(ay, (am || 1) - 1, ad || 1);
  const b = Date.UTC(by, (bm || 1) - 1, bd || 1);
  return Math.round((b - a) / 86400000);
}

// מוסיף n ימים לתאריך YYYY-MM-DD ומחזיר YYYY-MM-DD (שבוע עברי/ישראלי: א'-ש')
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + n);
  const yy = dt.getFullYear(), mm = String(dt.getMonth() + 1).padStart(2, "0"), dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// תחילת השבוע (יום ראשון) המכיל את התאריך הנתון
function startOfWeek(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return addDays(iso, -dt.getDay());
}

const WEEKDAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach(pair => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

module.exports = { uid, escapeHtml, formatPrice, formatDate, formatDateShort, todayISO, daysDiff, addDays, startOfWeek, WEEKDAY_NAMES, parseCookies };
