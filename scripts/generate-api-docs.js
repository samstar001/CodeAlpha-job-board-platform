import { writeFile } from 'node:fs/promises';

// Keep an importable OpenAPI contract alongside the human-readable API walkthroughs.
const string = { type: 'string' };
const id = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
const status = { type: 'string', enum: ['SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'HIRED', 'REJECTED'] };
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const jobFields = { title: { ...string, minLength: 1, maxLength: 160 }, description: { ...string, minLength: 20, maxLength: 20000 }, location: { ...string, minLength: 1, maxLength: 160 }, employmentType: { ...string, enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] }, workMode: { ...string, enum: ['ONSITE', 'HYBRID', 'REMOTE'] } };
const credentials = { email: { ...string, format: 'email' }, password: { ...string, description: '8–72 UTF-8 bytes, preserved without trimming', format: 'password' } };
const page = [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }];
const query = (name, schema = string) => ({ name, in: 'query', schema });
const paths = {};

function add(method, path, summary, { publicRoute = false, body, parameters = [], created = false, binary = false, list = false } = {}) {
  const pathParameters = [...path.matchAll(/\{(\w+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: id }));
  const response = binary ? { description: 'Authorized PDF attachment', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } } : { description: 'Success; see API contract for resource-specific fields', content: { 'application/json': { schema: { $ref: `#/components/schemas/${list ? 'ListResponse' : 'Success'}` } } } };
  paths[path] ??= {};
  paths[path][method] = {
    summary, security: publicRoute ? [] : [{ bearerAuth: [] }], parameters: [...pathParameters, ...parameters],
    ...(body ? { requestBody: { required: true, content: { [binary === 'upload' ? 'multipart/form-data' : 'application/json']: { schema: body } } } } : {}),
    responses: { [created ? '201' : '200']: response, ...Object.fromEntries([400, 401, 403, 404, 409, 413, 415, 429, 500, 503].map(code => [code, { description: 'Error when applicable; see API contract', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }])) },
  };
}

// Document every implemented endpoint, including role restrictions in operation summaries.
add('get', '/health', 'Process liveness', { publicRoute: true });
add('post', '/auth/register', 'Register candidate or employer; creates matching profile atomically', { publicRoute: true, created: true, body: { oneOf: [object({ ...credentials, role: { enum: ['CANDIDATE'] }, fullName: string }, ['email', 'password', 'role', 'fullName']), object({ ...credentials, role: { enum: ['EMPLOYER'] }, companyName: string }, ['email', 'password', 'role', 'companyName'])] } });
add('post', '/auth/login', 'Log in; returns token, expiresIn, and safe user', { publicRoute: true, body: object(credentials, ['email', 'password']) });
add('get', '/auth/me', 'Current user and matching profile');
add('patch', '/candidates/me', 'Candidate: edit own profile', { body: { ...object({ fullName: string, headline: { ...string, nullable: true }, location: { ...string, nullable: true }, bio: { ...string, nullable: true } }), minProperties: 1 } });
add('patch', '/employers/me', 'Employer: edit own company', { body: { ...object({ companyName: string, description: { ...string, nullable: true }, website: { ...string, format: 'uri', nullable: true }, location: { ...string, nullable: true } }), minProperties: 1 } });
add('get', '/jobs', 'Search open jobs; literal case-insensitive text filters', { publicRoute: true, list: true, parameters: [...page, query('q'), query('location'), query('employmentType', jobFields.employmentType), query('workMode', jobFields.workMode)] });
add('get', '/jobs/{jobId}', 'Public job detail, including closed jobs', { publicRoute: true });
add('post', '/jobs', 'Employer: publish an open job', { created: true, body: object(jobFields, Object.keys(jobFields)) });
add('patch', '/jobs/{jobId}', 'Owning employer: edit, close, or reopen job', { body: { ...object({ ...jobFields, status: { enum: ['OPEN', 'CLOSED'] } }), minProperties: 1 } });
add('get', '/employers/me/jobs', 'Employer: own open and closed jobs', { list: true, parameters: page });
add('post', '/resumes', 'Candidate: upload one PDF, maximum configured size (default 5 MiB)', { created: true, binary: 'upload', body: object({ file: { type: 'string', format: 'binary' } }, ['file']) });
// Upload returns JSON metadata, whereas the download operation returns binary PDF bytes.
paths['/resumes'].post.responses['201'] = { description: 'Resume metadata and downloadUrl', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } };
add('get', '/resumes/me', 'Candidate: own resume metadata', { list: true, parameters: page });
add('get', '/resumes/{resumeId}/download', 'Owner or linked employer: download private PDF', { binary: true });
add('post', '/jobs/{jobId}/applications', 'Candidate: apply once using own resume', { created: true, body: object({ resumeId: id, coverLetter: { ...string, maxLength: 5000 } }, ['resumeId']) });
add('get', '/applications/me', 'Candidate: own applications', { list: true, parameters: [...page, query('status', status)] });
add('get', '/jobs/{jobId}/applications', 'Owning employer: job applicants', { list: true, parameters: [...page, query('status', status)] });
add('get', '/applications/{applicationId}', 'Owning candidate or employer: application detail');
add('patch', '/applications/{applicationId}/status', 'Owning employer: change status with expected version', { body: object({ status, version: { type: 'integer', minimum: 1 } }, ['status', 'version']) });
add('get', '/notifications/me', 'Employer: own notification inbox', { list: true, parameters: [...page, query('unread', { enum: ['true', 'false'], type: 'string' })] });
add('patch', '/notifications/{notificationId}/read', 'Owning employer: mark read idempotently');

const document = {
  openapi: '3.0.3', info: { title: 'CodeAlpha Job Board API', version: '1.0.0', description: 'Node.js/Express/MongoDB backend. Bearer JWTs expire after one hour. Detailed fields and validation rules are in docs/04-api-contract.md. Import this file into Postman or Swagger Editor.' },
  servers: [{ url: 'http://localhost:5000/api/v1', description: 'Local development; adjust port if needed' }], paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: {
    Success: { type: 'object', required: ['data'], properties: { data: { type: 'object', additionalProperties: true } } },
    ListResponse: { type: 'object', required: ['data', 'meta'], properties: { data: { type: 'array', items: { type: 'object', additionalProperties: true } }, meta: object({ page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } }, ['page', 'limit', 'total', 'totalPages']) } },
    Error: {
      type: 'object', required: ['error'],
      properties: {
        error: {
          type: 'object', required: ['code', 'message'],
          properties: { code: string, message: string, details: { type: 'array', items: { type: 'object' } } },
        },
      },
    },
  } },
};
await writeFile('docs/openapi.json', JSON.stringify(document, null, 2) + '\n');
console.log(`Generated API contract for ${Object.values(paths).reduce((count, methods) => count + Object.keys(methods).length, 0)} operations`);
