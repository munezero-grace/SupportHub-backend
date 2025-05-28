import { Request, Response, NextFunction } from "express";
import * as Joi from "joi";
import { HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log("here is the body in the middleware", req.body);
    
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("here is the error in the middleware", error);
      
      const errors = error.details.map((detail) =>
        detail.message.replace(/['"]+/g, "")
      );
      res.status(HTTP_BAD_REQUEST).json({ messages: errors });
    } else {
      next();
    }
  };
};