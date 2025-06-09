import { PrismaClient, Clients } from "@prisma/client";
import { CreateClientDto } from "../types/client";
import * as bcrypt from "bcryptjs";
import { UserRole } from "../types";
import { generateClientCode } from "../helpers/generateClientCode";
import { ERROR_MESSAGES } from "../constants/response/errors";

const prisma = new PrismaClient();

export class ClientService {
  async createClient(data: CreateClientDto): Promise<Clients> {
    try {
      const existingUser = await prisma.users.findUnique({
        where: { email: data.contactEmail },
      });

      if (existingUser) {
        throw new Error(ERROR_MESSAGES.USER_EMAIL_EXISTS);
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
            roleId: clientRole.id
          }
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
            user: true
          },
        });

        return createdCompany;
      });
    } catch (error) {
      console.error("Error in createClient:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Failed to create client");
    }
  }

  async findUserClient(userId: string): Promise<Clients | null> {
    return prisma.clients.findFirst({
      where: { userId },
      include: {
        user: true,
        clientProducts: {
          include: {
            product: true
          }
        }
      },
    });
  }

  async findAllClients(): Promise<Clients[]> {
    try {
      return prisma.clients.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          clientProducts: {
            include: {
              product: true
            }
          }
        }
      });
    } catch (error) {
      console.error("Error finding all clients:", error);
      throw new Error("Failed to fetch clients");
    }
  }

  async findClientById(clientCode: string): Promise<Clients | null> {
    try {
      return prisma.clients.findUnique({
        where: { clientCode },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          clientProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  productCode: true,
                  name: true,
                  description: true,
                  status: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error("Error finding client by id:", error);
      throw new Error("Failed to fetch client");
    }
  }

  async updateClient(
    clientCode: string,
    data: Partial<Clients>
  ): Promise<Clients> {
    const existingClient = await prisma.clients.findUnique({
      where: { clientCode },
    });

    if (!existingClient) {
      throw new Error("Client not found");
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
    } return await prisma.clients.update({
      where: { clientCode },
      data: filteredData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
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

  async deleteClient(clientCode: string): Promise<Clients> {
    return prisma.$transaction(async (tx) => {
      const client = await tx.clients.findUnique({
        where: { clientCode },
        include: {
          user: true,
          clientProducts: true,
        },
      });

      if (!client) {
        throw new Error("Client not found");
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

  async getProductsForClient(clientId: string) {
    return prisma.clientProduct.findMany({
      where: { clientId },
      include: {
        product: true,
      },
    });
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
}
