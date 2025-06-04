import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import {
  HTTP_ACCESS_DENIED,
  HTTP_UNAUTHORIZED,
} from "../constants/httpStatusCodes";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role?: string };
    }
  }
}

const prisma = new PrismaClient();

export function requireRole(roleName: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const user = req.user as { id: string; role?: string } | undefined;
    if (!user || !user.id) {
      res.status(HTTP_UNAUTHORIZED).json({ message: "Unauthorized" });
      return;
    }
    if (user.role && user.role === roleName) {
      next();
      return;
    }
    const userRole = await prisma.userRoles.findFirst({
      where: { userId: user.id },
    });
    if (!userRole) {
      res
        .status(HTTP_ACCESS_DENIED)
        .json({ message: "Forbidden: No role assigned" });
      return;
    }
    const role = await prisma.roles.findUnique({
      where: { id: userRole.roleId },
    });
    if (!role || role.name !== roleName) {
      res
        .status(HTTP_ACCESS_DENIED)
        .json({ message: `Forbidden: Requires ${roleName} role` });
      return;
    }
    next();
  };
}
