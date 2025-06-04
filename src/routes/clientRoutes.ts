import { Router } from "express";
import { ClientController } from "../controllers/clients.controller";
import {
  createClientValidations,
  updateClientValidations,
} from "../validations/client.validator";
import { requireRole } from "../middlewares/requireRole";
import { authenticateUser } from "../middlewares/authenticateUser";

const router = Router();
const clientController = new ClientController();

router.get(
  "/",
  authenticateUser,
  requireRole("super_admin"),
  clientController.getAllClients
);

router.post(
  "/",
  createClientValidations,
  authenticateUser,
  requireRole("super_admin"),
  clientController.createClient
);

router.get(
  "/:clientCode",
  authenticateUser,
  requireRole("super_admin"),
  clientController.getClientById
);

router.put(
  "/:clientCode",
  updateClientValidations,
  authenticateUser,
  requireRole("super_admin"),
  clientController.updateClient
);

router.delete(
  "/:clientCode",
  authenticateUser,
  requireRole("super_admin"),
  clientController.deleteClient
);

router.patch(
  "/:clientCode/status",
  authenticateUser,
  requireRole("super_admin"),
  clientController.updateClientStatus
);

export default router;
