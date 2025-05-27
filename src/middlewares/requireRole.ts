import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import {
  HTTP_ACCESS_DENIED,
  HTTP_UNAUTHORIZED,
} from "../constants/httpStatusCodes";

const prisma = new PrismaClient();


declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role?: string };
  }
}


export function requireRole(roleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {

    const user = req.user as { id: string; role?: string } | undefined;
    if (!user || !user.id) {
      return res.status(HTTP_UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    if (user.role && user.role === roleName) {
      return next();
    }

    const userRole = await prisma.userRoles.findFirst({
      where: { userId: user.id },
    });
    if (!userRole) {
      return res
        .status(HTTP_ACCESS_DENIED)
        .json({ message: "Forbidden: No role assigned" });
    }
    const role = await prisma.roles.findUnique({
      where: { id: userRole.roleId },
    });
    if (!role || role.name !== roleName) {
      return res
        .status(HTTP_ACCESS_DENIED)
        .json({ message: `Forbidden: Requires ${roleName} role` });
    }
    next();
  };
}