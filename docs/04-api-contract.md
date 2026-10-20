# API contract

Base path: `/api/v1`. JSON requests use `Content-Type: application/json`; protected requests use `Authorization: Bearer <token>`. Resume upload uses multipart form data. IDs are MongoDB ObjectIds (24-character hexadecimal strings). Reject unknown write fields and validate inputs before services execute.

Single success: `{ "data": { ... } }`. List success: `{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`.

Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": [{ "field": "email", "message": "Invalid email" }] } }`. Details are optional.

Status codes: 200 read/update/login, 201 create, 400 invalid input, 401 missing/invalid token, 403 wrong role, 404 missing or inaccessible owned resource, 409 duplicate/invalid transition/stale version/closed job, 413 upload too large, 415 unsupported file, 429 rate limited, 500 unexpected failure. Never return passwordHash, storageKey, or filesystem paths.

Resume uploads accept exactly one multipart file field named file, with no extra form fields. They are limited to 10 attempts per 15 minutes per IP and four active handlers per process; overload returns 503 UPLOAD_BUSY. Downloads allow the candidate owner or the employer whose job has an application linked to that resume.

## Endpoints

| Method and path | Access | Input / behavior |
| --- | --- | --- |
| GET /health | Public | Basic service health, no secrets |
| POST /auth/register | Public | email, password, role, fullName (candidate) or companyName (employer); returns token and safe user; 201 |
| POST /auth/login | Public | email, password; returns token and safe user; generic invalid-credentials error |
| GET /auth/me | Authenticated | Safe user and matching profile |
| PATCH /candidates/me | Candidate | fullName?, headline?, location?, bio? |
| PATCH /employers/me | Employer | companyName?, description?, website?, location? |
| GET /jobs | Public | Open jobs only; filters below |
| GET /jobs/:jobId | Public | Public details including company and OPEN/CLOSED status |
| POST /jobs | Employer | title, description, location, employmentType, workMode; starts OPEN; 201 |
| GET /employers/me/jobs | Employer | Own jobs including closed; paginated |
| PATCH /jobs/:jobId | Owning employer | Any job content fields and/or status OPEN/CLOSED |
| POST /resumes | Candidate | multipart field `file`; PDF only; max 5 MiB; returns metadata; 201 |
| GET /resumes/me | Candidate | Own metadata; paginated |
| GET /resumes/:resumeId/download | Owner or linked reviewing employer | Streams PDF as attachment; no public static file URL |
| POST /jobs/:jobId/applications | Candidate | resumeId, coverLetter?; returns application; 201 |
| GET /applications/me | Candidate | Own applications with job/company summary; optional status filter; paginated |
| GET /jobs/:jobId/applications | Owning employer | Applicants with candidate summary and resume metadata; optional status filter; paginated |
| GET /applications/:applicationId | Candidate owner or owning employer | Application detail with job summary and authorized resume link |
| PATCH /applications/:applicationId/status | Owning employer | status, version; enforces lifecycle and optimistic concurrency |
| GET /notifications/me | Employer | Own notifications; optional unread=true/false; paginated |
| PATCH /notifications/:notificationId/read | Owning employer | No body; sets readAt once; repeat is a success |

All list endpoints accept `page` (default 1) and `limit` (default 20, max 100). Sort by createdAt descending, then id descending for stable ordering. Public job search also accepts `q`, `location`, `employmentType`, and `workMode`. Keyword matches title or description; location is a case-insensitive substring; enum filters are exact. Combine different filters with AND. Blank text filters are ignored; invalid enum values return 400.

Job-list page values are capped at 10000, keyword length at 200, and location length at 160. Unsupported query fields are rejected. Text filters match literal input, including regex punctuation.

## Validation boundaries

Trim user text, normalize email, and leave password bytes unchanged. Email max 254 characters. Password 8–72 UTF-8 bytes for bcrypt. Names max 120 characters, job title max 160, location max 160, headline max 200, bio/company description max 5,000, job description 20–20,000, cover letter max 5,000. Required text must be nonblank. Website must be an HTTP(S) URL. PATCH must contain at least one supported field. Version is a positive integer. Never accept owner IDs from request bodies.

## Example journey

Register employer:
```json
{ "email": "employer@example.com", "password": "DemoPassword123!", "role": "EMPLOYER", "companyName": "Example Ltd" }
```

Create a job with that token:
```json
{ "title": "Junior Backend Developer", "description": "Build and maintain Node.js APIs with our engineering team.", "location": "Lagos, Nigeria", "employmentType": "FULL_TIME", "workMode": "HYBRID" }
```

Register a candidate with fullName, log in, upload a PDF, and submit its returned ID:
```json
{ "resumeId": "<resume ObjectId>", "coverLetter": "I would like to join your backend team." }
```

Application response fields: id, jobId, candidateId, resumeId, coverLetter, status, version, createdAt, updatedAt. Initial status is SUBMITTED and version is 1. Related summaries are included on read endpoints as described in the table. Resume metadata fields: id, originalName, mimeType, sizeBytes, createdAt, downloadUrl. Job responses include job content, id, status, timestamps, and company summary (id, companyName, website, location). Auth responses include token, expiresIn (seconds), and user (id, email, role, createdAt).

Employer begins review:
```json
{ "status": "REVIEWING", "version": 1 }
```

The response returns status REVIEWING and version 2. The candidate sees this through their application endpoint. The employer's notification contains id, type, applicationId, readAt, createdAt, and job/candidate summaries. This contract will be translated into a machine-readable OpenAPI document during the final documentation phase.

