import { Prisma } from "@prisma/client";

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  const softDeleteModels = ["Clients"];

  if (softDeleteModels.includes(params.model || "")) {
    if (params.action === "findUnique" || params.action === "findFirst") {
      params.action = "findFirst";

      if (params.args.where && !("deletedAt" in params.args.where)) {
        params.args.where["deletedAt"] = null;
      }
    }

    if (params.action === "findMany") {
      if (!params.args) params.args = { where: { deletedAt: null } };
      else if (!params.args.where) params.args.where = { deletedAt: null };
      else if (!("deletedAt" in params.args.where))
        params.args.where["deletedAt"] = null;
    }
  }

  return next(params);
};
