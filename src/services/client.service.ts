import { PrismaClient, Clients, ClientStatus } from "@prisma/client";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { CreateClientDto } from "../types/client";
import * as bcrypt from "bcryptjs";
import { UserRole } from "../types";
import { generateClientCode } from "../helpers/generateClientCode";
import {
  getClientById,
  getUserByEmail,
  userInfoSelect,
  softDeleteClientById,
  restoreClientById,
  addProductToClientHelper,
  removeProductFromClientHelper,
} from "../helpers/clientHelpers";

const prisma = new PrismaClient();

export class ClientService {
  async createClient(
    data: CreateClientDto
  ): Promise<Clients | { error: string }> {
    try {
      const existingUser = await getUserByEmail(data.contactEmail);

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
    return getClientById(clientId);
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
          user: { select: userInfoSelect },
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
    clientId: string,
    data: Partial<Clients>
  ): Promise<Clients> {
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
      where: { id: clientId },
      data: filteredData,
      include: {
        user: { select: userInfoSelect },
      },
    });
  }

  async updateClientStatus(
    clientId: string,
    status: string
  ): Promise<Clients | { error: string }> {
    if (
      ![ClientStatus.active, ClientStatus.inactive].includes(
        status as ClientStatus
      )
    )
      return { error: "Invalid status value" };
    return prisma.clients.update({
      where: { id: clientId },
      data: { status: status as ClientStatus },
      include: {
        user: { select: userInfoSelect },
      },
    });
  }

  async deleteClient(clientId: string): Promise<Clients> {
    return softDeleteClientById(clientId);
  }

  async softDeleteClient(
    clientId: string
  ): Promise<Clients | { error: string }> {
    try {
      const client = await getClientById(clientId, true);

      if (client && client.deletedAt) {
        throw new Error(ERROR_MESSAGES.CLIENT_SOFT_DELETED);
      }
      return await softDeleteClientById(clientId);
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
      const client = await getClientById(clientId, true);

      if (client && !client.deletedAt) {
        throw new Error("Client is not soft-deleted");
      }
      return await restoreClientById(clientId);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.FAILED_TO_RESTORE_CLIENT,
      };
    }
  }

  async getProductsForClient(clientId: string) {
    try {
      const client = await getClientById(clientId);
      return client!.clientProducts.map((cp: any) => ({
        ...cp.product,
        clients: cp.product.clientProducts.map((ccp: any) => ccp.client),
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
    return addProductToClientHelper(clientId, productId);
  }

  async removeProductFromClient(clientId: string, productId: string) {
    return removeProductFromClientHelper(clientId, productId);
  }
}
