# Phase 4: private resume files

## What was built and why

Candidates can upload a PDF, list their resume metadata, and download their own files. This prepares the document candidates will select when applying. Uploads are immutable: uploading a newer version creates a new record and leaves earlier versions available for future application history.

PDF bytes are stored beneath UPLOAD_DIR on the server. MongoDB's Resume collection holds the candidate reference, sanitized original filename, generated storage key, content type, byte size, and creation time. API responses omit storage keys and absolute disk paths. Nothing in storage is served through express.static.

## Packages used

| Package | Reason |
| --- | --- |
| multer | Parse multipart/form-data and bound file size, file count, and form parts |
| express | Register endpoints and stream authorized downloads with res.download |
| @prisma/client | Store/read metadata and resolve candidate ownership |
| zod | Validate ObjectId and pagination input |
| express-rate-limit | Limit upload attempts per IP |
| jsonwebtoken | Existing authentication verifies the bearer token before parsing files |
| prisma (development) | Validate/sync the Resume schema and generate its client |

No new npm package was installed. Node's built-in fs/promises writes/removes files, path resolves safe locations, and crypto generates UUID filenames. Tests use node:test/assert, temporary directories, native fetch, FormData, and Blob.

## Important code lines

`multer.memoryStorage()` buffers the single bounded file so the service can inspect bytes before writing. limits.fileSize uses MAX_RESUME_BYTES (default 5 MiB); fields: 0 forbids additional text fields. An upload limiter allows 10 attempts per 15 minutes per IP, and a process-wide cap permits four active upload handlers. Multiple server processes need shared limits; incoming slow requests also need deployment-level timeouts.

`file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-'` rejects bytes without a PDF header. The extension and claimed MIME type must also match. This is basic file-type checking, not complete PDF parsing or malware scanning. Do not treat uploaded documents as trusted content.

``const storageKey = `${randomUUID()}.pdf` `` gives each file its own generated disk name. The candidate's original filename is metadata only; it cannot choose the write path.

`writeFile(target, file.buffer, { flag: 'wx', mode: 0o600 })` creates a new file exclusively rather than overwriting one. Permission behavior follows the host operating system; Windows uses its filesystem access controls.

`await unlink(target)` runs if metadata persistence fails after the write. Disk and MongoDB cannot share a transaction: a process crash between writing and saving metadata can still leave an orphan. Automatic orphan reconciliation is deferred.

`resume.candidate.userId !== user.id` denies downloading another candidate's document. Once applications exist, the service will also allow the employer who owns the linked job; employers currently receive 404 for all resumes.

`res.download(file.filePath, file.originalName, ...)` streams an authorized attachment. Cache-Control is private, no-store. The path resolver accepts generated keys only and checks that the resolved target stays inside the configured directory. The storage directory must remain controlled by the server administrator, not untrusted filesystem users.

## Try with Postman

Start the API using `npm run dev`; log in as a candidate and copy its token. For POST http://localhost:5000/api/v1/resumes:

1. Authorization → Bearer Token → paste token.
2. Body → form-data → add a key named file, change its type from Text to File, and choose a PDF.
3. Send without extra fields. Let Postman generate the multipart Content-Type and boundary.

Expect 201 with metadata and downloadUrl. GET /api/v1/resumes/me lists the caller's resumes with page and limit support. GET /api/v1/resumes/:resumeId/download with the candidate token retrieves the attachment. Postman's download option lets you save it; a browser address bar cannot attach a bearer header.

Inspect the generated file under storage/resumes and its metadata in MongoDB. Then try another candidate's token (404), an employer token for upload (403), a non-PDF (415), no file (400), and an oversized PDF (413). The local folder is ignored by Git and is not copied when the repository is cloned.

## Verification and limitations

`npm test` checks local HTTP behavior plus path-traversal rejection and disk cleanup under a simulated database failure. `npm run test:integration` explicitly uses job_board_test and a newly generated temporary upload directory, verifies upload bytes on disk/download, metadata privacy, listing, ownership, PDF type/size checks, wrong form fields, and missing files, then removes only its test records/files. Earlier authentication/job checks run too.

The PDF fixture contains a header and dummy bytes to test storage behavior, not a fully rendered resume. Production requires stronger document validation/scanning and persistent/shared storage as appropriate. No delete endpoint is included so submitted documents can later retain stable references.

Next: applications and application-linked employer download access.
