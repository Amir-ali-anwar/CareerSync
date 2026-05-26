# CareerSync Backend - Features Documentation

## Overview
CareerSync is a job portal API that connects **Talents** (job seekers) with **Employers** (recruiters) and **Organizations**.

**Tech Stack:** Node.js, Express.js, MongoDB (Mongoose), JWT Authentication

---

## 🔐 Authentication Module

### Endpoints: `/api/v1/auth`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new user (talent/employer) | Public |
| POST | `/login` | Login with email & password | Public |
| GET | `/logout` | Logout user (clear cookies) | Public |
| GET | `/verify-Email` | Verify email with token | Public |
| POST | `/resend-verification` | Resend verification email | Public |
| PATCH | `/updateUser` | Update user profile | Authenticated |
| PATCH | `/updateUserPassword` | Change password | Authenticated |
| GET | `/showCurrentUser` | Get current user info | Authenticated |

### Features:
- ✅ Email verification with expiring tokens (10 min)
- ✅ Password hashing with bcrypt
- ✅ JWT tokens stored in httpOnly signed cookies
- ✅ Refresh token rotation
- ✅ Rate limiting (5 login attempts/min, 10 registrations/hour)
- ✅ Role-based registration (talent vs employer)
- ✅ Employer-specific fields (companyName, companySize, industry)

---

## 💼 Jobs Module

### Endpoints: `/api/v1/jobs`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new job posting | Employer |
| GET | `/` | Get all jobs (with filters) | Employer |
| GET | `/:id` | Get single job by ID | Employer |
| PATCH | `/:id` | Update job | Employer |
| DELETE | `/:id` | Delete job | Employer |
| PATCH | `/:jobId/close` | Close job (stop applications) | Employer |
| POST | `/applyForJob/:id` | Apply for a job | Talent |
| GET | `/myApplications` | Get user's applications | Talent |

### Features:
- ✅ Job CRUD operations
- ✅ Job types: full-time, part-time, internship
- ✅ Job statuses: pending, interview, declined
- ✅ Application deadline enforcement
- ✅ Job closing functionality
- ✅ Search & filtering (by status, type, search term)
- ✅ Sorting (newest, oldest, a-z, z-a)
- ✅ Pagination support
- ✅ Permission checks (only job creator can modify)

---

## 📝 Job Applications Module

### Endpoints: `/api/v1/applications`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/:jobId` | Get applications for a job | Employer |
| PATCH | `/:jobId/:applicantId/status` | Update application status | Employer |
| PATCH | `/:id/withdraw` | Withdraw application | Talent |
| GET | `/my-applications` | Get my applications | Talent |

### Features:
- ✅ CV upload (PDF, DOC, DOCX)
- ✅ Cover letter, portfolio, LinkedIn profile
- ✅ Skills and experience level tracking
- ✅ Application statuses: pending, under review, shortlisted, interview, rejected
- ✅ Withdrawal only allowed before decision made
- ✅ Duplicate application prevention
- ✅ Rejected applicant re-application blocked

### Application Fields:
- CV (required)
- Cover Letter
- Portfolio URL
- LinkedIn Profile
- Skills (array)
- Experience Level (beginner/intermediate/expert)
- Availability
- Location Preferences
- References

---

## 👥 Talents Module

### Endpoints: `/api/v1/talents`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all talents who applied | Employer |
| GET | `/:talentId` | Get talent by ID | Employer |
| GET | `/export` | Export applications to CSV | Employer |

### Features:
- ✅ View all applicants for employer's jobs
- ✅ Individual talent profile viewing
- ✅ CSV export of applications with:
  - Talent name, email, phone
  - Job title, position, company
  - Application status, date

---

## 🏢 Organizations Module

### Endpoints: `/api/v1/organization`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create organization | Employer |
| GET | `/` | Get my organizations | Employer |
| PATCH | `/:id` | Update organization | Employer |
| DELETE | `/:id` | Delete organization | Employer |
| GET | `/public` | List all public organizations | Public |
| GET | `/public/:id` | Get single public organization | Public |
| POST | `/:id/follow` | Follow organization | Talent |
| GET | `/:id/followers` | Get organization followers | Employer |
| GET | `/:id/is-following` | Check if following | Talent |
| GET | `/public-organizations/:id/followers/count` | Get follower count | Public |

### Features:
- ✅ Organization CRUD
- ✅ Max 4 organizations per employer
- ✅ Company profiles with:
  - Logo, website, description, mission, culture
  - Industry, company size, HQ location
  - Social links (LinkedIn, Twitter, Facebook, Glassdoor)
  - Office photos, cover image, intro video
  - Awards, founding year
- ✅ Organization types: Private, Public, Non-Profit, Startup, Government
- ✅ Follow/unfollow functionality for talents
- ✅ URL validation for website and social links

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT with signed httpOnly cookies |
| Password Security | bcrypt hashing with salt |
| Rate Limiting | Express-rate-limit (login, register, verification) |
| Input Validation | Mongoose validators, custom validation |
| CORS | Configurable origin with credentials |
| Error Handling | Centralized error middleware |
| Permissions | Role-based + resource ownership checks |

---

## 🛠️ Middleware Stack

| Middleware | Purpose |
|------------|---------|
| `auth.js` | JWT verification, user extraction |
| `permissions.js` | Role authorization & resource ownership |
| `rateLimiter.js` | Rate limiting for auth endpoints |
| `fileuploader.js` | Multer-based CV upload |
| `error-handler.js` | Centralized error responses |
| `not-found.js` | 404 handler |

---

## 📊 Data Models

### User
- name, lastName, email, password, phone
- location (country, city)
- role (talent/employer)
- profileImage (auto-generated avatar)
- verification fields (token, expiry, status)
- employer fields (company name, size, industry)

### Job
- company, title, position
- jobType, jobStatus, jobLocation
- applicationDeadline, isClosed
- createdBy (employer reference)
- applicants (embedded array)

### JobApplication
- job, talent references
- cv, coverLetter, portfolio, linkedInProfile
- skills, experienceLevel, availability
- status, appliedAt

### Organization
- name, logo, website, emailDomain
- description, mission, culture
- industry, companySize, hqLocation
- socialLinks, locations
- followers, createdBy

### Token
- refreshToken, ip, userAgent
- user reference, isValid

---

## 📧 Email Features

- ✅ Verification email on registration
- ✅ Resend verification capability
- ✅ Configurable email via Nodemailer
- ✅ Mailgen for email templates

---

## 📖 API Documentation

- ✅ Swagger/OpenAPI documentation
- ✅ Available at `/api-docs`
- ✅ Interactive API explorer
- ✅ All endpoints documented with schemas

---

## 🚀 Production Ready Features

- ✅ CORS configuration with credentials
- ✅ MongoDB connection error handling (exits on failure)
- ✅ Environment variable support
- ✅ Request logging (Morgan)
- ✅ Docker support (Dockerfile included)
- ✅ Git-ignored sensitive files (.env)

---

## 📁 Project Structure

```
server/
├── app.js                 # Express app entry point
├── config/
│   └── swagger.js         # Swagger configuration
├── controllers/
│   ├── authController.js
│   ├── jobController.js
│   ├── jobApplicationController.js
│   ├── talentController.js
│   └── organizationController.js
├── db/
│   └── connect.js         # MongoDB connection
├── errors/
│   ├── CustomAPIError.js
│   ├── bad-request.js
│   ├── not-found.js
│   └── unAuthenticated.js
├── middlewares/
│   ├── auth.js
│   ├── permissions.js
│   ├── rateLimiter.js
│   ├── fileuploader.js
│   ├── error-handler.js
│   └── not-found.js
├── models/
│   ├── User.js
│   ├── JobsModal.js
│   ├── JobApplicationModal.js
│   ├── OrganizationModal.js
│   └── Token.js
├── routes/
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── jobApplicationRoutes.js
│   ├── talentRoutes.js
│   └── OrganizationRoutes.js
└── utils/
    ├── constants.js
    ├── createTokenUser.js
    ├── embedding.js
    ├── jwt.js
    ├── mailConfig.js
    └── sendVerificationEmail.js
```

---

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URL=<mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:3000
```

---

*Documentation generated on May 24, 2026*
