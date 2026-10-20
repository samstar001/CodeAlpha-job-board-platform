# Requirements and scope

## What the assignment asks for

The supplied screenshot describes a job board backend using Django or Express. We will use Node.js and Express as requested. It asks for models for employers, job listings, candidates, resumes, and applications; APIs for posting/searching jobs, uploading resumes, applying, and tracking applications; search filters, status updates, and employer notifications. An admin panel and reporting are explicitly optional.

The screenshot is the source brief. The details below are implementation proposals to turn that brief into a testable system.

## Roles

| Role | Permissions |
| --- | --- |
| Visitor | Search open jobs and view public job details |
| Candidate | Maintain own profile, upload own resumes, apply, view own applications |
| Employer | Maintain own company profile, manage own jobs, view applicants to own jobs, update their statuses, read own notifications |

Users have one role for this submission. Registration creates the matching profile in one database transaction. A company profile belongs to one employer account; multi-user company teams are deferred.

## Required acceptance criteria

1. Registration and login work; passwords are hashed and private routes require authentication.
2. Employers can create, edit, close, and list their jobs. Other employers cannot change them.
3. Visitors can search open jobs by keyword, location, employment type, and work mode, with pagination.
4. Candidates can upload PDF resumes and view their own resume metadata. Other users cannot download them except the employer reviewing a linked application.
5. A candidate can apply once per job using a resume they own. Closed jobs reject applications.
6. Candidates can list their applications and see current status.
7. Employers can list applications to their jobs and perform allowed status changes.
8. Successful application submission also creates an employer notification in the same database transaction.
9. Invalid input, unauthenticated access, forbidden access, missing resources, and duplicates produce consistent errors.
10. Setup instructions and example requests let a reviewer reproduce the main journey.

## Scope for today's submission

Build the backend and in-app notification endpoints. Store PDF files locally for development, with private authenticated downloads. Keep automated tests focused on permissions, application submission, and status rules.

Defer email delivery, frontend, admin panel, analytics, password reset, email verification, resume parsing, recommendations, saved jobs, company teams, and cloud file storage. Optional work starts only after the core journey passes.

## Important edge cases

- Two simultaneous applications must still result in only one record.
- Closing a job preserves existing applications.
- Editing a job cannot transfer ownership.
- Application resumes remain available after newer resume uploads.
- Database or file-write failures must not leave a usable partial upload record; clean up newly written files if persistence fails.
- A stale status update must not overwrite a more recent one.

