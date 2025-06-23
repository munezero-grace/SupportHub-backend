import { PrismaClient, StatusEnum, PriorityEnum } from '@prisma/client';
import { ClientService } from './client.service';
import { ERROR_MESSAGES } from '../constants/response/errors';

const prisma = new PrismaClient();
const clientService = new ClientService();

interface CreateTicketData {
  title: string;
  priority?: PriorityEnum;
  imageUrl?: string;
  clientId?: string;
  productId?: string;
  product?: string;
  tags?: string;
  dueDate?: string;
  internalNotes?: string;
  description?: string;
}

export class TicketsService {
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

  static async createTicket(userId: string, ticketData: CreateTicketData & { imageUrls?: string[] }) {
    const { title, priority, imageUrls, clientId, productId, product, tags, dueDate, internalNotes, description } = ticketData;

    const userClient = await clientService.findClientByUserId(userId);

    let finalClientId = clientId;
    if (!clientId && userClient && 'id' in userClient) {
      finalClientId = userClient.id;
    } else if (clientId) {
      const clientExists = await clientService.findClientByIdField(clientId);
      if (!clientExists) {
        return { error: ERROR_MESSAGES.CLIENT_DOES_NOT_EXIST.replace('{id}', clientId) };
      }
    } else if (!userClient) {
      return { error: ERROR_MESSAGES.NO_CLIENT_ASSOCIATED_WITH_USER };
    }

    const finalProductId = productId || product;

    if (finalProductId) {
      const productExists = await prisma.products.findUnique({
        where: { id: finalProductId }
      });

      if (!productExists) {
        return { error: ERROR_MESSAGES.PRODUCT_DOES_NOT_EXIST };
      }

      if (finalClientId) {
        const clientProduct = await prisma.clientProduct.findUnique({
          where: {
            clientId_productId: {
              clientId: finalClientId,
              productId: finalProductId
            }
          }
        });

        if (!clientProduct) {
          return { error: ERROR_MESSAGES.PRODUCT_NOT_ASSOCIATED_WITH_CLIENT };
        }
      }
    }

    const ticketCode = await TicketsService.getNextTicketCode();

    const ticket = await prisma.tickets.create({
      data: {
        ticketCode,
        title,
        status: StatusEnum.new,
        priority: priority || PriorityEnum.medium,
        imageUrl: imageUrls && imageUrls.length > 0 ? imageUrls[0] : null,
        description,
        internalNotes,
        ...(tags ? { tags: typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        owner: {
          connect: { id: userId }
        },
        ...(finalClientId && {
          client: {
            connect: { id: finalClientId }
          }
        }),
        ...(finalProductId && {
          product: {
            connect: { id: finalProductId }
          }
        }),
        ...(description && { description }),
        ...(internalNotes && { internalNotes }),
        ...(tags && { tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) }),
        ...(dueDate && { dueDate: new Date(dueDate) })
      }
    });

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        await prisma.ticketAttachment.create({
          data: {
            ticketId: ticket.id,
            fileUrl: url
          }
        });
      }
    }

    const completeTicket = await prisma.tickets.findUnique({
      where: { id: ticket.id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            status: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
            status: true,
            updatedAt: true
          }
        },
        TicketAttachments: true
      }
    });

    return completeTicket;
  }

  static async checkUserExists(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    return !!user;
  }

  static async getUserTickets(userId: string, isAdmin: boolean = false) {
    try {
      return await prisma.tickets.findMany({
        where: isAdmin ? {} : {
          OR: [
            { createdBy: userId },
            {
              client: {
                userId: userId
              }
            }
          ]
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              clientCode: true,
              status: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              productCode: true,
              status: true,
              updatedAt: true
            }
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  static async getUserTicketsWithOptions(queryOptions: any) {
    return await prisma.tickets.findMany(queryOptions);
  }

  static async getTicketById(id: string) {
    return await prisma.tickets.findUnique({
      where: { id },
      include: {
        owner: true,
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
        TicketAttachments: true
      },
    });
  }

  static async getTicketByCode(ticketCode: string) {
    return await prisma.tickets.findUnique({
      where: { ticketCode },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true,
            status: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
            status: true
          }
        },
      },
    });
  }

  static async updateTicket(id: string, updateData: any) {
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
