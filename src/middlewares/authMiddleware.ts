import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { HTTP_UNAUTHORIZED } from '../constants/httpStatusCodes';

interface JwtPayload {
  id: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const authHeaderSchema = Joi.object({
  authorization: Joi.string().pattern(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/).required()
}).unknown(true);

export const authenticateJWT = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = authHeaderSchema.validate(req.headers);
    if (error) {
      res.status(HTTP_UNAUTHORIZED).json({ message: 'Authorization header missing or malformed' });
      return;
    }

    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    try {
      const secret = process.env.JWT_SECRET || 'your_jwt_secret';
      const decoded = jwt.verify(token, secret) as JwtPayload;
      (req as AuthenticatedRequest).user = decoded;
      next();
    } catch (error) {
      res.status(HTTP_UNAUTHORIZED).json({ message: 'Invalid or expired token' });
    }
  };
};
