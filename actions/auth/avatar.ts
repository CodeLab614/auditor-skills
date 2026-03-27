'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { logActivity } from '@/actions/activity-log';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

export const uploadAvatarAction = async (
  formData: FormData
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: { imageUrl: string } | null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    const file = formData.get('avatar') as File | null;

    if (!file || !(file instanceof File)) {
      return {
        response: 'error',
        message: 'No file provided',
        data: null,
      };
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        response: 'error',
        message: 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.',
        data: null,
      };
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return {
        response: 'error',
        message: 'File too large. Maximum size is 4MB.',
        data: null,
      };
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Delete previous avatars for this user
    const existingFiles = await readdir(UPLOAD_DIR);
    for (const f of existingFiles) {
      if (f.startsWith(session.user.id + '.')) {
        await unlink(path.join(UPLOAD_DIR, f));
      }
    }

    // Get file extension from mime type
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const fileName = `${session.user.id}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Update user image in database
    const imageUrl = `/uploads/avatars/${fileName}?t=${Date.now()}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    await logActivity(session.user.id, 'avatar_change');

    return {
      response: 'success',
      message: 'Avatar updated successfully',
      data: { imageUrl },
    };
  } catch (error) {
    console.error('Avatar upload error:', error);
    return {
      response: 'error',
      message: 'Failed to upload avatar',
      data: null,
    };
  }
};
