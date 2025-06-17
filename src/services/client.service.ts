import { PrismaClient, Clients } from "@prisma/client";
import { CreateClientDto } from "../types/client";
import * as bcrypt from "bcryptjs";
import { UserRole } from "../types";
import { generateClientCode } from "../helpers/generateClientCode";
import { ERROR_MESSAGES } from "../constants/response/errors";

const prisma = new PrismaClient();

export class ClientService {
  async createClient(data: CreateClientDto): Promise<Clients | { error: string }> {
    try {
      const existingUser = await prisma.users.findUnique({
        where: { email: data.contactEmail },
      });

      if (existingUser) {
        return { error: ERROR_MESSAGES.USER_EMAIL_EXISTS };
      }

      const clientCode = await generateClientCode(prisma);
      const { contactName, contactEmail } = data;
      return await prisma.$transaction(async (tx) => {
        const createUser = await tx.users.create({
          data: {
            firstName: contactName,
            lastName: "",
            email: contactEmail,
            password: await bcrypt.hash(
              process.env.DEFAULT_PASSWORD ?? "Password123!",
              10
            ),
          },
        });

        let clientRole = await tx.roles.findUnique({
          where: { name: UserRole.CLIENT },
        });

        if (!clientRole) {
          clientRole = await tx.roles.create({
            data: { name: UserRole.CLIENT },
          });
        }

        await tx.userRoles.create({
          data: {
            userId: createUser.id,
            roleId: clientRole.id,
          },
        });

        const createdCompany = await tx.clients.create({
          data: {
            clientCode,
            companyName: data.companyName,
            supportTier: data.supportTier ?? "standard",
            status: data.status ?? "active",
            createdBy: createUser.id,
            userId: createUser.id,
          },
          include: {
            user: true,
          },
        });

        return createdCompany;
      });
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: ERROR_MESSAGES.FAILED_TO_CREATE_CLIENT };
    }
  }

  async findUserClient(userId: string): Promise<Clients | null> {
    return prisma.clients.findFirst({
      where: { userId },
      include: {
        user: true,
        clientProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findClientByIdField(clientId: string): Promise<Clients | null> {
    return prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAllClients(activeOnly: boolean = false): Promise<Clients[] | { error: string }> {
    try {
      return prisma.clients.findMany({
        where: activeOnly
          ? {
            status: "active",
          }
          : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          clientProducts: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch (error) {
      return { error: ERROR_MESSAGES.FAILED_TO_FETCH_CLIENTS };
    }
  }

  async findClientById(clientCode: string): Promise<Clients | null | { error: string }> {
    try {
      return prisma.clients.findUnique({
        where: { clientCode },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          clientProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  productCode: true,
                  name: true,
                  description: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      return { error: ERROR_MESSAGES.FAILED_TO_FETCH_CLIENT };
    }
  }

  async findClientByUserId(userId: string): Promise<Clients | null | { error: string }> {
    return prisma.clients.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
  
  async updateClient(
    clientCode: string,
    data: Partial<Clients>
  ): Promise<Clients | { error: string }> {
    const existingClient = await prisma.clients.findUnique({
      where: { clientCode },
    }); 
    
    if (!existingClient) {
      return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND_UPDATE };
    }
    
    const allowedFields: (keyof Clients)[] = [
      "companyName",
      "supportTier",
      "status",
    ];
    const filteredData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined && typeof data[key] === "string") {
        filteredData[key] = data[key];
      }
    }
    
    return await prisma.clients.update({
      where: { clientCode },
      data: filteredData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async updateClientStatus(
    clientCode: string,
    status: "active" | "inactive"
  ): Promise<Clients> {
    return prisma.clients.update({
      where: { clientCode },
      data: { status },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteClient(clientCode: string): Promise<Clients | { error: string }> {
    return prisma.$transaction(async (tx) => {
      const client = await tx.clients.findUnique({
        where: { clientCode },
        include: {
          user: true,
          clientProducts: true,
        },
      }); 
      
      if (!client) {
        return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND };
      }
      
      await tx.clientProduct.deleteMany({
        where: { clientId: client.id },
      });
      
      const deletedClient = await tx.clients.delete({
        where: { clientCode },
      });

      return deletedClient;
    });
  }
  
  async getProductsForClient(clientCode: string) {
    try {
      const client = await prisma.clients.findUnique({
        where: { clientCode },
        include: {
          clientProducts: {
            include: {
              product: {
                include: {
                  clientProducts: {
                    include: {
                      client: {
                        select: {
                          clientCode: true,
                          companyName: true,
                          status: true,
                          supportTier: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }); 

      if (!client) {
        return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND };
      }

      return client.clientProducts.map((cp) => ({
        ...cp.product,
        clients: cp.product.clientProducts.map((ccp) => ccp.client),
      }));
    } catch (error) {
      return { error: error instanceof Error ? error.message : ERROR_MESSAGES.FAILED_TO_GET_PRODUCTS_FOR_CLIENT };
    }
  }

  async addProductToClient(clientId: string, productId: string) {
    return prisma.clientProduct.create({
      data: {
        clientId,
        productId,
      },
    });
  }

  async removeProductFromClient(clientId: string, productId: string) {
    return prisma.clientProduct.delete({
      where: {
        clientId_productId: {
          clientId,
          productId,
        },
      },
    });
  }

  async findByClientCode(clientCode: string): Promise<Clients | null> {
    return prisma.clients.findUnique({
      where: { clientCode },
      include: {
        user: true,
        clientProducts: true,
      },
    });
  }
}
