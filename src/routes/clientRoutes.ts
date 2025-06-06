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

const router = Router();
const clientController = new ClientController();

router
  .route("/")
  .get(WrapAsync(authenticateUser), WrapAsync(clientController.getAllClients))
  .post(
    WrapAsync(authenticateUser),
    WrapAsync(requireRole("super_admin")),
    validateRequest(createClientSchema),
    WrapAsync(clientController.createClient)
  );

router.route("/:clientCode")
  .get(WrapAsync(authenticateUser), WrapAsync(clientController.getClientById))
  .patch(
    WrapAsync(authenticateUser),
    WrapAsync(requireRole("super_admin")),
    validateRequest(updateClientSchema),
    WrapAsync(clientController.updateClient)
  )
  .delete(WrapAsync(authenticateUser), WrapAsync(requireRole("super_admin")), WrapAsync(clientController.deleteClient));

router.patch(
  "/:clientId/status",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(clientController.updateClientStatus)
);

export default router;
