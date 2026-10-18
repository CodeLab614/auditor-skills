export interface DetectedImageType { extension: 'jpg' | 'png' | 'gif' | 'webp'; mimeType: string }

export function getImageTypeFromBytes(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte)) {
    return { extension: 'png', mimeType: 'image/png' };
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].some((sig) => Buffer.from(bytes.subarray(0, 6)).toString('ascii') === sig)) {
    return { extension: 'gif', mimeType: 'image/gif' };
  }
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP') {
    return { extension: 'webp', mimeType: 'image/webp' };
  }
  return null;
}
