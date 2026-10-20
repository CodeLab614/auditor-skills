import { expect, test } from '@playwright/test';
import {
  getBetterAuthIpAddressOptions,
  getClientIpFromHeaders,
  resolveTrustedProxy,
} from '../../lib/client-ip';

test('trusted proxy modes select only their configured valid IP header', () => {
  const headers = new Headers({
    'x-forwarded-for': '198.51.100.50',
    'x-vercel-forwarded-for': '203.0.113.10',
    'cf-connecting-ip': '2001:db8::10',
    'x-real-ip': '192.0.2.25',
  });

  expect(getClientIpFromHeaders(headers, 'none')).toBeNull();
  expect(getClientIpFromHeaders(headers, 'vercel')).toBe('203.0.113.10');
  expect(getClientIpFromHeaders(headers, 'cloudflare')).toBe('2001:db8::10');
  expect(getClientIpFromHeaders(headers, 'proxy')).toBe('192.0.2.25');
});

test('invalid IPs and unknown proxy values are treated as unknown', () => {
  expect(
    getClientIpFromHeaders(
      new Headers({ 'cf-connecting-ip': 'not-an-ip' }),
      'cloudflare',
    ),
  ).toBeNull();
  expect(resolveTrustedProxy('unrecognized')).toBe('none');
  expect(getBetterAuthIpAddressOptions('none')).toEqual({
    disableIpTracking: true,
  });
  expect(getBetterAuthIpAddressOptions('vercel')).toEqual({
    disableIpTracking: false,
    ipAddressHeaders: ['x-vercel-forwarded-for'],
  });
});
