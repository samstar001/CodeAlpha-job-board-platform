# Progress log

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
