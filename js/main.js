/* ============================================================
   Навчаємо — shared JS (vanilla, no dependencies)
   Dark mode, mobile menu, scroll-reveal, count-up,
   progress bars, filters, search, modals, form validation
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Theme (dark mode) with localStorage ---------- */
  var root = document.documentElement;
  function applyTheme(t) {
    if (t === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }
  var stored = null;
  try { stored = localStorage.getItem("nv-theme"); } catch (e) {}
  if (!stored && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    stored = "dark";
  }
  applyTheme(stored || "light");

  function bindThemeToggle() {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var isDark = root.getAttribute("data-theme") === "dark";
        var next = isDark ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem("nv-theme", next); } catch (e) {}
        btn.setAttribute("aria-pressed", String(next === "dark"));
      });
    });
  }

  /* ---------- Mobile nav ---------- */
  function bindNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var links = document.getElementById("nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  function bindReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Count-up numbers ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = (el.getAttribute("data-decimals") | 0);
    var dur = 1600, start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = decimals
        ? val.toFixed(decimals)
        : Math.floor(val).toLocaleString("uk-UA");
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = decimals ? target.toFixed(decimals) : target.toLocaleString("uk-UA");
    }
    requestAnimationFrame(frame);
  }
  function bindCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    if (!("IntersectionObserver" in window)) { nums.forEach(animateCount); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Progress bars (animate to data-value %) ---------- */
  function bindProgress() {
    var bars = document.querySelectorAll(".progress__bar[data-value]");
    if (!bars.length) return;
    function fill(bar) { bar.style.width = Math.min(100, parseFloat(bar.getAttribute("data-value"))) + "%"; }
    if (!("IntersectionObserver" in window)) { bars.forEach(fill); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { setTimeout(function(){ fill(e.target); }, 150); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { io.observe(b); });
  }

  /* ---------- Generic card filtering (projects page) ---------- */
  function bindFilters() {
    var container = document.querySelector("[data-filter-grid]");
    if (!container) return;
    var state = {};
    var chipGroups = document.querySelectorAll("[data-filter-group]");
    var countEl = document.querySelector("[data-filter-count]");

    chipGroups.forEach(function (group) {
      var key = group.getAttribute("data-filter-group");
      state[key] = "all";
      group.querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          group.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); c.setAttribute("aria-pressed","false"); });
          chip.classList.add("active");
          chip.setAttribute("aria-pressed","true");
          state[key] = chip.getAttribute("data-value");
          apply();
        });
      });
    });

    function apply() {
      var items = container.querySelectorAll("[data-tags]");
      var shown = 0;
      items.forEach(function (item) {
        var ok = true;
        for (var key in state) {
          if (state[key] === "all") continue;
          var tagVal = item.getAttribute("data-" + key) || "";
          if (tagVal.split(" ").indexOf(state[key]) === -1) { ok = false; break; }
        }
        item.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown;
      var empty = container.querySelector(".empty-state");
      if (empty) empty.style.display = shown === 0 ? "block" : "none";
    }
    apply();
  }

  /* ---------- News search + category filter ---------- */
  function bindNewsFilter() {
    var list = document.querySelector("[data-news-list]");
    if (!list) return;
    var searchInput = document.querySelector("[data-news-search]");
    var cat = "all";
    var countEl = document.querySelector("[data-news-count]");
    var chips = document.querySelectorAll("[data-news-cat] .chip");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        cat = chip.getAttribute("data-value");
        apply();
      });
    });
    if (searchInput) searchInput.addEventListener("input", apply);

    function apply() {
      var q = (searchInput && searchInput.value || "").trim().toLowerCase();
      var items = list.querySelectorAll("[data-article]");
      var shown = 0;
      items.forEach(function (item) {
        var matchCat = cat === "all" || item.getAttribute("data-cat") === cat;
        var text = (item.getAttribute("data-search") || item.textContent).toLowerCase();
        var matchQ = !q || text.indexOf(q) !== -1;
        var ok = matchCat && matchQ;
        item.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown;
      var empty = list.parentElement.querySelector(".empty-state");
      if (empty) empty.style.display = shown === 0 ? "block" : "none";
    }
    apply();
  }

  /* ---------- Modals ---------- */
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    var f = modal.querySelector("input, textarea, button");
    if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  function bindModals() {
    document.querySelectorAll("[data-modal-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(document.getElementById(btn.getAttribute("data-modal-open")));
      });
    });
    document.querySelectorAll(".modal").forEach(function (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target.matches(".modal__overlay, [data-modal-close]") ||
            e.target.closest("[data-modal-close]")) {
          closeModal(modal);
        }
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") document.querySelectorAll(".modal.open").forEach(closeModal);
    });
  }

  /* ---------- Donation amount selector ---------- */
  function bindAmounts() {
    document.querySelectorAll("[data-amount-group]").forEach(function (group) {
      var input = group.parentElement.querySelector("[data-amount-input]");
      group.querySelectorAll(".amount-opt").forEach(function (opt) {
        opt.addEventListener("click", function () {
          group.querySelectorAll(".amount-opt").forEach(function (o) { o.classList.remove("active"); });
          opt.classList.add("active");
          if (input) input.value = opt.getAttribute("data-amount");
        });
      });
    });
  }

  /* ---------- Form validation ---------- */
  function bindForms() {
    document.querySelectorAll("[data-validate]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var valid = true;
        form.querySelectorAll("[required]").forEach(function (input) {
          var field = input.closest(".field") || input.parentElement;
          var v = (input.value || "").trim();
          var ok = !!v;
          if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          if (ok && input.type === "tel") ok = /[0-9]{6,}/.test(v.replace(/\D/g, ""));
          field.classList.toggle("invalid", !ok);
          if (!ok) valid = false;
        });
        if (valid) {
          var success = form.querySelector(".form-success");
          if (success) success.classList.add("show");
          form.reset();
          form.querySelectorAll(".amount-opt.active").forEach(function(o){o.classList.remove("active");});
          var modal = form.closest(".modal");
          if (modal) setTimeout(function () { closeModal(modal); if(success) success.classList.remove("show"); }, 2200);
        }
      });
      form.querySelectorAll("[required]").forEach(function (input) {
        input.addEventListener("input", function () {
          var field = input.closest(".field") || input.parentElement;
          if (field.classList.contains("invalid") && (input.value || "").trim()) field.classList.remove("invalid");
        });
      });
    });
  }

  /* ---------- Footer year ---------- */
  function setYear() {
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Header shadow on scroll ---------- */
  function bindHeaderScroll() {
    var h = document.querySelector(".site-header");
    if (!h) return;
    var onScroll = function () {
      h.style.boxShadow = window.scrollY > 8 ? "var(--shadow-sm)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Init ---------- */
  function init() {
    bindThemeToggle();
    bindNav();
    bindReveal();
    bindCounters();
    bindProgress();
    bindFilters();
    bindNewsFilter();
    bindModals();
    bindAmounts();
    bindForms();
    bindHeaderScroll();
    setYear();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
