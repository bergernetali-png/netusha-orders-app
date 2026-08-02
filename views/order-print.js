"use strict";
const { escapeHtml: e, formatPrice, formatDate } = require("../lib/util");
const { calcOrder } = require("../lib/calc");
const { statusLabel, paymentLabel } = require("../lib/constants");

function renderOrderPrint(order, settings) {
  const c = calcOrder(order, settings);
  const itemsRows = (order.items || []).map(it => `
    <tr>
      <td>${e(it.name)}${it.brandingText ? `<br><span class="muted">${e(it.brandingText)}</span>` : ""}</td>
      <td>${e(it.qty)}</td>
      <td>${formatPrice(it.unitPrice)}</td>
      <td>${formatPrice((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>הזמנה #${order.orderNumber} · ${e(settings.businessName)}</title>
  <meta name="robots" content="noindex,nofollow" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Heebo", Arial, sans-serif; direction: rtl; color: #2B2530; padding: 40px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .muted { color: #6E6577; font-size: 0.85rem; }
    .head-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2B2530; padding-bottom: 16px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { text-align: right; padding: 10px 8px; border-bottom: 1px solid #E5DFEA; font-size: 0.92rem; }
    th { color: #6E6577; font-weight: 600; }
    .totals { margin-top: 16px; width: 100%; max-width: 320px; margin-inline-start: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.92rem; }
    .totals .grand { font-size: 1.1rem; font-weight: 700; border-top: 1px solid #2B2530; padding-top: 8px; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 0.92rem; }
    .no-print { margin-top: 24px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="head-row">
    <div>
      <h1>${e(settings.businessName)}</h1>
      <div class="muted">סיכום הזמנה — לא מהווה חשבונית מס/קבלה רשמית</div>
    </div>
    <div style="text-align:left;">
      <div><strong>הזמנה #${order.orderNumber}</strong></div>
      <div class="muted">${order.createdAt ? formatDate((order.createdAt || "").slice(0, 10)) : ""}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div><span class="muted">לקוח/ה:</span> ${e(order.customerName)}</div>
    <div><span class="muted">טלפון:</span> ${e(order.customerPhone)}</div>
    <div><span class="muted">תאריך אספקה:</span> ${order.deliveryDate ? formatDate(order.deliveryDate) : "—"}</div>
    <div><span class="muted">סטטוס:</span> ${e(statusLabel(order.status))}</div>
    <div><span class="muted">סטטוס תשלום:</span> ${e(paymentLabel(order.paymentStatus))}</div>
  </div>

  <table>
    <thead><tr><th>פריט</th><th>כמות</th><th>מחיר יחידה</th><th>סה"כ</th></tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="totals">
    <div><span>סה"כ לתשלום</span><strong>${formatPrice(c.sellTotal)}</strong></div>
    ${order.paymentStatus !== "unpaid" ? `<div><span>שולם</span><strong>${formatPrice(order.amountPaid)}</strong></div>` : ""}
    <div class="grand"><span>סה"כ</span><strong>${formatPrice(c.sellTotal)}</strong></div>
  </div>

  ${order.notes ? `<p class="muted" style="margin-top:24px;">הערות: ${e(order.notes)}</p>` : ""}

  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 20px; border-radius:8px; border:1px solid #2B2530; background:#fff; cursor:pointer;">הדפסה</button>
  </div>
</body>
</html>`;
}

module.exports = { renderOrderPrint };
