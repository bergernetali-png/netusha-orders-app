"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e, formatPrice, formatDate, todayISO, daysDiff } = require("../lib/util");
const { calcOrder } = require("../lib/calc");
const { STATUSES, statusLabel, statusColor, paymentLabel, OPEN_STATUSES } = require("../lib/constants");

function renderDashboard(orders, settings) {
  const today = todayISO();
  const thisMonthKey = today.slice(0, 7); // YYYY-MM

  const openOrders = orders.filter(o => OPEN_STATUSES.includes(o.status));

  // "דורש תשומת לב": פריט כלשהו מסומן "צריך להזמין" מספק, בהזמנה שעדיין פתוחה
  const needsAttention = openOrders.filter(o =>
    (o.items || []).some(it => it && it.supplyStatus === "needed")
  );

  // טרם שולם במלואו — בכוונה לא מוגבל להזמנות פתוחות: גם הזמנה שכבר סופקה
  // אבל עדיין לא שולמה במלואו חייבת להישאר גלויה, כדי שלא "תיעלם" מהראש.
  const unpaid = orders.filter(o => o.status !== "cancelled" && o.paymentStatus !== "paid");

  // משלוחים קרובים — פתוחות, ממוינות לפי תאריך אספקה
  const upcoming = openOrders
    .filter(o => o.deliveryDate)
    .slice()
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .slice(0, 8);

  // סטטיסטיקות החודש (לפי תאריך יצירה, לא כולל הזמנות שבוטלו)
  // "רווח" כאן הוא רווח המוצר (תכל'ס — לפני זמן עבודה): מחיר מכירה פחות עלויות ישירות בלבד.
  // עלות זמן העבודה נשארת כלי תמחור שרואים בפירוט בתוך כל הזמנה, ולא מקוזזת מהמספר הראשי כאן.
  // האחוז מחושב כיחס כולל (סה"כ רווח חלקי סה"כ מכירה) ולא כממוצע אחוזים — כדי שיתאים למספרים בשקלים.
  const monthOrders = orders.filter(o => (o.createdAt || "").slice(0, 7) === thisMonthKey && o.status !== "cancelled");
  let monthRevenue = 0, monthProfit = 0;
  monthOrders.forEach(o => {
    const c = calcOrder(o, settings);
    monthRevenue += c.sellTotal;
    monthProfit += c.productProfit;
  });
  const avgMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  const statCard = (label, value, opts) => {
    opts = opts || {};
    return `
    <div class="stat-card" style="--stat-color:${opts.color || "var(--color-accent)"};">
      <div class="stat-card-head">
        <span class="stat-icon">${opts.icon || ""}</span>
        <span class="stat-label">${e(label)}</span>
      </div>
      <div class="stat-value">${value}</div>
      ${opts.sub ? `<div class="stat-sub">${e(opts.sub)}</div>` : ""}
    </div>`;
  };

  const statusQuickSelect = (o, returnTo) => `
    <form method="POST" action="/orders/${e(o.id)}/status" class="quick-status-form">
      <input type="hidden" name="returnTo" value="${e(returnTo)}" />
      <select name="status" class="status-select" style="--pill-color:${statusColor(o.status)};" aria-label="עדכון סטטוס הזמנה">
        ${STATUSES.map(s => `<option value="${e(s.value)}" ${o.status === s.value ? "selected" : ""}>${e(s.label)}</option>`).join("")}
      </select>
    </form>`;

  const attentionRow = (o) => {
    const missing = (o.items || []).filter(it => it && it.supplyStatus === "needed").map(it => it.name).join(", ");
    return `
    <a href="/orders/${e(o.id)}" class="attention-row">
      <div>
        <div class="attention-title">#${o.orderNumber} · ${e(o.customerName)}</div>
        <div class="attention-sub">חסר במלאי: ${e(missing)}</div>
      </div>
      <div class="attention-date">${o.deliveryDate ? formatDate(o.deliveryDate) : ""}</div>
    </a>`;
  };

  const unpaidRow = (o) => {
    const c = calcOrder(o, settings);
    const balance = Math.max(0, c.sellTotal - (Number(o.amountPaid) || 0));
    return `
    <a href="/orders/${e(o.id)}" class="attention-row">
      <div>
        <div class="attention-title">✱ #${o.orderNumber} · ${e(o.customerName)}</div>
        <div class="attention-sub">${e(paymentLabel(o.paymentStatus))} · יתרה לתשלום ${formatPrice(balance)} · סטטוס הזמנה: ${e(statusLabel(o.status))}</div>
      </div>
      <div class="attention-date">${o.deliveryDate ? formatDate(o.deliveryDate) : ""}</div>
    </a>`;
  };

  const upcomingRow = (o) => {
    const diff = o.deliveryDate ? daysDiff(today, o.deliveryDate) : null;
    let urgency = "";
    let urgencyLabel = "";
    if (diff !== null) {
      if (diff < 0) { urgency = "is-overdue"; urgencyLabel = "באיחור"; }
      else if (diff === 0) { urgency = "is-today"; urgencyLabel = "היום"; }
      else if (diff === 1) { urgency = "is-soon"; urgencyLabel = "מחר"; }
      else if (diff <= 3) { urgency = "is-soon"; urgencyLabel = `בעוד ${diff} ימים`; }
    }
    const itemsSummary = (o.items || []).filter(Boolean)
      .map(it => `${it.name || "(ללא שם)"}${(Number(it.qty) || 0) > 1 ? ` ×${it.qty}` : ""}`)
      .join(", ");
    const c = calcOrder(o, settings);
    const isPaid = o.paymentStatus === "paid";
    return `
    <div class="upcoming-row-wrap ${urgency}">
      <a href="/orders/${e(o.id)}" class="upcoming-row-link">
        <span class="upcoming-customer">${e(o.customerName)}</span>
        <span class="upcoming-items">
          ${e(itemsSummary || "—")}
          <span class="upcoming-payment ${isPaid ? "" : "is-unpaid"}">· ${e(paymentLabel(o.paymentStatus))}</span>
        </span>
      </a>
      <a href="/orders/${e(o.id)}" class="upcoming-price">${formatPrice(c.sellTotal)}</a>
      ${statusQuickSelect(o, "/")}
      <a href="/orders/${e(o.id)}" class="upcoming-date">${formatDate(o.deliveryDate)}${urgencyLabel ? ` <em>· ${e(urgencyLabel)}</em>` : ""}</a>
    </div>`;
  };

  const content = `
    <div class="stat-grid">
      ${statCard("הזמנות פתוחות", openOrders.length, { icon: icons.list, color: "#6D4FA6" })}
      ${statCard("הכנסות החודש", formatPrice(monthRevenue), { icon: icons.coins, color: "#4FA37A" })}
      ${statCard("רווח החודש", formatPrice(monthProfit), { icon: icons.trend, color: "#D98CC0" })}
      ${statCard("אחוז רווח ממוצע", `${avgMargin.toFixed(0)}%`, { icon: icons.percent, color: "#E0A458" })}
    </div>

    ${needsAttention.length ? `
    <div class="panel panel-alert">
      <div class="panel-head">${icons.alert}<h2>דורש תשומת לב — צריך להזמין מספק</h2></div>
      <div class="attention-list">${needsAttention.map(attentionRow).join("")}</div>
    </div>` : ""}

    <div class="panel">
      <div class="panel-head">
        <h2>הזמנות פתוחות — משלוחים קרובים</h2>
        <a href="/orders" class="panel-head-link">כל ההזמנות ←</a>
      </div>
      ${upcoming.length ? `<div class="upcoming-list">${upcoming.map(upcomingRow).join("")}</div>` : `<p class="empty-note">אין הזמנות פתוחות עם תאריך אספקה קרוב.</p>`}
    </div>

    ${unpaid.length ? `
    <div class="panel panel-alert">
      <div class="panel-head">${icons.alert}<h2>טרם שולם במלואו (${unpaid.length})</h2></div>
      <div class="attention-list">${unpaid.map(unpaidRow).join("")}</div>
    </div>` : ""}

    <a href="/orders/new" class="btn btn-primary btn-fab">${icons.plus} הזמנה חדשה</a>
  `;

  return layout({ title: "דשבורד", active: "dashboard", content, businessName: settings.businessName, showLogoTitle: true });
}

module.exports = { renderDashboard };
