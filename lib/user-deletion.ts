import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/report-error";
import { deleteStoredAvatar } from "@/lib/storage/avatar";

type UserDeletionOptions = {
  where?: Prisma.UserWhereInput;
  afterDelete?: (transaction: Prisma.TransactionClient) => Promise<void>;
};

type DeletedUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function deleteUserRecord(
  userId: string,
  options: UserDeletionOptions = {},
): Promise<{ deleted: boolean; user: DeletedUser | null }> {
  const result = await prisma.$transaction(
    async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      });
      if (!user) return { deleted: false, user: null };

      const deletion = await transaction.user.deleteMany({
        where: {
          AND: [{ id: userId }, options.where ?? {}],
        },
      });

      if (deletion.count === 0) return { deleted: false, user };
      await options.afterDelete?.(transaction);
      return { deleted: true, user };
    },
    { isolationLevel: "Serializable" },
  );

  if (!result.deleted || !result.user) return result;

  try {
    await deleteStoredAvatar(result.user.image, result.user.id);
  } catch (error) {
    reportError(error, { area: "user-deletion.avatar" });
  }

  return result;
}
