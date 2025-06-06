import { PrismaClient, Clients } from "@prisma/client";
import { CreateClientDto } from "../types/client";
import * as bcrypt from "bcryptjs";
import { UserRole } from "../types";

const prisma = new PrismaClient();

export class ClientService {
  async generateClientCode(): Promise<string> {
    const lastClient = await prisma.clients.findFirst({
      orderBy: { clientCode: "desc" },
    });

    if (!lastClient) return "C-1001";

    const lastClientId = lastClient.clientCode;
    const lastNumber = parseInt(lastClientId.split("-")[1]);
    const nextNumber = lastNumber + 1;

    return `C-${nextNumber}`;
  }

  async createClient(data: CreateClientDto): Promise<Clients> {
    try {
      // Check if user with email already exists
      const existingUser = await prisma.users.findUnique({
        where: { email: data.contactEmail },
      });

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }

      const clientCode = await this.generateClientCode();
      const { contactName, contactEmail } = data;      // Use transaction to ensure both user and client are created or neither is
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

        // Assign client role within the transaction
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
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
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

  async findAllClients(): Promise<Clients[]> {
    return prisma.clients.findMany({
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
  }

  async findClientById(clientCode: string): Promise<Clients | null> {
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
            product: true,
          },
        },
      },
    });
  }

  async findClientByUUID(clientId: string): Promise<Clients | null> {
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
    }

    try {
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
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update client: ${error.message}`);
      }
      throw new Error("Failed to update client");
    }
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
      // Get the client first to verify it exists
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

      // Delete all client-product associations
      await tx.clientProduct.deleteMany({
        where: { clientId: client.id },
      });

      // Delete the client
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
