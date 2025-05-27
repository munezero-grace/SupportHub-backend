import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  //dProduct: z.string().optional(),
  status: z.enum(['Active', 'Inactive']),
});

export const productIdSchema = z.object({
  id: z.string().regex(/^P-\d+$/, 'Invalid product ID format')
});

export type ProductCreateInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = Partial<ProductCreateInput>;
