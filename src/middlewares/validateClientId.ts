import { Request, Response, NextFunction } from "express";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { getClientById } from "../helpers/clientHelpers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  if (!UUID_REGEX.test(clientId)) {
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
