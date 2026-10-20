# CodeAlpha Backend Development Internship - Task 4: Job Board Platform

A Node.js and Express REST API connecting employers who post jobs with candidates who apply using resumes.

This repository contains **Task 4: Job Board Platform**, completed for the CodeAlpha Backend Development Internship. It is the third task in my internship portfolio, following Task 1 (Simple URL Shortener) and Task 2 (Event Registration System). Those two tasks were completed and shared on LinkedIn separately; their code is not included here.

## Assignment coverage

| CodeAlpha Task 4 requirement | Implementation |
| --- | --- |
| Express backend for jobs, employers, candidates, and applications | REST API with authenticated candidate/employer roles |
| Models for employers, jobs, candidates, resumes, and applications | MongoDB models in [Prisma schema](prisma/schema.prisma) |
| Post and search jobs | Employer publishing/editing/closing; public keyword and location search |
| Upload resumes and apply for jobs | Private PDF storage and one application per candidate/job |
| Track applications and update status | Candidate tracking and employer review with version checks |
| Search filters | Employment type, work mode, location, keyword, and pagination |
| Employer notifications | Atomic application notifications, employer inbox, unread filters, mark-as-read |
| Optional admin panel and reporting | Not included; optional in the task brief |

The workflow is employer registration → job publishing → candidate registration → resume upload → application → employer notification/review → candidate status tracking. This is a backend API; use Postman to demonstrate it.

## Technology and project structure

Node.js, Express, MongoDB, Prisma 6.19, JWT, bcrypt, Zod, and Multer provide routing, persistence, authentication, validation, and file uploads. Tests use Node's built-in test runner.

```text
src/        Express app/server, middleware, feature modules, and utilities
prisma/     MongoDB schema and repeatable fictional demo seed
tests/      Local checks and isolated full-workflow database tests
scripts/    API documentation generation and verification helpers
docs/       Requirements, architecture, API contract, walkthroughs, and submission guide
```

See the [actual folder structure](docs/02-architecture.md) and [CodeAlpha submission checklist](docs/15-codealpha-checklist.md). The checklist distinguishes the completed backend from repository naming, LinkedIn video, and form submission steps.

Status: Required backend complete: authentication, profiles, jobs, private resumes, applications, status tracking, and employer notifications. Optional admin UI/reporting is not included.

## Run locally

Use Node.js 22 or 24 and a MongoDB replica set. Run `npm ci`, create your own `.env` using `.env.example`, and set a random JWT_SECRET of at least 32 characters. Follow the submission guide for the complete fresh-clone procedure.

```powershell
npm run db:generate
npm run db:validate
npm run db:push
npm run db:seed
npm run dev
```

`GET http://localhost:5000/api/v1/health` returns `{ "data": { "status": "ok" } }` (adjust for your PORT). Startup validates configuration and pings MongoDB before listening. The health route is process liveness, not a continuous database readiness probe.

Use `npm start` to run without watch mode and `npm test` for local checks without database access. Run `npm run test:integration` for the full workflow against the separate job_board_test database and temporary file storage. The implementation uses Node's built-in watch mode and test runner.

The seed adds fictional employer/candidate accounts, a job, PDF, application, and notification without resetting data. Newly created demo accounts employer@demo.example and candidate@demo.example use DemoPassword123!; existing passwords remain unchanged. Seed is optional and disabled in production.

Import [OpenAPI](docs/openapi.json) into Postman to explore all 21 operations. See the [submission guide](docs/14-submission-guide.md) for setup, demo steps, scope, and limitations.

## Project guide

Start at the [documentation index](docs/README.md) for separate reviewer, learning, and development-history paths.

- [Requirements and scope](docs/01-requirements.md)
- [Architecture and folder structure](docs/02-architecture.md)
- [Data models](docs/03-data-models.md)
- [API contract](docs/04-api-contract.md)
- [Build phases and GitHub workflow](docs/05-build-plan.md)
- [Decision log](docs/06-decision-log.md)
- [Progress log](docs/07-progress-log.md)
- [Installation, environment, and Prisma guide](docs/08-setup-guide.md)
- [How local resume storage works](docs/09-local-file-storage.md)
- [Authentication walkthrough and requests](docs/10-authentication-walkthrough.md)
- [Job publishing and search walkthrough](docs/11-jobs-walkthrough.md)
- [Resume storage, packages, and code walkthrough](docs/12-resumes-walkthrough.md)
- [Applications, transactions, and status tracking](docs/13-applications-walkthrough.md)
- [Complete setup, demo, and submission guide](docs/14-submission-guide.md)
- [Importable OpenAPI specification](docs/openapi.json)
- [CodeAlpha task coverage and delivery checklist](docs/15-codealpha-checklist.md)

Start with the submission guide to run the project, then follow the numbered guides to learn the design. Earlier proposals and subsequent decisions are preserved in the decision log.

## Main user journey

An employer registers, creates a company profile, and publishes a job. A candidate registers, searches jobs, uploads a PDF resume, and applies. The employer receives an in-app notification and updates the application's status. The candidate can track that status.

## Submission target

A working backend with database schema setup, documented setup, example requests, meaningful automated tests, and a Git history that shows completed phases. A frontend and hosted deployment are outside the required backend scope unless submission rules require them.

