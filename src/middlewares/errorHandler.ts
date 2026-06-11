import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { HTTP_BAD_REQUEST, HTTP_SERVER_ERROR } from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";

const MULTER_ERROR_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: "File too large. Maximum size is 10MB per file.",
  LIMIT_FILE_COUNT: "Too many files uploaded.",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
};

export const errorHandler = (
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("[ErrorHandler]", err.message, err.stack);

  if (err instanceof MulterError) {
    return res.status(HTTP_BAD_REQUEST).json({
      message: MULTER_ERROR_MESSAGES[err.code] || err.message,
    });
  }

  // multer's fileFilter throws a plain Error (not a MulterError)
  if (err.message === "Only image (JPEG, PNG, GIF, WEBP) and PDF files are allowed") {
    return res.status(HTTP_BAD_REQUEST).json({ message: err.message });
  }

  return res.status(HTTP_SERVER_ERROR).json({
    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
};