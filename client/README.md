# CareerSync Frontend

A production-grade Next.js frontend for **CareerSync** — an AI-powered, two-sided job-board marketplace connecting talent (job seekers) with employers. Built directly against the real `server/` API; see [`FRONTEND_API_INTEGRATION.md`](../FRONTEND_API_INTEGRATION.md) at the repo root for the full endpoint reference and [`MISSING_BACKEND_FEATURES.md`](../MISSING_BACKEND_FEATURES.md) for documented backend gaps.

## Tech stack

- **Next.js 15** (App Router, TypeScript, `src/` directory)
- **Tailwind CSS v4** with a custom design-token theme (light/dark, indigo AI accent)
- **shadcn/ui** (Base UI primitives under the hood) for the component library
- **TanStack Query** for all server state, caching, and mutations
- **Zustand** for minimal client UI state (sidebar/mobile nav)
- **React Hook Form + Zod** for form state and validation
- **Axios** for the HTTP client, with a cookie-based auth interceptor (401 → refresh-token → retry)
- **next-themes**, **Sonner** (toasts), **Framer Motion** (subtle landing-page motion), **Recharts** (dashboard charts), **Lucide** (icons)
- **Vitest + Testing Library** for unit/component tests

## Setup

```bash
cd client
npm install
cp .env.example .env.local   # adjust NEXT_PUBLIC_API_URL if the backend runs elsewhere
```

The backend (`server/`) must be running separately — see its own README/`.env.example`. This frontend expects it at `http://localhost:4000` by default, and the backend's `CLIENT_URL` must point back at `http://localhost:3000` for CORS + cookie auth to work.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL of the CareerSync backend API (no `/api/v1` suffix — the API client appends it) |

## Running

```bash
npm run dev      # start the dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npm run test     # Vitest unit/component tests
```

## Project structure

```
src/
  app/
    (auth)/          # login, register, verify-email — split branding/form layout
    (dashboard)/      # dashboard, jobs, matches, applications, organization, settings, talents/[id]
    organizations/    # public organization directory + detail (unauthenticated-friendly)
    page.tsx          # marketing landing page
  components/
    ui/               # shadcn/ui primitives
    common/           # Sidebar, Header, MobileNav, EmptyState, ErrorState, StatusBadge, MatchScoreRing, ...
    jobs/ matches/ applications/ organizations/ dashboard/ landing/
  hooks/              # TanStack Query hooks, one module per resource
  lib/
    api/              # axios client + one thin module per backend resource
    validation/       # Zod schemas matching backend validation exactly
    utils.ts
  providers/          # ThemeProvider, QueryProvider, AuthProvider
  store/              # Zustand UI store
  types/              # TypeScript types mirroring backend request/response shapes
  constants/
  middleware.ts       # edge-level auth-cookie presence check for protected routes
```

## API integration

Every network call goes through `src/lib/api/*` (one file per backend resource: `auth`, `jobs`, `applications`, `organizations`, `talents`, `matches`), wrapped by TanStack Query hooks in `src/hooks/`. No component calls `fetch`/`axios` directly. Auth is cookie-based (httpOnly, `credentials: 'include'`) — there is no bearer token anywhere in this app, matching the backend exactly. See `FRONTEND_API_INTEGRATION.md` for the full endpoint-by-endpoint mapping, and `MISSING_BACKEND_FEATURES.md` for backend capabilities the UI deliberately does not fake (standalone resume/profile management, a batched matches endpoint, password reset, account deletion, and more).

## Two roles, two experiences

The backend is a real two-sided marketplace, not a single-persona app — the UI branches by `role` from `GET /auth/showCurrentUser`:

- **Talent**: Dashboard, Profile (skills/experience/education/preferences + resume upload), Jobs (browse + semantic search + apply), Matches (AI-ranked, server-side), Applications (track + withdraw), Settings (account, password, danger zone).
- **Employer**: Dashboard, Jobs (post/manage + review applicants), Applications (talent pool, table + Kanban, CSV export), Organization (company profile CRUD), Settings.

Also public, unauthenticated: `/forgot-password`, `/reset-password`.

## Testing

`npm run test` runs a focused Vitest suite: the API error normalizer, auth form validation (matching backend rules exactly), and two critical shared components (status badges, match score rendering). This intentionally isn't exhaustive — see the brief's own guidance against over-testing.
