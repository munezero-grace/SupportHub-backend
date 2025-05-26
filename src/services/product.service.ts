import { PrismaClient, Product } from '@prisma/client';
import { ProductCreateInput, ProductUpdateInput } from '../types/product';

const prisma = new PrismaClient();

export class ProductService {
  private async ensureMinimumSequence(): Promise<void> {
    // Find all products with sequence < 1001
    const lowSequenceProducts = await prisma.product.findMany({
      where: { sequence: { lt: 1001 } },
      orderBy: { sequence: 'asc' }
    });

    // Start from 1001 and update sequences
    let nextSequence = 1001;
    for (const product of lowSequenceProducts) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          sequence: nextSequence,
          id: `P-${nextSequence}`
        }
      });
      nextSequence++;
    }
  }

  private async getNextValidSequence(): Promise<number> {
    return await prisma.$transaction(async (tx) => {
      // Get highest existing sequence
      const lastProduct = await tx.product.findFirst({
        orderBy: { sequence: 'desc' }
      });
      
      // Start from 1001 if no products exist, otherwise use next sequence
      const nextSequence = lastProduct ? Math.max(lastProduct.sequence + 1, 1001) : 1001;
      
      return nextSequence;
    });
  }

  async createProduct(data: ProductCreateInput): Promise<Product> {
    return await prisma.$transaction(async (tx) => {
      // Ensure all existing products have sequences >= 1001
      await this.ensureMinimumSequence();
      
      // Get the next valid sequence number
      const sequence = await this.getNextValidSequence();
      
      // Create the product with the next sequence
      return tx.product.create({
        data: {
          id: `P-${sequence}`,
          sequence,
          name: data.name,
          description: data.description || '',
          status: data.status,
          clientCount: data.clientCount || 0,
          developerCount: data.developerCount || 0,
          activeTickets: data.activeTickets || 0
        }
      });
    });
  }

  async getAllProducts(): Promise<Product[]> {
    return prisma.product.findMany({
      orderBy: [{ sequence: 'desc' }]
    });
  }

  async getProductById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id }
    });
  }

  async updateProduct(id: string, data: ProductUpdateInput): Promise<Product> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.clientCount !== undefined) updateData.clientCount = data.clientCount;
    if (data.developerCount !== undefined) updateData.developerCount = data.developerCount;
    if (data.activeTickets !== undefined) updateData.activeTickets = data.activeTickets;

    return prisma.product.update({
      where: { id },
      data: updateData
    });
  }

  async deleteProduct(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id }
    });
  }
}
