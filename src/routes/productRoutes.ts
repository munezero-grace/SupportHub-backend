import { Router } from 'express';
import { z } from 'zod';
import ProductController from '../controllers/product.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { errorHandler } from '../middlewares/errorHandler';
import { productSchema, productIdSchema } from '../types/product';

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

router.put('/:id',
  validateRequest({ 
    params: productIdSchema,
    body: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').optional(),
      description: z.string().optional(),
      status: z.enum(['Active', 'Inactive']).optional(),
      clientCount: z.number().min(0).optional(),
      developerCount: z.number().min(0).optional(),
      activeTickets: z.number().min(0).optional()
    })
  }),
  ProductController.updateProduct
);

router.delete('/:id',
  validateRequest({ params: productIdSchema }),
  ProductController.deleteProduct
);

router.use(errorHandler);

export default router;
