"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e, formatDate, todayISO, addDays, startOfWeek, WEEKDAY_NAMES } = require("../lib/util");
const { statusLabel, statusColor, OPEN_STATUSES } = require("../lib/constants");

function renderWeekPage(orders, settings, query) {
  const offset = parseInt(query.offset, 10) || 0;
  const today = todayISO();
  const weekStart = addDays(startOfWeek(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const openOrders = orders.filter(o => OPEN_STATUSES.includes(o.status));
  const byDay = {};
  days.forEach(d => { byDay[d] = []; });
  openOrders.forEach(o => { if (o.deliveryDate && byDay[o.deliveryDate]) byDay[o.deliveryDate].push(o); });

  // פריטים שאמורים להגיע מהספק במהלך השבוע הזה — כדי לראות מראש מה "נכנס" השבוע, לא רק מה "יוצא"
  const arrivingThisWeek = [];
  openOrders.forEach(o => (o.items || []).forEach(it => {
    if (it && it.supplyStatus === "ordered" && it.supplierEta && it.supplierEta >= weekStart && it.supplierEta <= weekEnd) {
      arrivingThisWeek.push({ order: o, item: it });
    }
  }));
  arrivingThisWeek.sort((a, b) => a.item.supplierEta.localeCompare(b.item.supplierEta));

  const dayCard = (d, i) => {
    const list = byDay[d].slice().sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
    const isToday = d === today;
    return `
    <div class="week-day ${isToday ? "is-today" : ""}">
      <div class="week-day-head">
        <span>${WEEKDAY_NAMES[i]}</span>
        <span class="week-day-date">${formatDate(d).split(" ").slice(0, 2).join(" ")}</span>
      </div>
      ${list.length ? list.map(o => `
        <a href="/orders/${e(o.id)}" class="week-order">
          <span class="week-order-customer">${e(o.customerName)}</span>
          <span class="status-pill" style="--pill-color:${statusColor(o.status)};">${e(statusLabel(o.status))}</span>
        </a>`).join("") : `<div class="week-day-empty">אין אספקות</div>`}
    </div>`;
  };

  const content = `
    <div class="week-nav">
      <a href="/week?offset=${offset - 1}" class="btn btn-secondary btn-sm">← שבוע קודם</a>
      <div class="week-range">${formatDate(weekStart)} — ${formatDate(weekEnd)}</div>
      <a href="/week?offset=${offset + 1}" class="btn btn-secondary btn-sm">שבוע הבא →</a>
      ${offset !== 0 ? `<a href="/week" class="panel-head-link">חזרה לשבוע הנוכחי</a>` : ""}
    </div>

    ${arrivingThisWeek.length ? `
    <div class="panel">
      <div class="panel-head">${icons.truck}<h2>אמור להגיע מהספק השבוע</h2></div>
      <div class="attention-list">
        ${arrivingThisWeek.map(n => `
          <a href="/orders/${e(n.order.id)}" class="attention-row">
            <div>
              <div class="attention-title">${e(n.item.name)} × ${e(n.item.qty)}</div>
              <div class="attention-sub">להזמנה #${n.order.orderNumber} · ${e(n.order.customerName)}${n.item.supplierName ? " · מ-" + e(n.item.supplierName) : ""}</div>
            </div>
            <div class="attention-date">${formatDate(n.item.supplierEta)}</div>
          </a>`).join("")}
      </div>
    </div>` : ""}

    <div class="week-grid">${days.map(dayCard).join("")}</div>
  `;

  return layout({ title: "לוח שבועי", active: "week", content, businessName: settings.businessName });
}

module.exports = { renderWeekPage };
