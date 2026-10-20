# Build phases and GitHub workflow

## Working approach

Complete one vertical slice, demonstrate it, review the code together, then commit and push it. A phase is complete only when its acceptance checks pass. Record actual progress, not planned work, in the progress log. If time is tight, drop optional features before cutting permissions or core validation.

| Phase | Deliverable | Completion check | Suggested commit |
| --- | --- | --- | --- |
| 0 | Planning documents | Scope, schema, routes, and milestones reviewed | docs: define job board backend plan |
| 1 | Express foundation | Environment validation, health endpoint, consistent errors, database connection, schema synchronization, .gitignore, .env.example | chore: initialize Express API and database |
| 2 | Authentication and profiles | Register/login/me, profile editing, role guards; duplicate email and cross-role checks pass | feat: add authentication and role profiles |
| 3 | Jobs | Employer CRUD subset and public filtered search; cross-employer write is denied | feat: add job publishing and search |
| 4 | Resumes | Bounded private PDF upload/list/download; unauthorized download denied; persistence failure cleans files | feat: add private resume uploads |
| 5 | Applications | Apply/list/detail/status; duplicate, closed job, wrong resume owner, stale version, and transition cases pass | feat: add application workflow |
| 6 | Notifications | Application and notification commit atomically; employer list/read works with ownership checks | feat: add employer notifications |
| 7 | Submission | Fresh database setup, fictional seed data, API examples/OpenAPI, full core journey and regression tests pass | docs: prepare submission and API guide |

Build the application/notification transaction together in phase 5; phase 6 exposes and verifies notification retrieval. Do not temporarily create applications without required notifications.

## Timebox for today

Reserve the first short session for reviewing this plan and database setup. Spend the largest block on phases 2–5. Keep the last 60–90 minutes for verification, documentation, GitHub checks, and submission. These are planning allocations, not a guaranteed completion estimate; revise after the foundation runs. Avoid frontend/admin work while required backend flows remain unfinished.

## GitHub tracking

The local repository is on `main` and has origin `https://github.com/samstar001/CodeAlpha-job-board-platform.git`. Remote access and push permissions have not yet been verified.

The user selected a branch per feature/phase. Start each branch from updated main, using names such as `codex/express-foundation`, `codex/auth-profiles`, `codex/jobs`, `codex/resumes`, and `codex/applications`. Commit and push the phase branch, review its diff (preferably in a pull request), then merge completed work into main before branching for the next phase. Submit the repository with completed features available on main. Before each phase commit:

1. Run the checks relevant to that phase and record results in the progress log.
2. Review `git status` and the diff. Stage named source/docs files; keep .env, uploads, dependency folders, and real personal data out of Git.
3. Commit the completed slice with the suggested message or a precise equivalent.
4. Push the phase branch with `git push -u origin <branch>` and verify the remote branch contains the new commit.
5. Record the commit reference and remaining work in the log. Keep the commit hash in the next log update to avoid a self-referential commit.

The user has requested feature/phase pushes as the project is built. Push completed work when available; do not mark an attempted or failed push as successful. This planning turn creates documentation only and does not commit or push it.

## Reviewer's demo

Create an employer and a candidate → employer posts job → candidate searches → candidate uploads PDF and applies → employer sees notification and applicant → employer moves application to REVIEWING → candidate sees updated status. Also demonstrate a duplicate application rejection and denial of another employer's access.

## Teaching checkpoint for each phase

Explain the request path, the database records involved, the permission rule, and one failure case. Run a real request and inspect the response before moving on. Keep explanations tied to working code rather than introducing all framework concepts at once.

