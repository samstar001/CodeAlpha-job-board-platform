# Submission and reviewer guide

This is the CodeAlpha Task 4 backend using Node.js, Express, MongoDB, and Prisma 6.19. The required backend features are complete. Optional admin UI/reporting, frontend, and hosted deployment are outside this submission.

## Fresh clone

Install Node.js 22 or 24, Git, and access to a MongoDB replica set (Atlas works). From your terminal:

```powershell
git clone https://github.com/samstar001/CodeAlpha-job-board-platform.git
cd CodeAlpha-job-board-platform
npm ci
Copy-Item .env.example .env
```

Edit .env before continuing. Set DATABASE_URL with the database name job_board, not just the cluster hostname. Set TEST_DATABASE_URL with a separate database name job_board_test. Set a randomly generated JWT_SECRET of at least 32 characters. Set CORS_ORIGIN to your intended frontend origin (the provided localhost value works for the demo). Never commit .env. Database credentials and network IP access must permit your local connection.

```powershell
npm run db:generate
npm run db:validate
npm run db:push
npm run db:seed
npm test
npm run test:integration
npm run dev
```

Stop an existing API process before regenerating the Prisma client on Windows. MongoDB uses db push for this pinned Prisma version, not migrate dev. Database integration tests explicitly use job_board_test and delete only their own fictional data; ordinary npm test does not access MongoDB.

Startup prints database connection success, active port, and the health URL. GET http://localhost:5000/api/v1/health returns data.status=ok. Change the URL if PORT differs. Use npm start without watch mode.

## Demo accounts and journey

The optional seed creates employer@demo.example and candidate@demo.example, both initially using DemoPassword123!. These are fictional demo credentials, not database credentials. Existing passwords, status changes, and read timestamps are preserved when reseeding. It also creates a job, one valid dummy PDF on disk, one application, and one employer notification. Seed is disabled for NODE_ENV=production. Do not use these known passwords for real users.

Import docs/openapi.json into Postman as an OpenAPI collection. Its default server is http://localhost:5000/api/v1. Detailed field limits and error codes are in docs/04-api-contract.md. Register fresh accounts to demonstrate creation, or log in with the demo accounts to inspect seeded data.

1. Log in as employer; copy data.token into Postman's Bearer Token authorization.
2. Create a job with POST /jobs; save its ID.
3. Search GET /jobs?q=backend&location=lagos.
4. Log in as candidate and upload one PDF through multipart POST /resumes, file field named file.
5. Apply using POST /jobs/:jobId/applications with resumeId; save the application ID and version.
6. Switch to employer token: GET /notifications/me?unread=true and GET /jobs/:jobId/applications.
7. Download the linked resume with the employer token, then PATCH /applications/:applicationId/status using status REVIEWING and version 1.
8. Switch back to candidate: GET /applications/me shows the new status/version.
9. Demonstrate duplicate application rejection and denial of another employer's access.
10. Mark a notification read using PATCH /notifications/:notificationId/read and verify unread filtering.

## Submission

Submit https://github.com/samstar001/CodeAlpha-job-board-platform through your internship Google Form. Ensure the reviewer can access the repository and choose main, which contains all completed phases. The form itself is not submitted by this project. Feature branches preserve the development history.

Include source, Prisma schema, dependency lockfile, .env.example, tests, and docs in Git. Exclude secrets, node_modules, real resumes, and generated runtime files. Reviewers generate their own demo PDF by running the seed script.

## Known scope and operational limits

- Backend REST API only; optional admin/reporting and frontend are not included.
- Notifications are persisted in-app, not sent by email or push services.
- JWTs expire in one hour; refresh, password reset, verification, and revocation endpoints are deferred.
- Basic PDF checks are not malware scanning. Files require persistent private storage; multi-instance hosting needs shared storage and shared rate limiting.
- File and metadata writes cannot share a transaction. Normal persistence failures clean up files; abrupt process crashes can leave orphan files. Back up both MongoDB and storage.
- The health route checks process liveness; startup verifies the database, but the health response is not a continuous database readiness test.
- Prisma 6.19 is intentionally pinned for the documented MongoDB workflow. Review supported dependency versions before long-term production use.
- Search uses literal case-insensitive substring matching, with pagination. Large datasets need search/indexing improvements.

## Learning path after submission

Read docs 01–04 for the domain, architecture, models, and contract. Then follow 08 and the feature walkthroughs 10–13, tracing route → middleware → controller → service → database. Review local storage in 09/12 and notifications in src/modules/notifications. Every completed phase is recorded in the progress log. We can walk through these together after submission.
