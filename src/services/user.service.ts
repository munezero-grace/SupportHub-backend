import { PrismaClient } from "@prisma/client";
import { HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import { SignupRequestBody } from "../types/auth";
import { UserCompanyProfile } from "../types/client";

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
          throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const clients = await tx.$queryRaw`
          SELECT id, "clientCode", "companyName"
          FROM "Clients"
          WHERE "userId" = ${userId}
        `;

        if (Array.isArray(clients) && clients.length > 0) {
          throw new Error(ERROR_MESSAGES.CANNOT_DELETE_USER_WITH_CLIENTS);
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
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }

  // Removed unused method updateUserSettingsFromProfile as it is not implemented and parameters are unused

  async softDeleteUser(userId: string) {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { error: ERROR_MESSAGES.USER_NOT_FOUND };
      }

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      return updatedUser;
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
        deletedAt: true,
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

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      deletedAt: user.deletedAt,
      roles: user.userRoles.map((ur) => ur.role.name),
    }));
  }

  async getTeamMembers() {
    const users = await prisma.users.findMany({
      where: {
        deletedAt: null,
        userRoles: {
          some: {
            role: { name: { in: ["developer", "ticket_manager"] } },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userRoles: {
          select: { role: { select: { name: true } } },
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      roles: u.userRoles.map((ur) => ur.role.name),
    }));
  }

  async reactivateUser(userId: string) {
    try {
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) return { error: ERROR_MESSAGES.USER_NOT_FOUND };

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: { deletedAt: null },
      });

      return updatedUser;
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
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
          throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (user.Clients.length > 0) {
          throw new Error(ERROR_MESSAGES.CANNOT_DELETE_USER_WITH_CLIENTS);
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
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }

  async getUserProfile(userId: string) {
    try {
      const findUser = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
          Clients: {
            select: {
              id: true,
              companyName: true,
              companyDomain: true,
              clientCode: true,
              createdAt: true,
            },
          },
        }
      });
      if (!findUser) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      return findUser;
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.USER_NOT_FOUND,
      };
    }
  }

  async updateUserProfile(userId: string, data: SignupRequestBody) {
    try {
      
      const { firstName, lastName, email, password } = data;
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (password !== undefined) updateData.password = password;

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: updateData,
      });

      return updatedUser;
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message: error instanceof Error ?
          error.message :
          ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }

  async updateUserCompanyProfile(userId: string, data: UserCompanyProfile) {
    try {
      const updatedClient = await prisma.clients.update({
        where: { id: data.id, userId: userId },
        data: {
          ...data
        },
      });
      return updatedClient;
    } catch (error) {
      throw {
        status: HTTP_BAD_REQUEST,
        message: error instanceof Error ?
          error.message :
          ERROR_MESSAGES.USER_DELETE_FAILED,
      };
    }
  }
}
