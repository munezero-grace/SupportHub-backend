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
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as { id: string; role?: string } | undefined;

      if (!user || !user.id) {
        return res.status(HTTP_UNAUTHORIZED).json({
          status: "error",
          message: "No user found in request",
          code: "NO_USER"
        });
      }
      if (user.role && user.role === roleName) {
        return next();
      }
      const userRole = await prisma.userRoles.findFirst({
        where: { userId: user.id },
        include: {
          role: true
        }
      });

      if (!userRole || !userRole.role) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ message: "Forbidden: No role assigned" });
      }

      if (userRole.role.name !== roleName) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({
            message: `Forbidden: Requires ${roleName} role. Current role: ${userRole.role.name}`
          });
      }
      req.user!.role = userRole.role.name;

      next();
    } catch (error) {
      return res
        .status(HTTP_ACCESS_DENIED)
        .json({ message: "Error checking user permissions" });
    }
  };
}