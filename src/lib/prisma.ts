import { PrismaClient } from "@prisma/client";

const basePrisma = new PrismaClient();

const softDeleteFilter = (where: Record<string, unknown> | null | undefined) => {
  if (!where) return { deletedAt: null };
  return "deletedAt" in where ? where : { ...where, deletedAt: null };
};

// Prisma v5+ removed $use middleware; soft-delete is handled via $extends query hooks.
const prisma = basePrisma.$extends({
  query: {
    clients: {
      async findUnique({ args }) {
        // findUnique rejects non-unique fields in where; delegate to findFirst
        return basePrisma.clients.findFirst({
          ...args,
          where: softDeleteFilter(args.where as any) as any,
        });
      },
      async findFirst({ args, query }) {
        (args as any).where = softDeleteFilter(args.where as any);
        return query(args);
      },
      async findMany({ args, query }) {
        (args as any).where = softDeleteFilter(args.where as any);
        return query(args);
      },
    },
  },
});

export default prisma;
