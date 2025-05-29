import { Router } from "express";
import { ClientController } from "../controllers/clients.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
  // createClientSchema,
  updateClientSchema,
} from "../validations/client.validation";
import { WrapAsync } from "../middlewares/wrapAsync";
import { requireRole } from "../middlewares/requireRole";

const router = Router();
const clientController = new ClientController();

router
  .route("/")
  .get(WrapAsync(clientController.getAllClients))
  .post(
    // WrapAsync(requireRole("super_admin")),
    // validateRequest(createClientSchema),
    WrapAsync(clientController.createClient)
  );

router
  .route("/:clientId")
  .get(WrapAsync(clientController.getClientById))
  .put(
    WrapAsync(requireRole("super_admin")),
    validateRequest(updateClientSchema),
    WrapAsync(clientController.updateClient)
  )
  .delete(
    WrapAsync(requireRole("super_admin")),
    WrapAsync(clientController.deleteClient)
  );

router.patch(
  "/:clientId/status",
  WrapAsync(requireRole("super_admin")),
  WrapAsync(clientController.updateClientStatus)
);

export default router;
