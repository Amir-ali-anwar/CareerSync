# CareerSync — Component Guidelines

Practical rules for adding to or modifying the frontend, so it stays consistent with `DESIGN_SYSTEM.md`. See `UI_AUDIT.md` for the reasoning behind each rule.

## Page titles

Never write `<h1>Some Title</h1>` directly in a dashboard page again. Instead:

```tsx
usePageHeader("Jobs", "Manage your job postings and review applicants."); // once, near the top of the component
// ...
<MobilePageHeader /> // once, near the top of the returned JSX
```

`usePageHeader` feeds the persistent desktop `Header`; `MobilePageHeader` renders the same title/description on mobile, where the header collapses to just the logo. If the title is dynamic (job name, candidate name), call `usePageHeader` unconditionally with a sensible fallback (`job?.title || "Job"`) — hooks can't be called conditionally, but the *value* can update once data loads.

This only applies inside `(dashboard)/*` (wrapped by `PageHeaderProvider`). Standalone pages (auth, public organizations, landing) keep their own in-content `<h1>` at the H1 tier (`text-3xl font-semibold tracking-tight`) since there's no shared header there.

## Cards vs. plain rows

- Use `<Card>` for a genuinely distinct, self-contained block of content with its own heading (e.g. "Recent Applications", "Job Description").
- Use a plain `rounded-lg border border-border p-3` row for a single list item inside a card or list (a recent application, a kanban card, an applicant row). Don't nest a `<Card>` inside a `<Card>`.
- Use `<Card size="sm">` for list-style content that reads better dense (job cards, match cards) — 12px padding instead of 16px.

## Metrics

Use `MetricStrip` + `MetricItem` (`components/dashboard/stat-card.tsx`) for any row of top-level counts. The strip is a compact, divided rail: values stay `font-mono tabular-nums`, icon accents remain semantic, and the items do not lift, glow, or cast shadows. Add a new `accent` variant there rather than hand-styling a one-off metric card.

## Interactive result rows

Use `InteractiveListCard` (`components/common/interactive-list-card.tsx`) for linked job and match results. It centralizes dense card spacing and hover treatment; do not reimplement those classes in each result component.

## Buttons

- `default` for the one primary action per view.
- `outline` for secondary actions that need visual weight (export, close).
- `ghost` for low-emphasis icon-only actions (theme toggle, collapse sidebar).
- `destructive` only behind an `AlertDialog` confirmation — never a bare destructive button with no confirmation step.
- Loading: `disabled={mutation.isPending}` + change the label to an in-progress phrase ("Saving…"). Don't add a spinner icon unless the button has no text.

## Forms

Always `react-hook-form` + `zod`, validation rules matching the backend's own constraints exactly (see `FRONTEND_API_INTEGRATION.md`). Wrap every field in the shared `FormField` (label, required marker, inline error, optional hint) — never a bare `<Input>` with a hand-written error `<p>` next to it.

## Status badges

`ApplicationStatusBadge` only ever renders the six real, backend-supported values: `pending, under review, shortlisted, interview, rejected, withdrawn`. **Never rename, relabel, or add a status this component doesn't already support** — the backend's `PATCH /applications/:jobId/:applicantId/status` will reject anything else, and the Kanban board's columns are generated directly from `MUTABLE_APPLICATION_STATUSES` for the same reason. If a design reference (or a future brief) suggests different column names, that's a visual-only reskin of the same six values, never a rename.

## Empty / loading / error states

Every data-driven view needs all three, using the shared `Loading`, `EmptyState`, `ErrorState` components — never a blank container while `isLoading`, never a raw thrown error, never an empty `<Table>` with no rows and no explanation.

## Don't fabricate data

If a number or label isn't backed by a real API field (or a documented, honest client-side computation over real fields — like `profileStrength`'s five-point checklist), don't add it. Check `MISSING_BACKEND_FEATURES.md` before inventing a metric; if the backend genuinely doesn't support it, that file is where it gets proposed, not the UI.

## Tokens, not hardcoded colors

Never write `bg-indigo-50`, `#6366f1`, or similar literals in a component. Use the semantic tokens (`bg-primary-light`, `text-primary`, `border-border`, `bg-surface`) — they're the only thing that makes light/dark mode and future re-theming work without touching every file.
