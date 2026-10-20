# Job Board Platform

A Node.js and Express REST API connecting employers who post jobs with candidates who apply using resumes.

Status: Express foundation, identity schema, authentication, and own-profile endpoints implemented. Job listings are next.

## Run locally

Use Node.js 22 and a MongoDB replica set. Run `npm ci`, create your own `.env` using `.env.example`, and set a random JWT_SECRET of at least 32 characters. Follow the setup guide for connection details.

```powershell
npm run db:generate
npm run db:validate
npm run db:push
npm run dev
```

`GET http://localhost:5000/api/v1/health` returns `{ "data": { "status": "ok" } }` (adjust for your PORT). Startup validates configuration and pings MongoDB before listening. The health route is process liveness, not a continuous database readiness probe.

Use `npm start` to run without watch mode and `npm test` for local HTTP/configuration/rate-limit checks without database access. Run `npm run test:integration` explicitly for authentication tests against the separate job_board_test database; see the authentication walkthrough for safeguards. The implementation uses Node's built-in watch mode and test runner; nodemon, Vitest, and Supertest are not required.

## Project guide

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

Start with requirements, then follow the guides in order. Technology choices beyond Node.js and Express are proposals recorded in the decision log.

## Main user journey

An employer registers, creates a company profile, and publishes a job. A candidate registers, searches jobs, uploads a PDF resume, and applies. The employer receives an in-app notification and updates the application's status. The candidate can track that status.

## Submission target

A working backend with database schema setup, documented setup, example requests, meaningful automated tests, and a Git history that shows completed phases. A frontend and hosted deployment are outside the required backend scope unless submission rules require them.

