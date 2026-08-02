"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e, formatPrice, formatDate, todayISO, daysDiff } = require("../lib/util");
const { calcOrder } = require("../lib/calc");
const { statusLabel, statusColor, paymentLabel, OPEN_STATUSES, MARGIN_WARNING_THRESHOLD } = require("../lib/constants");

function renderDashboard(orders, settings) {
  const today = todayISO();
  const thisMonthKey = today.slice(0, 7); // YYYY-MM

  const openOrders = orders.filter(o => OPEN_STATUSES.includes(o.status));

  // "דורש תשומת לב": פריט כלשהו מסומן "צריך להזמין" מספק, בהזמנה שעדיין פתוחה
  const needsAttention = openOrders.filter(o =>
    (o.items || []).some(it => it && it.supplyStatus === "needed")
  );

  // רווחיות נמוכה — תופס תמחור-חסר לפני שמתחייבים ליצור, לא רק אחרי
  const lowMargin = openOrders.filter(o => {
    const c = calcOrder(o, settings);
    return c.sellTotal > 0 && c.marginPct < MARGIN_WARNING_THRESHOLD;
  });

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
  const monthOrders = orders.filter(o => (o.createdAt || "").slice(0, 7) === thisMonthKey && o.status !== "cancelled");
  let monthRevenue = 0, monthProfit = 0, marginSum = 0, marginCount = 0;
  monthOrders.forEach(o => {
    const c = calcOrder(o, settings);
    monthRevenue += c.sellTotal;
    monthProfit += c.profit;
    if (c.sellTotal > 0) { marginSum += c.marginPct; marginCount++; }
  });
  const avgMargin = marginCount ? (marginSum / marginCount) : 0;

  const statCard = (label, value, sub) => `
    <div class="stat-card">
      <div class="stat-label">${e(label)}</div>
      <div class="stat-value">${value}</div>
      ${sub ? `<div class="stat-sub">${e(sub)}</div>` : ""}
    </div>`;

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

  const lowMarginRow = (o) => {
    const c = calcOrder(o, settings);
    return `
    <a href="/orders/${e(o.id)}" class="attention-row">
      <div>
        <div class="attention-title">#${o.orderNumber} · ${e(o.customerName)}</div>
        <div class="attention-sub">רווח ${formatPrice(c.profit)} מתוך ${formatPrice(c.sellTotal)}</div>
      </div>
      <div class="attention-date">${c.marginPct.toFixed(0)}% רווח</div>
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
    <a href="/orders/${e(o.id)}" class="upcoming-row ${urgency}">
      <div class="upcoming-main">
        <div class="upcoming-top">
          <span class="upcoming-customer">${e(o.customerName)}</span>
          <span class="upcoming-price">${formatPrice(c.sellTotal)}</span>
          <span class="status-pill" style="--pill-color:${statusColor(o.status)};">${e(statusLabel(o.status))}</span>
        </div>
        <div class="upcoming-items">
          ${e(itemsSummary || "—")}
          <span class="upcoming-payment ${isPaid ? "" : "is-unpaid"}">· ${e(paymentLabel(o.paymentStatus))}</span>
        </div>
      </div>
      <span class="upcoming-date">${formatDate(o.deliveryDate)}${urgencyLabel ? ` <em>· ${e(urgencyLabel)}</em>` : ""}</span>
    </a>`;
  };

  const content = `
    <div class="stat-grid">
      ${statCard("הזמנות פתוחות", openOrders.length)}
      ${statCard("הכנסות החודש", formatPrice(monthRevenue))}
      ${statCard("רווח החודש", formatPrice(monthProfit))}
      ${statCard("אחוז רווח ממוצע", `${avgMargin.toFixed(0)}%`)}
    </div>

    ${needsAttention.length ? `
    <div class="panel panel-alert">
      <div class="panel-head">${icons.alert}<h2>דורש תשומת לב — צריך להזמין מספק</h2></div>
      <div class="attention-list">${needsAttention.map(attentionRow).join("")}</div>
    </div>` : ""}

    ${lowMargin.length ? `
    <div class="panel panel-alert">
      <div class="panel-head">${icons.alert}<h2>רווחיות נמוכה (מתחת ל-${MARGIN_WARNING_THRESHOLD}%)</h2></div>
      <div class="attention-list">${lowMargin.map(lowMarginRow).join("")}</div>
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

  return layout({ title: "דשבורד", active: "dashboard", content, businessName: settings.businessName });
}

module.exports = { renderDashboard };
