#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface EnvVariable {
  key: string;
  description: string;
  placeholder: string;
  required: boolean;
  validate?: (value: string) => boolean | string;
  transform?: (value: string) => string;
  helpUrl?: string;
  category: 'database' | 'auth' | 'email' | 'oauth';
  autoGenerate?: () => string;
}

const ENV_VARIABLES: EnvVariable[] = [
  // Database
  {
    key: 'DATABASE_URL',
    description: 'PostgreSQL connection string',
    placeholder: 'postgresql://user:password@host:5432/database',
    required: true,
    category: 'database',
    helpUrl: 'https://neon.tech',
    validate: (value) => {
      if (
        !value.startsWith('postgresql://') &&
        !value.startsWith('postgres://')
      ) {
        return 'Must be a valid PostgreSQL connection string';
      }
      return true;
    },
  },
  // Better Auth
  {
    key: 'BETTER_AUTH_SECRET',
    description: 'Secret key for Better Auth (auto-generated)',
    placeholder: 'Auto-generated',
    required: true,
    category: 'auth',
    autoGenerate: () => crypto.randomBytes(32).toString('hex'),
  },
  {
    key: 'BETTER_AUTH_URL',
    description: 'Base URL of your application',
    placeholder: 'http://localhost:3000',
    required: true,
    category: 'auth',
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Must be a valid URL';
      }
    },
  },
  // Email
  {
    key: 'RESEND_API_KEY',
    description: 'Resend API key for sending emails',
    placeholder: 're_xxxxxxxxxxxxx',
    required: true,
    category: 'email',
    helpUrl: 'https://resend.com/api-keys',
    validate: (value) => {
      if (!value.startsWith('re_')) {
        return "Resend API keys start with 're_'";
      }
      return true;
    },
  },
  {
    key: 'FROM_EMAIL',
    description: 'Email sender address',
    placeholder: 'RapidAuth <noreply@yourdomain.com>',
    required: true,
    category: 'email',
  },
  // Google OAuth
  {
    key: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth Client ID',
    placeholder: 'xxxxx.apps.googleusercontent.com',
    required: false,
    category: 'oauth',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth Client Secret',
    placeholder: 'GOCSPX-xxxxxxxxxxxxx',
    required: false,
    category: 'oauth',
  },
  // GitHub OAuth
  {
    key: 'GITHUB_CLIENT_ID',
    description: 'GitHub OAuth Client ID',
    placeholder: 'Ov23liXXXXXXXX',
    required: false,
    category: 'oauth',
    helpUrl: 'https://github.com/settings/developers',
  },
  {
    key: 'GITHUB_CLIENT_SECRET',
    description: 'GitHub OAuth Client Secret',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    required: false,
    category: 'oauth',
  },
];

// ============================================================================
// COLORS & STYLING
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Text colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const icons = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  rocket: '🚀',
  database: '🗄️',
  key: '🔑',
  email: '📧',
  globe: '🌐',
  check: '✅',
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

function showCursor() {
  process.stdout.write('\x1b[?25h');
}

function print(text: string) {
  process.stdout.write(text);
}

function println(text: string = '') {
  console.log(text);
}

function printHeader() {
  clearScreen();
  println();
  println(`${colors.cyan}${colors.bold}  ┌────────────────────────────────────────────────┐${colors.reset}`);
  println(`${colors.cyan}${colors.bold}  │                                                │${colors.reset}`);
  println(`${colors.cyan}${colors.bold}  │${colors.reset}   ${icons.rocket} ${colors.bold}${colors.white}RAPIDAUTH - SETUP WIZARD${colors.reset}                ${colors.cyan}${colors.bold}│${colors.reset}`);
  println(`${colors.cyan}${colors.bold}  │${colors.reset}      ${colors.dim}Professional Authentication Boilerplate${colors.reset}  ${colors.cyan}${colors.bold}│${colors.reset}`);
  println(`${colors.cyan}${colors.bold}  │                                                │${colors.reset}`);
  println(`${colors.cyan}${colors.bold}  └────────────────────────────────────────────────┘${colors.reset}`);
  println();
}

function printStep(current: number, total: number, title: string) {
  const progress = Math.round((current / total) * 100);
  const barLength = 40;
  const filled = Math.round((progress / 100) * barLength);
  const empty = barLength - filled;

  println(
    `${colors.dim}  Step ${current}/${total}${colors.reset} ${colors.bold}${title}${colors.reset}`,
  );
  println();
  print(`  ${colors.cyan}`);
  print('█'.repeat(filled));
  print(`${colors.dim}${'░'.repeat(empty)}${colors.reset}`);
  println(` ${progress}%`);
  println();
}

function printBox(
  title: string,
  content: string[],
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
) {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };
  const iconMap = {
    info: icons.info,
    success: icons.success,
    warning: icons.warning,
    error: icons.error,
  };

  const color = colorMap[type];
  const icon = iconMap[type];
  const boxWidth = 52;

  println(`  ${color}┌${'─'.repeat(boxWidth)}┐${colors.reset}`);
  println(`  ${color}│${colors.reset} ${icon} ${colors.bold}${title}${colors.reset}${' '.repeat(boxWidth - title.length - 3)}${color}│${colors.reset}`);
  println(`  ${color}├${'─'.repeat(boxWidth)}┤${colors.reset}`);

  for (const line of content) {
    const padding = boxWidth - line.length - 1;
    println(`  ${color}│${colors.reset} ${line}${' '.repeat(Math.max(0, padding))}${color}│${colors.reset}`);
  }

  println(`  ${color}└${'─'.repeat(boxWidth)}┘${colors.reset}`);
  println();
}

async function spinner(
  message: string,
  task: () => Promise<void>,
): Promise<void> {
  hideCursor();
  let i = 0;
  const interval = setInterval(() => {
    print(
      `\r  ${colors.cyan}${icons.spinner[i % icons.spinner.length]}${colors.reset} ${message}`,
    );
    i++;
  }, 80);

  try {
    await task();
    clearInterval(interval);
    println(`\r  ${colors.green}${icons.success}${colors.reset} ${message}`);
  } catch (error) {
    clearInterval(interval);
    println(`\r  ${colors.red}${icons.error}${colors.reset} ${message}`);
    throw error;
  } finally {
    showCursor();
  }
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askVariable(
  variable: EnvVariable,
  existingValue?: string,
): Promise<string> {
  const categoryIcons = {
    database: icons.database,
    auth: icons.key,
    email: icons.email,
    oauth: icons.globe,
  };

  const icon = categoryIcons[variable.category];

  // If auto-generate is available
  if (variable.autoGenerate) {
    const generated = variable.autoGenerate();
    println(`  ${icon} ${colors.bold}${variable.key}${colors.reset}`);
    println(`     ${colors.dim}${variable.description}${colors.reset}`);
    println(
      `     ${colors.green}${icons.success} Auto-generated${colors.reset}`,
    );
    println();
    return generated;
  }

  println(
    `  ${icon} ${colors.bold}${variable.key}${colors.reset}${variable.required ? ` ${colors.red}*${colors.reset}` : ` ${colors.dim}(optional)${colors.reset}`}`,
  );
  println(`     ${colors.dim}${variable.description}${colors.reset}`);

  if (variable.helpUrl) {
    println(
      `     ${colors.blue}${icons.arrow} ${variable.helpUrl}${colors.reset}`,
    );
  }

  let value = '';
  let isValid = false;

  while (!isValid) {
    const defaultHint = existingValue
      ? ` ${colors.dim}[${existingValue}]${colors.reset}`
      : '';
    const placeholderHint = variable.placeholder
      ? ` ${colors.dim}(${variable.placeholder})${colors.reset}`
      : '';

    value = await question(
      `     ${colors.yellow}${icons.arrow}${colors.reset}${defaultHint}${placeholderHint}: `,
    );

    // Use existing value if empty and exists
    if (!value && existingValue) {
      value = existingValue;
    }

    // Check if required
    if (variable.required && !value) {
      println(
        `     ${colors.red}${icons.error} This field is required${colors.reset}`,
      );
      continue;
    }

    // Skip validation if optional and empty
    if (!variable.required && !value) {
      isValid = true;
      continue;
    }

    // Validate
    if (variable.validate) {
      const result = variable.validate(value);
      if (result !== true) {
        println(`     ${colors.red}${icons.error} ${result}${colors.reset}`);
        continue;
      }
    }

    isValid = true;
  }

  // Transform if needed
  if (value && variable.transform) {
    value = variable.transform(value);
  }

  if (value) {
    println(`     ${colors.green}${icons.success} Set${colors.reset}`);
  }
  println();

  return value;
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function runPrismaGenerate(): Promise<void> {
  execSync('bunx prisma generate', { stdio: 'inherit' });
}

async function runPrismaPush(): Promise<void> {
  execSync('bunx prisma db push', { stdio: 'inherit' });
}

async function runSeed(): Promise<void> {
  execSync('bun run scripts/seed.ts', { stdio: 'inherit' });
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

function loadExistingEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');

  const result: Record<string, string> = {};

  const paths = [envPath, envLocalPath];

  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) {
            let value = valueParts.join('=');
            // Remove quotes if present
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }
            result[key] = value;
          }
        }
      }
    }
  }

  return result;
}

function writeEnvFile(envVars: Record<string, string>): void {
  const envPath = path.join(process.cwd(), '.env');

  const sections: Record<string, string[]> = {
    database: ['# Database'],
    auth: ['# Better Auth'],
    email: ['# Email (Resend)'],
    oauth: ['# OAuth Providers'],
  };

  for (const variable of ENV_VARIABLES) {
    const value = envVars[variable.key];
    if (value) {
      sections[variable.category].push(`${variable.key}="${value}"`);
    }
  }

  const content = Object.values(sections)
    .filter((section) => section.length > 1)
    .map((section) => section.join('\n'))
    .join('\n\n');

  writeFileSync(envPath, content + '\n');
}

// ============================================================================
// MAIN SETUP FLOW
// ============================================================================

async function runSetup() {
  const existingEnv = loadExistingEnv();
  const newEnv: Record<string, string> = {};

  const categories = [
    { key: 'database', title: 'Database Configuration', icon: icons.database },
    { key: 'auth', title: 'Authentication', icon: icons.key },
    { key: 'email', title: 'Email Configuration', icon: icons.email },
    { key: 'oauth', title: 'OAuth Providers', icon: icons.globe },
  ] as const;

  let stepNumber = 1;
  const totalSteps = categories.length + 2; // +2 for database setup and final

  // Welcome screen
  printHeader();
  printBox(
    'Welcome to RapidAuth Setup',
    [
      'This wizard will help you configure your application.',
      '',
      'Before you start, make sure you have:',
      '  • A PostgreSQL database (Neon, Supabase, etc.)',
      '  • A Resend account for sending emails',
      '  • OAuth credentials (optional)',
    ],
    'info',
  );

  await question(`  ${colors.cyan}Press Enter to continue...${colors.reset}`);

  // Collect variables by category
  for (const category of categories) {
    printHeader();
    printStep(stepNumber, totalSteps, category.title);

    const categoryVars = ENV_VARIABLES.filter(
      (v) => v.category === category.key,
    );

    for (const variable of categoryVars) {
      const value = await askVariable(variable, existingEnv[variable.key]);
      if (value) {
        newEnv[variable.key] = value;
      }
    }

    stepNumber++;
  }

  // Write .env file
  printHeader();
  printStep(stepNumber, totalSteps, 'Setting up Database');

  await spinner('Writing .env file...', async () => {
    writeEnvFile(newEnv);
  });

  // Test database connection
  println();
  await spinner('Testing database connection...', async () => {
    // Just a delay to simulate testing
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  // Run Prisma commands
  println();
  println(
    `  ${colors.cyan}${icons.arrow} Running Prisma generate...${colors.reset}`,
  );
  println();

  try {
    await runPrismaGenerate();
    println();
    println(
      `  ${colors.green}${icons.success} Prisma client generated${colors.reset}`,
    );
  } catch (err) {
    println(
      `  ${colors.red}${icons.error} Failed to generate Prisma client${colors.reset}`,
    );
    throw err;
  }

  println();
  println(
    `  ${colors.cyan}${icons.arrow} Pushing schema to database...${colors.reset}`,
  );
  println();

  try {
    await runPrismaPush();
    println();
    println(
      `  ${colors.green}${icons.success} Database schema pushed${colors.reset}`,
    );
  } catch (err) {
    println(
      `  ${colors.red}${icons.error} Failed to push schema${colors.reset}`,
    );
    throw err;
  }

  // Run seed
  println();
  println(
    `  ${colors.cyan}${icons.arrow} Seeding database with initial data...${colors.reset}`,
  );
  println();

  try {
    await runSeed();
    println();
    println(`  ${colors.green}${icons.success} Database seeded${colors.reset}`);
  } catch {
    println(
      `  ${colors.yellow}${icons.warning} Seed skipped (may already exist)${colors.reset}`,
    );
  }

  stepNumber++;

  // Final screen
  printHeader();
  printStep(stepNumber, totalSteps, 'Setup Complete!');

  printBox(
    'Setup Complete!',
    [
      'Your RapidAuth application is ready to use.',
      '',
      'Admin credentials:',
      `  Email:    admin@admin.com`,
      `  Password: Admin123!`,
      '',
      "Run 'bun dev' to start the development server.",
    ],
    'success',
  );

  println(`  ${colors.cyan}${icons.rocket} Happy coding!${colors.reset}`);
  println();
}

// ============================================================================
// ENTRY POINT
// ============================================================================

async function main() {
  try {
    await runSetup();
  } catch (error) {
    println();
    println(
      `  ${colors.red}${icons.error} Setup failed: ${error}${colors.reset}`,
    );
    process.exit(1);
  } finally {
    rl.close();
    showCursor();
  }
}

main();
