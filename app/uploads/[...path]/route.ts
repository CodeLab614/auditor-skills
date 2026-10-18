import { NextResponse } from 'next/server';
import { resolve } from 'node:path';
import { getStorage, getStorageDriver, resolveLocalStoragePath } from '@/lib/storage';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  if (getStorageDriver() !== 'local') return new Response('Not found', { status: 404 });
  const { path: segments } = await context.params;
  if (!Array.isArray(segments) || segments.length === 0) return new Response('Not found', { status: 404 });

  let key: string;
  try {
    key = segments.join('/');
    resolveLocalStoragePath(resolve(process.cwd(), 'storage', 'uploads'), key);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType = contentTypes[extension];
  if (!contentType) return new Response('Not found', { status: 404 });

  try {
    const bytes = await getStorage().get(key);
    if (!bytes) return new Response('Not found', { status: 404 });
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Local file delivery error:', error);
    return new Response('Not found', { status: 404 });
  }
}
