(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initRepeaters();
    initConfirmSubmit();
    initSupplyStatusToggle(document);
    initLiveProfitCalc();
    initQuickStatusForms();
  });

  /* ---------------- ניווט מובייל ---------------- */
  function initMobileNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var sidebar = document.querySelector("[data-sidebar]");
    if (!toggle || !sidebar) return;
    toggle.addEventListener("click", function () {
      sidebar.classList.toggle("is-open");
    });
    document.addEventListener("click", function (e) {
      if (sidebar.classList.contains("is-open") && !sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        sidebar.classList.remove("is-open");
      }
    });
  }

  /* ---------------- Repeater (פריטי הזמנה) ---------------- */
  function initRepeaters() {
    document.querySelectorAll("[data-repeater]").forEach(function (wrap) {
      var rows = wrap.querySelector("[data-repeater-rows]");
      var tpl = wrap.querySelector("template");
      var addBtn = wrap.querySelector("[data-repeater-add]");
      var max = parseInt(wrap.getAttribute("data-repeater-max"), 10) || Infinity;

      function updateAddState() {
        if (!addBtn) return;
        var count = rows.querySelectorAll(".repeater-row").length;
        var atMax = count >= max;
        addBtn.hidden = atMax;
        addBtn.disabled = atMax;
      }

      function bindRemove() {
        rows.querySelectorAll("[data-repeater-remove]").forEach(function (btn) {
          if (btn._bound) return;
          btn._bound = true;
          btn.addEventListener("click", function () {
            var row = btn.closest(".repeater-row");
            if (row) row.remove();
            initLiveProfitCalc();
            updateAddState();
          });
        });
      }

      if (addBtn) {
        addBtn.addEventListener("click", function () {
          if (rows.querySelectorAll(".repeater-row").length >= max) return;
          var clone = tpl.content.cloneNode(true);
          rows.appendChild(clone);
          bindRemove();
          initSupplyStatusToggle(rows);
          initLiveProfitCalc();
          updateAddState();
        });
      }
      bindRemove();
      updateAddState();
    });
  }

  /* ---------------- הצג/הסתר שדות ספק לפי "אספקה" (לא צריך / צריך / הוזמן) ---------------- */
  function initSupplyStatusToggle(scope) {
    scope.querySelectorAll(".js-supply-toggle").forEach(function (sel) {
      if (sel._bound) return;
      sel._bound = true;
      sel.addEventListener("change", function () {
        var row = sel.closest(".item-row");
        var fields = row && row.querySelector(".supplier-name-field");
        if (fields) fields.hidden = sel.value === "not_needed";
      });
    });
  }

  /* ---------------- אישור לפני מחיקה ----------------
     מאזין אחד גלובלי: תומך גם ב-data-confirm על טופס שלם (למשל מחיקת הזמנה מהרשימה)
     וגם על כפתור בודד בתוך טופס גדול יותר (למשל כפתור המחיקה בתוך טופס ההזמנה עצמו,
     שמשתמש ב-formaction כדי לא ליצור טופס מקונן בתוך טופס — HTML לא תומך בזה). */
  function initConfirmSubmit() {
    document.addEventListener("submit", function (e) {
      var submitter = e.submitter;
      var target = (submitter && submitter.hasAttribute("data-confirm")) ? submitter : e.target;
      if (target && target.hasAttribute("data-confirm")) {
        if (!window.confirm(target.getAttribute("data-confirm"))) e.preventDefault();
      }
    });
  }

  /* ---------------- עדכון סטטוס מהיר (דשבורד / רשימת הזמנות / בתוך ההזמנה) ---------------- */
  function initQuickStatusForms() {
    document.querySelectorAll(".quick-status-form select[name='status']").forEach(function (sel) {
      if (sel._bound) return;
      sel._bound = true;
      sel.addEventListener("change", function () {
        sel.form.submit();
      });
    });
  }

  /* ---------------- חישוב רווח חי בטופס ההזמנה ---------------- */
  function initLiveProfitCalc() {
    var form = document.querySelector("[data-order-form]");
    var summary = document.querySelector("[data-profit-summary]");
    if (!form || !summary) return;
    var hourlyRate = parseFloat(form.getAttribute("data-hourly-rate")) || 0;

    function recalc() {
      var rows = form.querySelectorAll(".item-row");
      var sellTotal = 0, materialsCost = 0, brandingCost = 0;
      rows.forEach(function (row) {
        var qty = parseFloat(val(row, "itemQty")) || 0;
        var cost = parseFloat(val(row, "itemUnitCost")) || 0;
        var branding = parseFloat(val(row, "itemUnitBrandingCost")) || 0;
        var price = parseFloat(val(row, "itemUnitPrice")) || 0;
        sellTotal += qty * price;
        materialsCost += qty * cost;
        brandingCost += qty * branding;
      });
      var prepMinutes = parseFloat(val(form, "prepTimeMinutes")) || 0;
      var prepCost = (prepMinutes / 60) * hourlyRate;
      var shippingCost = parseFloat(val(form, "shippingCost")) || 0;
      var otherCosts = parseFloat(val(form, "otherCosts")) || 0;
      // רווח בשני שלבים — כמו ב-lib/calc.js: קודם רווח המוצר (לפני זמן עבודה), ואז רווח נטו (אחרי זמן עבודה)
      var productCost = materialsCost + brandingCost + shippingCost + otherCosts;
      var productProfit = sellTotal - productCost;
      var totalCost = productCost + prepCost;
      var profit = productProfit - prepCost;
      var marginPct = sellTotal > 0 ? (profit / sellTotal) * 100 : 0;
      var isEmpty = sellTotal === 0;

      setCalc("sellTotal", formatPrice(sellTotal));
      setCalc("materialsCost", formatPrice(materialsCost));
      setCalc("brandingCost", formatPrice(brandingCost));
      setCalc("prepCost", formatPrice(prepCost));
      setCalc("shippingCost", formatPrice(shippingCost));
      setCalc("otherCosts", formatPrice(otherCosts));
      setCalc("productProfit", isEmpty ? "—" : formatPrice(productProfit));
      setCalc("profit", isEmpty ? "—" : formatPrice(profit));
      setCalc("marginPct", isEmpty ? "—" : Math.round(marginPct) + "%");
      var subtotalRow = summary.querySelector("[data-profit-subtotal]");
      if (subtotalRow) {
        subtotalRow.classList.toggle("is-empty", isEmpty);
        subtotalRow.classList.toggle("is-negative", !isEmpty && productProfit < 0);
      }
      var totalRow = summary.querySelector("[data-profit-total]");
      if (totalRow) {
        totalRow.classList.toggle("is-empty", isEmpty);
        totalRow.classList.toggle("is-negative", !isEmpty && profit < 0);
      }
      var hint = summary.querySelector("[data-profit-hint]");
      if (hint) hint.style.display = isEmpty ? "" : "none";
    }
    function val(scope, name) {
      var el = scope.querySelector('[name="' + name + '"]');
      return el ? el.value : "";
    }
    function setCalc(key, text) {
      var el = summary.querySelector('[data-calc="' + key + '"]');
      if (el) el.textContent = text;
    }
    function formatPrice(n) {
      n = Math.round((n || 0) * 100) / 100;
      return "₪" + n.toLocaleString("he-IL", { maximumFractionDigits: 2 });
    }

    form.addEventListener("input", function (e) {
      if (e.target.matches('input[name="itemQty"], input[name="itemUnitCost"], input[name="itemUnitBrandingCost"], input[name="itemUnitPrice"], input[name="prepTimeMinutes"], input[name="shippingCost"], input[name="otherCosts"]')) {
        recalc();
      }
    });
    recalc();
  }
})();
