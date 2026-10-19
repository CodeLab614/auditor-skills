import { createHmac } from 'node:crypto';

function decodeBase32(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  for (const character of secret.toUpperCase().replace(/=+$/, '')) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error('Invalid base32 TOTP secret');
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpFromBytes(secret: Buffer, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

export function generateTotp(secret: string, timestamp = Date.now()) {
  return generateTotpFromBytes(decodeBase32(secret), timestamp);
}

export function generateTotpForStoredSecret(secret: string, timestamp = Date.now()) {
  return generateTotpFromBytes(Buffer.from(secret), timestamp);
}

export function generateInvalidTotp(secret: string) {
  const now = Date.now();
  const acceptedCodes = new Set(
    [-30_000, 0, 30_000].map((offset) => generateTotp(secret, now + offset)),
  );

  for (let candidate = 0; candidate < 1_000_000; candidate += 1) {
    const code = String(candidate).padStart(6, '0');
    if (!acceptedCodes.has(code)) return code;
  }

  throw new Error('Could not generate an invalid TOTP code');
}
