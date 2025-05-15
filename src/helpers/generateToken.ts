import * as jwt from "jsonwebtoken";
import { AuthPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret";

// Helper to generate JWT tokens for authentication. Reusable across controllers.
export const generateToken = (user: AuthPayload): string => {
  return jwt.sign(
    {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};
