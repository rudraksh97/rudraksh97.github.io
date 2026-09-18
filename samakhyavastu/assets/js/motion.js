/* ==========================================================================
   MahaVastu Magic — Motion Engine
   --------------------------------------------------------------------------
   Reproduces the reference site's motion vocabulary without its dependency
   stack. The reference loads jQuery 3.7 + AOS 2.3.1 + skrollr + Arctext
   (~140KB, render-blocking, no reduced-motion support, skrollr is abandoned
   and disables itself on touch). This module is dependency-free, rAF-batched,
   and honours prefers-reduced-motion.

   DESIGN NOTE — why no IntersectionObserver.
   The first cut used IO for reveals. It dropped elements: IO samples on frame
   boundaries, so a fast trackpad fling or a smooth-scrolling anchor jump can
   carry an element through the viewport between two samples. Because a reveal
   only fires on `isIntersecting`, any element missed that way stayed at
   opacity:0 permanently — clicking "Gallery" in the nav left every section it
   flew past invisible. Measured: 27 of 49 reveal targets stuck after one pass.
   Reveals are now driven from the same rAF scroll loop as everything else and
   resolve on geometry, not on event delivery, so "has this element reached the
   reveal line" is answered from the element's real position every frame. An
   element that is already above the line — because we jumped past it — reveals
   immediately. No element can be permanently lost.

   Public contract — markup opts in via data attributes only:
     data-reveal="fade-up|fade-left|fade-right|zoom"   scroll reveal
     data-reveal-delay="150"                            stagger, ms
     data-parallax="0.18"                               scroll translate factor
     data-parallax-scale="1.15"                         scroll scale target
     data-count="500" data-count-suffix="+"             count-up on reveal
     data-scrub="zoom"                                  writes --sp (0-1) as it rises
     data-pin  (on a tall section with a sticky stage)  writes --e, --tp, --wp
     data-words                                         split into .w spans for --wp
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function toArray(nodes) { return Array.prototype.slice.call(nodes); }
  /* progress of p through the window [a, b], smoothed at both ends */
  function seg(p, a, b) { var t = clamp((p - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* Wrap each word in a span carrying its index, so CSS can light words up
     in order from a single progress value on the parent. */
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (w, i) {
      var span = document.createElement("span");
      span.className = "w";
      span.style.setProperty("--i", i);
      span.textContent = w;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.style.setProperty("--n", words.length);
  }

  /* The line, as a fraction of viewport height, an element's top must cross
     before it is considered "arrived". Just under 1.0 means an element begins
     revealing the moment it enters the viewport, so it has finished its
     transition by the time the reader's eye reaches it. */
  var REVEAL_LINE = 0.98;

  /* Ceiling on author-declared stagger. A row of five at 80ms plus a 500ms
     transition already runs ~900ms; anything longer reads as sluggish and, on
     a fast scroll, leaves a trail of half-faded content behind the viewport.
     Section authors declare intent; this keeps the whole page to one tempo. */
  var MAX_STAGGER = 240;

  /* ------------------------------------------------------------ counters */
  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    var suffix = el.getAttribute("data-count-suffix") || "";

    if (reduced) { el.textContent = target + suffix; return; }

    var start = null;
    var dur = 1400;
    function tick(now) {
      if (start === null) start = now;
      var t = clamp((now - start) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------------- boot */
  function boot() {
    /* ---- collect everything the scroll loop drives ---- */
    var revealPending = toArray(document.querySelectorAll("[data-reveal], .step"));
    var countPending  = toArray(document.querySelectorAll("[data-count]"));
    var parallax      = toArray(document.querySelectorAll("[data-parallax], [data-parallax-scale]"));
    var nav           = document.querySelector(".nav");
    var hero          = document.querySelector("[data-hero]");
    var pins          = toArray(document.querySelectorAll("[data-pin]"));
    var scrubs        = toArray(document.querySelectorAll("[data-scrub]"));

    toArray(document.querySelectorAll("[data-words]")).forEach(splitWords);

    /* Reduced motion: show final state, skip the loop entirely. */
    if (reduced) {
      revealPending.forEach(function (el) { el.classList.add("is-in"); });
      countPending.forEach(runCounter);
      revealPending = [];
      countPending = [];
      parallax = [];
      pins = [];
      scrubs = [];
      hero = null;
    }

    var ticking = false;

    function frame() {
      ticking = false;
      var y = window.pageYOffset;
      var vh = window.innerHeight;
      var line = vh * REVEAL_LINE;

      /* ---- nav condenses past the fold edge ---- */
      if (nav) nav.classList.toggle("is-stuck", y > 40);

      /* ---- hero ground: ivory -> sand across the first viewport ----
         Mirrors the reference's cream-to-amber scroll transition. */
      if (hero) {
        var t = clamp(y / (vh * 0.9), 0, 1);
        document.body.style.backgroundColor =
          "rgb(" + Math.round(lerp(253, 246, t)) + "," +
                   Math.round(lerp(248, 231, t)) + "," +
                   Math.round(lerp(240, 201, t)) + ")";
        /* hero scroll-out progress, read by hero.css */
        hero.style.setProperty("--hp", clamp(y / (vh * 0.8), 0, 1).toFixed(4));
      }

      /* ---- pinned stages ----
         Progress is how far through the section's extra height we have
         scrolled while its stage is stuck. Phases overlap slightly so one
         motion hands off to the next without a dead beat. */
      for (var s = 0; s < pins.length; s++) {
        var pin = pins[s];
        var pr = pin.getBoundingClientRect();
        var run = pr.height - vh;
        var pp = run > 0 ? clamp(-pr.top / run, 0, 1) : 1;
        pin.style.setProperty("--e",  (1 - seg(pp, 0, 0.36)).toFixed(4));
        pin.style.setProperty("--tp", seg(pp, 0.28, 0.48).toFixed(4));
        pin.style.setProperty("--wp", seg(pp, 0.44, 0.9).toFixed(4));
      }

      /* ---- scrubbed elements: 0 as the top enters, 1 by 55% up ---- */
      for (var k = 0; k < scrubs.length; k++) {
        var sr = scrubs[k].getBoundingClientRect();
        var sp = clamp((vh - sr.top) / (vh * 0.45), 0, 1);
        scrubs[k].style.setProperty("--sp", (1 - Math.pow(1 - sp, 3)).toFixed(4));
      }

      /* ---- reveals: geometry-driven, drain the pending list ---- */
      for (var i = revealPending.length - 1; i >= 0; i--) {
        var el = revealPending[i];
        if (el.getBoundingClientRect().top < line) {
          var d = parseInt(el.getAttribute("data-reveal-delay"), 10);
          if (!isNaN(d) && d > 0) {
            el.style.setProperty("--rv-delay", Math.min(d, MAX_STAGGER) + "ms");
          }
          el.classList.add("is-in");
          revealPending.splice(i, 1);
        }
      }

      /* ---- counters: same geometry rule, fire once ---- */
      for (var c = countPending.length - 1; c >= 0; c--) {
        var cel = countPending[c];
        if (cel.getBoundingClientRect().top < line) {
          runCounter(cel);
          countPending.splice(c, 1);
        }
      }

      /* ---- parallax translate / scale ---- */
      for (var p = 0; p < parallax.length; p++) {
        var pel = parallax[p];
        var r = pel.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;

        var progress = clamp((vh - r.top) / (vh + r.height), 0, 1);
        var speed = parseFloat(pel.getAttribute("data-parallax")) || 0;
        var scaleTo = parseFloat(pel.getAttribute("data-parallax-scale"));
        var shift = (progress - 0.5) * speed * 220;
        var scale = scaleTo ? lerp(1, scaleTo, progress) : 1;

        pel.style.transform =
          "translate3d(0," + shift.toFixed(2) + "px,0) scale(" + scale.toFixed(4) + ")";
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(frame); }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", onScroll);

    /* Settle pass. The first second after boot is when position is least
       trustworthy: the browser may still be applying a #hash jump or a
       restored scroll position, and images without intrinsic size are still
       resolving and shifting everything below them. None of that reliably
       produces a scroll event, so poll our own geometry for a short window
       instead of assuming one arrives. Self-cancels once the work is done. */
    var settleUntil = performance.now() + 1000;
    (function settle(now) {
      frame();
      var pendingWork = revealPending.length || countPending.length;
      if (now < settleUntil || pendingWork) {
        if (now < settleUntil) requestAnimationFrame(settle);
      }
    })(performance.now());

    frame();

    initAccordion();
    initNav();
    initScrollSpy();
    initHashLanding();
  }

  /* ------------------------------------------------------ hash landing ---
     Landing on /#services must actually arrive at Services. The browser
     resolves the hash at parse time, before late images and the 100svh hero
     have settled, so the target has usually moved by the time painting ends
     and the reader is left at the top of the page. Re-resolve it once things
     have stopped moving. Only runs when the URL carries a hash, and never
     fights a reader who has already started scrolling. */
  function initHashLanding() {
    if (!window.location.hash) return;

    var target;
    try {
      target = document.querySelector(window.location.hash);
    } catch (err) {
      return; /* not a valid selector */
    }
    if (!target) return;

    var cancelled = false;
    function cancel() { cancelled = true; }
    window.addEventListener("wheel", cancel, { passive: true, once: true });
    window.addEventListener("touchstart", cancel, { passive: true, once: true });
    window.addEventListener("keydown", cancel, { once: true });

    function settleTo() {
      if (cancelled) return;
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }

    /* once after layout, once more after images have had a chance to load */
    requestAnimationFrame(function () { requestAnimationFrame(settleTo); });
    window.addEventListener("load", function () { setTimeout(settleTo, 60); });
  }

  /* ---------------------------------------------------------- accordion */
  function initAccordion() {
    toArray(document.querySelectorAll(".acc")).forEach(function (acc) {
      toArray(acc.querySelectorAll(".acc__btn")).forEach(function (btn) {
        var item = btn.closest(".acc__item");
        var panel = item.querySelector(".acc__panel");
        var inner = panel.querySelector(".acc__panel-inner");
        if (!panel || !inner) return;

        btn.setAttribute("aria-expanded", "false");

        btn.addEventListener("click", function () {
          var isOpen = item.classList.contains("is-open");

          toArray(acc.querySelectorAll(".acc__item.is-open")).forEach(function (other) {
            if (other === item) return;
            other.classList.remove("is-open");
            other.querySelector(".acc__panel").style.height = "0px";
            other.querySelector(".acc__btn").setAttribute("aria-expanded", "false");
          });

          item.classList.toggle("is-open", !isOpen);
          btn.setAttribute("aria-expanded", String(!isOpen));
          panel.style.height = isOpen ? "0px" : inner.offsetHeight + "px";
        });
      });
    });
  }

  /* -------------------------------------------------------------- nav */
  function initNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    if (!nav || !toggle) return;

    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    toArray(nav.querySelectorAll(".nav__links a")).forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* --------------------------------------------------------- scroll spy */
  function initScrollSpy() {
    var links = toArray(document.querySelectorAll('.nav__links a[href^="#"]'));
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    links.forEach(function (a) {
      var el = document.querySelector(a.getAttribute("href"));
      if (el) map[el.id] = a;
    });

    /* Scroll spy is purely decorative — a missed frame costs an inactive
       highlight, never hidden content — so IO is fine here. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("is-active"); });
        if (map[e.target.id]) map[e.target.id].classList.add("is-active");
      });
    }, { threshold: 0.2, rootMargin: "-20% 0px -50% 0px" });

    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
