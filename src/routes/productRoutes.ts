import { Router } from 'express';
import ProductController from '../controllers/ProductsController';
import { validateRequest } from '../middlewares/validateRequest';
import { errorHandler } from '../middlewares/errorHandler';
import {
  productValidation,
  updateProductValidation
} from '../validations/product.validation';
import { WrapAsync } from '../middlewares/wrapAsync';

const router = Router();

router.post('/', validateRequest(productValidation), WrapAsync(ProductController.createProduct));
router.get('/', WrapAsync(ProductController.getAllProducts));
router.get('/:id', WrapAsync(ProductController.getProductById));
router.put('/:id', validateRequest(updateProductValidation), WrapAsync(ProductController.updateProduct));
router.delete('/:id', WrapAsync(ProductController.deleteProduct));
router.post('/:id/clients/:clientId', WrapAsync(ProductController.addClientToProduct));
router.delete('/:id/clients/:clientId', WrapAsync(ProductController.removeClientFromProduct));
router.use(errorHandler);

export default router;
