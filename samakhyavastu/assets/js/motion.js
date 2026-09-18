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
     data-pin="window"  sticky stage: opens, then a day passes (see celestial.css)
     data-pin="orbit"   sticky stage: phone flip, compass, five elements
     data-stars="90"                                    generate a twinkling starfield
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

  function lin(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function set(el, name, v) { el.style.setProperty(name, v.toFixed(4)); }

  /* Deterministic starfield: same sky on every visit, no layout cost. */
  function makeStars(el) {
    var n = parseInt(el.getAttribute("data-stars"), 10) || 60;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var s = document.createElement("i");
      var size = 1 + rnd() * rnd() * 2.6;
      s.style.cssText =
        "left:" + (rnd() * 100).toFixed(2) + "%;top:" + (Math.pow(rnd(), 1.4) * 100).toFixed(2) + "%;" +
        "width:" + size.toFixed(2) + "px;height:" + size.toFixed(2) + "px;" +
        "--tw:" + (2.5 + rnd() * 4).toFixed(2) + "s;--td:" + (-rnd() * 6).toFixed(2) + "s";
      frag.appendChild(s);
    }
    el.appendChild(frag);
  }

  /* ---- per-pin timelines. p is 0 -> 1 through the pinned run. ---- */
  var timelines = {
    /* Opens to full-bleed, then a whole day passes: the sun rises in the
       east (left), arcs over the house and sets in the west, dusk falls,
       the lamps come on, stars and the moon come out. The copy arrives in
       daylight and finishes being read under the night sky. */
    window: function (el, p) {
      set(el, "--e",  1 - seg(p, 0, 0.2));
      set(el, "--tp", seg(p, 0.2, 0.34));
      set(el, "--wp", seg(p, 0.34, 0.76));

      var t = lin(p, 0.04, 0.96);            /* time of day */
      var u = lin(t, 0, 0.7);                /* sun's journey */
      set(el, "--sx", 6 + u * 88);
      set(el, "--sy", 70 - Math.sin(Math.PI * u) * 58);
      set(el, "--sun",   seg(t, 0, 0.08) * (1 - seg(t, 0.6, 0.72)));
      set(el, "--dawn",  1 - seg(t, 0.06, 0.34));
      set(el, "--dusk",  seg(t, 0.4, 0.58) * (1 - seg(t, 0.72, 0.9)));
      set(el, "--night", seg(t, 0.6, 0.88));
      set(el, "--lamps", seg(t, 0.68, 0.88));
      set(el, "--stars", seg(t, 0.74, 0.96));
      set(el, "--moon",  seg(t, 0.8, 1));
    },

    /* Phone turns over, the compass draws itself and swings to north, then
       the five elements light zone by zone in step with the list. */
    orbit: function (el, p) {
      set(el, "--f",  seg(p, 0, 0.26));
      set(el, "--a",  seg(p, 0.24, 0.42));
      set(el, "--rr", p * 100 - 30);

      var z = lin(p, 0.44, 0.94) * 5;
      var current = p < 0.44 ? -1 : Math.min(4, Math.floor(z));
      if (el._current !== current) {
        el._current = current;
        el.classList.toggle("has-current", current >= 0);
        (el._els || (el._els = toArray(el.querySelectorAll("[data-el]")))).forEach(function (n) {
          var i = +n.getAttribute("data-el");
          n.classList.toggle("is-lit", i <= current);
          n.classList.toggle("is-current", i === current);
        });
      }
    }
  };

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
    toArray(document.querySelectorAll("[data-stars]")).forEach(makeStars);

    /* Reduced motion: show final state, skip the loop entirely. */
    if (reduced) {
      revealPending.forEach(function (el) { el.classList.add("is-in"); });
      countPending.forEach(runCounter);
      revealPending = [];
      countPending = [];
      parallax = [];
      pins = [];
      scrubs = [];
      /* finished state for the compass: every element lit */
      toArray(document.querySelectorAll(".orbit [data-el]")).forEach(function (n) { n.classList.add("is-lit"); });
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
        if (pr.bottom < -vh || pr.top > vh * 2) continue;   /* far off-screen */
        var line_ = timelines[pin.getAttribute("data-pin")];
        if (line_) line_(pin, pp);
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

    initTilt();
    initAccordion();
    initNav();
    initScrollSpy();
    initHashLanding();
  }

  /* ---------------------------------------------------------------- tilt ---
     Cards lean toward the pointer and a gold highlight follows it, as if
     the card were catching lamplight. Pointer devices only. */
  function initTilt() {
    if (reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    toArray(document.querySelectorAll(".card, .bubble")).forEach(function (el) {
      el.classList.add("tiltable");
      var raf = 0, ev = null;
      function apply() {
        raf = 0;
        var r = el.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width;
        var y = (ev.clientY - r.top) / r.height;
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        el.style.setProperty("--ry", ((x - 0.5) * 10).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
      }
      el.addEventListener("pointerenter", function () {
        el.style.removeProperty("--rv-delay");   /* stagger is for the entrance only */
        el.classList.add("is-tilt");
      });
      el.addEventListener("pointermove", function (e) {
        ev = e;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener("pointerleave", function () { el.classList.remove("is-tilt"); });
    });
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
