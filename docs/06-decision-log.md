# Decision log

Status meanings: Confirmed = requested by user; Proposed = default to review during implementation; Deferred = deliberately outside current scope.

| ID | Date | Status | Decision and reason |
| --- | --- | --- | --- |
| D001 | 2026-10-20 | Confirmed | Use Node.js and Express, as requested. |
| D002 | 2026-10-20 | Proposed | PostgreSQL + Prisma: the domain is relational and benefits from unique constraints and transactions. Requires local or hosted PostgreSQL setup. |
| D003 | 2026-10-20 | Proposed | JavaScript ES modules: reduce deadline setup overhead. TypeScript can be adopted if already familiar. |
| D004 | 2026-10-20 | Proposed | One account role and one employer-owned company profile: keeps ownership understandable; team membership deferred. |
| D005 | 2026-10-20 | Proposed | One-hour bearer JWTs and bcrypt: straightforward API authentication; refresh/revocation workflows deferred. |
| D006 | 2026-10-20 | Proposed | Private local PDF storage, max 5 MiB: sufficient for a persistent single-server demo. Cloud storage needed for ephemeral hosting. |
| D007 | 2026-10-20 | Proposed | In-app employer notifications created atomically with applications: meets notification behavior without email infrastructure. |
| D008 | 2026-10-20 | Proposed | Immutable resume records and no delete endpoints: preserve submitted documents and avoid orphan references. |
| D009 | 2026-10-20 | Proposed | Unique candidate/job application and explicit status transitions with version checking: prevent duplicates and lost updates. |
| D010 | 2026-10-20 | Confirmed | Track completed features/phases on GitHub, as requested. Each push must follow verification. |
| D011 | 2026-10-20 | Deferred | Admin UI/reporting and email delivery: core submission takes priority. |

Add a row when a decision changes, referring to the superseded ID and explaining its practical impact. Do not silently rewrite decision history.

## Updates — 2026-10-20

- D017 — Confirmed: use one branch per feature/phase, review and merge into main before the next phase. Include the docs folder in the submission repository.
- D018 — Implementation: use Node's built-in watch mode and test runner for foundation checks, reducing setup dependencies. Vitest/Supertest remain optional for later test needs.

- D012 — Confirmed: MongoDB replaces PostgreSQL, superseding D002's database choice. Use ObjectIds, unique indexes, service-enforced references, and a replica set for transactions.
- D013 — Confirmed: user accepts the remaining architecture choices and wants to learn local storage while building. Teach each upload/download step with a dummy file and inspect disk plus metadata.
- D014 — Confirmed: user creates and populates .env. Provide placeholders and variable explanations; never commit actual secrets.
- D015 — Confirmed: deliverable is the GitHub repository link for the CodeAlpha internship Google Form. User handles form submission; no hosting requirement inferred.
- D016 — Selected implementation baseline: pin prisma and @prisma/client to 6.19.0 for the documented MongoDB workflow. Use db push, generated client, and explicit backfill scripts instead of SQL-style Prisma Migrate. Newer major workflows must not be mixed into these commands; review the version choice for long-term maintenance after submission.
