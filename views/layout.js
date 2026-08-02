"use strict";
const fs = require("fs");
const path = require("path");
const { escapeHtml: e } = require("../lib/util");
const icons = require("./icons");

let cssVersion = Date.now();
try {
  cssVersion = fs.statSync(path.join(__dirname, "..", "public", "css", "style.css")).mtimeMs;
} catch (err) { /* נשאר עם ברירת מחדל אם הקובץ עדיין לא קיים */ }

function layout({ title, active, content, businessName }) {
  const navItems = [
    { key: "dashboard", href: "/", label: "דשבורד", icon: icons.dashboard },
    { key: "orders", href: "/orders", label: "כל ההזמנות", icon: icons.list },
    { key: "new-order", href: "/orders/new", label: "הזמנה חדשה", icon: icons.plus },
    { key: "week", href: "/week", label: "לוח שבועי", icon: icons.calendar },
    { key: "suppliers", href: "/suppliers", label: "ספקים וקניות", icon: icons.truck },
    { key: "settings", href: "/settings", label: "הגדרות", icon: icons.settings }
  ];
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e(title)} · ניהול הזמנות${businessName ? " " + e(businessName) : ""}</title>
  <link rel="stylesheet" href="/css/style.css?v=${cssVersion}" />
  <meta name="robots" content="noindex,nofollow" />
</head>
<body>
  <div class="shell">
    <button type="button" class="mobile-nav-toggle" data-nav-toggle aria-label="פתיחת תפריט">${icons.menu}</button>
    <aside class="sidebar" data-sidebar>
      <div class="sidebar-brand"><img src="/images/netusha-logo.png" alt="${e(businessName || "NETUSHA")}" /><span>ניהול הזמנות</span></div>
      <nav class="side-nav" aria-label="ניווט ראשי">
        ${navItems.map(item => `<a href="${item.href}" class="${active === item.key ? "is-active" : ""}">${item.icon}<span>${e(item.label)}</span></a>`).join("")}
      </nav>
      <form method="POST" action="/logout" class="sidebar-logout">
        <button type="submit">${icons.logout}<span>התנתקות</span></button>
      </form>
    </aside>
    <div class="main">
      <div class="topbar"><h1>${e(title)}</h1></div>
      <div class="main-content">${content}</div>
    </div>
  </div>
  <script src="/js/app.js" defer></script>
</body>
</html>`;
}

module.exports = { layout };
