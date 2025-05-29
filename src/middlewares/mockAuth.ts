import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export default function mockAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV !== "test") return next();

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "testsecret";
    const decoded = jwt.verify(token, secret);

    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
