import { PrismaClient, Products } from '@prisma/client';
import { ProductCreateInput, ProductUpdateInput } from '../types/product';

const prisma = new PrismaClient();

export class ProductsService {
  private async getNextProductCode(): Promise<string> {
    const lastProduct = await prisma.products.findFirst({
      orderBy: { productCode: 'desc' }
    });

    return !lastProduct 
      ? 'P-1001'
      : `P-${parseInt(lastProduct.productCode.split('-')[1]) + 1}`;
  }
  async createProduct(data: ProductCreateInput): Promise<Products> {
    const productCode = await this.getNextProductCode();
    
    return prisma.products.create({
      data: {
        productCode,
        name: data.name,
        description: data.description || '',
        status: data.status,
      }
    });
  }

  async getAllProducts(): Promise<Products[]> {
    return prisma.products.findMany({
      orderBy: [{ productCode: 'desc' }]
    });
  }

  async getProductById(id: string): Promise<Products | null> {
    return prisma.products.findUnique({
      where: { id }
    });
  }

  async getProductByCode(productCode: string): Promise<Products | null> {
    return prisma.products.findUnique({
      where: { productCode }
    });
  }

  async updateProduct(id: string, data: ProductUpdateInput): Promise<Products> {
    return prisma.products.update({
      where: { id },
      data
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await prisma.products.delete({
      where: { id }
    });
  }
}
