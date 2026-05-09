import { Router } from "express";
import ProductController from "../controllers/products.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { errorHandler } from "../middlewares/errorHandler";
import {
  productValidation,
  updateProductValidation,
} from "../validations/product.validation";
import { WrapAsync } from "../middlewares/wrapAsync";
import { requireRole } from "../middlewares/requireRole";
import { authenticateUser } from "../middlewares/authenticateUser";

const router = Router();

router.post(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  validateRequest(productValidation),
  WrapAsync(ProductController.createProduct)
);

router.get(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(ProductController.getAllProducts)
);

router.get(
  "/client-products",
  WrapAsync(authenticateUser),
  WrapAsync(ProductController.getProductsByClient)
);

router.get(
  "/client/:clientCode",
  WrapAsync(authenticateUser),
  WrapAsync(ProductController.getProductsByClientCode)
);

router.get(
  "/id/:id",
  WrapAsync(authenticateUser),
  WrapAsync(ProductController.getProductById)
);

router.get(
  "/:productCode",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(ProductController.getProductByCode)
);

router.put(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  validateRequest(updateProductValidation),
  WrapAsync(ProductController.updateProduct)
);

router.delete(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(ProductController.deleteProduct)
);

router.post(
  "/:productId/clients/:clientId",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(ProductController.addClientToProduct)
);

router.delete(
  "/:productId/clients/:clientId",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(ProductController.removeClientFromProduct)
);

router.use(errorHandler);

export default router;
