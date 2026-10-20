
// Load environment settings and Prisma's CLI configuration helpers.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Tell the Prisma CLI where the schema lives and how to connect to MongoDB.
export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
