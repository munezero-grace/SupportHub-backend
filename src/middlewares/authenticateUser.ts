import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { TokenExpiredError } from "jsonwebtoken";

export async function authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const authHeader = req.headers["authorization"]; if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            status: "error",
            message: ERROR_MESSAGES.NO_TOKEN,
            code: 'NO_TOKEN'
        });
    }
    const token = authHeader.split(" ")[1];
    try {
        const secret = process.env.JWT_SECRET || "testsecret";
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
        (req as any).user = decoded;
        if (decoded.client && decoded.client.id) {
            (req as any).user.clientId = decoded.client.id;
        }

        return next();
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return res.status(401).json({
                status: "error",
                message: ERROR_MESSAGES.TOKEN_EXPIRED,
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            status: "error",
            message: ERROR_MESSAGES.INVALID_TOKEN,
            code: 'INVALID_TOKEN'
        });
    }
}
