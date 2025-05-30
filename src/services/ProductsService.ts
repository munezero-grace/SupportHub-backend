import { PrismaClient,Products } from '@prisma/client';
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
        status: data.status.toLowerCase() as 'active' | 'inactive',
      }
    });
  }

  async getAllProducts(): Promise<Products[]> {
    return prisma.products.findMany({
      orderBy: [{ productCode: 'desc' }],
      include: {
        clientProducts: {
          include: {
            client: true,
          },
        },
      },
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
    const updateData = {
      ...data,
      status: data.status ? data.status.toLowerCase() as 'active' | 'inactive' : undefined
    };

    return prisma.products.update({
      where: { id },
      data: updateData
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await prisma.products.delete({
      where: { id }
    });
  }

  async getClientsForProduct(productId: string) {
    return prisma.clientProduct.findMany({
      where: { productId },
      include: {
        client: true,
      },
    });
  }
  async addClientToProduct(productId: string, clientId: string) {
    return prisma.clientProduct.upsert({
      where: {
        clientId_productId: {
          clientId,
          productId,
        }
      },
      update: {}, 
      create: {
        productId,
        clientId,
      },
    });
  }

  async removeClientFromProduct(productId: string, clientId: string) {
    return prisma.clientProduct.delete({
      where: {
        clientId_productId: {
          clientId,
          productId,
        },
      },
    });
  }
}
