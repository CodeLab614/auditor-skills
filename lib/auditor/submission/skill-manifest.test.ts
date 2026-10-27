import { describe, expect, test } from 'bun:test';
import { parseSkillManifest } from './skill-manifest';

describe('parseSkillManifest', () => {
  test.each([
    ['inline values', '---\nname: review\ndescription: Review code\n---\nBody', {
      name: 'review',
      description: 'Review code',
    }],
    ['quoted values', '---\nname: "review code"\ndescription: \'Inspect changes\'\n---', {
      name: 'review code',
      description: 'Inspect changes',
    }],
    ['block values', '---\nname: review\ndescription: >\n  Inspect\n  code changes\n---', {
      name: 'review',
      description: 'Inspect code changes',
    }],
  ] as const)('reads %s', (
    _label: string,
    text: string,
    expected: { name: string; description: string },
  ) => {
    expect(parseSkillManifest(text)).toEqual(expected);
  });

  test.each([
    ['name: review\ndescription: Review code'],
    ['---\ndescription: Review code\n---'],
    ['---\nname: review\ndescription:   \n---'],
  ] as const)('rejects invalid front matter', (text: string) => {
    expect(parseSkillManifest(text)).toBeNull();
  });
});
