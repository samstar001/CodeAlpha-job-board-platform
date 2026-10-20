// Import the database client generated from prisma/schema.prisma.
import { PrismaClient } from '@prisma/client';

// Share one client instance across modules instead of creating a connection pool per request.
export const prisma = new PrismaClient();
