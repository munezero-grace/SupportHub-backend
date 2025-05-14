import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret";

const generateToken = (userId: string) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1h" });

const assignClientRole = async (userId: string): Promise<any> => {
  const clientRole = await prisma.roles.findUnique({
    where: { name: "client" },
  });

  if (!clientRole) {
    throw new Error("Client role not found");
  }

  await prisma.userRoles.create({
    data: { userId, roleId: clientRole.id },
  });
};

export const signupWithEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        provider: "credentials",
      },
    });

    await assignClientRole(user.id);
    const token = generateToken(user.id);
    const userRole = await prisma.userRoles.findFirst({
      where: { userId: user.id },
      include: { role: { select: { name: true } } },
    });

    return res.status(201).json({ ...user, token, userRole });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Signup failed", error: error.message });
  }
};

export const loginWithEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    return res.status(200).json({ user, token });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Login failed", error: error.message });
  }
};

export const googleSignIn = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { email, firstName, lastName, provider, providerId } = req.body;

  try {
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: "Missing Google user data" });
    }

    let user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.users.create({
        data: {
          email,
          firstName,
          lastName,
          provider,
          providerId,
        },
      });

      await assignClientRole(user.id);
    }

    const token = generateToken(user.id);

    return res.status(200).json({ user, token });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Google sign-in failed", error: error.message });
  }
};

export { prisma };
