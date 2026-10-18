'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
import { logActivity } from '@/lib/activity-log';
import { checkRateLimit } from '@/lib/rate-limit';
import { getImageTypeFromBytes, getStorage } from '@/lib/storage';
import { deleteStoredAvatar } from '@/lib/storage/avatar';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

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

    // Validate file size
    if (file.size > MAX_SIZE) {
      return {
        response: 'error',
        message: 'File too large. Maximum size is 4MB.',
        data: null,
      };
    }

    const rateLimit = await checkRateLimit([
      { key: `avatar:user:${session.user.id}`, window: 600, max: 5 },
    ]);

    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageType = getImageTypeFromBytes(bytes);
    if (!imageType) {
      return {
        response: 'error',
        message: 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.',
        data: null,
      };
    }

    const previous = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });
    const key = `avatars/${session.user.id}-${randomBytes(8).toString('hex')}.${imageType.extension}`;
    const storage = getStorage();
    const imageUrl = await storage.put(key, bytes, imageType.mimeType);

    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
      });
    } catch (error) {
      try { await storage.delete(key); } catch (cleanupError) {
        console.error('Failed to clean up an avatar after the profile update failed:', cleanupError);
      }
      throw error;
    }

    try {
      await deleteStoredAvatar(previous?.image, session.user.id);
    } catch (error) {
      console.error('Failed to delete previous avatar after replacement:', error);
    }

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
