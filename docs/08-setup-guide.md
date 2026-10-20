# Installation, environment, and Prisma guide

This is a guide for the upcoming implementation, not a claim that the app is running. You will create and populate `.env`; `.env.example` contains placeholders only. Never send or commit credentials.

## 1. Prerequisites

Use Node.js 22 LTS and npm, Git, an API client such as Postman, and a MongoDB replica set. Atlas is a convenient option: create a database user, allow your development IP, and obtain the driver connection string. Include the database name `job_board` in that string. URL-encode special characters in the username/password. A local standalone mongod is insufficient for our transactions; configure a replica set if running locally.

## 2. Initialize and install

Run these from the project root when starting phase 1:

```powershell
npm init -y
npm pkg set type=module
npm install express zod bcrypt jsonwebtoken multer dotenv cors helmet express-rate-limit
npm install --save-exact @prisma/client@6.19.0
npm install --save-dev --save-exact prisma@6.19.0
npm install --save-dev nodemon vitest supertest
```

| Package | Purpose |
| --- | --- |
| express | Routes and HTTP middleware |
| @prisma/client | Generated MongoDB query client |
| zod | Validate requests and environment variables |
| bcrypt | Hash and verify passwords |
| jsonwebtoken | Sign and verify access tokens |
| multer | Parse bounded multipart file uploads |
| dotenv | Load .env into process.env |
| cors | Configure allowed browser origins |
| helmet | HTTP security headers |
| express-rate-limit | Limit repeated authentication attempts |
| prisma (development) | Schema validation, generation, index synchronization |
| nodemon (development) | Restart server while editing |
| vitest (development) | Test runner and assertions |
| supertest (development) | Exercise Express HTTP routes in tests |

Node's built-in `fs/promises`, `path`, and `crypto` handle files, paths, and generated filenames; no installation needed. We do not need Mongoose or the MongoDB driver directly for this Prisma 6 plan. Commit package.json and package-lock.json. Review installation output for compatibility/security issues before proceeding.

## 3. Create your environment file

Create `.env` manually using `.env.example` as the template. Set DATABASE_URL to your development database; keep TEST_DATABASE_URL pointed at a different database reserved for tests. JWT_SECRET must be a long random secret; generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

PORT is the API port. JWT_EXPIRES_IN controls token lifetime. UPLOAD_DIR is resolved from the project root; MAX_RESUME_BYTES sets the 5 MiB limit. CORS_ORIGIN is the permitted frontend origin if a frontend is later used; Postman does not need CORS permission. NODE_ENV selects development/test/production behavior. The application must load dotenv before validating configuration.

## 4. Initialize Prisma 6

After `.env` exists:

```powershell
npx prisma init --datasource-provider mongodb
```

If the CLI offers to create an environment file, keep your existing `.env`. In `prisma/schema.prisma`, use this initial learning example; the full models are added in the foundation phase:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  email        String   @unique
  passwordHash String
  role         Role
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Role {
  CANDIDATE
  EMPLOYER
}
```

`@map("_id")` maps the application's id to MongoDB's `_id`. `@db.ObjectId` selects the BSON ObjectId type; `auto()` generates it. Reference fields such as userId must also use `String @db.ObjectId`. `@unique` creates a unique index.

## 5. Synchronize the schema and generate the client

```powershell
npx prisma format
npx prisma validate
npx prisma db push
npx prisma generate
npx prisma studio
```

Format tidies the schema; validate checks its structure; db push synchronizes supported schema/index changes; generate creates the JavaScript query client; Studio opens a data browser. Successful generation does not prove the database connection works. Verify db push succeeds, then perform a real create/read through the implementation before declaring setup complete.

**These instructions intentionally target Prisma 6.19.0.** Do not mix them with unversioned latest-major tutorials. Prisma 6 with MongoDB does not use `prisma migrate dev` or `prisma migrate deploy` and does not create a migration history folder. Its db push workflow is schema synchronization, not versioned data migration. Prisma 8 has a different MongoDB migration system, outside this project's pinned workflow.

## 6. Handle later schema changes

Edit schema → format → validate → review the change → back up important data → db push against development → generate → test affected behavior → commit schema, lockfile, and any backfill script. Adding required fields does not automatically populate old documents. For existing data, add fields as optional first, run an explicit repeatable backfill, verify all records, then make fields required. Unique indexes require existing duplicates to be resolved first. Do not use force-reset or accept-data-loss flags as routine setup steps.

Track data transformations under `prisma/data-changes/`, documenting target database, checks, and execution result. db push has no automatic rollback history. A fresh clone should use `npm ci`, create its own .env, generate the client, synchronize a new database, and run the documented seed/start scripts once those scripts exist.

## 7. GitHub submission

Submit the repository URL to the CodeAlpha internship Google Form yourself. The form URL has not been provided and no form has been submitted. Before submission, verify the intended branch is pushed, the reviewer can access the repository, and README includes installation/start/test commands, environment variable names, endpoints, example requests, and project limitations. A hosted API is not assumed required from the screenshot. Use fictional seed data and a dummy resume; actual uploads remain local and out of Git.

Sources: [MongoDB's Prisma integration guide](https://www.mongodb.com/docs/drivers/node/current/integrations/prisma/), [Prisma MongoDB setup and db push](https://www.prisma.io/docs/v7/prisma-orm/add-to-existing-project/mongodb), [Prisma version release status](https://www.prisma.io/docs/orm/release-status). The v6 choice is a deadline-scoped compatibility decision, not a claim that it is the newest major release.
