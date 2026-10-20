# Data models

All IDs are MongoDB ObjectIds exposed as 24-character hexadecimal strings. Dates are UTC timestamps serialized as ISO 8601. Mutable records include `createdAt` and `updatedAt` unless stated otherwise.

| Model | Main fields | Relationships and constraints |
| --- | --- | --- |
| User | id, email, passwordHash, role | Unique normalized lowercase email; role CANDIDATE or EMPLOYER |
| CandidateProfile | id, userId, fullName, headline?, location?, bio? | Unique userId → User |
| EmployerProfile | id, userId, companyName, description?, website?, location? | Unique userId → User |
| Job | id, employerId, title, description, location, employmentType, workMode, status | employerId → EmployerProfile; status OPEN or CLOSED |
| Resume | id, candidateId, originalName, storageKey, mimeType, sizeBytes, createdAt | candidateId → CandidateProfile; unique generated storageKey; immutable |
| Application | id, jobId, candidateId, resumeId, coverLetter?, status, version | References Job, CandidateProfile, Resume; unique (jobId, candidateId); version starts at 1 |
| Notification | id, employerId, applicationId, type, readAt?, createdAt | EmployerProfile and Application references; type NEW_APPLICATION; unique (applicationId, type) |

Required profile name is supplied at registration: `fullName` for a candidate or `companyName` for an employer. Optional fields accept null. Resume ownership is enforced in the application service. Resume documents are immutable and no deletion endpoint is included, preserving submitted resume references.

Employment types: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP. Work modes: ONSITE, HYBRID, REMOTE. A location string remains required for remote jobs to describe geographic eligibility.

## Relationships

User 1 → 1 matching role profile. EmployerProfile 1 → many Jobs. CandidateProfile 1 → many Resumes and Applications. Job 1 → many Applications. Each Application references exactly one Resume. EmployerProfile 1 → many Notifications.

## Application lifecycle

```text
SUBMITTED → REVIEWING → SHORTLISTED → HIRED
    │           │            │
    └───────────┴────────────┴──→ REJECTED
```

HIRED and REJECTED are terminal. Repeating the current status is an idempotent success if the supplied version matches. Other transitions return 409. Candidates cannot change statuses. Employers can review existing applications after a job closes.

Status updates atomically match the expected version and increment it on change. Concurrent updates with an outdated version return 409.

## Transactions and indexes

- Create user and matching profile atomically.
- Apply within a transaction: conditionally update the OPEN job by incrementing an internal applicationSequence counter, validate resume ownership, create application, and create notification. Closing updates that same job document. The shared write creates a conflict for racing operations; retry transient transaction conflicts within a bounded policy and recheck OPEN. A read alone is insufficient to coordinate with closing. A compound unique index handles competing duplicate applications.
- Index jobs on (status, createdAt), applications on (candidateId, createdAt) and (jobId, createdAt), notifications on (employerId, readAt, createdAt).
- Start keyword search with case-insensitive title/description matching. Full-text search is deferred until data volume justifies it.
- No hard deletion endpoints in the MVP. Services must prevent dangling references; MongoDB has no database-enforced foreign keys. All reference fields use the same ObjectId representation. Add applicationSequence (integer, default 0) to Job for the concurrency protocol above.

