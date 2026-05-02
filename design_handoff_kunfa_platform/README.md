# Handoff: Kunfa Platform Redesign

## Overview
This is a redesign of the Kunfa platform — an AI-powered venture intelligence platform where investors source, score, and manage early-stage deals, and founders get investment-ready and matched with capital. The redesign establishes a new visual identity (modern fintech editorial — charcoal + warm amber accent + serif/sans pairing) and applies it consistently across the authenticated product surface.

## About the Design Files
The files in this bundle are **design references created as a working HTML/React prototype** — they show the intended look, structure, copy, and basic interaction patterns, but they are **not production code to copy directly**. The prototype uses inline Babel-transpiled JSX, CDN React, and a single hand-written `styles.css` so a designer can iterate quickly. Your task is to **recreate these designs in the Kunfa codebase's existing environment** (React/Next, Vue, Svelte, etc.) using its established patterns, component primitives, and styling solution (Tailwind, CSS modules, vanilla-extract, styled-components — whatever is in use). Lift the design *system* (tokens, type, layout patterns), not the prototype's plumbing.

If no frontend environment exists yet, prefer **Next.js + TypeScript + CSS variables (or Tailwind v4 with `@theme`)** — the design is grid-heavy, type-driven, and benefits from real CSS over runtime styling.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, and component patterns. Recreate pixel-perfectly, but using your codebase's component primitives — don't ship the prototype's JSX.

## Design Tokens

The single source of truth. Put these in a `tokens.css` (or Tailwind `@theme`) and have every component read from them. Never hardcode.

### Colors — Light (default)
```
--bg:           #fafaf7   /* paper white, page background */
--bg-elev:      #ffffff   /* cards, elevated surfaces */
--bg-sunk:      #f3f2ec   /* search input, subtle wells */
--ink:          #1c1c28   /* primary text, sidebar, dark CTAs */
--ink-2:        #2a2a36
--ink-soft:     #4a4a58   /* secondary text */
--ink-mute:     #7a7a86   /* tertiary text, labels */
--ink-faint:    #b0b0ba   /* disabled, icon stroke at 30% */
--line:         #e6e5dd   /* default borders */
--line-strong:  #d4d3ca   /* button borders, hover borders */

--accent:       oklch(0.72 0.12 70)   /* warm amber — primary accent */
--accent-soft:  oklch(0.94 0.04 75)   /* accent backgrounds */
--accent-ink:   oklch(0.38 0.08 60)   /* text on accent-soft */

--positive:     oklch(0.62 0.10 155)
--negative:     oklch(0.58 0.16 25)
```

### Colors — Dark
```
--bg:           #131319
--bg-elev:      #1c1c24
--bg-sunk:      #0e0e14
--ink:          #f4f3ee
--ink-soft:     #b8b7b0
--ink-mute:     #82817a
--line:         #2a2a32
--line-strong:  #383840
--accent-soft:  oklch(0.32 0.06 70)
--accent-ink:   oklch(0.86 0.10 75)
/* --accent stays the same in light/dark */
```

### Typography
- **Serif (display):** `Newsreader` (Google Fonts), opsz 6–72, weights 400/500/600. Used for h1–h3, stat values, card titles, brand wordmark.
- **Sans (UI):** `Inter Tight` (Google Fonts), weights 400/500/600. Used for everything else.
- **Mono (rare):** `JetBrains Mono` for kbd shortcuts and fine-print eyebrows.

Font pairing alternatives offered in the prototype's tweaks panel (you may want to expose any of these as themable):
- Fraunces + Inter
- Source Serif 4 + IBM Plex Sans
- Playfair Display + DM Sans

### Type Scale
| Token | Size | Line height | Letter-spacing | Family | Use |
|---|---|---|---|---|---|
| h1 | 38px | 1.1 | -0.02em | serif 400 | Page titles |
| h2 | 26px | 1.15 | -0.01em | serif 400 | Section titles |
| h3 | 19px | 1.25 | -0.01em | serif 400 | Card/aside titles |
| body | 14px | 1.5 | 0 | sans 400 | Default UI text |
| body-sm | 13px | 1.5 | 0 | sans 400 | Buttons, table cells |
| caption | 12px | 1.4 | 0 | sans 400 | Labels, foot notes |
| kicker | 11px | 1.4 | 0.14em uppercase | sans 500 | Tags, eyebrows |
| micro | 10px | 1 | 0.10em uppercase | sans 500 | Sidebar section labels, role |
| stat-val | 34px | 1 | -0.02em | serif 400 | Stat card values, tabular-nums |

All numeric values (stats, currency, table cells) use `font-variant-numeric: tabular-nums`.

### Spacing scale
4 / 8 / 14 / 18 / 22 / 32 / 40 / 80px. The page outer padding is **40px horizontal, 32px top, 80px bottom**.

### Radii
- Small (inputs, tags, pills): 5–6px
- Medium (buttons): 6px
- Large (cards, banners): 10px
- Full (pills, avatars): 99px / 50%

### Borders & shadows
- **No box-shadows.** This look is border-driven. Hover/focus states change border color, not elevation.
- Border weight: 1px everywhere.
- Focus ring on inputs: `box-shadow: 0 0 0 3px rgba(28,28,40,0.06)` + border color → `--ink`.

## Global Layout

```
┌──────────┬────────────────────────────────────────┐
│          │  topbar (sticky, 56px, border-bottom)  │
│ Sidebar  ├────────────────────────────────────────┤
│  248px   │                                        │
│  charcoal│  page (max-width 1280, padding 32/40/80) │
│  fixed   │                                        │
│  100vh   │                                        │
│          │                                        │
└──────────┴────────────────────────────────────────┘
```

- App is `display: grid; grid-template-columns: 248px 1fr`.
- Sidebar is `position: sticky; top: 0; height: 100vh` with internal flex column.
- Main column scrolls; topbar sticks to the top with `backdrop-filter: blur(8px)`.

## Screens

### 1. Sidebar (global)
**Background:** `--ink` (charcoal). Text uses `#e8e7e0` at varying opacities.

**Structure (top to bottom):**
1. **Brand block** (padding 22px, bottom border `rgba(255,255,255,0.06)`):
   - 28×28 mark — accent-colored rounded square with a serif "K" centered (charcoal text).
   - Wordmark: "Kunfa" in serif 19px (`#f4f3ee`), tight tracking.
   - Subtitle: "Venture Intelligence" in 10px uppercase, letter-spacing 0.12em, 45% opacity.
2. **Primary nav** (padding 18px 12px, gap 2px between items):
   - Items: Dashboard, Deals (badge "12"), Marketplace, Community, Startups, Investors, Invitations, FAQ.
   - Each item: 8×10 padding, 5px radius, 13px sans, icon left (15px, opacity 0.85), label, optional badge right.
   - Idle: text at 72% opacity. Hover: bg `rgba(255,255,255,0.04)`. Active: bg `rgba(255,255,255,0.07)`, full-opacity text.
   - Badge: 10px text, accent bg, charcoal text, 99px radius, 1×6 padding.
3. **"Join" section label** — 10px uppercase 0.14em letter-spacing, 40% opacity, 18px top padding.
4. **Join nav items:** Founder Onboarding, Join as Investor (same row style as primary).
5. **Wallet pill** (margin 8px 12px): rounded 6px, bg `rgba(255,255,255,0.04)`, 10×12 padding. Left: wallet icon + "Wallet" at 60% opacity. Right: amount in accent color, tabular-nums.
6. **User block** (top border, padding 14×18 bottom 18):
   - 30px circular avatar, gradient fill (accent → darker oklch), serif initials.
   - Name in 13px (`#f4f3ee`), role below in 10px uppercase 0.10em letter-spacing.

### 2. Dashboard ("Platform Overview")
**Sections in order:**

1. **Welcome banner** (dismissible) — full-width charcoal card, 26×30 padding, 10px radius. Left: 44×44 rounded inner-icon container with sparkle icon in accent color, then heading "Welcome — your $100 sourcing credit is live" + body explainer. Right: white "Browse deals" button. Decorative radial-gradient amber glow in the top-right (18% opacity). 22×14 close button top-right.
2. **Page head** — h1 "Platform Overview" + body subtitle, charcoal "Browse Deals" CTA on the right with right-arrow icon. 24px bottom padding, 1px bottom border.
3. **Stat grid** — 4 columns, 16px gap. Each stat card is `--bg-elev`, 1px border, 10px radius, 20×22 padding, vertical gap 14px. Top row has label (12px mute) + 14px outline icon. Big serif stat value (34px). Foot caption (12px mute).
4. **"Recent Deals" section header** — h2 26px serif on left, "View all →" link on right.
5. **Empty state** card (`--bg-elev`, 1px border, 10px radius, 60×40 padding, centered): 44px circular sunk-bg icon, "No recent deals" + caption.

### 3. Community
**Sections:**
1. **Page head** with "New Discussion" CTA (charcoal, plus icon).
2. **Tabs row** — 4 tabs: Discussions, Events, Sense Check, Screen a Startup. Tab style: 12×18 padding, 13px text, mute idle, ink active, 2px charcoal underline on active (sits on the row's bottom border).
3. **3-column stat row** — Members 1,284; Discussions this week 47; Top sectors 3. Centered layout per stat with a 32px sunk-bg icon container.
4. **Two-column body** (1fr / 320px, 28px gap):
   - **Left:** Discussions list. Card with `--bg-elev`, no padding except per-row 18px top/bottom. Each thread row is `grid-template-columns: 36px 1fr; gap 14px`. 34px circular charcoal avatar with white initials. Meta row: category tag + optional "★ Pinned" indicator in accent-ink color. Title in 14px medium. Foot row: name · sector · time · message-icon X replies · eye-icon Y views — all 12px mute.
   - **Right:** Two stacked aside cards.
     - First: charcoal background. 32px rounded inner sunk-bg icon container with sparkle in accent. Serif title "AI Deal Matching", body in 70% white, white CTA button "Set my preferences".
     - Second: light variant — `--bg-elev` with border. Same structure, compass icon, charcoal CTA.

**Tags:**
- `tag-accent`: accent-soft bg, accent-ink text, no border.
- `tag-ink`: charcoal bg, light text, no border.
- Default `tag`: bg `--bg`, 1px line-strong border, ink-soft text.

### 4. Invitations
1. **Page head** — "Invitations" + subtitle (no CTA).
2. **Referral banner** — full-width charcoal card, 32×36 padding, 10px radius. Top: time-limited pill (`rgba(255,255,255,0.08)` bg, accent text, sparkle icon, 11px uppercase). Big serif h2 "Earn $50 for every investor you refer". Body in 70% white. **Stat triplet** below: each stat in a `rgba(255,255,255,0.06)` translucent card, 14×18 padding, 8px radius. Stat values in serif 28px (white, last one in accent). Decorative bottom-right radial amber glow.
3. **Two invite cards** — equal columns, 16px gap:
   - **Invite a Startup** — `--bg-elev`, lock icon, h3 + body, two checkmark bullets (accent check), ghost-button CTA.
   - **Refer an Investor** — same shell. h3 has inline accent tag "$50 per referral". Two bullets. **Accent-button CTA** ("Refer an Investor") — this is the only place the accent fills a button.
4. **Info callout** — accent-soft bg, 6px radius, 12×16 padding, info icon + 12.5px text. Membership rationale.
5. **"Invitation history" section header** + empty state card (dashed border).

### 5. Founder Onboarding ("Complete Your Startup Profile")
1. **Form-page head** — 44×44 rounded charcoal icon block (lock icon in accent) + h1 30px + subtitle.
2. **Step breadcrumb** — 4 steps separated by chevron-right separators. Each step: 20px circular numbered chip + label. States:
   - `done`: charcoal-fill chip, white number, soft text.
   - `active`: accent-fill chip, charcoal number, bold ink text.
   - default: sunk-bg chip, line-strong border, mute text.
3. **Form card** — `--bg-elev`, 1px border, 10px radius, 32px padding, max-width 720px.
   - Section label "Startup information" — 12px uppercase 0.12em, mute, 14px bottom padding, 1px bottom border, 22px bottom margin.
   - 2-column field grid (16×18 gap). Required fields marked with red asterisk on label.
   - Fields: Company Name + Invitation Code, full-width Tagline, full-width Description (textarea, 96px min), Sector (select) + Stage (select), Founder Name + Founder Email, Location + Website.
   - Inputs: 10×12 padding, 5px radius, `--bg` fill, 1px line-strong border, 13.5px text. Focus → `--ink` border + 3px subtle focus ring.
   - **Submit button** — full-width charcoal, 13px padding, 14px medium text, 6px radius, 24px top margin.

### 6. Join as Investor
Same skeleton as Founder, with:
- Shield icon in head.
- Title "Join as Investor", subtitle "Accredited investors only. Read and sign the membership agreement."
- Section label "Investor profile".
- Fields: Full Name + Invitation Code, full-width Email, full-width Accreditation Status (select), full-width Bio (textarea), Location + LinkedIn URL, full-width Investment Focus / Sectors, Min Check Size + Max Check Size.
- Submit: "Join the Network".

### 7. FAQ
1. **Page head** — h1 "FAQ" + subtitle.
2. **FAQ accordion list** — single card (`--bg-elev`, 1px border, 10px radius, no internal padding, items separated by 1px lines).
   - Each item: full-width row button — 20×24 padding, left text 14px medium, right chevron-down icon (rotates 180° when open).
   - Hover bg `--bg-sunk`.
   - Open state: chevron rotated, answer panel below — 0/24/20 padding, 13.5px text at line-height 1.65, ink-soft color, max-width 720px.
   - 10 questions covering platform basics, accreditation, minimums, vetting, sectors, secondary market, referrals, fees, risk disclosure (full copy in `page-faq.jsx`).
3. **"Still have questions?" CTA bar** — 28px top margin, charcoal card, 24×28 padding, 10px radius. Left: serif h3 19px + 13px caption at 65% white. Right: white "Contact us" button. Decorative left-side radial amber glow.

### 8. Stub screens (Deals, Marketplace, Startups, Investors)
Already designed — see `page-stubs.jsx`. Patterns to lift:
- **Deal row** — grid `40px 1.6fr 1fr 1fr 1fr auto`, 18×22 padding. Logo (sunk-bg square with serif initials), name + sector, then 3 label/value cells with 10px uppercase labels and 13px values. Right: accent score tag + ghost "View" button.
- **Filter button row** — ghost buttons with filter icon, 8px gap, "Browse all" primary button right-aligned.
- **Empty state** — already documented.

## Components to Build

Build these as headless, token-driven primitives in your codebase:

| Component | Variants | Notes |
|---|---|---|
| `Button` | primary (charcoal), accent (amber), ghost (transparent + border), light (white + border), on-dark (white-on-charcoal) | All 9×16 padding, 6px radius, 13px medium, 7px gap. Optional leading/trailing icon. |
| `Card` | default, dark (charcoal), accent-soft | 10px radius, 1px border, 22px default padding. |
| `Tag` | default, accent (`tag-accent`), ink (`tag-ink`) | 99px pill, 11px medium, 2×8 padding. |
| `Input` / `Textarea` / `Select` | — | Label above, 12px medium soft, optional red `*`. Help text below in 11.5px mute. |
| `StatCard` | — | label + icon row, big serif value, foot caption. tabular-nums. |
| `PageHead` | — | h1 + subtitle + optional right CTA, 1px bottom divider, 36px bottom margin. |
| `SectionHead` | — | h2 left + optional right link, 40/18 vertical margin. |
| `Tabs` | — | underline-on-bottom-border style. Active = ink + 2px charcoal underline. |
| `Stepper` | done / active / default per step | 20px numbered chip + label, chevron-right separators. |
| `EmptyState` | — | Centered, optional icon, h3 14px + 13px mute caption. |
| `Callout` | accent-soft (default), neutral | 6px radius, 12×16 padding, leading icon. |
| `Avatar` | initials, gradient | 30/34 sizes used. Sidebar uses gradient fill. |
| `Accordion` | — | Single card shell, items split by lines. Chevron rotates 180°. |
| `Sidebar` | — | See section 1. Selected state via bg, not background highlight bar. |
| `Topbar` | — | Crumbs left, search + icon buttons right. Sticky + backdrop blur. |
| `WelcomeBanner` | dismissible | Full charcoal card with corner amber radial glow. |
| `ReferralBanner` | — | Same shell + stat triplet. |

## Iconography
- 24×24 viewBox, stroke 1.6, currentColor, round caps/joins. Lucide-style.
- The prototype defines icons in `icons.jsx` as a `window.I` map. In production, use `lucide-react` (or your existing icon set) — match these by name: Dashboard, Deals, Marketplace, Community (message-circle), Startups (rocket), Users, Mail, Help, Folder/Tree, Wallet, Search, Bell, Settings, Sparkle/Sparkles, Compass, Lock, Shield, Plus, X, ChevronDown/Right, ArrowRight, ArrowUpRight, Check, CheckCircle, Inbox, Filter, Activity, Briefcase, Coins, Target, Gift, Info, Sun, Moon.

## Interactions & Behavior
- **Sidebar nav** — single-page route switching in the prototype; in production wire to your router. Active route highlights via the `.active` style.
- **Welcome banner** — dismissible, persist dismissal in user prefs (not localStorage in production).
- **Tabs** — local state in prototype. Wire to URL query param (`?tab=discussions`) so links are shareable.
- **FAQ accordion** — single-open by default. Use `<details>`/`<summary>` if your stack allows, else a controlled accordion.
- **Form fields** — focus ring is `border-color → --ink, box-shadow 0 0 0 3px rgba(28,28,40,0.06)`. Invalid fields use `--negative` border.
- **Hover transitions** — 120ms on background/border-color/opacity. No transforms.
- **No box-shadows anywhere.** Don't add elevation; this look stays flat-on-paper.

## State Management
The prototype only mocks state for: active route, welcome dismiss, active tab, open FAQ index, theme/accent/font tweaks. In production wire each to:
- **Route** → router
- **Dismissals** → user prefs API
- **Tab + accordion** → URL query
- **Theme/accent/font** → user prefs (or org-level brand config)

## Theming
The prototype exposes 5 accents (amber, sage, mauve, iris, ember) and 4 font pairings via a tweaks panel — useful for stakeholder review. Default is **amber + Newsreader/Inter Tight**. Recommend keeping accent and font choice as ops-level config, not user-facing.

Light/dark mode is wired via `[data-theme="dark"]` on `<html>`. The dark palette is documented above.

## Copy
All on-screen copy is final and lives in the prototype's JSX files (`page-*.jsx`). Lift verbatim. The audience is VCs, family offices, angel networks, global LPs, and early-stage founders — keep the tone professional, slightly editorial, never breezy.

## Assets
- **Fonts:** Newsreader, Inter Tight, JetBrains Mono — all Google Fonts. Self-host for production (use a tool like `next/font` or `fontsource`).
- **Icons:** Lucide (already on npm).
- **No images, illustrations, or photos** in this design — by design. If you need imagery later, add subtly-striped placeholders rather than stock photography.

## Files in This Bundle
- `Kunfa Platform.html` — entry point (Babel + React via CDN, loads all JSX modules)
- `styles.css` — all component styles, tokens at the top
- `app.jsx` — route switcher, theme/tweak wiring
- `sidebar.jsx` — sidebar component
- `icons.jsx` — icon set
- `page-dashboard.jsx`, `page-community.jsx`, `page-invitations.jsx`, `page-founder.jsx`, `page-investor.jsx`, `page-faq.jsx`, `page-stubs.jsx` — per-screen layouts
- `tweaks-panel.jsx` — design-time controls (do not ship)

## Recommended Rollout
1. Land tokens + base typography (1 PR).
2. Sidebar + topbar shell across all routes (1 PR — this is what users notice).
3. Atomic primitives: Button, Card, Tag, form Input/Select, EmptyState (1 PR).
4. Page-level patterns: PageHead, SectionHead, StatCard, Stepper (1 PR).
5. Migrate screens in order: Dashboard → Community → Invitations → Forms → FAQ → Deals/Stubs.

Behind a feature flag if possible. Ship the chrome first; inner pages can follow over 2–3 sprints without looking broken because the chrome unifies them.
