import { Request, Response, NextFunction } from "express";
import { createClientSchema, updateClientSchema } from "./client.validation";
import { HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";

export function createClientValidations(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { error } = createClientSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const errors = error.details.map((detail) =>
      detail.message.replace(/['"]+/g, "")
    );
    res.status(HTTP_BAD_REQUEST).json({ messages: errors });
  }
  next();
}

export function updateClientValidations(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { error } = updateClientSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const errors = error.details.map((detail) =>
      detail.message.replace(/['"]+/g, "")
    );
    res.status(HTTP_BAD_REQUEST).json({ messages: errors });
  }
  next();
}
