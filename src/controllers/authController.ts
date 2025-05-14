import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret";

const generateToken = (userId: string) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1h" });

const assignClientRole = async (userId: string): Promise<void> => {
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
): Promise<void> => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
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

    res.status(201).json({ user, token });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

export const loginWithEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || !user.password) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user.id);
    res.status(200).json({ user, token });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const googleSignIn = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, firstName, lastName } = req.body;

  try {
    console.log("Google Sign-In request received with data:", {
      email,
      firstName,
      lastName,
    });

    if (!email || !firstName || !lastName) {
      console.error("Missing Google user data:", {
        email,
        firstName,
        lastName,
      });
      res.status(400).json({ message: "Missing Google user data" });
      return;
    }

    let user = await prisma.users.findUnique({ where: { email } });
    console.log("User lookup result:", user);

    if (!user) {
      console.log("User not found. Creating a new user...");
      user = await prisma.users.create({
        data: {
          email,
          firstName,
          lastName,
          provider: "google",
          providerId: "google-id",
        },
      });
      console.log("New user created:", user);

      await assignClientRole(user.id);
      console.log("Client role assigned to user with ID:", user.id);
    }

    const token = generateToken(user.id);
    console.log("JWT token generated for user with ID:", user.id);

    res.status(200).json({ user, token });
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    res
      .status(500)
      .json({ message: "Google sign-in failed", error: error.message });
  }
};

export { prisma };
