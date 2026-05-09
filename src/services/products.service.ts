import { PrismaClient, Products } from '@prisma/client';
import { ProductCreateInput, ProductUpdateInput } from '../types/product';
import { ERROR_MESSAGES } from '../constants/response/errors';
import { ErrorResponse } from '../types/product';

const prisma = new PrismaClient();

type ProductsResponse = Products[] | ErrorResponse;

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
  
  async getAllProducts(): Promise<ProductsResponse> {
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
          },
          _count: {
            select: {
              Tickets: {
                where: {
                  status: { in: ['new', 'in_progress', 'assigned', 'awaiting_client'] },
                },
              },
            },
          },
        },
      });

      if (!products) {
        return { error: ERROR_MESSAGES.FAILED_TO_RETRIEVE_PRODUCTS_FROM_DATABASE };
      }
      return products.map(({ _count, ...rest }) => ({
        ...rest,
        activeTickets: _count.Tickets,
      })) as unknown as Products[];
    } catch (error) {
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
        return { error: ERROR_MESSAGES.PRODUCT_NOT_FOUND };
      } 
      
      const client = await prisma.clients.findUnique({
        where: { id: clientId }
      });
      if (!client) {
        return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND };
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
      return { error: ERROR_MESSAGES.FAILED_TO_ADD_CLIENT_TO_PRODUCT };
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
  
  async getProductsByClient(clientCode: string): Promise<Products[] | ErrorResponse> {
    try {
      if (!clientCode) {
        return { error: ERROR_MESSAGES.CLIENT_CODE_IS_REQUIRED };
      }

      const client = await prisma.clients.findUnique({
        where: { clientCode }
      }); 
      
      if (!client) {
        return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND };
      }

      const products = await prisma.products.findMany({
        where: {
          clientProducts: {
            some: {
              clientId: client.id
            }
          }
        },
        include: {
          clientProducts: {
            include: {
              client: {
                select: {
                  clientCode: true,
                  companyName: true,
                  status: true,
                  supportTier: true
                }
              }
            }
          }
        },
        orderBy: [{ productCode: 'desc' }]
      });

      return products;
    } catch (error) {
      throw error instanceof Error ? error : new Error(ERROR_MESSAGES.FAILED_TO_GET_PRODUCTS_FOR_CLIENT);
    }
  }
}