#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as crypto from "node:crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

// Create Prisma client with pg adapter (same as lib/prisma.ts)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: true,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// COLORS
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

const icons = {
  success: "✓",
  info: "ℹ",
  arrow: "→",
};

// ============================================================================
// PASSWORD HASHING (Better Auth compatible)
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  // Better Auth uses Scrypt by default
  // We'll use a compatible hash format
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ============================================================================
// SEED DATA
// ============================================================================

const ADMIN_USER = {
  name: "Administrator",
  email: "admin@admin.com",
  password: "Admin123!",
  role: "admin",
  emailVerified: true,
};

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log();
  console.log(`${colors.cyan}${icons.arrow} Seeding database...${colors.reset}`);
  console.log();

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_USER.email },
  });

  if (existingAdmin) {
    console.log(`${colors.yellow}${icons.info} Admin user already exists, skipping...${colors.reset}`);
    return;
  }

  // Create admin user
  const hashedPassword = await hashPassword(ADMIN_USER.password);

  const admin = await prisma.user.create({
    data: {
      name: ADMIN_USER.name,
      email: ADMIN_USER.email,
      emailVerified: ADMIN_USER.emailVerified,
      role: ADMIN_USER.role,
      accounts: {
        create: {
          accountId: ADMIN_USER.email,
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  console.log(`${colors.green}${icons.success} Created admin user:${colors.reset}`);
  console.log(`   ${colors.dim}Email:    ${ADMIN_USER.email}${colors.reset}`);
  console.log(`   ${colors.dim}Password: ${ADMIN_USER.password}${colors.reset}`);
  console.log(`   ${colors.dim}Role:     ${ADMIN_USER.role}${colors.reset}`);
  console.log();

  // Log admin creation activity
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: "account_created",
      details: JSON.stringify({ method: "seed", role: "admin" }),
    },
  });

  console.log(`${colors.green}${icons.success} Seed completed successfully${colors.reset}`);
  console.log();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
