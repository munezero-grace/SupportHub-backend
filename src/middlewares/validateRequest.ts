import { Request, Response, NextFunction } from "express";
import * as Joi from "joi";
import { HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ message: error.details[0].message.replace(/['"]+/g, "") });
    } else {
      next();
    }
  };
};
