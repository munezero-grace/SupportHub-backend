import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { generateToken } from "../helpers/generateToken";
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

const prisma = new PrismaClient();
class AuthController {
  public signup = async (req: Request, res: Response): Promise<void> => {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      throw new AuthError(HTTP_EXIST, ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: { firstName, lastName, email, password: hashedPassword },
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
    res.status(HTTP_CREATED).json({
      user,
      token,
      message: SUCCESS_MESSAGES.USER_REGISTERED,
    });
  };

  public login = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    const findUser = await prisma.users.findUnique({
      where: { email },
      select: { ...userSelectFields, password: true },
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
      role: (role?.name as UserRole),
      provider: "credentials",
      providerId: "seeded-superadmin",
    });

    const { password: _, ...safeUser } = findUser;
    const responsePayload = {
      user: {
        ...safeUser,
        role: (role?.name as UserRole),
        provider: "credentials",
        providerId: "seeded-superadmin",
      },
      token,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    };

    return res.status(HTTP_OK).json(responsePayload);
  };

  public googleSignIn = async (req: Request, res: Response): Promise<void> => {
    const { email, firstName, lastName, provider, providerId } = req.body;
    let user = await prisma.users.findUnique({
      where: { email },
      select: userSelectFields,
    });
    if (!user) {
      user = await prisma.users.create({
        data: { email, firstName, lastName, provider, providerId },
        select: userSelectFields,
      });

      await this.assignClientRole(user.id);
    }

    const userRole = await prisma.userRoles.findFirst({
      where: { userId: user.id },
    });

    const role = userRole
      ? await prisma.roles.findUnique({ where: { id: userRole.roleId } })
      : null;

    const token = generateToken({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: (role?.name as UserRole),
    });
    res.status(HTTP_OK).json({
      user: {
        ...user,
        role: (role?.name as UserRole),
        provider: "credentials",
        providerId: "seeded-superadmin",
      },
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
