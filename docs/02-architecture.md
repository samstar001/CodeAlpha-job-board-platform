# Architecture and folder structure

## Implemented stack

Implemented stack: Node.js 22/24 with JavaScript ES modules, Express, MongoDB, Prisma 6.19.0, Zod for validation, bcrypt for password hashing, JWT bearer access tokens, and Multer for bounded multipart uploads. Tests use Node's built-in node:test/assert tools, fetch, and temporary local servers. Exact installed dependency versions are captured in package-lock.json.

MongoDB stores documents in collections. Prisma 6.19 describes models, generates a query client, and synchronizes indexes using `db push`. MongoDB does not enforce foreign keys: services validate references and ownership. Unique indexes enforce email and application uniqueness. A replica set is required for our multi-document transactions. This is a single application, suitable for the submission deadline.

## Request flow

Client → Express route → authentication/role checks → input validation → controller → service → Prisma → MongoDB.

The controller translates HTTP input/output. The service implements business rules and resource ownership checks. Prisma handles database access. Error middleware maps known failures to the API error contract and hides internal details.

Resume upload flow: authenticate → enforce candidate role → bound multipart size → inspect PDF content → store under a generated name outside public assets → create metadata → return metadata. A download route authorizes access before streaming the file.

## Repository structure

```text
docs/                       requirements, contracts, decisions, progress
prisma/
  schema.prisma             MongoDB document models and indexes
  seed.js                   fictional demo data
src/
  app.js                    Express configuration; exported for tests
  server.js                 environment validation and HTTP startup
  config/env.js             validated configuration
  lib/prisma.js             shared database client
  middleware/
    authenticate.js
    authorize.js
    validate.js
    error-handler.js
  modules/
    auth/
    profiles/
    jobs/
    resumes/
    applications/
    notifications/
  utils/api-error.js        expected public errors
tests/
  foundation.test.js        HTTP, environment, and rate-limit tests
  resumes.test.js           cleanup and path containment checks
  auth.integration.test.js  complete isolated database workflow
scripts/                    integration runner, docs generation, verification helpers
storage/resumes/            private files; ignored by Git
.env.example                placeholders only
.gitignore
package.json
README.md
```

Modules use route, controller, service, and schema files as needed. Notifications keep their small HTTP/validation layer in notifications.routes.js. Resume multipart parsing lives in resumes.routes.js and disk operations in resumes.service.js. The storage directory is created at runtime and is not committed. No data backfill scripts have been needed; add a documented prisma/data-changes directory only when needed.

## Configuration and safeguards

Environment variables: `NODE_ENV`, `PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `MAX_RESUME_BYTES`, and `CORS_ORIGIN`. Tests use a dedicated database and temporary upload directory, never development or production data.

Use TLS at deployment, security headers, a strict CORS allowlist, authentication rate limits, bounded JSON bodies, and parameterized Prisma queries. Never log passwords, tokens, or resume contents. Ignore secrets, dependencies, uploads, and test artifacts in Git.

JWT access tokens expire after one hour; clients log in again after expiry. No refresh or server-side logout/revocation in this scope. Role and resource ownership are checked against current database state on protected requests.

Local file storage is suitable for a persistent single-server demo. Ephemeral or multi-instance hosting needs shared object storage before deployment. PDF signature checks alone do not establish that a file is safe; production should add malware scanning and stronger document validation.

