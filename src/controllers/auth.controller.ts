import { Request, Response } from "express";
import * as bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { generateToken } from "../helpers/generateToken";
import { generateClientCode } from "../helpers/generateClientCode";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import { UserRole } from "../types";
import { AuthError } from "../helpers/errors";
import {
  HTTP_BAD_REQUEST,
  HTTP_CREATED,
  HTTP_EXIST,
  HTTP_OK,
} from "../constants/httpStatusCodes";
import { userSelectFields } from "../utils/userSelects";

class AuthController {
  public signup = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      throw new AuthError(HTTP_EXIST, ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        hasChangedPassword: true, // user chose their own password at signup
      },
      select: userSelectFields,
    });

    await this.assignClientRole(user.id);
    const token = generateToken({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: UserRole.CLIENT,
    });
    return res.status(HTTP_CREATED).json({
      user,
      token,
      message: SUCCESS_MESSAGES.USER_REGISTERED,
    });
  };
  public login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const findUser = await prisma.users.findUnique({
      where: { email },
      select: {
        ...userSelectFields,
        password: true,
        hasChangedPassword: true,
        Clients: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!findUser || !findUser.password) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }
    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const client = findUser.Clients?.[0];
    if (client?.deletedAt) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED });
      return;
    }

    const userRole = await prisma.userRoles.findFirst({
      where: { userId: findUser.id },
    });

    const role = userRole
      ? await prisma.roles.findUnique({ where: { id: userRole.roleId } })
      : null;

    const token = generateToken({
      id: findUser.id,
      firstName: findUser.firstName,
      lastName: findUser.lastName,
      email: findUser.email,
      role: role?.name as UserRole,
      provider: "credentials",
      providerId: "seeded-superadmin",
      client:
        client && !client.deletedAt
          ? {
              id: client.id,
              clientCode: client.clientCode,
              companyName: client.companyName,
            }
          : undefined,
    });

    if (role?.name === 'client' && client) {
      const clientStatus = await prisma.clients.findUnique({
        where: { id: client.id },
        select: { status: true }
      });
      if (clientStatus?.status === 'inactive') {
        return res.status(HTTP_BAD_REQUEST).json({ message: 'Your client account is inactive.' });
      }
    }

    const responsePayload = {
      user: findUser,
      token,
      hasChangedPassword: findUser.hasChangedPassword,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    };
    res.status(HTTP_OK).json(responsePayload);
    return;
  };

  public changePassword = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as string;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(HTTP_BAD_REQUEST).json({
          message: "Current password and new password are required"
        });
      }

      const user = await prisma.users.findUnique({ where: { id: userId } });
      
      if (!user || !user.password) {
        return res.status(HTTP_BAD_REQUEST).json({
          message: "User not found or password not set"
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(HTTP_BAD_REQUEST).json({
          message: "Current password is incorrect"
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          hasChangedPassword: true
        },
        select: userSelectFields
      });

      return res.status(HTTP_OK).json({
        message: "Password changed successfully",
        user: updatedUser
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message
      });
    }
  };

  public googleSignIn = async (req: Request, res: Response) => {
    const { email, firstName, lastName, provider, providerId } = req.body;
    let user = await prisma.users.findUnique({
      where: {
        email,
        providerId,
      },
      select: {
        ...userSelectFields,
        Clients: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!user) {
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.users.create({
          data: {
            email,
            firstName,
            lastName,
            provider,
            providerId,
            hasChangedPassword: true, // OAuth users have no password to change
          },
          select: {
            ...userSelectFields,
            Clients: {
              select: {
                id: true,
                clientCode: true,
                companyName: true,
                deletedAt: true,
              },
            },
          },
        });
        let clientRole = await tx.roles.findUnique({
          where: { name: UserRole.CLIENT },
        });

        if (!clientRole) {
          clientRole = await tx.roles.create({
            data: { name: UserRole.CLIENT },
          });
        }

        await tx.userRoles.create({
          data: {
            userId: newUser.id,
            roleId: clientRole.id,
          },
        });

        if (newUser.Clients.length === 0) {
          const clientCode = await generateClientCode(tx);
          await tx.clients.create({
            data: {
              clientCode,
              companyName: `${firstName} ${lastName}`.trim(),
              supportTier: "standard",
              status: "active",
              createdBy: newUser.id,
              userId: newUser.id,
            },
          });
        }

        return newUser;
      });
    }

    let client: { id: string; clientCode: string; companyName: string | null; deletedAt: Date | null; } | null = user.Clients?.[0] || null;
    if (client?.deletedAt) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED });
      return;
    }

    const userRole = await prisma.userRoles.findFirst({
      where: { userId: user.id },
    });

    const role = userRole
      ? await prisma.roles.findUnique({ where: { id: userRole.roleId } })
      : null;
    client = await prisma.clients.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        deletedAt: true,
      },
    });

    const token = generateToken({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: role?.name as UserRole,
      provider: provider || undefined,
      providerId: providerId || undefined,
      client:
        client && !client.deletedAt
          ? {
              id: client.id,
              clientCode: client.clientCode,
              companyName: client.companyName,
            }
          : undefined,
    });

    res.status(HTTP_OK).json({
      token,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    });
  };

  private async assignClientRole(userId: string) {
    const clientRole = await prisma.roles.findUnique({
      where: { name: UserRole.CLIENT },
    });
    if (clientRole) {
      await prisma.userRoles.create({
        data: { userId, roleId: clientRole.id },
      });
    }
  }
}
export default new AuthController();
