"use strict";
const { escapeHtml: e } = require("../lib/util");

function renderLogin({ error, businessName } = {}) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>כניסה · ניהול הזמנות</title>
  <link rel="stylesheet" href="/css/style.css" />
  <meta name="robots" content="noindex,nofollow" />
</head>
<body class="login-body">
  <div class="login-card">
    <img src="/images/netusha-logo.png" alt="${e(businessName || "NETUSHA")}" class="login-logo" />
    <p class="login-sub">כניסה למערכת ניהול ההזמנות</p>
    ${error ? `<div class="form-status error">${e(error)}</div>` : ""}
    <form method="POST" action="/login">
      <div class="field-group">
        <label>סיסמה</label>
        <input type="password" name="password" autofocus required />
      </div>
      <button type="submit" class="btn btn-primary btn-block">כניסה</button>
    </form>
  </div>
</body>
</html>`;
}

module.exports = { renderLogin };
