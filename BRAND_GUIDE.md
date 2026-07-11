# Echora — Brand Guide

> **Read before any UI/frontend/design work.** Execution reference for Echora's design system.
> Strategy, name analysis, competitive scan & sources live in `docs/brand-research.md` — **that doc is authoritative for identity; this doc is how to build it.** They must stay in sync.
> Product: **backoffice / internal tool** — an operations console for support, delivered first as a **WhatsApp support console** for full-time human agents (agent dashboard + admin backoffice + Ionic mobile companion).
> Minimum shipping quality = **Level 4 "Branded"** (every element carries brand meaning).

---

## 1. Brand Story

**Echora = the echo returns.** The name is built on the Greek root *ēchō* — *sound, echo, resonance* — "a voice that carries." Support is fundamentally an echo: a customer sends a voice out on WhatsApp and waits; Echora exists to make sure it comes **back answered** — fast, human, correct. Echora borrows the *emotional register of sound* — signal, resonance, clarity, response — to stand apart in a category (admin dashboards) drowning in generic corporate blue.

For the agent answering hundreds of times a day, Echora is the **calm command surface** — the quiet room where the only thing that sounds is the signal that matters.

- **One word we own:** **Clarity** — signal over noise; the important thing is always obvious.
- **Emotional soul:** **Resonance** — every voice comes back answered.
- **50ms visceral response we want:** *"Calm. Sharp. In control."* If a screen reads "cluttered" or "generic", the brand layer is missing.
- **Physical-space metaphor:** *the quiet room, the clear signal* — a dark, calm, near-neutral canvas (the room); the UI stays silent until something matters, then one resonant signal draws the eye.

**Brand personality (from research §4c):** Resonant · Clear · Responsive · Precise · Quietly confident.
**Voice:** direct, composed, no jargon-noise — a calm operator who already knows the numbers.

**Governing law of the whole system:** *chrome is quiet, color is signal.* Neutrals carry the surface; color is reserved to highlight **data, status, and action** — never to decorate chrome.

---

## 2. Design Philosophy

**Core principle:** *The tool disappears; the conversation stays.* Measure every decision against one question — **does this reduce the agent's load, or add to it?**

**Materialization test — how the principle shows up in pixels:**

| Principle | Materializes as |
|---|---|
| Signal over noise | Calm near-neutral canvas; one resonant accent + status colors reserved for what matters. Color highlights data, not chrome. |
| Reduce cognitive load | Status readable *pre-attentively* (color/shape before text). Bold harmonic-scale KPIs. Hierarchy by weight + scale. |
| Calm under load | Pressure is *ambient* — never a nag popup. Motion *pulses and settles* like a struck note decaying, not a mechanical slide. |
| Keyboard-first flow | Every frequent action reachable via command palette (⌘K) and shortcuts. Mouse is optional. |
| Resonance = depth | Layered surfaces (Obsidian → Slate Panel) with soft low elevation. Depth = resonance; never flat cards on a flat ground. |

**Norman's three levels for Echora:**
- **Visceral (50ms):** Obsidian canvas + Resonance Indigo + a single amber "echo" = "calm, considered, in control."
- **Behavioral (in use):** instant feedback (<200ms), keyboard flow, zero dead taps, skeletons not spinners.
- **Reflective (after shift):** "I cleared the queue and I'm not fried." Pride in a tool that respected their time.

---

## 3. Visual Identity

> All values below are the execution of `docs/brand-research.md` §4 & §6. If research changes, update here.

### 3.1 Color

**60-30-10:** 60% neutral canvas (Obsidian/Mist) · 30% secondary surfaces & chrome (Slate Panel, borders) · **10% reserved** — Resonance Indigo for primary action + Pulse Amber / status colors for signal. Never spend the 10% on decoration.

**Three-tier tokens** — primitives → semantic → component. Components use semantic tokens only.

```scss
/* Tier 1 — primitives (never used directly in components) */
$indigo-500: #4C4FE0;  $indigo-700: #2E2FA6;   /* Resonance Indigo / Deep */
$teal-400:   #22C8C0;                            /* Signal Teal */
$amber-400:  #FFB13C;                            /* Pulse Amber — the "echo" */
$mint-400:   #34D399;                            /* Success / online-live */
$rose-500:   #F0556B;                            /* Danger / SLA breach */
$obsidian:   #0E1020;  $slate-panel: #191C2E;  $muted-line: #2A2E44;
$mist: #F6F7FB;  $white: #FFFFFF;
$ink-dark: #E8EAF4;  $ink-light: #16182A;  $muted: #9BA0BC;

/* Tier 2 — semantic (dark = HERO; ops teams live on screen all day) */
:root, :root[data-theme="dark"] {
  --brand-primary:       #{$indigo-500};
  --brand-primary-deep:  #{$indigo-700};   /* hover/pressed, gradient anchor */
  --brand-secondary:     #{$teal-400};     /* secondary action, chart series B */
  --brand-accent:        #{$amber-400};    /* the ONE echo — key KPI / alert / focus pulse */
  --app-bg:      #{$obsidian};
  --surface:     #{$slate-panel};
  --surface-2:   #202542;                  /* elevated panel (one step lighter) */
  --border:      #{$muted-line};
  --text:        #{$ink-dark};
  --text-2:      #{$muted};
  --status-live:   #{$mint-400};           /* channel connected / agent online */
  --status-warn:   #{$amber-400};          /* SLA warning */
  --status-urgent: #{$rose-500};           /* SLA breach / error / destructive */
  --shadow-rgb:  0, 0, 0;                   /* on Obsidian, neutral low-elevation */
  --gradient-brand: linear-gradient(135deg, #{$indigo-500}, #{$teal-400}); /* brand moments ONLY */
}

/* Tier 2 — semantic (light peer) */
:root[data-theme="light"] {
  --brand-primary: #{$indigo-500}; --brand-primary-deep: #{$indigo-700};
  --brand-secondary: #{$teal-400}; --brand-accent: #{$amber-400};
  --app-bg: #{$mist};  --surface: #{$white};  --surface-2: #{$mist};
  --border: #E4E7EC;   --text: #{$ink-light}; --text-2: #667085;
  --status-live: #{$mint-400}; --status-warn: #{$amber-400}; --status-urgent: #{$rose-500};
  --shadow-rgb: 46, 47, 166;   /* indigo-tinted premium shadow */
}

/* Tier 3 — component */
:root {
  --btn-primary-bg: var(--brand-primary);
  --card-bg: var(--surface);
  --nav-active: var(--brand-primary);
  --tick-read: var(--brand-primary);   /* echo-return: read-tick fill */
  --kpi-callout: var(--brand-accent);  /* the single amber echo per view */
}
```

**Color discipline (non-negotiable):**
- **The canvas is silent.** Color appears only on data, status, or action. No decorative color on chrome.
- **One echo per view.** Pulse Amber marks *the single most important thing on screen* (a breaching SLA, a critical KPI). Spend it more than once and it stops meaning "look here."
- **Resonance Indigo = brand + primary action.** Signal Teal is the *secondary/support* signal (secondary actions, second chart series) — never a competing brand hue.
- **Status semantics:** mint = live/online, amber = SLA warning, rose = breach/error. Never repurpose these.
- **Gradient `#4C4FE0 → #22C8C0`** — hero, empty states, brand moments only. **Never behind live data.**
- **Never pure black `#000`** — use Obsidian `#0E1020`. Verify WCAG AA on Ink-on-Obsidian and Primary-on-surface before build.

### 3.2 Typography

Two human families + one mono. **Hierarchy by weight AND a harmonic scale.**

```scss
--font-display: 'Space Grotesk', 'Inter', system-ui, sans-serif; /* headings, KPIs, wordmark */
--font-body:    'Inter', system-ui, sans-serif;                  /* UI, body, tables — workhorse */
--font-mono:    'JetBrains Mono', ui-monospace, monospace;       /* IDs, phone#, timestamps, logs */
```

- **Space Grotesk** carries personality on big bold KPIs and headings — engineered, faintly "waveform," never novelty.
- **Inter** is the workhorse: superb at 12–14px, tabular figures, dense tables.
- **Harmonic type scale — perfect fifth (1.5×), a genuine musical interval** so the typographic rhythm literally *resonates*. This is a defensible, ownable brand detail (Sonos-inspired). Anchor sizes:

```scss
--font-size-xs: 12px;  --font-size-sm: 14px;  --font-size-md: 16px;   /* base body */
--font-size-lg: 20px;  --font-size-xl: 24px;  --font-size-2xl: 32px;  --font-size-3xl: 48px; /* KPIs */
--type-scale-ratio: 1.5; /* perfect fifth */
```

- Weights: 700 headings/KPIs · 600 labels/emphasis · 500 medium · 400 body.
- **`font-variant-numeric: tabular-nums`** on ALL changing numbers (SLA timers, queue counts, KPIs) — no jitter.
- **Mono for every identifier** (ticket #, `+65…` numbers, message IDs, logs) — scannable, aligned.
- Line-height: 1.2 headings, 1.5 body. Body fixed 14–16px — never fluid-scaled below legibility for an all-day tool.

### 3.3 Logo & mark

- **Wordmark:** "Echora" in **Space Grotesk** SemiBold with generous, harmonic letter-rhythm.
- **App mark:** an **"E" or origin-dot from which an echo ring / waveform emanates** (sound leaving a source) — Resonance Indigo on Obsidian (dark) or Ink on white (light). Reads at 24px in a nav rail.
- Clearspace = height of the "E". Never place the indigo mark on amber or teal. Provide `logo.svg` + `logo-white.svg` in `src/assets/images/`.

---

## 4. Materials & Surfaces

What each UI element *is*, physically, in the quiet-room metaphor:

| Element | Material identity |
|---|---|
| **App background** | The quiet room — matte **Obsidian** (dark) / cool **Mist** (light). Recedes; never competes. |
| **Panels (3-pane)** | Layered surfaces (Obsidian → Slate Panel → elevated) with soft low elevation. **Depth = resonance** — never a flat card on a flat ground. |
| **Conversation row** | A card with a **status rail** (3px left border) — the row *is* its SLA state; a mint dot when the channel is live. |
| **Chat bubbles** | Inbound = surface-2 neutral; outbound (agent) = indigo-tinted. WhatsApp-native shape, harmonic radius. |
| **The echo ring** | Concentric rings radiating from a point — focus states, "live" indicators, notifications, empty-state art, and the read-confirmation pulse. |
| **The waveform / pulse line** | A single travelling pulse line — active-state underline, loading rhythm, section divider, sparkline shape. **Data is the waveform.** |
| **Buttons** | Firm, tight-radius controls. Primary = solid Resonance Indigo; secondary = bordered/teal; ghost for tertiary. |
| **Command palette** | A floating glass overlay (subtle backdrop blur) — the console summoned on ⌘K. |
| **Toasts** | Low, quiet, bottom — brief confirmations, never modal blockers. |

```scss
--radius-sm: 6px;   /* inputs, chips, small controls */
--radius-md: 8px;   /* default cards, buttons, rows */
--radius-lg: 12px;  /* prominent panels */
--radius-xl: 16px;  /* modals, command palette */
--radius-full: 9999px; /* avatars, presence dots, pills */

/* shadows — soft, low-elevation, brand-tinted; opacity never > 0.15 */
--shadow-sm: 0 1px 3px rgba(var(--shadow-rgb), 0.06), 0 1px 2px rgba(var(--shadow-rgb), 0.04);
--shadow-md: 0 4px 12px rgba(var(--shadow-rgb), 0.08), 0 2px 4px rgba(var(--shadow-rgb), 0.04);
--shadow-lg: 0 12px 24px rgba(var(--shadow-rgb), 0.10), 0 4px 8px rgba(var(--shadow-rgb), 0.06);
```
Cards = `--shadow-sm` · palette/modal = `--shadow-lg` · prefer layered surfaces + borders over heavy shadows.

---

## 5. UX Signatures (unique interaction patterns)

These are the brand made interactive — the sound metaphor turned into behavior. Remove them and Echora becomes a generic chat app.

| Signature | Behavior | Brand origin |
|---|---|---|
| **Status rail** | Every conversation row carries a 3px left border encoding SLA state (neutral → amber → rose) + a mint live-channel dot. Queue health readable in one sweep. | Triaging "who needs me most, right now?" |
| **Ambient SLA ring (echo ring)** | A calm concentric ring per conversation depletes with time, warming to Pulse Amber then Rose near breach — the "one echo" for the critical case. Peripheral pressure, never a popup. | The felt pressure of a promise about to break. |
| **Echo-return delivery states** | WhatsApp ✓ → ✓✓ ticks; on **read**, ticks fill with Resonance Indigo and a soft **echo-ring pulse** ripples out then settles. The echo has returned. | "Did my reply actually land?" |
| **Command palette (⌘K / Ctrl-K)** | Assign, snooze, tag, resolve, search, jump — keyboard-first. | The power user living on the keyboard. |
| **Slash-snippets (`/`)** | Insert canned replies inline without leaving the composer. | Reaching for a line typed a thousand times. |
| **Resolve payoff (peak-end)** | On resolve, the echo ring collapses into a calm check and the row settles out of the queue — *pulse and settle*, ~200ms. | The small satisfaction of "handled." |

**Signature test:** if the triage/reply/resolve flow works identically for a to-do app, the signature isn't there yet.

**UX laws applied:** Doherty (feedback <200ms; skeletons) · Hick's (≤5 primary queue filters) · Fitts's (primary actions large, reachable; send fixed bottom-right) · Von Restorff (primary CTA + the single amber echo break the pattern) · Peak-End (resolve payoff; calm end-of-queue empty state) · Jakob's (WhatsApp-native bubbles/ticks so agents feel instantly at home).

---

## 6. Layout Direction

### Agent console (desktop — the primary surface): three-pane cockpit
```
┌───────────────────────────────────────────────────────────────┐
│  Top bar: ⌘K search · queue counts · presence toggle · avatar  │
├───────────┬───────────────────────────────┬───────────────────┤
│  TRIAGE   │        CONVERSATION           │   CONTEXT         │
│  queue    │  (WhatsApp-native thread,     │  profile · history│
│  + status │   composer w/ /snippets,      │  notes · CRM/order│
│  rail     │   echo-return ticks)          │  data             │
│  filters  │                               │                   │
└───────────┴───────────────────────────────┴───────────────────┘
```
- **Left (triage):** filterable queues (Mine / Unassigned / Waiting / All), each row = status rail + avatar + last message + SLA echo ring.
- **Center (conversation):** the active thread, WhatsApp-native bubbles, media, composer with slash-snippets and echo-return delivery states.
- **Right (context):** who you're talking to — never a click away. Collapsible on narrow screens.
- **Top bar:** global search + ⌘K entry, live queue counts, agent presence (Online/Away), profile.

### Admin backoffice / analytics
Left nav rail (Inbox · Analytics · Templates · Team · Channels · Settings) + content. Same tokens, same density. **Dashboards lead with the one "is everything okay?" KPI** (big Space Grotesk numeral), drill down on demand. Charts: Indigo primary + Teal secondary series on neutral gridlines, single amber echo for the alert line. Sparklines use the **waveform** motif.

### Mobile (Ionic/Capacitor companion)
Single-pane, swipe between **queue → thread → context**. Bottom composer with sticky send. A focused reply surface for agents on the go — not a feature-parity port.

**Spacing:** 8px base grid. Dense-but-breathable — panel padding 16px, row padding 12px, section gaps 24px. Never cram to 8px edges; never balloon a work tool with hero whitespace.

---

## 7. Imagery Direction

Echora is a **tool, not a consumer product** — imagery is minimal, functional, and motif-driven.

- **The two core motifs carry all "art":** the **waveform/pulse line** (dividers, sparklines, loading rhythm, active underlines) and the **echo ring** (focus, live indicators, notifications, empty states).
- **Iconography:** one rounded-geometric line-icon set, uniform ~1.5px stroke, consistent with Inter/Space Grotesk geometry; occasional waveform/pulse detail on brand-specific icons.
- **Empty states:** echo-ring / waveform line art + one-line message + next action. (e.g. empty queue → a settling echo ring + "Inbox zero. The room is quiet.")
- **Avatars** are the primary "photography" — circular, with a mint presence dot when online.
- **Data-viz:** Indigo + Teal on neutral gridlines; one amber echo for the critical series only. No rainbow charts, no gradients behind live data.
- **No stock photography, no decorative hero images.** Every visual element must inform.
- **Motion:** everything *pulses and settles* — actions ripple out (echo ring) then calm; easing like a struck note **decaying**, not a mechanical slide. Target 120–240ms, GPU transform/opacity only, **respect `prefers-reduced-motion`**. The echo-return read pulse is the one signature flourish — soft, ~240ms, once.

---

## 8. Do / Don't

| Do | Don't |
|---|---|
| Keep the canvas silent; reserve color for data/status/action | Rainbow dashboards; decorative color on chrome |
| Spend **one** Pulse Amber echo per view on the critical thing | Scatter amber; let everything shout |
| Resonance Indigo primary + Teal secondary signal | Introduce a competing third brand hue |
| Obsidian `#0E1020` as the dark ground | Pure black `#000` |
| Big harmonic-scale (1.5×) KPIs in Space Grotesk | Flat, same-size type in a dense tool |
| `tabular-nums` on every changing number; mono on IDs | Let timers/counts jitter; proportional figures in tables |
| Ambient, peripheral SLA pressure (echo ring) | Blocking "SLA breaching!" modals |
| Keyboard-first: ⌘K + shortcuts for all frequent actions | Force mouse-only interactions on power users |
| Layered surfaces + soft low elevation (depth = resonance) | Flat cards on a flat ground; harsh black shadows |
| Motion that pulses and settles; honor reduced-motion | Bouncy/theatrical or mechanical slide animation |
| Gradient only for hero/brand moments | Gradients behind live data |
| Dark mode as a first-class, AA-checked surface | Auto-inverted low-contrast dark mode |
| WhatsApp-native bubbles + ✓✓ ticks agents recognize | Reinvent chat into an email-thread shape |

---

## 9. Audit Findings

**Status: pre-build baseline (2026-07-11).** No UI exists yet — echora is a fresh scaffold. This section records the acceptance bar the first build must clear; populate with real findings after the first agent-console screens land.

**P0 — must hold from day one:**
- Three-tier tokens in `variables.scss` before any component code; values match `docs/brand-research.md`.
- Color discipline: silent canvas, one amber echo per view, mint = live/online only, no color on chrome.
- Dark (Obsidian) mode functional and **WCAG AA verified** (Ink-on-Obsidian, Primary-on-surface) — it is the hero.
- All feedback <200ms; skeletons, not spinners; `prefers-reduced-motion` respected.

**P1 — required for Level 4 "Branded":**
- Status rail + ambient SLA echo ring implemented (not a plain list).
- Echo-return delivery states (indigo read-tick fill + settle pulse).
- Command palette (⌘K) covering assign/snooze/tag/resolve/search/jump.
- Harmonic 1.5× type scale live; `tabular-nums` on all metrics; mono on all identifiers.

**P2 — polish:**
- Waveform/echo-ring empty states & sparklines.
- Resolve peak-end payoff (pulse-and-settle).
- Slash-snippets composer.

**Seven Brand Tests — target (verify post-build):** Swap · Blur · One-Word (Clarity) · Emotion (Calm/Sharp/In-control in 3s) · Story · Space (feels like the quiet room) · Pride. All seven must pass before shipping.

---

## 10. Revision History

| Date | Version | Change |
|---|---|---|
| 2026-07-11 | v1.0 | Initial brand guide — Echora as backoffice / WhatsApp support console. Executes the identity in `docs/brand-research.md` (Resonance Indigo + Signal Teal + Pulse Amber on Obsidian; Space Grotesk / Inter / JetBrains Mono; harmonic 1.5× scale; waveform + echo-ring motifs; pulse-and-settle motion) and grounds it in the agent-console product (three-pane cockpit, status rail, keyboard-first, echo-return delivery states). |
