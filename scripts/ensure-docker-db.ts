import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';
import {
  checkDockerPrerequisites,
  commandErrorOutput,
  ensureDockerDatabase,
} from './lib/docker';

const envPath = path.resolve(process.cwd(), '.env');
const env = existsSync(envPath) ? parse(readFileSync(envPath)) : {};

async function main(): Promise<void> {
  if (env.DOCKER_DATABASE !== 'true') return;

  try {
    const prerequisiteError = checkDockerPrerequisites();
    if (prerequisiteError) throw new Error(prerequisiteError);
    await ensureDockerDatabase(env.DB_PORT);
  } catch (error) {
    const reason = commandErrorOutput(error);
    process.stderr.write(
      [
        'The database is configured to run in Docker, but Docker is not running or the database could not start.',
        'Open Docker Desktop, OrbStack, or Colima, start the Docker engine, then run `bun dev` again.',
        `Reason: ${reason}`,
        'Guide: docs/en/03-docker.md (Spanish: docs/es/03-docker.md)',
        '',
      ].join('\n'),
    );
    process.exitCode = 1;
  }
}

void main();
