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
    const clientCode = await this.generateClientCode();
    const { contactName, contactEmail } = data;
    const createUser = await prisma.users.create({
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

    await this.assignClientRole(createUser.id);

    const createdCompany = await prisma.clients.create({
      data: {
        clientCode,
        companyName: data.companyName,
        supportTier: data.supportTier ?? "standard",
        status: data.status ?? "active",
        createdBy: createUser.id,
        userId: createUser.id,
      },
    });

    return createdCompany;
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
      },
    });
  }

  async updateClient(
    clientCode: string,
    data: Partial<Clients>
  ): Promise<Clients> {
    // Only allow updating client-specific fields
    const allowedFields: (keyof Clients)[] = [
      "companyName",
      "supportTier",
      "status",
    ];
    // Only copy fields that are of the correct type (string for companyName/supportTier/status)
    const filteredData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined && typeof data[key] === "string") {
        filteredData[key] = data[key];
      }
    }
    return prisma.clients.update({
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

  async deleteClient(clientCode: string): Promise<Clients> {
    return prisma.clients.delete({
      where: { clientCode },
    });
  }

  private async assignClientRole(userId: string) {
    const clientRole = await prisma.roles.findUnique({
      where: { name: UserRole.CLIENT },
    });

    if (clientRole) {
      await prisma.userRoles.create({
        data: { userId, roleId: clientRole.id },
      });
    }
  }
}
