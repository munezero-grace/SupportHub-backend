import { Router } from "express";
import { ClientController } from "../controllers/clients.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createClientSchema,
  updateClientSchema,
} from "../validations/client.validation";
import { WrapAsync } from "../middlewares/wrapAsync";
import { requireRole } from "../middlewares/requireRole";
import { authenticateUser } from "../middlewares/authenticateUser";
import { validateClientId } from "../middlewares/validateClientId";

const router = Router();

router.get(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(ClientController.getAllClients)
);
router.post(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  validateRequest(createClientSchema),
  WrapAsync(ClientController.createClient)
);
router.get(
  "/users/me",
  WrapAsync(authenticateUser),
  WrapAsync(ClientController.getClientByUserId)
);
router.get(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.getClientById)
);
router.patch(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  validateRequest(updateClientSchema),
  WrapAsync(ClientController.updateClient)
);
router.delete(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.deleteClient)
);
router.patch(
  "/:id/status",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.updateClientStatus)
);
router.patch(
  "/:id/soft-delete",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.softDeleteClient)
);
router.post(
  "/:id/restore",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.restoreClient)
);
router.get(
  "/:id/products",
  WrapAsync(authenticateUser),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.getProductsForClient)
);
router.post(
  "/:id/products/:productId",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.addProductToClient)
);
router.delete(
  "/:id/products/:productId",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(validateClientId),
  WrapAsync(ClientController.removeProductFromClient)
);

export default router;
