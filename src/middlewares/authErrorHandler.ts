import { Request, Response, NextFunction } from "express";
import { AuthError } from "../helpers/errors";

export const authErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return next(err);
};
