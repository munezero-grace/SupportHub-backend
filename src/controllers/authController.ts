import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { generateToken } from "../helpers/generateToken";
import {
  signupValidation,
  loginValidation,
} from "../validations/auth.validation";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import { AuthPayload } from "../types/auth.types";

const prisma = new PrismaClient();

class AuthController {
  public async signup(req: Request, res: Response) {
    const { error } = signupValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const { firstName, lastName, email, password } = req.body;
    try {
      const existingUser = await prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: ERROR_MESSAGES.USER_ALREADY_EXISTS });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.users.create({
        data: { firstName, lastName, email, password: hashedPassword },
      });
      await this.assignClientRole(user.id);
      const payload: AuthPayload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: "client",
      };
      const token = generateToken(payload);
      return res
        .status(201)
        .json({ user, token, message: SUCCESS_MESSAGES.USER_REGISTERED });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: ERROR_MESSAGES.SIGNUP_FAILED, error: err.message });
    }
  }

  public async login(req: Request, res: Response) {
    const { error } = loginValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const { email, password } = req.body;
    try {
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user || !user.password) {
        return res
          .status(400)
          .json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      }
      const userRole = await prisma.userRoles.findFirst({
        where: { userId: user.id },
      });
      const role = userRole
        ? await prisma.roles.findUnique({ where: { id: userRole.roleId } })
        : null;
      const payload: AuthPayload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: role?.name || "client",
      };
      const token = generateToken(payload);
      return res
        .status(200)
        .json({ user, token, message: SUCCESS_MESSAGES.LOGIN_SUCCESS });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: ERROR_MESSAGES.LOGIN_FAILED, error: err.message });
    }
  }

  public async googleSignIn(req: Request, res: Response) {
    const { email, firstName, lastName } = req.body;
    if (!email || !firstName || !lastName) {
      return res
        .status(400)
        .json({ message: ERROR_MESSAGES.MISSING_GOOGLE_DATA });
    }
    try {
      let user = await prisma.users.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.users.create({
          data: { email, firstName, lastName },
        });
        await this.assignClientRole(user.id);
      }
      const userRole = await prisma.userRoles.findFirst({
        where: { userId: user.id },
      });
      const role = userRole
        ? await prisma.roles.findUnique({ where: { id: userRole.roleId } })
        : null;
      const payload: AuthPayload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: role?.name || "client",
      };
      const token = generateToken(payload);
      return res
        .status(200)
        .json({ user, token, message: SUCCESS_MESSAGES.LOGIN_SUCCESS });
    } catch (err: any) {
      return res.status(500).json({
        message: ERROR_MESSAGES.GOOGLE_SIGNIN_FAILED,
        error: err.message,
      });
    }
  }
  private async assignClientRole(userId: string) {
    //Always assign the Prisma enum value for client
    const role = await prisma.roles.findUnique({ where: { name: "client" } });
    if (role) {
      await prisma.userRoles.create({ data: { userId, roleId: role.id } });
    }
  }
}

export default new AuthController();
