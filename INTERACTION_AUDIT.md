# CareerSync Interaction Audit

Validation date: 2026-09-13

| Surface | Interaction | Expected | Evidence / actual result | Status |
|---|---|---|---|---|
| Landing header | CareerSync logo | Navigate home | Link to `/` exists | Working by source |
| Landing header | Features / How it works | Scroll to sections | Hash links exist | Working by source |
| Landing header | Organizations | Open public organizations | Link to `/organizations` exists | Working by source |
| Landing header | Sign in / Get started | Open auth pages | Links to `/login` and `/register` | Working in browser snapshot |
| Landing hero / CTA | Get started | Open registration | Link exists and register page loaded | Working |
| Register | Submit form | Register, show errors, redirect/verify | React Hook Form + API mutation present | Source-integrated; browser submit not run without test data |
| Login | Submit form | Login, handle 2FA response, redirect | Auth mutation and protected route gate present | Source-integrated; external credential flow not run |
| Auth pages | OTP inputs | Verify/resend/reset | Forms and API methods exist | Working by source |
| Dashboard shell | Sidebar links | Navigate role-specific pages | Role-based nav groups and active state exist | Working by source |
| Dashboard shell | Logout | Revoke session and redirect | Sidebar/header logout mutation exists | Working by source |
| Dashboard shell | Theme toggle | Persist theme | Theme provider/toggle exists | Working by source |
| Dashboard shell | Notifications | Open/read notifications | Notification bell and mutations exist | Working by source |
| Dashboard shell | Mobile navigation | Navigate on small viewport | Bottom nav exists below `md` | Source present; visual mobile run not completed |
| Jobs | Search/filter controls | Query API and show loading/error/empty | Talent and employer views use query hooks | Working by source |
| Jobs | Semantic search | Query semantic endpoint and render results | Semantic query path and UI exist | Working by source; provider mode caveat in mock audit |
| Jobs | Job card | Open job detail | Link to `/jobs/:id` exists | Working by source |
| Jobs | Save/follow-like actions | Persist action | No generic job-save action identified | Not implemented / not claimed |
| Job detail | Apply | Upload CV and submit application | Multipart dialog and mutation exist | Source-integrated; real file flow not browser-tested |
| Job detail | Match panel | Fetch/display match score | `useJobMatch` and panel exist | Working by source |
| Job detail | Match explanation | Show why match | Backend exists, no client hook/UI | Missing |
| Job detail | Skill gap | Show roadmap | Backend exists, no client hook/UI | Missing |
| Profile | Edit/save | Persist candidate fields | Form + PATCH mutation exists | Working by source |
| Profile | Resume upload | Upload and refresh profile | Upload mutation exists | Working by source; async result visibility incomplete |
| Applications | Table | Render data, download CV, withdraw | Controls and mutations exist | Working by source |
| Applications | Kanban status movement | Persist status change | Status mutation exists; drag/drop browser path not validated here | Partial validation |
| Organization | Create/edit/delete | Persist organization changes | Form/dialog/API hooks exist | Working by source |
| Organization | Follow | Persist follow state | Talent public organization flow exists | Working by source |
| Settings | Account/password/delete | Persist changes and confirm deletion | Forms and alert dialog exist | Working by source |
| Settings | 2FA management | Setup/verify/disable and show backup codes | No UI or hooks | Missing |
| Settings | Session management | List/revoke devices | No UI or hooks | Missing |

## Browser-observed issue

The public landing/register page loaded successfully at `http://localhost:3000`, but the browser console emitted Base UI warnings: components configured as native buttons are being rendered through non-button elements in several landing-page `Button` usages. This is an accessibility risk and should be fixed by using a real `<button>` in the render prop or setting `nativeButton={false}` when the rendered element is a link.

## Validation caveat

Authenticated interactions were not fully exercised because no test account/session was supplied and the backend run did not expose a stable browser API URL/session for manual login. Source-level loading, error, empty, and mutation states were inspected where present.
