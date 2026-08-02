"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e, formatPrice, formatDate } = require("../lib/util");
const { calcOrder } = require("../lib/calc");
const { STATUSES, statusColor, paymentLabel } = require("../lib/constants");

function renderOrdersList(orders, settings, query) {
  const q = (query.q || "").trim().toLowerCase();
  const statusFilter = query.status || "";
  const dateFilter = query.date || "";

  let filtered = orders.slice();
  if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
  if (dateFilter) filtered = filtered.filter(o => o.deliveryDate === dateFilter);
  if (q) {
    filtered = filtered.filter(o => (o.customerName || "").toLowerCase().includes(q));
  }
  const sortBy = query.sort === "created" ? "createdAt" : "deliveryDate";
  filtered.sort((a, b) => dateFilter
    ? (a.customerName || "").localeCompare(b.customerName || "")
    : (b[sortBy] || "").localeCompare(a[sortBy] || ""));

  // חוזרים לאותו עמוד ופילטר/חיפוש/תאריך אחרי עדכון סטטוס מהיר, כדי לא "לאבד" את המסננים שהוגדרו
  const returnParams = new URLSearchParams();
  if (query.q) returnParams.set("q", query.q);
  if (statusFilter) returnParams.set("status", statusFilter);
  if (dateFilter) returnParams.set("date", dateFilter);
  if (query.sort) returnParams.set("sort", query.sort);
  const returnTo = `/orders${returnParams.toString() ? "?" + returnParams.toString() : ""}`;

  const row = (o) => {
    const c = calcOrder(o, settings);
    const unpaid = o.status !== "cancelled" && o.paymentStatus !== "paid";
    const href = `/orders/${e(o.id)}`;
    return `
    <div class="order-row order-row-wrap">
      <a href="${href}" class="order-cell order-cell-num">#${o.orderNumber}</a>
      <a href="${href}" class="order-cell order-cell-customer">
        <span class="order-customer-name">${unpaid ? `<span class="unpaid-flag" title="טרם שולם במלואו">✱</span> ` : ""}${e(o.customerName)}</span>
        <span class="order-customer-phone">${e(o.customerPhone)}</span>
      </a>
      <a href="${href}" class="order-cell">${o.deliveryDate ? formatDate(o.deliveryDate) : "—"}</a>
      <form method="POST" action="/orders/${e(o.id)}/status" class="order-cell quick-status-form">
        <input type="hidden" name="returnTo" value="${e(returnTo)}" />
        <select name="status" class="status-select" style="--pill-color:${statusColor(o.status)};" aria-label="עדכון סטטוס הזמנה">
          ${STATUSES.map(s => `<option value="${e(s.value)}" ${o.status === s.value ? "selected" : ""}>${e(s.label)}</option>`).join("")}
        </select>
      </form>
      <a href="${href}" class="order-cell">${e(paymentLabel(o.paymentStatus))}</a>
      <a href="${href}" class="order-cell order-cell-profit ${c.profit < 0 ? "is-negative" : ""}">${formatPrice(c.profit)}</a>
      <form method="POST" action="/orders/${e(o.id)}/delete" class="row-delete-form" data-confirm="למחוק את ההזמנה #${e(o.orderNumber)} (${e(o.customerName)}) לצמיתות? לא ניתן לשחזר.">
        <button type="submit" class="row-delete-btn" title="מחיקת הזמנה" aria-label="מחיקת הזמנה">${icons.trash}</button>
      </form>
    </div>`;
  };

  const content = `
    ${dateFilter ? `
    <div class="panel panel-alert" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <div class="panel-head" style="margin:0;">${icons.calendar}<h2>הזמנות לאספקה בתאריך ${e(formatDate(dateFilter))} (${filtered.length})</h2></div>
      <a href="/orders" class="btn btn-secondary btn-sm">איפוס וחזרה לכל ההזמנות</a>
    </div>` : ""}

    <div class="list-toolbar">
      <form method="GET" action="/orders" class="search-form">
        <span class="search-icon">${icons.search}</span>
        <input type="search" name="q" value="${e(query.q || "")}" placeholder="חיפוש לפי שם לקוח/ה" />
        ${statusFilter ? `<input type="hidden" name="status" value="${e(statusFilter)}" />` : ""}
        <button type="submit" class="btn btn-secondary btn-sm">חיפוש</button>
      </form>
      <div class="status-filters">
        <a href="/orders${q ? `?q=${encodeURIComponent(query.q)}` : ""}" class="chip ${!statusFilter ? "is-active" : ""}">הכל</a>
        ${STATUSES.map(s => `<a href="/orders?status=${e(s.value)}${q ? `&q=${encodeURIComponent(query.q)}` : ""}" class="chip ${statusFilter === s.value ? "is-active" : ""}">${e(s.label)}</a>`).join("")}
      </div>
      <a href="/export/orders.csv" class="btn btn-secondary btn-sm">${icons.download} ייצוא ל-CSV</a>
    </div>

    <div class="order-table">
      <div class="order-row order-row-head">
        <span class="order-cell order-cell-num">מס'</span>
        <span class="order-cell order-cell-customer">לקוח/ה</span>
        <span class="order-cell">תאריך אספקה</span>
        <span class="order-cell">סטטוס</span>
        <span class="order-cell">תשלום</span>
        <span class="order-cell order-cell-profit">רווח</span>
      </div>
      ${filtered.length ? filtered.map(row).join("") : `<p class="empty-note">לא נמצאו הזמנות תואמות.</p>`}
    </div>

    <a href="/orders/new" class="btn btn-primary btn-fab">${icons.plus} הזמנה חדשה</a>
  `;

  return layout({ title: dateFilter ? `הזמנות ל-${formatDate(dateFilter)}` : "כל ההזמנות", active: "orders", content, businessName: settings.businessName });
}

module.exports = { renderOrdersList };
