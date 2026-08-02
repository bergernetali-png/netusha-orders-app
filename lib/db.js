"use strict";
// שכבת נתונים פשוטה מבוססת קבצי JSON — כל ההזמנות וההגדרות נשמרים כאן, לא בקוד.
// אפשר בעתיד להחליף שכבה זו במסד נתונים אמיתי (SQLite/Postgres) מבלי לשנות את שאר האפליקציה,
// כל עוד פונקציות ה-get/save נשמרות עם אותה חתימה.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJSON(name, fallback) {
  const p = filePath(name);
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJSON(name, data) {
  const p = filePath(name);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, p);
}

function all(name) { return readJSON(name, []); }
function save(name, arr) { writeJSON(name, arr); }

function findById(name, id) {
  return all(name).find(x => x.id === id);
}
function upsert(name, item) {
  const list = all(name);
  const idx = list.findIndex(x => x.id === item.id);
  if (idx === -1) list.push(item); else list[idx] = item;
  save(name, list);
  return item;
}
function remove(name, id) {
  const list = all(name).filter(x => x.id !== id);
  save(name, list);
}

function getSettings() { return readJSON("settings", {}); }
function saveSettings(obj) { writeJSON("settings", obj); }

module.exports = { all, save, findById, upsert, remove, getSettings, saveSettings, readJSON, writeJSON, DATA_DIR };
