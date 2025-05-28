import { z } from 'zod';

export const productSchema = z.object({
  name: z.string()
    .min(2, 'Product name must be at least 2 characters')
    .max(50, 'Product name must not exceed 50 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  status: z.enum(['active', 'inactive']),
});

export const productIdSchema = z.object({
  id: z.string().regex(/^P-\d+$/, 'Invalid product ID format')
});

export type ProductCreateInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = Partial<ProductCreateInput>;
