"use strict";
const { layout } = require("./layout");
const icons = require("./icons");
const { escapeHtml: e } = require("../lib/util");

function renderSettings(settings, ordersCount, flash) {
  const content = `
    ${flash ? `<div class="form-status ${flash.type === "error" ? "error" : "success"}">${e(flash.message)}</div>` : ""}
    <form method="POST" action="/settings" class="settings-form">
      <div class="admin-card">
        <h3>פרטי העסק</h3>
        <div class="field-group"><label>שם העסק (מוצג בכותרת ובכניסה למערכת)</label><input type="text" name="businessName" value="${e(settings.businessName)}" /></div>
      </div>

      <div class="admin-card">
        <h3>בסיס לחישוב רווח</h3>
        <p class="field-hint" style="margin-bottom:12px;">הערכים כאן משמשים כברירת מחדל לחישוב הרווח האוטומטי בכל הזמנה (אפשר לשנות ידנית בכל הזמנה בנפרד).</p>
        <div class="field-group"><label>תעריף שעתי (₪ לשעת עבודה — לחישוב עלות זמן ההכנה)</label><input type="number" name="hourlyRate" value="${e(settings.hourlyRate)}" min="0" step="1" /></div>
      </div>

      <button type="submit" class="btn btn-primary">${icons.check} שמירת הגדרות</button>
    </form>

    <div class="admin-card">
      <h3>גיבוי ויצוא נתונים</h3>
      <p class="field-hint" style="margin-bottom:12px;">כרגע יש במערכת ${ordersCount} הזמנות. מומלץ להוריד גיבוי מדי פעם — במיוחד לפני עדכון גדול או שינוי אחסון.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a href="/export/backup.json" class="btn btn-secondary">${icons.download} הורדת גיבוי מלא (JSON)</a>
        <a href="/export/orders.csv" class="btn btn-secondary">${icons.download} ייצוא הזמנות ל-CSV (לאקסל)</a>
      </div>
    </div>

    <div class="admin-card">
      <h3>אבטחה</h3>
      <p class="field-hint">שינוי סיסמת הכניסה נעשה דרך משתנה הסביבה <code>ADMIN_PASSWORD</code> בהגדרות השרת/האחסון (לא בטופס הזה, מטעמי אבטחה) — פירוט בקובץ ה-README שנשלח יחד עם הפרויקט.</p>
    </div>
  `;
  return layout({ title: "הגדרות", active: "settings", content, businessName: settings.businessName });
}

module.exports = { renderSettings };
