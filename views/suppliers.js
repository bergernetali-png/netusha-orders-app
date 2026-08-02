"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e, formatDate } = require("../lib/util");
const { OPEN_STATUSES, SUPPLY_STATUSES } = require("../lib/constants");

function shoppingRow(order, item) {
  const action = `/orders/${e(order.id)}/items/${e(item.id)}/supplier`;
  return `
  <div class="shopping-row">
    <div class="shopping-row-main">
      <div class="shopping-row-name">${e(item.name || "(ללא שם)")} <span class="muted">× ${e(item.qty)}</span></div>
      <div class="shopping-row-sub">
        <a href="/orders/${e(order.id)}">הזמנה #${order.orderNumber} · ${e(order.customerName)}</a>
        ${order.deliveryDate ? ` · צריך עד ${formatDate(order.deliveryDate)}` : ""}
      </div>
    </div>
    <form method="POST" action="${action}" class="shopping-row-form">
      <input type="text" name="supplierName" value="${e(item.supplierName)}" placeholder="שם הספק" />
      <input type="date" name="supplierEta" value="${e(item.supplierEta)}" title="תאריך קבלה משוער" />
      <select name="supplyStatus">
        ${SUPPLY_STATUSES.map(s => `<option value="${e(s.value)}" ${item.supplyStatus === s.value ? "selected" : ""}>${e(s.label)}</option>`).join("")}
      </select>
      <button type="submit" class="btn btn-sm btn-secondary">${icons.check} עדכון</button>
    </form>
  </div>`;
}

function renderSuppliersPage(orders, settings) {
  const openOrders = orders.filter(o => OPEN_STATUSES.includes(o.status));
  // פריטים שסומנו "לא צריך" לא נכנסים בכלל לעמוד הזה — לפי בקשה מפורשת.
  const toOrder = [];
  const waiting = [];
  openOrders.forEach(o => {
    (o.items || []).forEach(it => {
      if (!it) return;
      if (it.supplyStatus === "needed") toOrder.push({ order: o, item: it });
      else if (it.supplyStatus === "ordered") waiting.push({ order: o, item: it });
    });
  });

  const content = `
    <div class="panel ${toOrder.length ? "panel-alert" : ""}">
      <div class="panel-head">${icons.alert}<h2>צריך להזמין מספק (${toOrder.length})</h2></div>
      ${toOrder.length ? `<div class="shopping-list">${toOrder.map(n => shoppingRow(n.order, n.item)).join("")}</div>` : `<p class="empty-note">אין כרגע פריטים שממתינים להזמנה מספק.</p>`}
    </div>

    <div class="panel">
      <div class="panel-head"><h2>הוזמן, ממתין להגעה (${waiting.length})</h2></div>
      ${waiting.length ? `<div class="shopping-list">${waiting.map(n => shoppingRow(n.order, n.item)).join("")}</div>` : `<p class="empty-note">אין כרגע פריטים שממתינים להגעה מספק.</p>`}
    </div>
  `;

  return layout({ title: "ספקים ורשימת קניות", active: "suppliers", content, businessName: settings.businessName });
}

module.exports = { renderSuppliersPage };
