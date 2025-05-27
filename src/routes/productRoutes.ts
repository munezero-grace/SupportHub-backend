import { Router } from 'express';
import ProductController from '../controllers/ProductsController';
import { validateRequest } from '../middlewares/validateRequest';
import { errorHandler } from '../middlewares/errorHandler';
import { productSchema } from '../types/product';
import { productIdSchema, updateProductSchema } from '../validations/product.validation';

const router = Router();

router.post('/',
  validateRequest({ 
    body: productSchema.strict() 
  }), 
  ProductController.createProduct
);


router.get('/', ProductController.getAllProducts);

router.get('/:id',
  validateRequest({ params: productIdSchema }),
  ProductController.getProductById
);

router.put('/:id',  validateRequest({ 
    params: productIdSchema,
    body: updateProductSchema
  }),
  ProductController.updateProduct
);

router.delete('/:id',
  validateRequest({ params: productIdSchema }),
  ProductController.deleteProduct
);

router.use(errorHandler);

export default router;
