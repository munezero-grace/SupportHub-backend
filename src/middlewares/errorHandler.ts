import { Request, Response, NextFunction } from "express";
import { HTTP_SERVER_ERROR } from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";

export const errorHandler = (
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("[ErrorHandler]", err.message, err.stack);
  res.status(HTTP_SERVER_ERROR).json({
    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
};