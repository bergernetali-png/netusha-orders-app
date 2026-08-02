"use strict";

const STATUSES = [
  { value: "new", label: "התקבלה", color: "#8F6FE8" },
  { value: "in_production", label: "בהכנה", color: "#D98CC0" },
  { value: "waiting_supplier", label: "ממתינה לספק", color: "#E0A458" },
  { value: "ready", label: "מוכנה למסירה", color: "#4FA37A" },
  { value: "delivered", label: "סופקה", color: "#6E6577" },
  { value: "cancelled", label: "בוטלה", color: "#C0564F" }
];

const OPEN_STATUSES = ["new", "in_production", "waiting_supplier", "ready"];

const SOURCES = ["אתר", "אינסטגרם", "וואטסאפ", "טלפון", "פנים אל פנים", "אחר"];

// סטטוס אספקה לפריט: "לא צריך" לא נכנס בכלל ללשונית ספקים וקניות (למשל: יש במלאי, או שלא רלוונטי).
// "צריך" מופיע ב"צריך להזמין". "הוזמן" מופיע ב"ממתין להגעה". ברירת מחדל לפריט חדש: לא צריך.
const SUPPLY_STATUSES = [
  { value: "not_needed", label: "לא צריך" },
  { value: "needed", label: "צריך להזמין" },
  { value: "ordered", label: "הוזמן מהספק" }
];

// הזמנה עם אחוז רווח נמוך מהסף הזה מסומנת בדשבורד כ"רווחיות נמוכה" — כדי לתפוס תמחור-חסר לפני שמתחייבים
const MARGIN_WARNING_THRESHOLD = 20;

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "לא שולם" },
  { value: "deposit", label: "מקדמה שולמה" },
  { value: "paid", label: "שולם במלואו" }
];

function statusLabel(value) {
  const s = STATUSES.find(s => s.value === value);
  return s ? s.label : value;
}
function statusColor(value) {
  const s = STATUSES.find(s => s.value === value);
  return s ? s.color : "#9A92A3";
}
function paymentLabel(value) {
  const p = PAYMENT_STATUSES.find(p => p.value === value);
  return p ? p.label : value;
}
function supplyStatusLabel(value) {
  const s = SUPPLY_STATUSES.find(s => s.value === value);
  return s ? s.label : "לא צריך";
}

module.exports = {
  STATUSES, OPEN_STATUSES, SOURCES, PAYMENT_STATUSES, SUPPLY_STATUSES, MARGIN_WARNING_THRESHOLD,
  statusLabel, statusColor, paymentLabel, supplyStatusLabel
};
