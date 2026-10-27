import { readFile } from 'node:fs/promises';

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type PyprojectManifest = {
  project?: {
    dependencies?: string[];
  };
  'dependency-groups'?: Record<string, string[]>;
  'build-system'?: {
    requires?: string[];
  };
};

declare const Bun: {
  TOML: {
    parse: (content: string) => Record<string, unknown>;
  };
};

const packagePath = new URL('../package.json', import.meta.url);
const pyprojectPath = new URL('../worker/pyproject.toml', import.meta.url);

const packageManifest = JSON.parse(await readFile(packagePath, 'utf8')) as PackageManifest;
const pyprojectToml = await readFile(pyprojectPath, 'utf8');
const pyprojectManifest = Bun.TOML.parse(pyprojectToml) as PyprojectManifest;

const invalid: string[] = [];

for (const section of ['dependencies', 'devDependencies'] as const) {
  for (const [name, version] of Object.entries(packageManifest[section] ?? {})) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      invalid.push(`package.json: ${section}.${name}: ${version}`);
    }
  }
}

const pythonExactVersionPattern = /^[a-zA-Z0-9_.-]+(?:\[[a-zA-Z0-9_,.-]+\])?==\d+\.\d+\.\d+$/;

for (const dep of pyprojectManifest.project?.dependencies ?? []) {
  if (!pythonExactVersionPattern.test(dep)) {
    invalid.push(`worker/pyproject.toml: project.dependencies: ${dep}`);
  }
}

for (const [group, deps] of Object.entries(pyprojectManifest['dependency-groups'] ?? {})) {
  for (const dep of deps ?? []) {
    if (!pythonExactVersionPattern.test(dep)) {
      invalid.push(`worker/pyproject.toml: dependency-groups.${group}: ${dep}`);
    }
  }
}

for (const req of pyprojectManifest['build-system']?.requires ?? []) {
  if (!pythonExactVersionPattern.test(req)) {
    invalid.push(`worker/pyproject.toml: build-system.requires: ${req}`);
  }
}

if (invalid.length > 0) {
  console.error('Direct dependencies must use complete exact versions:');
  for (const entry of invalid) console.error(`- ${entry}`);
  process.exit(1);
}

console.log('All direct dependencies in package.json and worker/pyproject.toml use complete exact versions.');
