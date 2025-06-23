import { Clients } from "@prisma/client";
import { CreateClientDto } from "../types/client";
import * as bcrypt from "bcryptjs";
import { UserRole } from "../types";
import { generateClientCode } from "../helpers/generateClientCode";
import { ERROR_MESSAGES } from "../constants/response/errors";
import prisma from "../lib/prisma";

export class ClientService {
  async createClient(
    data: CreateClientDto
  ): Promise<Clients | { error: string }> {
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
      where: {
        userId,
        deletedAt: null,
      },
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
    return prisma.clients.findFirst({
      where: {
        id: clientId,
        deletedAt: null,
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
  }
  async findAllClients(options?: {
    onlySoftDeleted?: boolean;
  }): Promise<Clients[] | { error: string }> {
    try {
      const onlySoftDeleted = options?.onlySoftDeleted;
      const clients = await prisma.clients.findMany({
        where: onlySoftDeleted
          ? { deletedAt: { not: null } }
          : { deletedAt: null },
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
      return clients;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.FAILED_TO_FETCH_CLIENTS,
      };
    }
  }

  async findClientById(
    clientCode: string
  ): Promise<Clients | null | { error: string }> {
    try {
      return prisma.clients.findFirst({
        where: {
          clientCode,
          deletedAt: null,
        },
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

  async findClientByUserId(
    userId: string
  ): Promise<Clients | null | { error: string }> {
    return prisma.clients.findFirst({
      where: {
        userId,
        deletedAt: null,
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
  }

  async updateClient(
    clientCode: string,
    data: Partial<Clients>
  ): Promise<Clients | { error: string }> {
    const existingClient = await prisma.clients.findFirst({
      where: {
        clientCode,
        deletedAt: null,
      },
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
  ): Promise<Clients | { error: string }> {
    const existingClient = await prisma.clients.findFirst({
      where: {
        clientCode,
        deletedAt: null,
      },
    });

    if (!existingClient) {
      return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND };
    }

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
  async deleteClient(clientId: string): Promise<Clients | { error: string }> {
    return prisma.$transaction(async (tx) => {
      const client = await tx.clients.findFirst({
        where: {
          id: clientId,
          deletedAt: null,
        },
        include: {
          user: true,
          clientProducts: true,
        },
      });

      if (!client) {
        return { error: ERROR_MESSAGES.CLIENT_NOT_FOUND };
      }

      const softDeletedClient = await tx.clients.update({
        where: { id: clientId },
        data: {
          deletedAt: new Date(),
          status: "inactive",
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

      return softDeletedClient;
    });
  }

  async getProductsForClient(clientId: string) {
    try {
      const client = await prisma.clients.findFirst({
        where: {
          id: clientId,
          deletedAt: null,
        },
        include: {
          clientProducts: {
            include: {
              product: {
                include: {
                  clientProducts: {
                    include: {
                      client: {
                        select: {
                          id: true,
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
      return {
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.FAILED_TO_GET_PRODUCTS_FOR_CLIENT,
      };
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
    return prisma.clients.findFirst({
      where: {
        clientCode,
        deletedAt: null,
      },
      include: {
        user: true,
        clientProducts: true,
      },
    });
  }
  async softDeleteClient(
    clientId: string
  ): Promise<Clients | { error: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        const client = await tx.clients.findUnique({
          where: { id: clientId },
        });

        if (!client) {
          throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
        }

        if (client.deletedAt) {
          throw new Error(ERROR_MESSAGES.CLIENT_SOFT_DELETED);
        }

        const updatedClient = await tx.clients.update({
          where: {
            id: client.id,
          },
          data: {
            deletedAt: new Date(),
            status: "inactive",
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

        return updatedClient;
      });
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.FAILED_TO_DELETE_CLIENT,
      };
    }
  }

  async restoreClient(clientId: string): Promise<Clients | { error: string }> {
    try {
      const clientArr =
        await prisma.$queryRaw`SELECT * FROM "Clients" WHERE id = ${clientId} LIMIT 1`;
      const client =
        Array.isArray(clientArr) && clientArr.length > 0 ? clientArr[0] : null;

      if (!client) {
        throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
      }

      if (!client.deletedAt) {
        throw new Error("Client is not soft-deleted");
      }

      const restoredClient = await prisma.clients.update({
        where: { id: clientId },
        data: { deletedAt: null, status: "active" },
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

      return restoredClient;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.FAILED_TO_RESTORE_CLIENT,
      };
    }
  }
}
