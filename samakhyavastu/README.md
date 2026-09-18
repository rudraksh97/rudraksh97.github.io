# MahaVastu Magic — site rebuild

A rebuild of **mahamagicvastu.com** that carries the content and photography of
the existing site into the visual and motion language of **aurickbanana.com**.

Static HTML/CSS/JS. No build toolchain, no framework, no runtime dependencies.

---

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Build it

`index.html` is generated. Edit `src/shell.html` or the files in `partials/`,
then:

```bash
python3 build.py
```

The build inlines each `<!--PARTIAL:name.html-->` marker and appends a content
hash to every local CSS/JS reference (`styles.css?v=ccd1757afe`). A missing
partial or a referenced asset that does not exist fails the build rather than
producing a half-rendered page.

**Edit the partials, never `index.html`** — it is overwritten on every build.

---

## Layout

```
src/shell.html        <head>, nav, hero, arc band, partial markers
partials/             one file per section group
assets/css/tokens.css design tokens — the only place raw values live
assets/css/styles.css component system
assets/css/hero.css   hero and masthead
assets/js/motion.js   motion engine
assets/img/           25 images lifted from the live site
build.py              assembler + asset fingerprinting
```

---

## What was carried across from the reference

The reference site's character comes from a few specific decisions, all of which
are reproduced here:

| Reference | Here |
|---|---|
| Playfair Display + Nunito Sans | same pairing |
| Cream ground that warms to amber as you scroll | ivory → sand, scroll-driven |
| Floating pill nav with a gold hairline | same, plus scroll-spy and a mobile sheet |
| Gold-bordered "speech bubble" panels | `.bubble` |
| Staggered fade-up reveals on scroll | `data-reveal` + `data-reveal-delay` |
| Scroll-linked parallax and scale | `data-parallax`, `data-parallax-scale` |
| Oversized ghost wordmark behind the hero | the देवनागरी *वास्तु* glyph |

**The palette was re-keyed, not copied.** The reference is built on brown
`#524025` and amber `#F5B936`. Those hues belong to that brand. This site keeps
the same tonal *structure* — warm ground, deep ink, gold accent — but takes its
hues from the MahaVastu mark itself: gold lotus `#C9A227`, oxblood laurel
`#7B2118`, red lotus centre `#C8102E`. The result reads as the same family of
design without wearing another company's colours.

---

## Motion engine

The reference achieves its motion with jQuery 3.7 + AOS 2.3.1 + skrollr +
Arctext — roughly 140KB of render-blocking script, no reduced-motion support,
and skrollr has been unmaintained for years and disables itself on touch.

`assets/js/motion.js` replaces all four. It is dependency-free, rAF-batched,
and honours `prefers-reduced-motion`.

Markup opts in through data attributes only:

```html
<div data-reveal="fade-up" data-reveal-delay="120">…</div>
<img data-parallax="0.16">
<figure data-parallax-scale="1.10">…</figure>
<span data-count="500" data-count-suffix="+">0</span>
<div data-scrub="zoom">…</div>                 <!-- scale/fade tied to scroll -->
<section class="pin" data-pin>…</section>      <!-- pinned, scroll-scrubbed stage -->
<p data-words>…</p>                            <!-- lit word by word inside a pin -->
```

### Apple-style scroll choreography

- **Pinned window** (`.pin`) — the stage sticks for ~2 viewports while the photo
  opens from an inset rounded card to full-bleed, the title comes into focus,
  then the paragraph lights up word by word. JS writes only progress values
  (`--e`, `--tp`, `--wp`); CSS maps them to visuals and defaults to the finished
  state, so no-JS and reduced-motion readers see the complete composition.
- **Hero scroll-out** — `--hp` lifts and dissolves the hero copy (desktop only)
  while the ghost glyph swells.
- **Headings** use `data-reveal="rise"`: a longer rise that sharpens from blur,
  on `--e-apple`.
### Celestial set pieces (`assets/css/celestial.css`)

- **Sunrise to starlight** — once the window opens, a whole day passes across
  the pinned stage: the sun rises in the east (left), arcs over the house and
  sets in the west; dusk falls, the lamps come on, stars and a crescent moon
  come out. Lighting is stacked blend-mode overlays whose *opacity* changes, so
  it never repaints the photo.
- **Phone flip + compass** (`partials/03b-online-compass.html`) — for the
  Online Consultation service. A phone turns over in 3D with a light sweep, a
  compass draws itself over a floor plan and swings to true north, then the
  five elements (Panchatattva) light zone by zone in step with the list. The
  twelve rashis orbit behind it, with 27 ticks for the nakshatras.
- **Light-catching cards** — on pointer devices cards tilt toward the cursor
  and a gold highlight follows it. Symptom cards and process steps flip in on
  a 3D hinge (`data-reveal="flip"`).

### Loader and the travelling compass (`loader.css`, `journey.css`)

- **Loader** — a compass ring draws around the MahaVastu medallion, eight
  direction ticks appear and the needle swings past north and settles; then
  two maroon temple doors swing open onto the page. The hero's load-in is
  paused until the doors move. Holds for ~1.5s on a first visit (capped at
  3.5s however slow the page), doors-only on repeat visits in the session.
  Only renders when JS is running (inline `<head>` flag), hides itself after
  6s regardless, and is skipped under reduced motion.
- **Travelling compass** — on desktop the compass seal lifts off the hero
  photo as you scroll, arcs down the right margin flipping through 3D, and
  docks in the centre of Benefits, where the six benefits sit around it as
  speech bubbles. Both ends are real elements; the flying copy only exists
  mid-flight. Below 1024px or with reduced motion the dock just shows its
  compass.

### Consultation showcase (`partials/04-services.html`, `assets/css/consult.css`)

The Services section is one pinned stage with a scene per consultation,
each built from SVG pieces that assemble as you scroll, with a tab rail on
top and the phone section (Online) following as chapter five:

- **Home** — isometric house drops in over a 3x3 Vastu grid: water body in
  the north-east, east-facing entrance, lamps on, a beam rising from the
  Brahmasthan.
- **Office** — desks pop onto the floor plan; the leader's desk sits in the
  south-west inside a gold ring.
- **Shop** — shutter rolls up under a "॥ शुभ लाभ ॥" board, awning unrolls,
  toran goes up, customers walk in, coins stack at the counter.
- **Remedies** — the stage turns to night; the kit's lid flips open and a
  yantra, crystal and colour swatches rise out, a diya is lit.

Every part declares its own window of the chapter's progress (`--a` start,
`--d` duration); `consult.css` derives linear, eased and spring curves from
those. The section only pins once JS adds `.is-pinned`, so without JS or with
reduced motion it renders as four finished chapters stacked down the page.

**Content to confirm:** the element-to-direction mapping in the compass
section follows classical Vastu (Water NE, Fire SE, Earth SW, Air NW, Space
centre). MahaVastu works with 16 zones; adjust the copy if the practice
presents it differently.
The same applies to the Vastu cues in the showcase scenes (north-east water,
east entrance, south-west leadership seat) and to the four chapter
headlines, which are new copy.

- `body` uses `overflow-x: clip`, not `hidden` — `hidden` turns body into a
  scroll container and silently breaks `position: sticky`.

### Why reveals are not driven by IntersectionObserver

The first implementation used IO. It dropped elements. IO samples on frame
boundaries, so a fast trackpad fling or a smooth-scrolling anchor jump can carry
an element through the viewport between two samples; because a reveal only fires
on `isIntersecting`, anything missed that way stayed at `opacity: 0`
permanently. Clicking "Gallery" in the nav left every section it flew past
invisible. Measured: **27 of 49 reveal targets stuck after a single pass.**

Reveals now resolve on geometry inside the same rAF scroll loop as everything
else, so "has this element reached the reveal line" is answered from its real
position every frame. An element already above the line — because we jumped past
it — reveals immediately. No element can be permanently lost.

Two supporting pieces exist for the same reason:

- **Settle pass** — polls geometry for ~1s after boot, because a `#hash` jump, a
  restored scroll position, and late-loading images all move content without
  reliably firing a scroll event.
- **Hash landing** — re-resolves `/#services` after layout settles. The browser
  resolves the hash at parse time, before the 100svh hero and lazy images have
  settled, which previously left deep links sitting at the top of the page. It
  cancels itself the moment the reader scrolls, taps or presses a key.

Scroll-spy still uses IO: a missed frame there costs an inactive nav highlight,
never hidden content.

---

## Content

All copy is the existing site's, lightly tightened for punctuation and
consistency. Nothing was invented — no statistics, awards, prices, testimonials
or credentials beyond what the live site already publishes.

**Contact details are deliberately unresolved.** The source site exposes no
email address, phone number, postal address or social URLs, so every "Book",
"WhatsApp" and legal-page link points at `#contact` or `#`. These are the only
placeholders in the build and each one needs a real destination before launch.

---

## Accessibility & responsive

- Single-column below 620px, two-column gallery, nav collapses to a sheet
- `prefers-reduced-motion` short-circuits the engine and renders final state
- Accordion is real `<button>`s with `aria-expanded`
- Every image has a descriptive `alt`; decorative ones are `alt="" aria-hidden`
- No horizontal overflow at 390px or 820px (verified)

---

## Before launch

1. Real destinations for the booking, WhatsApp and legal links.
2. Confirm the two consultant headshots are correctly attributed —
   `consultant-pradeep.jpeg` and `consultant-chandrashekhar.jpeg` were matched
   by comparing against the live site's rendered sections.
3. Gallery `alt` text describes the photographs generically (training sessions,
   team gatherings). Someone who was there should tighten it.
4. `hero-villa.jpg` was re-encoded from a 7.4MB PNG to a 749KB JPEG. Consider
   WebP/AVIF with a `<picture>` fallback if you want to go further.
