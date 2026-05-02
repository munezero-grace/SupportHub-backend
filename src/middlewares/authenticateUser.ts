import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { TokenExpiredError } from "jsonwebtoken";

const prisma = new PrismaClient();

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

        // Block explicitly deactivated accounts
        if (decoded.id) {
            const user = await prisma.users.findUnique({
                where: { id: decoded.id },
                select: { deletedAt: true }
            });
            if (user?.deletedAt) {
                return res.status(403).json({
                    status: "error",
                    message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }
        }

        // Block client users whose company is inactive
        const isClientRole = decoded.roles?.includes("client") ||
            decoded.role === "client";
        if (isClientRole && decoded.id) {
            const client = await prisma.clients.findFirst({
                where: { userId: decoded.id, deletedAt: null },
                select: { status: true }
            });
            if (!client || client.status === "inactive") {
                return res.status(403).json({
                    status: "error",
                    message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
                    code: 'CLIENT_INACTIVE'
                });
            }
        }

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
