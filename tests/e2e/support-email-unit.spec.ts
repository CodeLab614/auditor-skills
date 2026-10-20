import { expect, test } from '@playwright/test';
import {
  getSupportEmail,
  getSupportEmailConfigError,
} from '../../lib/support-email';

test.describe('getSupportEmail', () => {
  test('returns trimmed valid email', () => {
    expect(getSupportEmail({ SUPPORT_EMAIL: 'support@example.com' })).toBe('support@example.com');
  });

  test('trims surrounding whitespace from email', () => {
    expect(getSupportEmail({ SUPPORT_EMAIL: '   support@example.com   ' })).toBe('support@example.com');
  });

  test('returns null when empty or whitespace only', () => {
    expect(getSupportEmail({ SUPPORT_EMAIL: '' })).toBeNull();
    expect(getSupportEmail({ SUPPORT_EMAIL: '   ' })).toBeNull();
  });

  test('returns null when absent or undefined', () => {
    expect(getSupportEmail({})).toBeNull();
    expect(getSupportEmail({ SUPPORT_EMAIL: undefined })).toBeNull();
  });

  test('returns null when invalid email format', () => {
    expect(getSupportEmail({ SUPPORT_EMAIL: 'not-an-email' })).toBeNull();
    expect(getSupportEmail({ SUPPORT_EMAIL: 'invalid@' })).toBeNull();
    expect(getSupportEmail({ SUPPORT_EMAIL: '@example.com' })).toBeNull();
  });
});

test.describe('getSupportEmailConfigError', () => {
  test('names SUPPORT_EMAIL and refers to docs when email is missing or invalid', () => {
    const missingError = getSupportEmailConfigError({});
    expect(missingError).toContain('SUPPORT_EMAIL');
    expect(missingError).toContain('docs/en/01-environment-variables.md');

    const invalidError = getSupportEmailConfigError({ SUPPORT_EMAIL: 'not-an-email' });
    expect(invalidError).toContain('SUPPORT_EMAIL');
  });

  test('returns null when a valid email is provided', () => {
    expect(getSupportEmailConfigError({ SUPPORT_EMAIL: 'support@example.com' })).toBeNull();
    expect(getSupportEmailConfigError({ SUPPORT_EMAIL: '  support@example.com  ' })).toBeNull();
  });
});
