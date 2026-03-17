import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Note: sslmode is set via connection string, not ssl object
const connectionString = process.env.DATABASE_URL!.includes('sslmode=')
  ? process.env.DATABASE_URL!
  : `${process.env.DATABASE_URL!}${process.env.DATABASE_URL!.includes('?') ? '&' : '?'}sslmode=verify-full`;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
  },
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
