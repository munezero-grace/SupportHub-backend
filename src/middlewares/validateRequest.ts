import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";
import { HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";

export const validateRequest = (schema: { body?: AnyZodObject, params?: AnyZodObject }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error: any) {
      res.status(HTTP_BAD_REQUEST).json({ 
        messages: error.errors?.map((e: any) => e.message) || ['Validation failed'] 
      });
    }
  };
};
