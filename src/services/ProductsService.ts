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
        status: data.status.toLowerCase() as 'active' | 'inactive',
      }
    });
  } async getAllProducts(): Promise<Products[]> {
    try {
      const products = await prisma.products.findMany({
        orderBy: [{ productCode: 'desc' }],
        include: {
          clientProducts: {
            include: {
              client: {
                select: {
                  id: true,
                  clientCode: true,
                  companyName: true,
                  status: true,
                  supportTier: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!products) {
        throw new Error('Failed to retrieve products from database');
      }
      return products;
    } catch (error) {
      console.error('Error in ProductsService.getAllProducts:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Products | null> {
    return prisma.products.findUnique({
      where: { id },
      include: {
        clientProducts: {
          include: {
            client: true
          }
        }
      }
    });
  }

  async getProductByCode(productCode: string): Promise<Products | null> {
    return prisma.products.findUnique({
      where: { productCode },
      include: {
        clientProducts: {
          include: {
            client: true
          }
        }
      }
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
    try {
      const product = await prisma.products.findUnique({
        where: { id: productId }
      });
      if (!product) {
        throw new Error('Product not found');
      }
      const client = await prisma.clients.findUnique({
        where: { id: clientId }
      });
      if (!client) {
        throw new Error('Client not found');
      }
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
        include: {
          client: true,
          product: true
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add client to product');
    }
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
    async getProductsByClient(clientId: string): Promise<Products[]> {
    return prisma.products.findMany({
      where: {
        clientProducts: {
          some: {
            clientId: clientId
          }
        }
      },
      orderBy: [{ productCode: 'desc' }],
    });
  }
}
