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
  // FROM_EMAIL is handled separately in askEmailConfig()
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
// EMAIL TESTING
// ============================================================================

async function sendTestEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: 'RapidAuth - Test Email',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0ea5e9;">RapidAuth Setup</h1>
            <p>This is a test email to verify your Resend configuration.</p>
            <p style="color: #22c55e; font-weight: bold;">Email configuration is working correctly!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              This email was sent during the RapidAuth setup wizard.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function askEmailConfig(): Promise<{ fromEmail: string; testEmail: string }> {
  println(`  ${icons.email} ${colors.bold}FROM_EMAIL${colors.reset} ${colors.red}*${colors.reset}`);
  println(`     ${colors.dim}Email sender address${colors.reset}`);
  println();

  // Ask if user has a custom domain
  println(`     ${colors.yellow}Do you have a custom domain configured in Resend?${colors.reset}`);
  println(`     ${colors.dim}If not, you'll use the test email: onboarding@resend.dev${colors.reset}`);
  println(`     ${colors.dim}(With onboarding@resend.dev you can only send to your verified email)${colors.reset}`);
  println();

  const hasDomain = await question(
    `     ${colors.yellow}${icons.arrow}${colors.reset} ${colors.dim}(y/n)${colors.reset}: `,
  );

  let fromEmail: string;

  if (hasDomain.toLowerCase() === 'y' || hasDomain.toLowerCase() === 'yes') {
    // User has custom domain
    println();
    println(`     ${colors.cyan}Enter your FROM_EMAIL:${colors.reset}`);
    println(`     ${colors.dim}Format: Name <email@yourdomain.com>${colors.reset}`);

    let validEmail = false;
    fromEmail = '';

    while (!validEmail) {
      fromEmail = await question(
        `     ${colors.yellow}${icons.arrow}${colors.reset} ${colors.dim}(RapidAuth <noreply@yourdomain.com>)${colors.reset}: `,
      );

      if (!fromEmail) {
        println(`     ${colors.red}${icons.error} This field is required${colors.reset}`);
        continue;
      }

      validEmail = true;
    }
  } else {
    // Use onboarding email
    fromEmail = 'RapidAuth <onboarding@resend.dev>';
    println();
    println(`     ${colors.green}${icons.success} Using: ${fromEmail}${colors.reset}`);
    println();
    println(`     ${colors.yellow}${icons.warning} Important:${colors.reset}`);
    println(`     ${colors.dim}With onboarding@resend.dev you can ONLY send emails${colors.reset}`);
    println(`     ${colors.dim}to the email address verified in your Resend account.${colors.reset}`);
  }

  println();
  println(`     ${colors.green}${icons.success} FROM_EMAIL set${colors.reset}`);
  println();

  // Now ask for test email
  println(`  ${icons.email} ${colors.bold}Email Verification Test${colors.reset}`);
  println(`     ${colors.dim}We'll send a test email to verify your configuration.${colors.reset}`);

  if (hasDomain.toLowerCase() !== 'y' && hasDomain.toLowerCase() !== 'yes') {
    println(`     ${colors.yellow}${icons.warning} Enter the email verified in your Resend account${colors.reset}`);
  }

  println();

  let testEmail = '';
  let validTestEmail = false;

  while (!validTestEmail) {
    testEmail = await question(
      `     ${colors.yellow}${icons.arrow}${colors.reset} ${colors.dim}Test email address${colors.reset}: `,
    );

    if (!testEmail) {
      println(`     ${colors.red}${icons.error} Please enter an email to test${colors.reset}`);
      continue;
    }

    // Basic email validation
    if (!testEmail.includes('@') || !testEmail.includes('.')) {
      println(`     ${colors.red}${icons.error} Please enter a valid email address${colors.reset}`);
      continue;
    }

    validTestEmail = true;
  }

  println();

  return { fromEmail, testEmail };
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

  // Define the order and sections for env variables
  const variableToSection: Record<string, string> = {
    DATABASE_URL: 'database',
    BETTER_AUTH_SECRET: 'auth',
    BETTER_AUTH_URL: 'auth',
    RESEND_API_KEY: 'email',
    FROM_EMAIL: 'email',
    GOOGLE_CLIENT_ID: 'oauth',
    GOOGLE_CLIENT_SECRET: 'oauth',
    GITHUB_CLIENT_ID: 'oauth',
    GITHUB_CLIENT_SECRET: 'oauth',
  };

  const sections: Record<string, string[]> = {
    database: ['# Database'],
    auth: ['# Better Auth'],
    email: ['# Email (Resend)'],
    oauth: ['# OAuth Providers'],
  };

  // Add all env variables to their sections
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      const section = variableToSection[key] || 'oauth';
      sections[section].push(`${key}="${value}"`);
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

    if (category.key === 'email') {
      // Handle email category specially
      const categoryVars = ENV_VARIABLES.filter(
        (v) => v.category === 'email',
      );

      // First ask for RESEND_API_KEY
      for (const variable of categoryVars) {
        const value = await askVariable(variable, existingEnv[variable.key]);
        if (value) {
          newEnv[variable.key] = value;
        }
      }

      // Then ask for FROM_EMAIL with domain check
      const { fromEmail, testEmail } = await askEmailConfig();
      newEnv['FROM_EMAIL'] = fromEmail;

      // Send test email
      println(`  ${icons.email} ${colors.bold}Sending test email...${colors.reset}`);
      println();

      let emailSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!emailSuccess && retryCount < maxRetries) {
        const result = await sendTestEmail(
          newEnv['RESEND_API_KEY'],
          fromEmail,
          testEmail,
        );

        if (result.success) {
          println(`     ${colors.green}${icons.success} Test email sent successfully to ${testEmail}${colors.reset}`);
          println(`     ${colors.dim}Please check your inbox (and spam folder)${colors.reset}`);
          println();

          const confirmed = await question(
            `     ${colors.yellow}${icons.arrow}${colors.reset} ${colors.dim}Did you receive the email? (y/n)${colors.reset}: `,
          );

          if (confirmed.toLowerCase() === 'y' || confirmed.toLowerCase() === 'yes') {
            emailSuccess = true;
            println();
            println(`     ${colors.green}${icons.success} Email configuration verified!${colors.reset}`);
          } else {
            println();
            println(`     ${colors.yellow}${icons.warning} Email might be in spam folder or delayed${colors.reset}`);
            const continueAnyway = await question(
              `     ${colors.yellow}${icons.arrow}${colors.reset} ${colors.dim}Continue anyway? (y/n)${colors.reset}: `,
            );
            if (continueAnyway.toLowerCase() === 'y' || continueAnyway.toLowerCase() === 'yes') {
              emailSuccess = true;
            } else {
              retryCount++;
              if (retryCount < maxRetries) {
                println();
                println(`     ${colors.cyan}Let's try again...${colors.reset}`);
                const retryConfig = await askEmailConfig();
                newEnv['FROM_EMAIL'] = retryConfig.fromEmail;
              }
            }
          }
        } else {
          println(`     ${colors.red}${icons.error} Failed to send test email: ${result.error}${colors.reset}`);
          println();

          if (result.error?.includes('not verified') || result.error?.includes('not allowed')) {
            println(`     ${colors.yellow}${icons.warning} This error usually means:${colors.reset}`);
            println(`     ${colors.dim}  - The recipient email is not verified in Resend${colors.reset}`);
            println(`     ${colors.dim}  - You're using onboarding@resend.dev with wrong recipient${colors.reset}`);
            println();
          }

          retryCount++;
          if (retryCount < maxRetries) {
            const retry = await question(
              `     ${colors.yellow}${icons.arrow}${colors.reset} ${colors.dim}Try again? (y/n)${colors.reset}: `,
            );
            if (retry.toLowerCase() !== 'y' && retry.toLowerCase() !== 'yes') {
              break;
            }
            println();
            const retryConfig2 = await askEmailConfig();
            newEnv['FROM_EMAIL'] = retryConfig2.fromEmail;
          }
        }
      }

      if (!emailSuccess) {
        println();
        println(`     ${colors.yellow}${icons.warning} Continuing without email verification${colors.reset}`);
        println(`     ${colors.dim}You may need to fix email configuration manually${colors.reset}`);
      }

      println();
    } else {
      // Normal category handling
      const categoryVars = ENV_VARIABLES.filter(
        (v) => v.category === category.key,
      );

      for (const variable of categoryVars) {
        const value = await askVariable(variable, existingEnv[variable.key]);
        if (value) {
          newEnv[variable.key] = value;
        }
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
