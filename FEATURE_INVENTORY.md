# CareerSync Feature Inventory

Validation date: 2026-09-13

Status is based on implementation evidence and available automated validation. A feature is only marked Complete when backend, persistence/processing, frontend access, user feedback, and tests are all present.

| Feature | Backend API | Frontend | Database / processing | Status | Evidence / gap |
|---|---|---|---|---|---|
| Registration | Yes | Yes | Yes | Complete | Auth routes, register page, auth tests |
| Email verification | Yes | Yes | Yes | Complete | OTP verification and resend flow |
| Login / logout | Yes | Yes | Yes | Complete | Cookie auth, protected layout, auth tests |
| Refresh token rotation | Yes | Client refresh interceptor | Token persistence | Complete | Client API tests plus backend auth coverage |
| Password reset | Yes | Yes | Yes | Complete | Forgot/reset pages and backend tests |
| Profile update | Yes | Yes | Yes | Complete | Settings form and PATCH endpoint |
| Password change | Yes | Yes | Yes | Complete | Settings form and validation |
| Account deletion | Yes | Yes | Cascade | Complete | Settings confirmation flow |
| Two-factor setup / disable | Yes | No | Yes | Partial | Backend and tests exist; no settings UI or backup-code acknowledgement |
| Session / device management | Yes | No | Yes | Backend Only | Routes and controller exist; no client API, hook, or UI |
| Resume upload | Yes | Yes | File storage | Complete | Candidate profile upload and application upload flows |
| Resume processing | Yes | Partially surfaced | Async profile update | Partial | Processing exists; status/error/result visibility is incomplete |
| Resume text extraction | Yes | Indirect | Yes | Partial | Service and tests exist; extracted state is not clearly surfaced in UI |
| Candidate profile CRUD | Yes | Yes | Yes | Complete | Profile page, API, persistence |
| Job CRUD | Yes | Yes | Yes | Complete | Employer pages, route/controller/model tests |
| Job intelligence extraction | Yes | No visible result panel | JobProfile | Partial | Async processing exists; extracted intelligence/status is not surfaced consistently |
| Plain job search | Yes | Yes | Yes | Complete | Talent jobs search and query hooks |
| Semantic job search | Yes | Yes | Embeddings | Partial | End-to-end code exists; runtime uses fake embeddings without OpenAI key |
| Match score | Yes | Yes | Candidate/JobProfile | Complete* | Integrated score display; *provider-backed semantic component may be deterministic fake mode |
| Match explanation | Yes | No | Derived | Backend Only | Both backend endpoints and tests exist; no frontend hook/UI |
| Skill-gap analysis | Yes | No | Derived | Backend Only | Service, route, and tests exist; no frontend hook/UI |
| Applications | Yes | Yes | Yes | Complete | Apply, list, status update, withdraw, CV access |
| Kanban applications | Yes | Yes | Yes | Partial | Status updates are integrated; end-to-end drag interaction needs browser validation |
| Organizations | Yes | Yes | Yes | Complete | Employer CRUD, public listing, follow flow |
| Talent directory | Yes | Yes | Yes | Partial | Listing/detail are integrated; CSV export endpoint is not exposed in UI |
| Notifications | Yes | Yes | Yes | Complete | List, mark read, mark all read, realtime hook |
| Google authentication | Yes | Present in API | Yes | Partial | Backend/client API support exists; browser OAuth provider flow not validated here |
| Health / readiness | Yes | N/A | N/A | Complete | Public liveness/readiness routes |

## Key conclusion

The core account, profile, job, application, organization, and notification workflows are implemented. Advanced backend capabilities are ahead of the frontend: 2FA management, sessions, match explanations, skill-gap analysis, and processing-status presentation remain incomplete from a user-flow perspective.
