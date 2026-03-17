/**
 * CRUD Server Actions Template
 *
 * This template shows the REQUIRED pattern for CRUD operations
 * (Create, Read, Update, Delete) with Prisma.
 *
 * Key Rules:
 * 1. Each operation has its own action with "Action" suffix
 * 2. Always check authentication for protected resources
 * 3. Always validate ownership before update/delete
 * 4. Serialize dates as ISO strings
 * 5. Return standard response format
 */

'use server';

import * as z from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// ============================================
// 1. SCHEMAS (in validations/posts.ts)
// ============================================

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  published: z.boolean().default(false),
});

const updatePostSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
  title: z.string().min(1, 'Title is required').max(200).optional(),
  content: z.string().min(1).optional(),
  published: z.boolean().optional(),
});

// ============================================
// 2. TYPES
// ============================================

type PostData = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// 3. CREATE ACTION
// ============================================

export const createPostAction = async (
  values: z.infer<typeof createPostSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: PostData | null;
}> => {
  try {
    // Step 1: Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'You must be logged in to create a post',
        data: null,
      };
    }

    // Step 2: Validate input
    const { success, data, error } = createPostSchema.safeParse(values);

    if (!success) {
      const firstError = error.errors[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    // Step 3: Create in database
    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        published: data.published,
        authorId: session.user.id,
      },
    });

    // Step 4: Serialize and return
    return {
      response: 'success',
      message: 'Post created successfully',
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        published: post.published,
        authorId: post.authorId,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Create post error:', error);
    return {
      response: 'error',
      message: 'Failed to create post',
      data: null,
    };
  }
};

// ============================================
// 4. READ (GET BY ID) ACTION
// ============================================

export const getPostAction = async (
  id: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: PostData | null;
}> => {
  try {
    // Validate ID
    if (!id) {
      return {
        response: 'error',
        message: 'Post ID is required',
        data: null,
      };
    }

    // Fetch from database
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return {
        response: 'error',
        message: 'Post not found',
        data: null,
      };
    }

    // Serialize and return
    return {
      response: 'success',
      message: 'Post fetched successfully',
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        published: post.published,
        authorId: post.authorId,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Get post error:', error);
    return {
      response: 'error',
      message: 'Failed to fetch post',
      data: null,
    };
  }
};

// ============================================
// 5. READ (LIST) ACTION
// ============================================

export const getPostsAction = async (
  options?: { authorId?: string; published?: boolean }
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: PostData[] | null;
}> => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        ...(options?.authorId && { authorId: options.authorId }),
        ...(options?.published !== undefined && { published: options.published }),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Serialize all posts
    const serializedPosts: PostData[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      published: post.published,
      authorId: post.authorId,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }));

    return {
      response: 'success',
      message: `Found ${posts.length} posts`,
      data: serializedPosts,
    };
  } catch (error) {
    console.error('Get posts error:', error);
    return {
      response: 'error',
      message: 'Failed to fetch posts',
      data: null,
    };
  }
};

// ============================================
// 6. UPDATE ACTION
// ============================================

export const updatePostAction = async (
  values: z.infer<typeof updatePostSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: PostData | null;
}> => {
  try {
    // Step 1: Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'You must be logged in to update a post',
        data: null,
      };
    }

    // Step 2: Validate input
    const { success, data, error } = updatePostSchema.safeParse(values);

    if (!success) {
      const firstError = error.errors[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    // Step 3: Check ownership
    const existingPost = await prisma.post.findUnique({
      where: { id: data.id },
    });

    if (!existingPost) {
      return {
        response: 'error',
        message: 'Post not found',
        data: null,
      };
    }

    if (existingPost.authorId !== session.user.id) {
      return {
        response: 'error',
        message: 'You are not authorized to update this post',
        data: null,
      };
    }

    // Step 4: Update in database
    const { id, ...updateData } = data;
    const post = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    // Step 5: Serialize and return
    return {
      response: 'success',
      message: 'Post updated successfully',
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        published: post.published,
        authorId: post.authorId,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Update post error:', error);
    return {
      response: 'error',
      message: 'Failed to update post',
      data: null,
    };
  }
};

// ============================================
// 7. DELETE ACTION
// ============================================

export const deletePostAction = async (
  id: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: { id: string } | null;
}> => {
  try {
    // Step 1: Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'You must be logged in to delete a post',
        data: null,
      };
    }

    // Step 2: Validate ID
    if (!id) {
      return {
        response: 'error',
        message: 'Post ID is required',
        data: null,
      };
    }

    // Step 3: Check ownership
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return {
        response: 'error',
        message: 'Post not found',
        data: null,
      };
    }

    if (existingPost.authorId !== session.user.id) {
      return {
        response: 'error',
        message: 'You are not authorized to delete this post',
        data: null,
      };
    }

    // Step 4: Delete from database
    await prisma.post.delete({
      where: { id },
    });

    // Step 5: Return success with deleted ID
    return {
      response: 'success',
      message: 'Post deleted successfully',
      data: { id },
    };
  } catch (error) {
    console.error('Delete post error:', error);
    return {
      response: 'error',
      message: 'Failed to delete post',
      data: null,
    };
  }
};

// ============================================
// PATTERN SUMMARY
// ============================================

/**
 * CRUD Action Checklist:
 *
 * CREATE:
 * ✅ Check authentication
 * ✅ Validate input with Zod
 * ✅ Create in database
 * ✅ Serialize dates
 * ✅ Return created item
 *
 * READ (single):
 * ✅ Validate ID
 * ✅ Handle not found
 * ✅ Serialize dates
 * ✅ Return item
 *
 * READ (list):
 * ✅ Accept filter options
 * ✅ Serialize all items
 * ✅ Return array
 *
 * UPDATE:
 * ✅ Check authentication
 * ✅ Validate input
 * ✅ Check ownership
 * ✅ Update in database
 * ✅ Serialize dates
 * ✅ Return updated item
 *
 * DELETE:
 * ✅ Check authentication
 * ✅ Check ownership
 * ✅ Delete from database
 * ✅ Return deleted ID
 *
 * ALL:
 * ✅ Use "Action" suffix
 * ✅ Return standard response format
 * ✅ console.error before returning error
 * ✅ Try-catch wrapper
 */
