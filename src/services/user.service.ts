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
}
