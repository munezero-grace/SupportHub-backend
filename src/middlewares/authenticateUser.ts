import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ERROR_MESSAGES } from "../constants/response/errors";

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: ERROR_MESSAGES.NO_TOKEN });
  }
  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "testsecret";
    const decoded = jwt.verify(token, secret);
    (req as any).user = decoded;
   return next();
  } catch (err) {
    return res.status(401).json({ message: ERROR_MESSAGES.INVALID_TOKEN });
  }
}
