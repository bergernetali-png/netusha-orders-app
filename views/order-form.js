"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e, formatPrice, formatDate } = require("../lib/util");
const { calcOrder } = require("../lib/calc");
const { STATUSES, SOURCES, PAYMENT_STATUSES, SUPPLY_STATUSES, statusColor } = require("../lib/constants");

function itemRow(it) {
  it = it || { id: "", name: "", brandingText: "", qty: 1, unitCost: 0, unitBrandingCost: 0, unitPrice: 0, supplyStatus: "not_needed", supplierName: "", supplierEta: "" };
  const supplyStatus = it.supplyStatus || "not_needed";
  const showSupplierFields = supplyStatus !== "not_needed";
  return `
  <div class="repeater-row item-row">
    <input type="hidden" name="itemId" value="${e(it.id || "")}" />
    <button type="button" class="remove-row" data-repeater-remove>הסרה ✕</button>
    <div class="form-row">
      <div class="field-group"><label>שם המוצר</label><input type="text" name="itemName" value="${e(it.name)}" placeholder="לדוגמה: שלט עץ בהתאמה אישית" /></div>
      <div class="field-group"><label>מיתוג / התאמה אישית (טקסט לתיאור)</label><input type="text" name="itemBranding" value="${e(it.brandingText)}" placeholder="טקסט, שם, חריטה..." /></div>
    </div>
    <div class="form-row form-row-4">
      <div class="field-group"><label>כמות</label><input type="number" name="itemQty" value="${e(it.qty)}" min="1" step="1" class="js-calc" /></div>
      <div class="field-group"><label>מחיר מכירה ליחידה</label><input type="number" name="itemUnitPrice" value="${e(it.unitPrice)}" min="0" step="0.1" class="js-calc" /></div>
      <div class="field-group"><label>עלות מוצר ליחידה</label><input type="number" name="itemUnitCost" value="${e(it.unitCost)}" min="0" step="0.1" class="js-calc" /></div>
      <div class="field-group"><label>עלות מיתוג ליחידה</label><input type="number" name="itemUnitBrandingCost" value="${e(it.unitBrandingCost)}" min="0" step="0.1" class="js-calc" /></div>
    </div>
    <div class="form-row supplier-fields">
      <div class="field-group"><label>ספק</label>
        <select name="itemSupplyStatus" class="js-supply-toggle">
          ${SUPPLY_STATUSES.map(s => `<option value="${e(s.value)}" ${supplyStatus === s.value ? "selected" : ""}>${e(s.label)}</option>`).join("")}
        </select>
      </div>
      <div class="field-group supplier-name-field" ${showSupplierFields ? "" : "hidden"}><label>שם הספק</label><input type="text" name="itemSupplierName" value="${e(it.supplierName)}" /></div>
    </div>
  </div>`;
}

function renderOrderForm(order, settings, isNew) {
  order = order || {
    orderNumber: settings.nextOrderNumber, customerName: "", customerPhone: "",
    source: "", deliveryDate: "", status: "new", items: [null],
    prepTimeMinutes: 0, shippingCost: 0, otherCosts: 0, otherCostsNote: "",
    paymentStatus: "unpaid", amountPaid: 0, receiptIssued: false, notes: ""
  };
  const items = (order.items && order.items.length) ? order.items : [null];
  const c = calcOrder(order, settings);

  const content = `
  <div class="sticky-actions">
    <div class="field-hint">${isNew ? "הזמנה חדשה — מספר יוקצה אוטומטית בשמירה" : `הזמנה #${order.orderNumber}${order.createdAt ? " · נוצרה ב-" + formatDate((order.createdAt || "").slice(0, 10)) : ""}`}</div>
    ${!isNew ? `
    <form method="POST" action="/orders/${e(order.id)}/status" class="quick-status-form">
      <input type="hidden" name="returnTo" value="/orders/${e(order.id)}" />
      <select name="status" class="status-select status-select-lg" style="--pill-color:${statusColor(order.status)};" aria-label="עדכון סטטוס הזמנה">
        ${STATUSES.map(s => `<option value="${e(s.value)}" ${order.status === s.value ? "selected" : ""}>${e(s.label)}</option>`).join("")}
      </select>
    </form>` : ""}
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      ${!isNew ? `<a href="/orders/${e(order.id)}/print" target="_blank" class="btn btn-secondary btn-sm">${icons.download} סיכום להדפסה</a>` : ""}
      <button type="submit" form="order-form" class="btn btn-primary">${icons.check} שמירה</button>
    </div>
  </div>

  <form method="POST" action="${isNew ? "/orders" : `/orders/${e(order.id)}`}" id="order-form" class="order-form" data-order-form data-hourly-rate="${Number(settings.hourlyRate) || 0}">
    <div class="form-grid">
      <div class="form-main">
        <div class="admin-card">
          <h3>פרטי לקוח/ה</h3>
          <div class="form-row">
            <div class="field-group"><label>שם מלא</label><input type="text" name="customerName" value="${e(order.customerName)}" required /></div>
            <div class="field-group"><label>טלפון</label><input type="text" name="customerPhone" value="${e(order.customerPhone)}" /></div>
          </div>
          <div class="form-row">
            <div class="field-group"><label>מקור ההזמנה</label>
              <select name="source">
                <option value="">— בחרו —</option>
                ${SOURCES.map(s => `<option value="${e(s)}" ${order.source === s ? "selected" : ""}>${e(s)}</option>`).join("")}
              </select>
            </div>
            <div class="field-group"><label>תאריך אספקה</label><input type="date" name="deliveryDate" value="${e(order.deliveryDate)}" /></div>
          </div>
          <div class="field-group"><label>סטטוס</label>
            <select name="status">
              ${STATUSES.map(s => `<option value="${e(s.value)}" ${order.status === s.value ? "selected" : ""}>${e(s.label)}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="admin-card">
          <h3>פריטים</h3>
          <div data-repeater data-repeater-max="10">
            <div data-repeater-rows>${items.map(itemRow).join("")}</div>
            <template>${itemRow()}</template>
            <button type="button" class="btn btn-sm btn-secondary" data-repeater-add>${icons.plus} הוספת פריט</button>
          </div>
        </div>

        <div class="admin-card">
          <h3>עלויות נוספות</h3>
          <p class="field-hint" style="margin-bottom:12px;">עלות אריזה נכללת בתוך "עלות מיתוג ליחידה" בכל פריט — אין צורך להזין אותה שוב כאן.</p>
          <div class="form-row form-row-3">
            <div class="field-group"><label>זמן הכנה (דקות)</label><input type="number" name="prepTimeMinutes" value="${e(order.prepTimeMinutes)}" min="0" step="5" class="js-calc" /></div>
            <div class="field-group"><label>משלוח</label><input type="number" name="shippingCost" value="${e(order.shippingCost)}" min="0" step="0.1" class="js-calc" /></div>
            <div class="field-group"><label>עלות אחרת</label><input type="number" name="otherCosts" value="${e(order.otherCosts)}" min="0" step="0.1" class="js-calc" /></div>
          </div>
          <div class="field-group"><label>הערה לעלות האחרת (אופציונלי)</label><input type="text" name="otherCostsNote" value="${e(order.otherCostsNote)}" /></div>
        </div>

        <div class="admin-card">
          <h3>תשלום ותיעוד</h3>
          <div class="form-row">
            <div class="field-group"><label>סטטוס תשלום</label>
              <select name="paymentStatus">
                ${PAYMENT_STATUSES.map(p => `<option value="${e(p.value)}" ${order.paymentStatus === p.value ? "selected" : ""}>${e(p.label)}</option>`).join("")}
              </select>
            </div>
            <div class="field-group"><label>סכום ששולם בפועל</label><input type="number" name="amountPaid" value="${e(order.amountPaid)}" min="0" step="0.1" /></div>
          </div>
          <div class="field-group">
            <label>קבלה הוצאה?</label>
            <select name="receiptIssued">
              <option value="0" ${!order.receiptIssued ? "selected" : ""}>לא</option>
              <option value="1" ${order.receiptIssued ? "selected" : ""}>כן</option>
            </select>
          </div>
          <p class="field-hint">סימון פנימי לזכרון בלבד — לא מחליף הוצאת קבלה/חשבונית רשמית דרך מערכת החשבוניות שלך.</p>
        </div>

        <div class="admin-card">
          <h3>הערות פנימיות</h3>
          <textarea name="notes" rows="4" placeholder="כל מה שכדאי לזכור על ההזמנה הזו">${e(order.notes)}</textarea>
        </div>
      </div>

      <div class="form-side">
        ${(() => {
          const toBuy = items.filter(it => it && it.supplyStatus && it.supplyStatus !== "not_needed");
          if (!toBuy.length) return "";
          return `
        <div class="admin-card shopping-card">
          <h3>${icons.truck} מה לקנות להזמנה הזו</h3>
          ${toBuy.map(it => `
            <div class="shopping-item">
              <div class="shopping-item-name">${e(it.name || "(ללא שם)")} <span class="muted">× ${e(it.qty)}</span></div>
              <div class="shopping-item-sub">${it.supplyStatus === "ordered" ? `✓ הוזמן${it.supplierName ? " מ-" + e(it.supplierName) : ""}${it.supplierEta ? " · צפוי " + e(it.supplierEta) : ""}` : "⚠ עדיין לא הוזמן מספק"}</div>
            </div>`).join("")}
          <a href="/suppliers" class="panel-head-link" style="display:block; margin-top:10px;">לרשימת הקניות המלאה ←</a>
        </div>`;
        })()}
        <div class="admin-card profit-summary" data-profit-summary>
          <h3>סיכום רווח</h3>
          <div class="profit-row"><span>סה"כ מכירה</span><strong data-calc="sellTotal">${formatPrice(c.sellTotal)}</strong></div>
          <div class="profit-row"><span>עלות מוצר</span><strong data-calc="materialsCost">${formatPrice(c.materialsCost)}</strong></div>
          <div class="profit-row"><span>עלות מיתוג</span><strong data-calc="brandingCost">${formatPrice(c.brandingCost)}</strong></div>
          <div class="profit-row"><span>משלוח</span><strong data-calc="shippingCost">${formatPrice(c.shippingCost)}</strong></div>
          <div class="profit-row"><span>עלות אחרת</span><strong data-calc="otherCosts">${formatPrice(c.otherCosts)}</strong></div>
          <div class="profit-row profit-row-subtotal ${c.sellTotal === 0 ? "is-empty" : (c.productProfit < 0 ? "is-negative" : "")}" data-profit-subtotal>
            <span>רווח מוצר <em>(לפני זמן עבודה)</em></span><strong data-calc="productProfit">${c.sellTotal === 0 ? "—" : formatPrice(c.productProfit)}</strong>
          </div>
          <div class="profit-row"><span>עלות זמן הכנה</span><strong data-calc="prepCost">${formatPrice(c.prepCost)}</strong></div>
          <div class="profit-row profit-row-total ${c.sellTotal === 0 ? "is-empty" : (c.profit < 0 ? "is-negative" : "")}" data-profit-total>
            <span>רווח נטו <em>(אחרי זמן עבודה)</em></span><strong data-calc="profit">${c.sellTotal === 0 ? "—" : formatPrice(c.profit)}</strong>
          </div>
          <div class="profit-row"><span>אחוז רווח</span><strong data-calc="marginPct">${c.sellTotal === 0 ? "—" : c.marginPct.toFixed(0) + "%"}</strong></div>
          <p class="field-hint profit-empty-hint" data-profit-hint ${c.sellTotal === 0 ? "" : 'style="display:none;"'}>הזינו מחיר מכירה לפחות לפריט אחד כדי לראות את הרווח בפועל.</p>
        </div>
        ${!isNew ? `
        <div class="admin-card">
          <button type="submit" formaction="/orders/${e(order.id)}/delete" formmethod="POST" formnovalidate class="btn btn-danger btn-block" data-confirm="למחוק את ההזמנה הזו לצמיתות? לא ניתן לשחזר.">${icons.trash} מחיקת הזמנה</button>
        </div>` : ""}
      </div>
    </div>
  </form>`;

  return layout({ title: isNew ? "הזמנה חדשה" : `הזמנה #${order.orderNumber}`, active: isNew ? "new-order" : "orders", content, businessName: settings.businessName });
}

module.exports = { renderOrderForm };
