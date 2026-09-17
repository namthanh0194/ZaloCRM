type ZaloAccessDeleteClient = {
  zaloAccountAccess: {
    deleteMany(args: {
      where: {
        userId: string;
        zaloAccount: { orgId: string };
      };
    }): Promise<{ count: number }>;
  };
  conversationAccess?: {
    deleteMany(args: {
      where: {
        userId: string;
        orgId: string;
      };
    }): Promise<{ count: number }>;
  };
};

export async function revokeAllZaloAccessForUser(
  tx: ZaloAccessDeleteClient,
  userId: string,
  orgId: string,
): Promise<number> {
  const result = await tx.zaloAccountAccess.deleteMany({
    where: {
      userId,
      zaloAccount: { orgId },
    },
  });
  if (tx.conversationAccess) {
    await tx.conversationAccess.deleteMany({
      where: {
        userId,
        orgId,
      },
    });
  }
  return result.count;
}

