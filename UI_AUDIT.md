# CareerSync Frontend — UI/UX Audit

Source-verified against the actual code in `client/src/` (not assumptions). Every claim below cites a real file. Where the redesign brief's expectations conflict with what the real backend supports, that's called out explicitly — the fix is a *visual* one, never a fabricated backend value or a renamed status the API doesn't recognize.

---

## Typography Issues

**Font wiring is technically correct, not "missing."** `src/app/layout.tsx` loads `Geist`/`Geist_Mono` via `next/font/google`, exposes them as `--font-geist-sans`/`--font-geist-mono` CSS variables on `<body>`, and `globals.css`'s `@theme inline` maps them to Tailwind's `font-sans`/`font-mono` utilities, with `html { @apply font-sans; }` applying it globally. No conflicting `font-family` override exists anywhere else in the codebase, and the one third-party CSS import (`shadcn/tailwind.css`) only contributes keyframes/variants, never touches fonts or colors. **So the actual problems are:**

- **No typographic scale.** Every page hand-rolls its own heading with ad hoc classes (`text-2xl font-bold tracking-tight` shows up almost verbatim on every dashboard/list/settings page — e.g. `talent-dashboard.tsx`, `employer-dashboard.tsx`, `settings/page.tsx`, `profile/page.tsx`, `talent-job-detail.tsx`) rather than a shared `Heading`/`Text` component enforcing Display/H1/H2/H3/Body/Small tiers. This is why the app "doesn't look professional" despite technically correct font loading — there's no enforced hierarchy, just one repeated size used for everything that happens to be a title.
- **`font-mono` (Geist Mono) is loaded but never actually applied anywhere** — grep confirms zero uses of `font-mono` in any component. Stat/metric numbers (`StatCard` values, match scores, counts) all render in the default sans font, missing the numeric-tabular treatment the brief wants for "Numbers, code, technical information."
- **Muted/secondary text is already `--muted-foreground: #71717a`** (zinc-500-equivalent) in light mode, which matches the brief's "use zinc-500, not extremely light gray" — this part is already correct, no change needed.

## Layout Issues

- **No page-container width discipline.** `main` in the dashboard layout (`app/(dashboard)/layout.tsx`) has no `max-w-*` at all — pages stretch edge-to-edge on large monitors with only the sidebar as a boundary. The brief's `max-w-[1440px]` page-container convention doesn't exist anywhere.
- **Spacing is actually fairly disciplined already** (see grep counts in the appendix below) — `space-y-6` for page rhythm, `gap-3`/`gap-4` for grids, is used consistently across 30+ files. The complaint of "inconsistent spacing" is more about **hierarchy** (everything gets the same `space-y-6`/`gap-4` regardless of importance) than actual randomness.
- **Header's `title` prop is dead code.** `common/header.tsx` accepts a `title` prop and reserves desktop space for it, but grep confirms no page ever passes it — every page instead renders its own in-content `<h1>`, duplicating what the header was designed to show and leaving the header visually empty on desktop.
- **Sidebar nav is a flat list**, no section grouping — `constants/navigation.ts`'s `TALENT_NAV_ITEMS`/`EMPLOYER_NAV_ITEMS` are single flat arrays with no group labels, unlike the brief's WORKSPACE/OPPORTUNITIES/ACCOUNT grouping.

## Component Issues

- **Primitives are actually well-built, not generic** — `components/ui/*` (Button, Input, Card, Badge, Table, Select) are genuine Base UI-powered components with disciplined, consistent sizing (`h-8` default control height everywhere), not ad hoc divs. Shadows are already deliberately reserved for floating surfaces only (dropdown/select/popover), never used on static cards. This contradicts part of the brief's assumption — the primitive layer isn't the problem.
- **The real issue is composition, not primitives**: list rows across the app (recent applications, recent applicants, match cards, kanban cards) are all hand-built as `rounded-lg border border-border p-3` divs rather than a shared `ListRow`/`Card` pattern, so they *look* similar enough to read as repetitive/generic even though they're not literally the same component — there's no single source of truth for "a compact info row," so every page reinvents it slightly differently.
- **`StatCard`** (`components/dashboard/stat-card.tsx`) renders four large, equal-weight cards per page — exactly the "four huge cards" pattern the brief wants replaced with a compact horizontal metric strip.
- **Desktop has no account/logout affordance in the header** — the account dropdown in `header.tsx` is `md:hidden` (mobile-only); on desktop, logout only exists in the sidebar footer. Fine functionally, but means the header does nothing but hold a theme toggle on desktop.

## Design Issues

- **Color tokens are close to the new spec but not identical** — current `--background`/`--card` are `#fafafa`/`#ffffff` (page slightly gray, cards white); the new spec wants the *opposite emphasis* (`Background #FFFFFF`, `Surface #FAFAFA` as a secondary tone, `Card #FFFFFF`). Dark-mode border is currently `#303035`; the spec's is `#27272A`. Small deltas, worth aligning for a crisper, more "Stripe/Linear-white" feel rather than the current slightly-gray canvas.
- **No explicit hover/light accent tokens** — the primary button's hover state is `bg-primary/80` (opacity trick) rather than a distinct `#4F46E5` hover color; there's no `--primary-light` (`#EEF2FF`) token for things like active-nav backgrounds, which currently reuse `bg-primary/10` (visually close but not the precise, documentable token the brief wants).
- **Radius/shadow discipline is already good** (see appendix) — `rounded-lg` dominates interactive elements, `rounded-xl` is reserved for Card-level containers, shadows only appear on 5 floating-surface files. The brief's complaint about "excessive rounded corners/shadows" doesn't hold up against the actual grep evidence; no changes needed there beyond the radius *scale* values (currently sm=6px/md=8px/lg=10px/xl=14px vs. the brief's requested sm=6/md=10/lg=14 — close but worth exact-aligning).

## Recommended Improvements (before implementing)

1. Add a small typographic scale (Display/H1/H2/H3/Body/Small) as shared `Heading`/`Text`-style utilities or a `PageHeader` component, and actually use `font-mono` for every stat/score/count value.
2. Add a `max-w-[1440px]` page container with responsive padding (16/24/32-40px) in the dashboard layout.
3. Wire the header's title slot for real (or remove it and rely on in-content headings consistently — decided in the plan below) and add a desktop account menu.
4. Group the sidebar nav into labeled sections.
5. Realign color tokens to the new spec's exact values (background/surface swap, dark border, radius scale) and add explicit hover/light accent tokens.
6. Replace the 3-4-huge-card dashboard stat grids with a compact horizontal metric strip. **Implemented:** `MetricStrip` now uses a quiet divided rail and smaller metric treatment.
7. Introduce one shared compact "list row" pattern used consistently for recent applications/applicants/matches instead of each page hand-rolling its own bordered div. **Implemented for job and match results:** `InteractiveListCard` is now the shared result surface; dashboard/application rows remain intentionally plain because they are nested list items.

## Two conflicts between the new design brief and the real backend (resolved in favor of the backend — see the plan)

1. **Kanban columns**: the brief specifies `Interested / Applied / Interview / Offer / Rejected`. The real, backend-enforced statuses (`types/application.ts`, confirmed against `FRONTEND_API_INTEGRATION.md`) are exactly `pending, under review, shortlisted, interview, rejected, withdrawn` — six values, different names, and `PATCH /applications/:jobId/:applicantId/status` will reject anything else. **The redesign keeps the six real statuses** and applies the brief's *visual* treatment (compact cards, clean columns) to them, rather than inventing a column set the API doesn't support.
2. **Dashboard "Resume Score: 86"**: no such field exists anywhere in the backend (`MISSING_BACKEND_FEATURES.md` #2 — deliberately not implemented, no scoring concept exists). **This metric will not be fabricated.** The existing client-computed "profile strength" heuristic (`app/(dashboard)/profile/page.tsx`, a real 5-point checklist over real profile fields — skills present, experience present, education present, certifications present, resume processed) is kept and reused for this purpose, relabeled "Profile Completeness" to avoid implying it's an AI-derived score like `matchScore` genuinely is.

## Appendix: grep evidence for the "consistency" claims above

| Pattern | Occurrences (files) | Where |
|---|---|---|
| `space-y-*` | 82 (34 files) | Dominant vertical-rhythm pattern, used almost everywhere |
| `gap-3` / `gap-4` | 30 (21) / 40 (20) | Dominant row/grid gap |
| `rounded-lg` | 34 (22) | Buttons, inputs, list rows, dropzones, kanban cards |
| `rounded-xl` | 10 (10) | Reserved for `Card` and table wrappers only |
| `rounded-full` | 21 (12) | Avatars, score rings, status dots only |
| `shadow*` | 6 (5 files) | Only dropdown-menu/select/popover/tabs/tag-input — never on static cards |
| `font-mono` | 0 | Never used despite being loaded and mapped |
