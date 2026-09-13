# CareerSync — Design System

Reflects what's actually implemented in `client/src/app/globals.css` and the shared components, not an aspirational spec. See `UI_AUDIT.md` for what this replaced and why, and `COMPONENT_GUIDELINES.md` for usage rules.

## Typography

**Font**: Geist Sans (`--font-sans`) for all UI text; Geist Mono (`--font-mono`) reserved for numbers — stat/metric values, match-score percentages, kanban column counts. Both loaded via `next/font/google` in `app/layout.tsx`, mapped in `globals.css`'s `@theme inline`, applied globally via `html { @apply font-sans; }`.

| Tier | Size / weight | Where |
|---|---|---|
| Display | `text-4xl` → `sm:text-5xl md:text-6xl` (36/48/60px), 600 | Landing hero only |
| H1 (page title) | `text-3xl` (30px), 600 | Standalone pages outside the dashboard shell: auth pages, public organization pages |
| H1 (dashboard title) | `text-xl` (20px), 600 | The shared `Header`'s title slot (see Navigation) — deliberately smaller than a standalone H1 because it lives in a fixed 64px chrome bar, not a full page; "keep the header minimal" and "32-36px H1" are in tension for a persistent bar, resolved in favor of a compact header |
| H2 (section) | `text-base` (16px)/`text-lg`, 500 | `CardTitle` — every card's own heading |
| Body | `text-sm` (14px), 400 | Default body copy |
| Small / metadata | `text-xs` (12px) | Timestamps, hints, badge text |
| Muted | `text-muted-foreground` (`#71717a` light / `#a1a1aa` dark) | Secondary text everywhere — never a lighter gray than this |

## Colors

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#ffffff` | `#09090b` | Page canvas |
| `--surface` | `#fafafa` | `#18181b` | Secondary/recessed panels: sidebar, kanban columns |
| `--card` | `#ffffff` | `#18181b` | Card/dialog/popover fill |
| `--foreground` | `#18181b` | `#fafafa` | Primary text |
| `--muted-foreground` | `#71717a` | `#a1a1aa` | Secondary text |
| `--border` / `--input` | `#e4e4e7` | `#27272a` | Hairline borders |
| `--primary` | `#6366f1` | same | The one accent color — indigo |
| `--primary-hover` | `#4f46e5` | same | Solid-primary-button hover |
| `--primary-light` | `color-mix(in oklab, var(--primary) 10%, var(--background))` | auto-adapts | Active nav background, icon chips, subtle accent panels — computed, not a second hardcoded hex, so it stays correct in both themes automatically |
| `--success` / `--warning` / `--error` | `#10b981` / `#f59e0b` / `#ef4444` | same | Status only — never decorative |

Cards and the page background are the same white in light mode by design (`--card === --background`) — separation comes from the card's `ring-1 ring-foreground/10` border, not a fill-color difference, per "cards should rely on background contrast, borders, spacing" read together with "avoid excessive shadows." Dashboard landing views are the exception (see Shadows and the hero banner below) — they trade some of that flatness for visual presence since they're the first thing a user sees per session.

## Spacing

Tailwind's default scale used directly (4/8/12/16/20/24/32px steps via `p-1`…`p-8`, `gap-*`, `space-y-*`). Page-level rhythm is `space-y-6`; within a card, `space-y-3`/`space-y-4`; row/grid gaps are `gap-3` (tight) or `gap-4` (grid). Page container padding: `px-4` (16px, mobile) → `md:px-6` (24px, tablet) → `lg:px-10` (40px, desktop), capped at `max-w-[1440px]`.

## Radius

`--radius: 0.625rem` (10px) is the base; everything else derives from it: `sm`=6px, `md`=8px, `lg`=10px (buttons, inputs, list rows), `xl`=14px (Card, dialogs, table wrappers), `2xl`=18px (the landing CTA card). Matches the brief's Small/Medium/Large (6/10/14) scale exactly via the `lg`/`xl` steps already used everywhere — no component classes needed to change, only the token values.

## Shadows

Mostly none, by default. Reserved for surfaces that float above content: dropdown menus, selects, popovers, tooltips (`shadow-md`/`shadow-lg`). Static cards, table wrappers, and kanban cards never use a shadow — border + background contrast only.

Dashboard metrics stay flat and compact: `MetricStrip` uses a one-pixel divider grid and `MetricItem` uses a restrained hover surface, with no lift, glow, or shadow. This keeps the numbers prominent without turning every metric into a separate card.

## Gradients & the hero banner

One deliberate gradient surface exists: `components/dashboard/hero-banner.tsx`, used once at the top of each dashboard landing view. `bg-gradient-to-br from-primary via-primary to-accent-violet` — the same two accent tokens already in the palette, not a new color. Decorative blurred circles (`bg-white/10 blur-3xl`) add depth without extra tokens. This is the only gradient surface in the app; don't add a second one on the same page (one hero per view), and don't use a gradient as a card background elsewhere — it's a landing-moment device, not a general card treatment.

## Charts

Recharts bars/segments may use the full `--chart-1` … `--chart-5` sequence for categorical series (e.g. applications-by-status) instead of a single flat color — this was always the tokens' purpose, now actually used. Still never a hardcoded hex in the component; reference the CSS custom properties.

## Buttons

`components/ui/button.tsx` — six variants (`default`/`outline`/`secondary`/`ghost`/`destructive`/`link`), one height per size (`sm`=28px, `default`=32px, `lg`=36px, plus square `icon*` variants). Primary hover uses `--primary-hover`, not an opacity trick. Loading state = disabled + a "…" label change at the call site (no separate spinner variant — kept simple, consistent with existing call sites).

## Inputs

`components/ui/input.tsx`/`textarea.tsx`/`select.tsx` — uniform `h-8` control height, `rounded-lg`, focus ring via `ring-3 ring-ring/50`. Errors surface through the shared `FormField` wrapper (label + input + inline error/hint), never ad hoc.

## Cards

`components/ui/card.tsx` supports `size="default"` (16px padding) and `size="sm"` (12px, used for dense list-style cards — job cards, match cards). Structure is Header (optional) → Content → Footer (optional); never nest a card inside a card.

## Tables

`components/ui/table.tsx` — header row `h-10`, cells `p-2`, row hover `bg-muted/50`, no per-cell borders. Every table-driven page supplies its own loading (skeleton rows), empty (`EmptyState`), and error (`ErrorState`) states — never a blank table.

## Badges

`components/ui/badge.tsx`, pill-shaped (`rounded-4xl`), used only for status (`ApplicationStatusBadge`, `ProcessingStatusBadge`), skills (`SkillBadgeList`), and short categorical tags — never decoratively.

## Navigation

Sidebar (`components/common/sidebar.tsx`) is grouped: **Workspace** (Dashboard, Profile for talent), **Opportunities** (Jobs, Matches, Applications / Jobs, Applications, Organization for employer), **Account** (Settings, pinned at the bottom). Active item = `bg-primary-light text-primary`. Icons are 18px (`size-4.5`). Collapses to a 72px icon-only rail via a toggle; hidden entirely below `md`, replaced by a bottom `MobileNav` tab bar.

The page title lives in one place: `providers/page-header-provider.tsx`'s `usePageHeader(title, description?)`, called once per page, read by the persistent `Header` on desktop (`md:` and up) and by a `<MobilePageHeader />` drop-in on mobile (where the header collapses to just the logo). No page hand-rolls its own `<h1>` anymore.

## Responsive rules

Breakpoints follow Tailwind defaults (`sm`/`md`/`lg`/`xl`). Sidebar and desktop header title: `md` and up. Bottom tab bar and mobile page title: below `md`. Job detail's match-score sidebar is `lg:sticky lg:top-20`. Kanban scrolls horizontally on narrow viewports rather than squeezing columns.
