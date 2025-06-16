import { PrismaClient } from '@prisma/client';
import { ClientService } from './client.service';

const prisma = new PrismaClient();
const clientService = new ClientService();

class TicketsService {
  private static async getNextTicketCode(): Promise<string> {
    const lastTicket = await prisma.tickets.findFirst({
      orderBy: { ticketCode: 'desc' },
    });

    if (!lastTicket) {
      return 'T-1001';
    }

    const lastCodeNumber = parseInt(lastTicket.ticketCode.split('-')[1]);
    const nextCodeNumber = lastCodeNumber + 1;
    return `T-${nextCodeNumber}`;
  }

  static async createTicket(userId: string, ticketData: any) {
    const { title, status, priority, imageUrl, clientId, productId } = ticketData;

    if (clientId) {
      const clientExists = await clientService.findClientByIdField(clientId);
      if (!clientExists) {
        throw new Error(`Client with id ${clientId} does not exist`);
      }
    }

    if (productId) {
      const productExists = await prisma.products.findUnique({
        where: { id: productId },
      });
      if (!productExists) {
        throw new Error(`Product with id ${productId} does not exist`);
      }
    } else {
      throw new Error('productId is required');
    }

    const ticketCode = await this.getNextTicketCode();

    const ticket = await prisma.tickets.create({
      data: {
        ticketCode,
        title,
        status,
        priority,
        description: ticketData.description || '',
        imageUrl,
        createdBy: userId,
        clientId,
        productId,
      },
    });
    return ticket;
  }

  static async checkUserExists(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    return !!user;
  }

  static async getUserTickets(userId: string) {
    try {
      return await prisma.tickets.findMany({
        where: { createdBy: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              companyName: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  }

  static async getTicketById(id: string) {
    return await prisma.tickets.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async updateTicket(id: string, updateData: any) {
    if (updateData.productId) {
      const productExists = await prisma.products.findUnique({
        where: { id: updateData.productId },
      });
      if (!productExists) {
        throw new Error(`Product with id ${updateData.productId} does not exist`);
      }
    }
    return await prisma.tickets.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteTicket(id: string) {
    return await prisma.tickets.delete({
      where: { id },
    });
  }
}

export default TicketsService;