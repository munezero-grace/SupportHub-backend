import { z } from 'zod';

export const productIdSchema = z.object({
  id: z.string().min(1, 'Product ID is required')
});

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});
