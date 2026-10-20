# How local resume storage works

The PDF bytes live on the API server's disk. MongoDB stores only metadata and a generated storage key. A database record is not the PDF itself.

Example: a candidate selects `my-resume.pdf`. The API saves the validated bytes as `storage/resumes/<random-UUID>.pdf`. Its Resume document stores candidateId, originalName, storageKey, mimeType, sizeBytes, and timestamps. The random filename avoids collisions and keeps user-controlled names out of filesystem paths. UUID filenames and ObjectId database IDs serve different purposes.

## Upload, step by step

1. The client sends multipart/form-data with field `file`, plus its bearer token. In Postman choose Body → form-data → file, set its type to File, and select a PDF. Let Postman generate the multipart Content-Type boundary.
2. Authentication and candidate-role checks run before Multer accepts the file.
3. Multer allows one file, enforces the 5 MiB limit and bounded form fields, and initially buffers bytes in memory. Bound concurrent uploads/rate limits to control aggregate memory use.
4. The service checks the claimed type, extension, and PDF signature. These are basic validation, not malware detection.
5. Generate a filename using Node's crypto.randomUUID(). Create the configured directory if necessary and write with exclusive creation to avoid accidental overwrites.
6. Create the Resume document in MongoDB. If that fails, remove the newly written file. Return safe metadata and an authenticated download route.

Disk and MongoDB cannot share one atomic transaction. A process crash between disk write and metadata creation can leave an orphan file; a later reconciliation job can compare keys and remove old orphans. Document this limitation and implement normal-error cleanup first.

## Download, step by step

1. Client requests GET /api/v1/resumes/:resumeId/download with its token.
2. Look up the Resume document. Allow the owning candidate or an employer who owns a job with an application referencing that resume.
3. Resolve the generated storage key beneath the configured upload directory and verify the resolved path stays inside that directory.
4. Stream the file as an attachment using a sanitized download name, application/pdf, and private/no-store caching. Handle missing files with a controlled error.

Do not expose this folder with express.static: that would bypass the authorization route. Browser address-bar navigation cannot add a bearer header; the future frontend should fetch with authorization and download the returned Blob.

## What to inspect while learning

Upload one dummy PDF, inspect its generated filename on disk, inspect the metadata document, and download it through the API. Then try an oversized file, a non-PDF, and another candidate's token. Explain where each request is rejected. Finally simulate a metadata-save failure and check that cleanup removed the new file.

Local storage means the machine running Node, not necessarily the candidate's machine. Cloning the repository does not copy uploads. Moving the app requires moving both metadata and files; backing up one without the other is incomplete. Persistent disk is required for a hosted demo using this design.
