# Progress log

## 2026-10-20 — Phase 3: jobs

- Advanced main to completed authentication commit 86cba4a, then created feat/jobs.
- Added Job and employment/work-mode/status enums with owner and public-search indexes.
- Added employer create/edit/close/reopen/own-list routes and public filtered, paginated search/detail routes. Owner ID is derived from the authenticated employer and included in atomic update conditions.
- Verified schema format/validation, generated Prisma Client, and passed the expanded MongoDB integration suite against job_board_test. Tests cover authentication plus job role checks, ownership, validation, literal/combined search, pagination, closed visibility, and reopening; test-created records were removed.
- All three local regression checks passed. Development db push added only the Job collection/indexes and regenerated the client; no database reset performed.
- Windows initially locked the Prisma engine while the API ran; user stopped the API and generation then passed. Restart with npm run dev.
- Added docs/11-jobs-walkthrough.md with what/why, request flow, endpoints, example bodies, and limitations. Next phase: private resume storage.

## 2026-10-20 — Code readability

- Reduced app.js/server.js comments to short explanations per logical section and added blank lines between related blocks at the user's request.
- Behavior unchanged; both files passed Node syntax checks and the diff passed whitespace checks.

## 2026-10-20 — Startup feedback

- Added a terminal confirmation after MongoDB connection and ping succeed, followed by the active HTTP port and health URL after listening starts.
- Node syntax check and git diff whitespace check passed. Health response remains served by the GET route in src/app.js.

## 2026-10-20 — Phase 2: authentication and profiles

- Advanced local main to verified setup commit 5c7f25a and created feat/auth-profiles.
- Added strict registration/login validation, normalized email, bcrypt hashes, atomic nested user/profile creation, one-hour signed JWTs, current-user lookup, role guards, and own-profile editing.
- Added safe business errors, authentication rate limits, and a walkthrough explaining the request flow and Postman requests. Existing one-line section comments continue in new code.
- MongoDB integration passed against job_board_test: both roles, duplicate email, hash storage, invalid input, login, token checks, profile edits, role denial, ownership, and removed-user tokens. Fictional test records were cleaned up.
- No schema change or development-data modification was needed. Optional refresh/logout/password-reset/email-verification flows remain outside scope.
- Final local regression run passed all three checks; database integration is deliberately skipped by the ordinary test command and was run separately successfully.

## 2026-10-20 — Reading comments and branch naming

- Added one-line explanations for logical sections in application code, tests, Prisma configuration, and schema; runtime behavior is unchanged.
- User selected feat/project-setup and feat/<feature> branch naming, replacing the earlier prefix.
- Foundation was previously pushed successfully as 2a0208c on codex/express-foundation; main baseline f3fa4fe was also verified remotely.

## 2026-10-20 — Express foundation

- User confirmed successful MongoDB synchronization of the three identity collections and unique indexes.
- Saved initial plan/schema/dependency baseline on main as f3fa4fe, then created codex/express-foundation.
- Added Express app/server separation, validated configuration, shared Prisma client, startup database ping, graceful shutdown, health route, CORS/security headers, bounded JSON parsing, and safe error responses.
- Added start/dev/test/database npm scripts and README quick start. Selected branch-per-phase workflow and included docs for reviewer context.
- Verification: both Node test cases passed, covering real HTTP responses and configuration-secret redaction. Local HTTP connections required permission outside the sandbox.
- Authentication and feature routes are not yet implemented. Foundation tests do not modify databases.
- Configuration validation and a read-only MongoDB ping passed with network permission. Confirmed .env is ignored by Git.

## 2026-10-20 — Identity models

- Added Role, User, CandidateProfile, and EmployerProfile to prisma/schema.prisma.
- Added unique email/userId indexes and explicit ObjectId references. Removed the unused generated migrations configuration.
- Checks: Prisma 6.19 format and validate both passed. Used the installed Node executable directly because this agent shell does not include npx in PATH.
- These new models have not yet been pushed to MongoDB; the earlier successful db push preceded their creation. Registration services must enforce exactly one profile matching the user's role and normalize email before saving.
- No commit or push performed; this is part of the incomplete foundation phase.

## 2026-10-20 — Phase 0: planning

- Inspected the workspace: empty Git repository on main, with a configured GitHub origin.
- Converted the screenshot brief into acceptance criteria and a bounded submission scope.
- Wrote architecture, proposed folder structure, data models, API contract, build phases, and decision log.
- Verification: reviewed documentation for alignment between routes, ownership rules, lifecycle, and phase dependencies. No application exists yet, so no runtime tests were run.
- Git status: planning files created locally; no commit or push performed.
- Next: review the proposed database choice, confirm MongoDB availability, then implement the Express/database foundation.

## Entry template

### Planning revision — MongoDB and learning guides

- User selected MongoDB and accepted the remaining plan; switched identifiers to ObjectIds and revised concurrency/reference enforcement for MongoDB.
- Added dependency installation commands, .env.example, .gitignore, a version-specific Prisma guide, and a local-file-storage walkthrough.
- Recorded GitHub repository submission as the target; no Google Form submitted.
- Checked official Prisma and MongoDB documentation. Commands are documented but not executed; dependencies are not installed and no database connection is verified.
- Next: user fills .env, then work through foundation setup and explain each step. No commit or push performed in this revision.

```text
Date / phase:
Completed behavior:
Files or modules affected:
Checks run and actual results:
Decision IDs added or changed:
Commit reference (record after commit):
Push result / remote verification:
Remaining work or blockers:
Next step:
```
