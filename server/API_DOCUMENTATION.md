# CareerSync API Documentation

## Overview

CareerSync is a comprehensive job portal API that connects talent (job seekers) with employers and organizations. This API provides endpoints for user authentication, job management, organization profiles, and application tracking.

## Base URL

- **Development**: `http://localhost:4000`
- **Production**: `https://api.careersync.com`

## API Documentation

The complete interactive API documentation is available at:
- **Swagger UI**: `http://localhost:4000/api-docs`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Tokens are stored in httpOnly cookies for security.

### Authentication Flow

1. **Register**: Create a new account with email verification
2. **Login**: Authenticate with email and password
3. **Access Protected Routes**: Include authentication token in requests
4. **Logout**: Clear authentication tokens

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register a new user | No |
| POST | `/login` | Login user | No |
| GET | `/logout` | Logout user | No |
| GET | `/verify-Email` | Verify email address | No |
| PATCH | `/updateUser` | Update user profile | Yes |
| GET | `/showCurrentUser` | Get current user info | Yes |
| PATCH | `/updateUserPassword` | Update password | Yes |
| POST | `/resend-verification` | Resend verification email | No |

### Jobs (`/api/v1/jobs`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/` | Create job posting | Yes | Employer |
| GET | `/` | Get all jobs (with filters) | Yes | Employer |
| GET | `/:id` | Get specific job | Yes | Employer |
| PATCH | `/:id` | Update job | Yes | Employer |
| DELETE | `/:id` | Delete job | Yes | Employer |
| POST | `/:id/apply` | Apply for job | Yes | Talent |
| GET | `/my-applications` | Get user's applications | Yes | Talent |
| PATCH | `/:jobId/close` | Close job for applications | Yes | Employer |

### Organizations (`/api/v1/organization`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/` | Create organization | Yes | Employer |
| GET | `/` | Get user's organizations | Yes | Employer |
| PATCH | `/:id` | Update organization | Yes | Employer |
| DELETE | `/:id` | Delete organization | Yes | Employer |
| POST | `/:id/follow` | Follow organization | Yes | Talent |
| GET | `/:id/followers` | Get organization followers | Yes | Employer |
| GET | `/:id/is-following` | Check if following | Yes | Talent |
| GET | `/public` | Get all public organizations | No | - |
| GET | `/public/:id` | Get public organization | No | - |

### Job Applications (`/api/v1/applications`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/:jobId` | Get job applications | Yes | Employer |
| PATCH | `/:jobId/:applicantId/status` | Update application status | Yes | Employer |
| PATCH | `/:id/withdraw` | Withdraw application | Yes | Talent |
| GET | `/my-applications` | Get user's applications | Yes | Talent |

### Talents (`/api/v1/talents`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all talents | Yes | Employer |
| GET | `/:talentId` | Get talent by ID | Yes | Employer |
| GET | `/export` | Export applications to CSV | Yes | Employer |

## Data Models

### User
```json
{
  "_id": "string",
  "name": "string",
  "lastName": "string",
  "email": "string",
  "profileImage": "string",
  "location": {
    "country": "string",
    "city": "string"
  },
  "role": "talent" | "employer",
  "phone": "string",
  "isVerified": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Job
```json
{
  "_id": "string",
  "company": "string",
  "title": "string",
  "position": "string",
  "jobStatus": "pending" | "interview" | "declined",
  "jobType": "full-time" | "part-time" | "internship",
  "jobLocation": {
    "country": "string",
    "city": "string"
  },
  "applicationDeadline": "datetime",
  "isClosed": "boolean",
  "createdBy": "string",
  "applicants": "array",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Organization
```json
{
  "_id": "string",
  "name": "string",
  "description": "string",
  "industry": "string",
  "companySize": "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+",
  "hqLocation": "string",
  "website": "string",
  "emailDomain": "string",
  "hiringContactEmail": "string",
  "socialLinks": {
    "linkedin": "string",
    "twitter": "string",
    "facebook": "string",
    "glassdoor": "string"
  },
  "followers": "array",
  "createdBy": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Job Application
```json
{
  "_id": "string",
  "job": "string",
  "talent": "string",
  "status": "pending" | "under review" | "shortlisted" | "interview" | "rejected",
  "cv": "string",
  "coverLetter": "string",
  "portfolio": "string",
  "linkedInProfile": "string",
  "skills": "array",
  "experienceLevel": "beginner" | "intermediate" | "expert",
  "appliedAt": "datetime",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

```json
{
  "msg": "Error message",
  "error": "Detailed error information"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting on authentication endpoints:

- **Register**: 5 requests per 15 minutes
- **Login**: 5 requests per 15 minutes
- **Resend Verification**: 3 requests per 15 minutes

## File Uploads

The API supports file uploads for CVs and documents:

- **Supported formats**: PDF, DOC, DOCX
- **Max file size**: 10MB
- **Upload endpoint**: `/api/v1/jobs/:id/apply`
- **File field**: `cv`

## Security Features

- JWT-based authentication with httpOnly cookies
- Password hashing with bcrypt
- Email verification required
- Role-based access control
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- CORS protection

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   SALT_ROUNDS=10
   NODE_ENV=development
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Testing the API

1. Start the server
2. Visit `http://localhost:4000/api-docs` for interactive documentation
3. Use the Swagger UI to test endpoints
4. Or use tools like Postman or curl

## Examples

### Register a New User

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "location": {
      "country": "United States",
      "city": "New York"
    },
    "role": "talent",
    "phone": "+1234567890"
  }'
```

### Create a Job Posting

```bash
curl -X POST http://localhost:4000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_jwt_token" \
  -d '{
    "title": "Senior Software Engineer",
    "company": "Tech Corp",
    "position": "Software Engineer",
    "jobType": "full-time",
    "jobLocation": {
      "country": "United States",
      "city": "San Francisco"
    },
    "description": "We are looking for a senior software engineer..."
  }'
```

### Apply for a Job

```bash
curl -X POST http://localhost:4000/api/v1/jobs/job_id/apply \
  -H "Cookie: accessToken=your_jwt_token" \
  -F "cv=@resume.pdf" \
  -F "coverLetter=I am excited to apply for this position..." \
  -F "skills=JavaScript,React,Node.js"
```

## Support

For support and questions, please contact:
- Email: support@careersync.com
- Documentation: Visit `/api-docs` endpoint

## License

This project is licensed under the MIT License.
