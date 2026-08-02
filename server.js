"use strict";
require("./lib/loadEnv").loadEnv();

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const db = require("./lib/db");
const { Router } = require("./lib/router");
const { parseBody, toArray } = require("./lib/body");
const auth = require("./lib/auth");
const { uid, formatPrice, formatDate } = require("./lib/util");
const { calcOrder } = require("./lib/calc");
const { STATUSES, statusLabel, paymentLabel } = require("./lib/constants");

const { renderLogin } = require("./views/login");
const { renderDashboard } = require("./views/dashboard");
const { renderOrdersList } = require("./views/orders-list");
const { renderOrderForm } = require("./views/order-form");
const { renderOrderPrint } = require("./views/order-print");
const { renderSettings } = require("./views/settings");
const { renderSuppliersPage } = require("./views/suppliers");
const { renderMonthPage } = require("./views/month");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ "Content-Type": "text/html; charset=utf-8" }, headers || {}));
  res.end(body);
}
function redirect(res, location, status = 303) {
  res.writeHead(status, { Location: location });
  res.end();
}
function safeJoin(base, target) {
  const p = path.normalize(path.join(base, target));
  if (!p.startsWith(base)) return null;
  return p;
}
function serveStatic(req, res, pathname) {
  const filePath = safeJoin(PUBLIC_DIR, decodeURIComponent(pathname));
  if (!filePath) return false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const cache = ext === ".css" || ext === ".js" ? "no-cache" : "public, max-age=86400";
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cache });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

/* ==================== עזרי הזמנות ==================== */
function parseItemsFromFields(fields, existingItems) {
  const ids = toArray(fields.itemId);
  const names = toArray(fields.itemName);
  const brandings = toArray(fields.itemBranding);
  const qtys = toArray(fields.itemQty);
  const costs = toArray(fields.itemUnitCost);
  const brandingCosts = toArray(fields.itemUnitBrandingCost);
  const prices = toArray(fields.itemUnitPrice);
  const supplyStatuses = toArray(fields.itemSupplyStatus);
  const supplierNames = toArray(fields.itemSupplierName);
  const validSupplyStatus = ["not_needed", "needed", "ordered"];
  // תאריך קבלה משוער מהספק אינו נערך יותר בטופס ההזמנה עצמו (מוגדר מתוך עמוד "ספקים וקניות") —
  // לכן יש לשמר אותו לפי מזהה הפריט ולא לאבד אותו בכל שמירה של טופס ההזמנה.
  const existingById = {};
  (existingItems || []).forEach(it => { if (it && it.id) existingById[it.id] = it; });

  return names.map((name, i) => {
    const id = ids[i] || uid("item");
    const prevEta = (existingById[id] && existingById[id].supplierEta) || "";
    return {
      id,
      name: (name || "").trim(),
      brandingText: (brandings[i] || "").trim(),
      qty: Math.max(0, parseFloat(qtys[i]) || 0),
      unitCost: Math.max(0, parseFloat(costs[i]) || 0),
      unitBrandingCost: Math.max(0, parseFloat(brandingCosts[i]) || 0),
      unitPrice: Math.max(0, parseFloat(prices[i]) || 0),
      supplyStatus: validSupplyStatus.includes(supplyStatuses[i]) ? supplyStatuses[i] : "not_needed",
      supplierName: (supplierNames[i] || "").trim(),
      supplierEta: prevEta
    };
  }).filter(it => it.name || it.qty);
}

function orderFromFields(fields, existing) {
  const items = parseItemsFromFields(fields, existing && existing.items);
  return Object.assign({}, existing, {
    customerName: (fields.customerName || "").trim(),
    customerPhone: (fields.customerPhone || "").trim(),
    customerEmail: (fields.customerEmail || "").trim(),
    source: fields.source || "",
    deliveryDate: fields.deliveryDate || "",
    status: fields.status || "new",
    items,
    prepTimeMinutes: Math.max(0, parseFloat(fields.prepTimeMinutes) || 0),
    shippingCost: Math.max(0, parseFloat(fields.shippingCost) || 0),
    otherCosts: Math.max(0, parseFloat(fields.otherCosts) || 0),
    otherCostsNote: (fields.otherCostsNote || "").trim(),
    paymentStatus: fields.paymentStatus || "unpaid",
    amountPaid: Math.max(0, parseFloat(fields.amountPaid) || 0),
    receiptIssued: fields.receiptIssued === "1",
    notes: (fields.notes || "").trim(),
    updatedAt: new Date().toISOString()
  });
}

function csvEscape(v) {
  const s = String(v === undefined || v === null ? "" : v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/* ==================== ראוטר ==================== */
const router = new Router();

router.get("/login", (req, res) => {
  if (auth.isAuthenticated(req)) return redirect(res, "/");
  send(res, 200, renderLogin({ businessName: db.getSettings().businessName }));
});
router.post("/login", async (req, res) => {
  const { fields } = await parseBody(req);
  if (auth.checkPassword(fields.password)) {
    res.setHeader("Set-Cookie", auth.loginCookie());
    return redirect(res, "/");
  }
  send(res, 200, renderLogin({ error: "סיסמה שגויה, נסו שוב.", businessName: db.getSettings().businessName }));
});
router.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", auth.logoutCookie());
  redirect(res, "/login");
});

function requireAuth(handler) {
  return (req, res, params, query) => {
    if (!auth.isAuthenticated(req)) return redirect(res, "/login");
    return handler(req, res, params, query);
  };
}

router.get("/", requireAuth((req, res) => {
  const orders = db.all("orders");
  const settings = db.getSettings();
  send(res, 200, renderDashboard(orders, settings));
}));

router.get("/orders", requireAuth((req, res, params, query) => {
  const orders = db.all("orders");
  const settings = db.getSettings();
  send(res, 200, renderOrdersList(orders, settings, query));
}));

router.get("/orders/new", requireAuth((req, res) => {
  const settings = db.getSettings();
  send(res, 200, renderOrderForm(null, settings, true));
}));

router.post("/orders", requireAuth(async (req, res) => {
  const { fields } = await parseBody(req);
  const settings = db.getSettings();
  const orderNumber = settings.nextOrderNumber || 1000;
  const order = orderFromFields(fields, {
    id: uid("order"),
    orderNumber,
    createdAt: new Date().toISOString()
  });
  db.upsert("orders", order);
  settings.nextOrderNumber = orderNumber + 1;
  db.saveSettings(settings);
  redirect(res, `/orders/${order.id}`);
}));

router.get("/orders/:id", requireAuth((req, res, params) => {
  const order = db.findById("orders", params.id);
  if (!order) return notFound(req, res);
  const settings = db.getSettings();
  send(res, 200, renderOrderForm(order, settings, false));
}));

router.post("/orders/:id", requireAuth(async (req, res, params) => {
  const existing = db.findById("orders", params.id);
  if (!existing) return notFound(req, res);
  const { fields } = await parseBody(req);
  const updated = orderFromFields(fields, existing);
  db.upsert("orders", updated);
  redirect(res, `/orders/${existing.id}`);
}));

router.post("/orders/:id/delete", requireAuth((req, res, params) => {
  db.remove("orders", params.id);
  redirect(res, "/orders");
}));

// עדכון מהיר של סטטוס הזמנה בלבד — משמש את התפריט המהיר בדשבורד, ברשימת ההזמנות ובתוך ההזמנה,
// כדי שלא יהיה צורך לפתוח ולשמור את כל טופס ההזמנה רק כדי לקדם סטטוס.
router.post("/orders/:id/status", requireAuth(async (req, res, params) => {
  const order = db.findById("orders", params.id);
  if (!order) return notFound(req, res);
  const { fields } = await parseBody(req);
  const validStatuses = STATUSES.map(s => s.value);
  if (validStatuses.includes(fields.status)) {
    order.status = fields.status;
    order.updatedAt = new Date().toISOString();
    db.upsert("orders", order);
  }
  const returnTo = (fields.returnTo && fields.returnTo.startsWith("/")) ? fields.returnTo : `/orders/${order.id}`;
  redirect(res, returnTo);
}));

// עדכון מהיר של פריט בודד (ספק/תאריך קבלה/סטטוס אספקה) — משמש מעמוד "ספקים וקניות"
// כדי לא לצטרך לפתוח את כל טופס ההזמנה רק לעדכן שהוזמן/התקבל.
router.post("/orders/:id/items/:itemId/supplier", requireAuth(async (req, res, params) => {
  const order = db.findById("orders", params.id);
  if (!order) return notFound(req, res);
  const { fields } = await parseBody(req);
  const item = (order.items || []).find(it => it.id === params.itemId);
  if (item) {
    item.supplierName = (fields.supplierName || "").trim();
    item.supplierEta = (fields.supplierEta || "").trim();
    const validSupplyStatus = ["not_needed", "needed", "ordered"];
    if (validSupplyStatus.includes(fields.supplyStatus)) item.supplyStatus = fields.supplyStatus;
    order.updatedAt = new Date().toISOString();
    db.upsert("orders", order);
  }
  redirect(res, "/suppliers");
}));

router.get("/suppliers", requireAuth((req, res) => {
  const orders = db.all("orders");
  const settings = db.getSettings();
  send(res, 200, renderSuppliersPage(orders, settings));
}));

router.get("/month", requireAuth((req, res, params, query) => {
  const orders = db.all("orders");
  const settings = db.getSettings();
  send(res, 200, renderMonthPage(orders, settings, query));
}));

router.get("/orders/:id/print", requireAuth((req, res, params) => {
  const order = db.findById("orders", params.id);
  if (!order) return notFound(req, res);
  const settings = db.getSettings();
  send(res, 200, renderOrderPrint(order, settings));
}));

router.get("/settings", requireAuth((req, res) => {
  const settings = db.getSettings();
  const ordersCount = db.all("orders").length;
  send(res, 200, renderSettings(settings, ordersCount));
}));

router.post("/settings", requireAuth(async (req, res) => {
  const { fields } = await parseBody(req);
  const settings = db.getSettings();
  settings.businessName = (fields.businessName || settings.businessName || "").trim();
  settings.hourlyRate = Math.max(0, parseFloat(fields.hourlyRate) || 0);
  db.saveSettings(settings);
  const ordersCount = db.all("orders").length;
  send(res, 200, renderSettings(settings, ordersCount, { type: "success", message: "ההגדרות נשמרו." }));
}));

/* ---------- ייצוא / גיבוי ---------- */
router.get("/export/backup.json", requireAuth((req, res) => {
  const payload = { exportedAt: new Date().toISOString(), settings: db.getSettings(), orders: db.all("orders") };
  send(res, 200, JSON.stringify(payload, null, 2), {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="netusha-orders-backup-${new Date().toISOString().slice(0, 10)}.json"`
  });
}));

router.get("/export/orders.csv", requireAuth((req, res) => {
  const orders = db.all("orders");
  const settings = db.getSettings();
  const header = ["מספר הזמנה", "תאריך יצירה", "לקוח/ה", "טלפון", "תאריך אספקה", "סטטוס", "סטטוס תשלום", "סה\"כ מכירה", "עלות כוללת", "רווח", "אחוז רווח", "קבלה הוצאה"];
  const rows = orders.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map(o => {
    const c = calcOrder(o, settings);
    return [
      o.orderNumber, (o.createdAt || "").slice(0, 10), o.customerName, o.customerPhone,
      o.deliveryDate || "", statusLabel(o.status), paymentLabel(o.paymentStatus),
      c.sellTotal.toFixed(2), c.totalCost.toFixed(2), c.profit.toFixed(2), c.marginPct.toFixed(0) + "%",
      o.receiptIssued ? "כן" : "לא"
    ];
  });
  const csv = "﻿" + [header, ...rows].map(r => r.map(csvEscape).join(",")).join("\r\n");
  send(res, 200, csv, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="netusha-orders-${new Date().toISOString().slice(0, 10)}.csv"`
  });
}));

/* ==================== שרת HTTP ==================== */
function notFound(req, res) {
  send(res, 404, `<!DOCTYPE html><html lang="he" dir="rtl"><meta charset="UTF-8"><body style="font-family:sans-serif; text-align:center; padding:80px;"><h1>404</h1><p>הדף לא נמצא.</p><a href="/">חזרה לדשבורד</a></body></html>`);
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsed.pathname);

    if (req.method === "GET" && (pathname.startsWith("/css/") || pathname.startsWith("/js/") || pathname.startsWith("/images/") || pathname === "/manifest.webmanifest")) {
      if (serveStatic(req, res, pathname)) return;
    }

    const match = router.match(req.method, pathname);
    if (match) return match.handler(req, res, match.params, parsed.query);

    if (req.method === "GET") return notFound(req, res);
    send(res, 405, "Method not allowed");
  } catch (err) {
    console.error(err);
    send(res, 500, `<!DOCTYPE html><html lang="he" dir="rtl"><meta charset="UTF-8"><body style="font-family:sans-serif; text-align:center; padding:80px;"><h1>שגיאת שרת</h1><p>משהו השתבש. נסו שוב או פנו לתמיכה הטכנית.</p></body></html>`);
  }
});

server.listen(PORT, () => {
  console.log(`📋 מערכת ניהול ההזמנות רצה על http://localhost:${PORT}`);
});
