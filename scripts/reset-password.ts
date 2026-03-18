#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const connectionString = process.env.DATABASE_URL!.includes("sslmode=")
  ? process.env.DATABASE_URL!
  : `${process.env.DATABASE_URL!}${process.env.DATABASE_URL!.includes("?") ? "&" : "?"}sslmode=verify-full`;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EMAIL = "admin@admin.com";
const NEW_PASSWORD = "Admin123!";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`User ${EMAIL} not found`);
    process.exit(1);
  }

  const hashed = await hashPassword(NEW_PASSWORD);

  await prisma.account.updateMany({
    where: { userId: user.id, providerId: "credential" },
    data: { password: hashed },
  });

  console.log(`✓ Password updated for ${EMAIL}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
