# Phase 3: job publishing and search

## What was built and why

Employers can publish, edit, close, reopen, and list their own jobs. Visitors can search open listings and read details without logging in. This connects the employer's publishing journey to the candidate's discovery journey before applications are added.

Job references EmployerProfile through employerId. Ownership comes from the authenticated user's profile, never from request input. Updates include both job ID and employer ID in the database condition; another employer receives 404. Closing preserves the document for future application history. The internal applicationSequence counter is reserved for coordinating applications with closing in the next phase; it is not returned publicly.

## Read the code

The jobs module follows schema → routes → controller → service. Schemas validate body, ID, and query values. Routes apply authentication and employer guards for writes. Controllers translate HTTP inputs. Services resolve ownership and query MongoDB. Public responses include company summaries but no account credentials or internal counters.

Search combines keyword (title OR description), location, employment type, and work mode using AND. Text matching is case-insensitive and regex metacharacters are escaped for literal search. Results are sorted newest first, with ID as the secondary sort. Counts and pages are separate database queries, so metadata may change during concurrent publishing. Substring search is suitable for the demo; full-text indexing can replace it as the data grows.

## Run and try

Stop the API before generating Prisma Client on Windows, because the process can lock its engine DLL. Then run:

```powershell
npm run db:push
npm run dev
```

POST /api/v1/jobs with an employer bearer token:

```json
{
  "title": "Junior Backend Developer",
  "description": "Build and maintain Node.js APIs with our engineering team.",
  "location": "Lagos, Nigeria",
  "employmentType": "FULL_TIME",
  "workMode": "HYBRID"
}
```

Expect 201 with data.id and status OPEN. The company is taken from the employer's profile. Do not supply employerId or status when creating a job.

| Request | Result |
| --- | --- |
| GET /api/v1/jobs | Paginated open listings |
| GET /api/v1/jobs?q=backend&location=lagos&workMode=HYBRID&page=1&limit=10 | Combined search filters |
| GET /api/v1/jobs/:jobId | Public details, including closed status |
| GET /api/v1/employers/me/jobs | Own open and closed jobs; employer token required |
| PATCH /api/v1/jobs/:jobId | Edit supported content fields or status; owner token required |

Close with `{ "status": "CLOSED" }`; reopen with `{ "status": "OPEN" }`. Closed jobs leave public search but remain accessible by direct detail URL. There is no delete endpoint. Reject empty updates, ownership fields, invalid enums, bad IDs, and unsupported query fields. Page is limited to 1–10000 and limit to 1–100.

## Verification

Run `npm test` for local checks and `npm run test:integration` for the explicit job_board_test database suite. The integration suite now includes publishing permission checks, invalid input, company summaries, combined filters, literal search, pagination, missing jobs, cross-employer editing, owner listings, closing and reopening. It also reruns authentication. Only uniquely created test records are removed.

Next: private resume uploads, before candidates can apply.
