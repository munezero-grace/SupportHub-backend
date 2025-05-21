import { PrismaClient } from "@prisma/client";
import { UserRole } from "../types";

const prisma = new PrismaClient();

export const getUserRole = async (userId: string): Promise<UserRole> => {
  const userRole = await prisma.userRoles.findFirst({ where: { userId } });
  if (!userRole) return UserRole.CLIENT;

  const role = await prisma.roles.findUnique({ where: { id: userRole.roleId } });
  return (role?.name as UserRole) || UserRole.CLIENT;
};
