import { readFile } from 'node:fs/promises';

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const manifest = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;
const invalid: string[] = [];

for (const section of ['dependencies', 'devDependencies'] as const) {
  for (const [name, version] of Object.entries(manifest[section] ?? {})) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      invalid.push(`${section}.${name}: ${version}`);
    }
  }
}

if (invalid.length > 0) {
  console.error('Direct dependencies must use complete exact versions (x.y.z):');
  for (const entry of invalid) console.error(`- ${entry}`);
  process.exit(1);
}

console.log('All direct dependencies use complete exact versions.');
