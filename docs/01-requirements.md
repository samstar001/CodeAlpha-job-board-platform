# Requirements and scope

## What the assignment asks for

Task 4 in the supplied CodeAlpha Backend Development Tasks & Instructions PDF describes a job board backend using Django or Express. This project uses Node.js and Express. It asks for models for employers, job listings, candidates, resumes, and applications; APIs for posting/searching jobs, uploading resumes, applying, and tracking applications; search filters, status updates, and employer notifications. An admin panel and reporting are explicitly optional.

The original screenshot and the complete supplied PDF are the assignment sources. The acceptance criteria below describe the implemented backend. Internship delivery requirements (repository naming, LinkedIn video, and submission form) are tracked separately in docs/15-codealpha-checklist.md.

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

## Submitted implementation scope

The backend includes in-app notification endpoints and local private PDF storage with authenticated downloads. Automated tests cover permissions, application submission, status rules, notifications, and file storage behavior.

Defer email delivery, frontend, admin panel, analytics, password reset, email verification, resume parsing, recommendations, saved jobs, company teams, and cloud file storage. Optional work starts only after the core journey passes.

## Important edge cases

- Two simultaneous applications must still result in only one record.
- Closing a job preserves existing applications.
- Editing a job cannot transfer ownership.
- Application resumes remain available after newer resume uploads.
- Database or file-write failures must not leave a usable partial upload record; clean up newly written files if persistence fails.
- A stale status update must not overwrite a more recent one.

