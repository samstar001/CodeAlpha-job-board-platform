# Phase 5: applications and status tracking

## What was built and why

Candidates apply once per job using their own uploaded resume and can view their submissions. Employers list applicants to their own jobs and move applications through a controlled lifecycle. Both parties can read authorized application details. Employers can download a resume only when it is linked to an application to their own job.

Application stores the job, candidate, selected resume, optional cover letter, status, and version. Notification stores a NEW_APPLICATION event for the owning employer. Notification retrieval and mark-read endpoints are the next phase; creation already happens atomically during submission.

## Packages used

No new packages were installed. Express provides routing and responses; Zod validates IDs, submission/status bodies, and pagination; @prisma/client provides queries, transactions, and conditional writes. Existing jsonwebtoken middleware authenticates requests before role guards. The Prisma development CLI synchronizes collections/indexes and generates the client. Node's built-in test/assert tools exercise the HTTP workflow; no additional test library was needed.

## Request flow and important lines

Routes apply authentication → role check → body validation → controller → service. Services resolve the profile from the caller's ID and enforce resource ownership. Controllers validate URL/query values and format success envelopes.

`@@unique([jobId, candidateId])` creates a compound unique index. Even simultaneous requests cannot create two applications for the same candidate/job pair. A conflict returns 409 ALREADY_APPLIED.

`db.$transaction(work)` groups job coordination, application creation, and notification creation. Throwing at any step rolls back all writes. If notification saving fails, no application survives and the job counter is unchanged. The MongoDB deployment must support transactions.

`updateMany({ where: { id: jobId, status: 'OPEN' }, data: { applicationSequence: { increment: 1 } } })` writes the same document that job closing updates. Concurrent submission/closing therefore causes a transaction conflict instead of silently accepting a submission based on an outdated read. Retry P2034 conflicts at most three times, rechecking the OPEN condition each time; exhaustion returns 409 CONCURRENT_CHANGE. A successful submission before closing remains valid afterward.

`tx.resume.findFirst({ where: { id: input.resumeId, candidateId } })` checks both resume identity and ownership. Supplying another candidate's resume returns 404. Submission validates metadata ownership; it does not re-read disk bytes, so an externally missing file is reported by download, not by submission.

`where: { id, version: input.version, status: current.status }` makes the status write conditional on the current version/state. A successful change increments version. An outdated version returns 409 STALE_VERSION; clients must reload instead of guessing the next number.

`job: { employerId: ownerId }` scopes employer application queries to their own listings. The resume download service similarly checks an application whose job belongs to the caller. Responses omit hashes and disk storage keys.

## Status rules

```text
SUBMITTED → REVIEWING → SHORTLISTED → HIRED
    │           │            │
    └───────────┴────────────┴──→ REJECTED
```

HIRED and REJECTED are terminal. Repeating the current status with the current version succeeds without incrementing version. Other unsupported transitions return 409 INVALID_TRANSITION. Employers can continue reviewing existing applications after closing a job. Candidates cannot change application status.

## Try in Postman

Use candidate and employer tokens from registration/login. Create an open job and upload a candidate PDF first. Then POST /api/v1/jobs/:jobId/applications with the candidate token:

```json
{ "resumeId": "<uploaded resume ID>", "coverLetter": "I would like to join your backend team." }
```

Expect 201, status SUBMITTED, and version 1. Save the returned application ID.

| Request | Access and purpose |
| --- | --- |
| GET /api/v1/applications/me | Candidate's own applications |
| GET /api/v1/jobs/:jobId/applications | Owning employer's applicants |
| GET /api/v1/applications/:applicationId | Owning candidate or employer |
| PATCH /api/v1/applications/:applicationId/status | Owning employer only |
| GET /api/v1/resumes/:resumeId/download | Candidate owner or employer with linked application |

List endpoints support page, limit, and optional status (for example status=REVIEWING). The detail response includes safe job, candidate, and resume summaries with a download URL.

With the employer token, PATCH the status endpoint:

```json
{ "status": "REVIEWING", "version": 1 }
```

Expect version 2. GET the candidate's application list to see the change. A second submission returns 409. Another employer receives 404 for this application's detail, status, applicant list, and resume download.

## Verification

Five local regression tests run via npm test. The explicit npm run test:integration suite uses only job_board_test and temporary files. It verifies wrong-resume/role denial, closed-job rejection, simulated notification failure rollback, simultaneous duplicate submissions, exactly one notification, candidate/employer access, linked resume downloads, unrelated employer denial, stale and competing status updates, allowed/terminal transitions, filtering, and reviewing after closure. Existing authentication/job/resume checks run too. Cleanup removes only records/files created by the test.

There is no withdrawal, resubmission, status history, email delivery, or notification inbox in this phase. Retry conflicts are bounded; clients may need to retry a 409 concurrent-change response. List count and item queries can reflect concurrent changes between reads.

Next: employer notification list and mark-as-read endpoints.
