import { PrismaClient } from "@prisma/client";
import { HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

const prisma = new PrismaClient();

export class UserService {
  async deleteUserWithSQL(userId: string) {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.$queryRaw`
          SELECT id, email 
          FROM "Users" 
          WHERE id = ${userId}
        `;

        if (!user || !Array.isArray(user) || user.length === 0) {
          return { Error: (ERROR_MESSAGES.USER_NOT_FOUND) };
        }

        const clients = await tx.$queryRaw`
          SELECT id, "clientCode", "companyName"
          FROM "Clients"
          WHERE "userId" = ${userId}
        `;

        if (Array.isArray(clients) && clients.length > 0) {
          return { Error: (ERROR_MESSAGES.CANNOT_DELETE_USER_WITH_CLIENTS) };
        }

        await tx.$executeRaw`
          DELETE FROM "UserRoles"
          WHERE "userId" = ${userId}
        `;

        await tx.$executeRaw`
          DELETE FROM "Users"
          WHERE id = ${userId}
        `;

        return { success: true };
      });

      return { success: true, message: SUCCESS_MESSAGES.USER_DELETED };
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message:
          error instanceof Error ? error.message : ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }

  async getUserById(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    return user;
  }

  async getAllUsersWithRoles() {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    
    const usersWithRoles = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.name),
    }));

    return usersWithRoles;
  }

  async findClientByUUID(clientId: string) {
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    });
    return client;
  }

  async deleteUser(userId: string) {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.users.findUnique({
          where: { id: userId },
          include: {
            Clients: true,
          },
        });

        if (!user) {
          return { Error: (ERROR_MESSAGES.USER_NOT_FOUND) };
        }

        if (user.Clients.length > 0) {
          return { Error: (ERROR_MESSAGES.CANNOT_DELETE_USER_WITH_CLIENTS) };
        }

        await tx.users.delete({
          where: { id: userId },
        });

        return { success: true };
      });

      return { success: true, message: SUCCESS_MESSAGES.USER_DELETED };
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message:
          error instanceof Error ? error.message : ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }

  async updateUserSettings(userId: string, companyName: string, companyDomain?: string, firstName?: string, lastName?: string) {
    try {
      const client = await prisma.clients.findFirst({
        where: { userId: userId },
      });

      if (!client) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      const updatedClient = await prisma.clients.update({
        where: { id: client.id },
        data: {
          companyName,
          ...(companyDomain ? { companyDomain } : {}),
        },
      });

      if (firstName !== undefined || lastName !== undefined) {
        await prisma.users.update({
          where: { id: userId },
          data: {
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {}),
          },
        });
      }

      return updatedClient;
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }

  async getUserSettings(userId: string) {
    try {
      
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      const isSuperAdmin = user?.userRoles.some(ur => ur.role.name === 'super_admin');

      if (isSuperAdmin) {
        return {
          companyName: null,
          companyDomain: null,
          clientCode: null,
          firstName: null,
          lastName: null,
        };
      }

      const client = await prisma.clients.findFirst({
        where: { userId: userId },
      });

      if (!client) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return {
        companyName: client.companyName,
        companyDomain: client.companyDomain,
        clientCode: client.clientCode,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
      };
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.USER_NOT_FOUND,
      };
    }
  }
}
