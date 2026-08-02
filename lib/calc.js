"use strict";
// חישוב רווח להזמנה — מקור אמת יחיד (נטען גם ב-server.js וגם משוכפל ב-public/js/order-form.js
// לצורך תצוגה חיה בטופס; השרת הוא זה שקובע את הערך הסופי שנשמר ומוצג בדשבורד/ברשימות).

function calcOrder(order, settings) {
  // items יכול להכיל null זמנית (שורת פריט ריקה בטופס "הזמנה חדשה" לפני שמילאו כלום)
  const items = (Array.isArray(order.items) ? order.items : []).filter(Boolean);
  const sellTotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  // עלות מוצר (חומרים/רכישה) ועלות מיתוג נספרות בנפרד — לפי בקשה מפורשת, כדי שהפירוט
  // בסיכום הרווח יראה בדיוק: מחיר מכירה → עלות מוצר → עלות מיתוג → רווח.
  // אין שדה אריזה נפרד — עלות אריזה נכללת בתוך עלות המיתוג לפי בקשת המשתמשת (טופס קליל יותר).
  const materialsCost = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitCost) || 0), 0);
  const brandingCost = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitBrandingCost) || 0), 0);

  const hourlyRate = Number((settings && settings.hourlyRate) || 0);
  const prepMinutes = Number(order.prepTimeMinutes) || 0;
  const prepCost = (prepMinutes / 60) * hourlyRate;

  const shippingCost = Number(order.shippingCost) || 0;
  const otherCosts = Number(order.otherCosts) || 0;

  // רווח בשני שלבים, לפי בקשה מפורשת — כדי שיהיה ברור מה כל שורה אומרת:
  // 1) "רווח מוצר" — מחיר המכירה פחות כל העלויות הישירות (חומרים, מיתוג, משלוח, עלות אחרת),
  //    לפני שמורידים את שווי זמן העבודה שלך. זה מראה כמה המוצר עצמו "מרוויח" על הנייר.
  // 2) "רווח נטו" — רווח המוצר פחות עלות זמן ההכנה (לפי תעריף שעתי). זה הרווח האמיתי שנשאר
  //    בכיס בסוף, אחרי שגם הזמן שלך מתומחר ומקוזז.
  const productCost = materialsCost + brandingCost + shippingCost + otherCosts;
  const productProfit = sellTotal - productCost;

  const totalCost = productCost + prepCost;
  const profit = productProfit - prepCost; // = sellTotal - totalCost
  const marginPct = sellTotal > 0 ? (profit / sellTotal) * 100 : 0;

  return {
    sellTotal, materialsCost, brandingCost, prepCost, shippingCost, otherCosts,
    productCost, productProfit, totalCost, profit, marginPct
  };
}

module.exports = { calcOrder };
