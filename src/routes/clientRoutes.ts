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

router.delete(
  "/:clientId/soft-delete",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(clientController.softDeleteClient)
);

router.post(
  "/:clientId/restore",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(clientController.restoreClient)
);

router.get(
  "/users/:userId",
  WrapAsync(authenticateUser),
  WrapAsync(clientController.getClientByUserId)
);
router.get(
  "/:clientId/products",
  WrapAsync(authenticateUser),
  WrapAsync(clientController.getProductsForClient)
);

router
  .route("/:clientId/products/:productId")
  .post(
    WrapAsync(authenticateUser),
    WrapAsync(requireRole("super_admin")),
    WrapAsync(clientController.addProductToClient)
  )
  .delete(
    WrapAsync(authenticateUser),
    WrapAsync(requireRole("super_admin")),
    WrapAsync(clientController.removeProductFromClient)
  );

router
  .route("/:clientId")
  .get(WrapAsync(authenticateUser), WrapAsync(clientController.getClientById))
  .patch(
    WrapAsync(authenticateUser),
    WrapAsync(requireRole("super_admin")),
    validateRequest(updateClientSchema),
    WrapAsync(clientController.updateClient)
  )
  .delete(
    WrapAsync(authenticateUser),
    WrapAsync(requireRole("super_admin")),
    WrapAsync(clientController.deleteClient)
  );

router.patch(
  "/:clientId/status",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(clientController.updateClientStatus)
);

export default router;
