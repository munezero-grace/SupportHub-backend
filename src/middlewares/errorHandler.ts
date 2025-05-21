import { Request, Response, NextFunction } from "express";
import { HTTP_SERVER_ERROR } from "../constants/httpStatusCodes";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  
  res.status(HTTP_SERVER_ERROR).json({
    message: "An unexpected error occurred.",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
};
