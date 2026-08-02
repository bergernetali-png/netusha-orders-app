"use strict";
const { layout } = require("./layout");
const { escapeHtml: e, todayISO } = require("../lib/util");
const { statusColor, OPEN_STATUSES } = require("../lib/constants");

const WEEKDAY_SHORT = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const MAX_NAMES_PER_DAY = 3;

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function renderMonthPage(orders, settings, query) {
  const today = todayISO();
  const [ty, tm] = today.split("-").map(Number);
  const offset = parseInt(query.offset, 10) || 0;

  // החודש המוצג מחושב מ"החודש הזה" בתוספת offset חודשים (לא ימים — כדי לא "לסטות" בחודשים קצרים/ארוכים)
  const base = new Date(ty, (tm - 1) + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay(); // 0=ראשון
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month, 1 - startWeekday);

  const openOrders = orders.filter(o => OPEN_STATUSES.includes(o.status));
  const byDay = {};
  openOrders.forEach(o => {
    if (o.deliveryDate) (byDay[o.deliveryDate] = byDay[o.deliveryDate] || []).push(o);
  });

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const dayCell = (d) => {
    const iso = toISO(d);
    const inMonth = d.getMonth() === month;
    const isToday = iso === today;
    const list = (byDay[iso] || []).slice().sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
    const shown = list.slice(0, MAX_NAMES_PER_DAY);
    const extra = list.length - shown.length;
    const cls = `month-day ${inMonth ? "" : "is-outside"} ${isToday ? "is-today" : ""}`;
    // מספר היום מקשר לרשימה המאוגדת של כל ההזמנות לתאריך הזה; כל שם לקוח/ה הוא קישור נפרד
    // ישירות להזמנה שלו — כך אפשר גם לראות מיד למי מספקים, וגם לפתוח כל הזמנה בלחיצה אחת.
    const dayNum = list.length
      ? `<a href="/orders?date=${iso}" class="month-day-num">${d.getDate()}</a>`
      : `<span class="month-day-num">${d.getDate()}</span>`;
    return `
    <div class="${cls}">
      ${dayNum}
      ${list.length ? `
      <div class="month-day-names">
        ${shown.map(o => `<a href="/orders/${e(o.id)}" class="month-order" style="--pill-color:${statusColor(o.status)};" title="${e(o.customerName)}">${e(o.customerName)}</a>`).join("")}
        ${extra > 0 ? `<a href="/orders?date=${iso}" class="month-order-extra">+${extra} נוספות</a>` : ""}
      </div>` : ""}
    </div>`;
  };

  const content = `
    <div class="week-nav">
      <a href="/month?offset=${offset - 1}" class="btn btn-secondary btn-sm">← חודש קודם</a>
      <div class="week-range">${MONTH_NAMES[month]} ${year}</div>
      <a href="/month?offset=${offset + 1}" class="btn btn-secondary btn-sm">חודש הבא →</a>
      ${offset !== 0 ? `<a href="/month" class="panel-head-link">חזרה לחודש הנוכחי</a>` : ""}
    </div>

    <div class="month-grid">
      <div class="month-grid-head">${WEEKDAY_SHORT.map(w => `<span>${w}</span>`).join("")}</div>
      <div class="month-grid-body">${cells.map(dayCell).join("")}</div>
    </div>
  `;

  return layout({ title: "לוח חודשי", active: "month", content, businessName: settings.businessName });
}

module.exports = { renderMonthPage };
