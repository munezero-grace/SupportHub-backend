import { PrismaClient, StatusEnum, PriorityEnum } from "@prisma/client";
import { ClientService } from "./client.service";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { sendSlackNotification } from '../utils/slackNotifier';
import { getUserRole } from '../helpers/getUserRole';
import { CreateTicketData } from '../types/ticket';
import { buildTicketData } from '../utils/ticketData';
import { ticketIncludes, ticketListIncludes } from '../utils/ticketPrismaIncludes';
import { uploadTicketFiles } from '../helpers/ticketFileHelper';
import { buildSlackTicketMessage } from '../helpers/slackHelper';
import { throwIfTicketNotFound, throwIfNotAuthorized } from '../helpers/ErrorHandling';

const prisma = new PrismaClient();
const clientService = new ClientService();

function parseTags(tags: string | string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  if (Array.isArray(tags)) return tags.map(tag => tag.trim()).filter(Boolean);
  return tags.split(',').map(tag => tag.trim()).filter(Boolean);
}

export class TicketsService {
  private static async getNextTicketCode(): Promise<string> {
    const lastTicket = await prisma.tickets.findFirst({ orderBy: { ticketCode: "desc" } });
    if (!lastTicket) return "T-1001";
    const lastCodeNumber = parseInt(lastTicket.ticketCode.split("-")[1]);
    return `T-${lastCodeNumber + 1}`;
  }

  static async createTicket(userId: string, ticketData: CreateTicketData & { imageUrls?: string[] }) {
    const { title, priority, imageUrls, clientId, productId, product, tags, dueDate, internalNotes, description } = ticketData;
    const userClient = await clientService.findClientByUserId(userId);
    let finalClientId = clientId;
    if (!clientId && userClient && "id" in userClient) finalClientId = userClient.id;
    if (clientId) {
      const clientExists = await clientService.findClientByIdField(clientId);
      if (!clientExists) return { error: ERROR_MESSAGES.CLIENT_DOES_NOT_EXIST.replace("{id}", clientId) };
    } else if (!userClient) {
      return { error: ERROR_MESSAGES.NO_CLIENT_ASSOCIATED_WITH_USER };
    }
    const finalProductId = productId || product;
    if (finalProductId) {
      const productExists = await prisma.products.findUnique({ where: { id: finalProductId } });
      if (!productExists) return { error: ERROR_MESSAGES.PRODUCT_DOES_NOT_EXIST };
      if (finalClientId) {
        const clientProduct = await prisma.clientProduct.findUnique({ where: { clientId_productId: { clientId: finalClientId, productId: finalProductId } } });
        if (!clientProduct) return { error: ERROR_MESSAGES.PRODUCT_NOT_ASSOCIATED_WITH_CLIENT };
      }
    }
    const ticketCode = await TicketsService.getNextTicketCode();
    const tagsArray = parseTags(tags);
    const data = buildTicketData({
      ticketCode,
      title,
      priority,
      imageUrls,
      description,
      internalNotes,
      tags: undefined, 
      dueDate,
      userId,
      finalClientId,
      finalProductId
    });
    const ticket = await prisma.tickets.create({ data: { ...data, tags: tagsArray } });
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        await prisma.ticketAttachment.create({ data: { ticketId: ticket.id, fileUrl: url } });
      }
    }
    return prisma.tickets.findUnique({
      where: { id: ticket.id },
      include: ticketIncludes
    });
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
        where: isAdmin
          ? {}
          : {
            OR: [
              { createdBy: userId },
              { client: { userId: userId } },
            ],
          },
        orderBy: [{ createdAt: "desc" }],
        include: ticketListIncludes
      });
    } catch (error) {
      throw error;
    }
  }

  static async getUserTicketsWithOptions(queryOptions: any) {
    return await prisma.tickets.findMany({ ...queryOptions, include: ticketListIncludes });
  }

  static async getTicketById(id: string) {
    return await prisma.tickets.findUnique({
      where: { id },
      include: ticketIncludes
    });
  }

  static async getTicketByCode(ticketCode: string) {
    const ticket = await prisma.tickets.findUnique({
      where: { ticketCode },
      include: ticketIncludes
    });
    if (!ticket) {
      const { ErrorHandling } = await import('../helpers/ErrorHandling');
      throw new ErrorHandling(ERROR_MESSAGES.TICKET_NOT_FOUND, 404);
    }
    return ticket;
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

  static async getAllTickets() {
    return await prisma.tickets.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: ticketListIncludes
    });
  }

  static async getTicketsCounts() {
    const [total, open, newTickets, inProgress, assigned, awaiting, resolved] =
      await Promise.all([
        prisma.tickets.count(),
        prisma.tickets.count({
          where: {
            status: {
              in: ["new", "in_progress", "assigned", "awaiting_client"],
            },
          },
        }),
        prisma.tickets.count({
          where: { status: "new" },
        }),
        prisma.tickets.count({
          where: { status: "in_progress" },
        }),
        prisma.tickets.count({
          where: { status: "assigned" },
        }),
        prisma.tickets.count({
          where: { status: "awaiting_client" },
        }),
        prisma.tickets.count({
          where: { status: "resolved" },
        }),
      ]);

    return {
      total,
      open,
      closed: resolved,
      byStatus: {
        new: newTickets,
        in_progress: inProgress,
        assigned,
        awaiting_client: awaiting,
        resolved,
      },
    };
  }

  static async createTicketWithUploadsAndNotify(userId: string, body: any, files: any) {
    try {
      const userExists = await TicketsService.checkUserExists(userId);
      if (!userExists) {
        return { error: ERROR_MESSAGES.USER_DOES_NOT_EXIST };
      }
      const userRole = await getUserRole(userId);
      const isAdmin = userRole?.includes("admin") || userRole?.includes("super_admin");
      let imageUrls: string[] = await uploadTicketFiles(files);
      let ticketData;
      if (isAdmin) {
        ticketData = { ...body, imageUrls };
      } else {
        const client = await (new ClientService()).findClientByUserId(userId);
        if (!client || "error" in client) {
          return { error: ERROR_MESSAGES.NO_CLIENT_ASSOCIATED_WITH_USER };
        }
        ticketData = { ...body, imageUrls, clientId: client.id };
      }
      const ticketResult = await TicketsService.createTicket(userId, ticketData);
      if (!ticketResult || "error" in ticketResult) {
        return { error: ticketResult?.error };
      }
      try {
        const user = await (new (require("../services/user.service").UserService)()).getUserById(userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : "Unknown";
        const product = ticketResult.productId
          ? await prisma.products.findUnique({ where: { id: ticketResult.productId } })
          : null;
        const slackMessage = buildSlackTicketMessage(
          { ...ticketResult, description: ticketResult.description ?? undefined },
          product ? product : {},
          userName
        );
        await sendSlackNotification(slackMessage);
      } catch { }
      return { data: ticketResult };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  static async getUserTicketsControllerLogic(userId: string) {
    const userExists = await TicketsService.checkUserExists(userId);
    if (!userExists) {
      throw new Error(ERROR_MESSAGES.USER_DOES_NOT_EXIST);
    }
    const userRole = await getUserRole(userId);
    const isAdmin = userRole === "super_admin";
    const queryOptions = {
      orderBy: [{ createdAt: "desc" }],
      include: {
        client: { select: { id: true, companyName: true, clientCode: true, status: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
        product: { select: { id: true, name: true, productCode: true, status: true, updatedAt: true } }
      },
    };
    const whereCondition: any = {};
    if (!isAdmin) {
      try {
        const client = await (new ClientService()).findClientByUserId(userId);
        if (!client || "error" in client) {
          whereCondition.OR = [{ createdBy: userId }];
        } else {
          whereCondition.OR = [{ createdBy: userId }, { clientId: client.id }];
        }
      } catch {
        whereCondition.OR = [{ createdBy: userId }];
      }
    }
    if (Object.keys(whereCondition).length > 0) {
      (queryOptions as any).where = whereCondition;
    }
    return await TicketsService.getUserTicketsWithOptions(queryOptions);
  }

  static async getAllTicketsControllerLogic(userId: string) {
    const userRole = await getUserRole(userId);
    const isAdmin = userRole?.includes("admin") || userRole?.includes("super_admin");
    if (!isAdmin) {
      return { error: ERROR_MESSAGES.UNAUTHORIZED };
    }
    const tickets = await TicketsService.getAllTickets();
    return { data: tickets };
  }

  static async getTicketsCountsControllerLogic(userId: string) {
    const userRole = await getUserRole(userId);
    const isAdmin = userRole?.includes("admin") || userRole?.includes("super_admin");
    if (!isAdmin) {
      return { error: ERROR_MESSAGES.UNAUTHORIZED };
    }
    const counts = await TicketsService.getTicketsCounts();
    return { data: counts };
  }

  static async updateTicketWithValidation(user: any, id: string, body: any) {
    try {
      if (user && (user.role === 'client' || user.role === 'user')) {
        return { error: ERROR_MESSAGES.UNAUTHORIZED, status: 403 };
      }
      const { status, priority } = body;
      const updateData: any = {};
      if ('status' in body) {
        if (!Object.values(StatusEnum).includes(status)) {
          return { error: `${ERROR_MESSAGES.INVALID_STATUS}: ${Object.values(StatusEnum).join(', ')}`, status: 400 };
        }
        updateData.status = status;
      }
      if ('priority' in body) {
        if (!Object.values(PriorityEnum).includes(priority)) {
          return { error: `${ERROR_MESSAGES.INVALID_PRIORITY}: ${Object.values(PriorityEnum).join(', ')}`, status: 400 };
        }
        updateData.priority = priority;
      }
      if (Object.keys(updateData).length === 0) {
        return { error: ERROR_MESSAGES.NO_VALID_FIELDS_TO_UPDATE, status: 400 };
      }
      try {
        const ticket = await TicketsService.updateTicket(id, updateData);
        return { data: ticket };
      } catch (error: any) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as any).code === "P2025"
        ) {
          return { error: ERROR_MESSAGES.TICKET_NOT_FOUND, status: 404 };
        } else {
          return { error: ERROR_MESSAGES.FAILED_TO_UPDATE_TICKET, status: 400 };
        }
      }
    } catch (error: any) {
      return { error: error.message || ERROR_MESSAGES.FAILED_TO_UPDATE_TICKET, status: 400 };
    }
  }

  static async getTicketByIdWithAuth(id: string, user: any) {
    const ticket = await TicketsService.getTicketById(id);
    throwIfTicketNotFound(ticket);
    throwIfNotAuthorized(user, ticket);
    return ticket;
  }

  static async deleteTicketWithAuth(id: string, user: any) {
    const ticket = await TicketsService.getTicketById(id);
    throwIfTicketNotFound(ticket);
    throwIfNotAuthorized(user, ticket);
    await TicketsService.deleteTicket(id);
    return true;
  }
}
