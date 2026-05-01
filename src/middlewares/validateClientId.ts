import { Request, Response, NextFunction } from "express";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { getClientById } from "../helpers/clientHelpers";

export async function validateClientId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const clientId = req.params.id || req.body.clientId || req.query.clientId;

  if (!clientId) {
    return res.status(400).json({
      error: ERROR_MESSAGES.CLIENT_ID_REQUIRED,
    });
  }

  const { validate: isUuid } = await import("uuid");
  if (!isUuid(clientId)) {
    return res.status(400).json({
      error: ERROR_MESSAGES.INVALID_CLIENT_ID,
    });
  }
  const client = await getClientById(clientId, true);
  if (!client) {
    return res.status(404).json({ error: ERROR_MESSAGES.CLIENT_NOT_FOUND });
  }

  (req as any).client = client;
  return next();
}
