# Phase 2: authentication and profiles

## What was built and why

Registration and login identify users. JWT authentication protects private endpoints. Database-based role guards keep candidate and employer actions separate. Own-profile endpoints let users update public details without changing credentials, roles, or ownership.

Registration runs through route → rate limiter → Zod validation → controller → service → Prisma nested create. Email is trimmed/lowercased; passwords remain unchanged and are hashed with bcrypt at cost 12. The user and matching profile are created atomically, so a profile failure rolls back the user. MongoDB's unique email index handles simultaneous duplicate registrations.

Login compares the supplied password with the stored hash and returns a one-hour HS256 JWT. The token contains a subject (user ID), issuer, audience, and expiry; it is signed, not encrypted. Treat it as a credential and send it only to the API. Protected requests verify its signature/claims and load the current user from MongoDB. A deleted user cannot keep using a still-unexpired token. Password hashes never appear in API responses.

Express 5 forwards rejected async route promises to our error middleware. ApiError represents intentional public failures; unexpected errors remain generic 500 responses.

## Files to read in order

1. src/modules/auth/auth.schema.js — accepted registration/login input.
2. src/modules/auth/auth.routes.js — endpoints and password-attempt limits.
3. src/modules/auth/auth.controller.js — HTTP status and response envelopes.
4. src/modules/auth/auth.service.js — password hashing, nested registration, login, tokens.
5. src/middleware/authenticate.js and authorize.js — identity and permission checks.
6. src/modules/profiles/ — own-profile reads/edits and validation.
7. src/middleware/error-handler.js — consistent safe failures.

## Try it in Postman

Start with `npm run dev`. Use your configured port; examples assume 5000. POST requests below use Body → raw → JSON.

POST http://localhost:5000/api/v1/auth/register:

```json
{
  "email": "candidate@example.com",
  "password": "LearningPassword123!",
  "role": "CANDIDATE",
  "fullName": "Demo Candidate"
}
```

Expect 201 with data.token, data.expiresIn (3600), and data.user. Register an employer using role EMPLOYER and companyName instead of fullName. Unknown fields are rejected.

POST http://localhost:5000/api/v1/auth/login:

```json
{ "email": "candidate@example.com", "password": "LearningPassword123!" }
```

For protected requests, select Authorization → Bearer Token and paste the returned token. GET http://localhost:5000/api/v1/auth/me returns the safe user and matching profile.

PATCH http://localhost:5000/api/v1/candidates/me:

```json
{ "headline": "Junior Backend Developer", "location": "Lagos", "bio": "Learning Node.js and Express" }
```

With an employer token, PATCH /api/v1/employers/me accepts companyName, description, website, and location. Set optional fields to null to clear them. Empty patches, unknown fields, and ownership/role fields are rejected. Using the candidate token on the employer endpoint returns 403.

## Verification and limits

`npm test` runs local HTTP/configuration/rate-limit tests and skips MongoDB integration. `npm run test:integration` explicitly validates a distinct job_board_test URL, synchronizes its indexes, creates uniquely named fictional users, tests both roles, and cleans up only that run's records. It never resets the database. The test checks password hashing, normalized/duplicate emails, invalid registration, login failures, expired/forged tokens, deleted users, cross-role denial, and profile ownership.

The password endpoints share an in-memory limit of 20 attempts per 15 minutes per IP, including invalid inputs. Restarting resets this limit; multi-instance hosting needs a shared rate-limit store. Proxy trust is not enabled; configure it precisely for the hosting provider before deploying behind a proxy. Tokens have no refresh/revocation endpoint, and registration has no email verification or password reset in this scope.

Implementation references: [Express 5 async errors](https://expressjs.com/en/5x/guide/error-handling/), [Prisma 6 client reference](https://docs.prisma.io/docs/orm/v6/reference/prisma-client-reference), [JWT library documentation](https://github.com/auth0/node-jsonwebtoken).
