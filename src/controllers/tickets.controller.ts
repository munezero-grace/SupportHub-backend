import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { TicketsService } from "../services/tickets.service";
import { UserService } from "../services/user.service";
import cloudinary from "../utils/cloudinary";
import { ClientService } from "../services/client.service";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import {
  HTTP_OK,
  HTTP_CREATED,
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_ACCESS_DENIED,
} from "../constants/httpStatusCodes";
import { sendSlackNotification } from "../utils/slackNotifier";
import prisma from "../lib/prisma";
import { getUserRole } from "../helpers/getUserRole";

const clientService = new ClientService();
const userService = new UserService();

class TicketsController {
  static async createTicket(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userExists = await TicketsService.checkUserExists(userId);
      if (!userExists) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.USER_DOES_NOT_EXIST });
      }

      const userRole = await getUserRole(userId);
      const isAdmin =
        userRole?.includes("admin") || userRole?.includes("super_admin");

      if (!isAdmin) {
        const client = await clientService.findClientByUserId(userId);
        if (!client || "error" in client) {
          return res
            .status(HTTP_BAD_REQUEST)
            .json({ error: ERROR_MESSAGES.NO_CLIENT_ASSOCIATED_WITH_USER });
        }
      }

      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(
            (file as Express.Multer.File).path,
            {
              folder: "tickets",
            }
          );
          imageUrls.push(result.secure_url);
        }
      } else if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "tickets",
        });
        imageUrls.push(result.secure_url);
      }

      let ticketData;
      if (isAdmin) {
        ticketData = {
          ...req.body,
          imageUrls,
        };
      } else {
        const client = await clientService.findClientByUserId(userId);
        if (!client || "error" in client) {
          return res
            .status(HTTP_BAD_REQUEST)
            .json({ error: ERROR_MESSAGES.NO_CLIENT_ASSOCIATED_WITH_USER });
        }
        ticketData = {
          ...req.body,
          imageUrls,
          clientId: client.id,
        };
      }

      const ticketResult = await TicketsService.createTicket(
        userId,
        ticketData
      );

      if (!ticketResult || "error" in ticketResult) {
        return res.status(HTTP_BAD_REQUEST).json({
          error: ticketResult?.error || ERROR_MESSAGES.GENERAL_ERROR,
        });
      }

      const user = await userService.getUserById(userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : "Unknown";

      const product = ticketResult.productId
        ? await prisma.products.findUnique({
            where: { id: ticketResult.productId },
          })
        : null;

      const slackMessage = [
        `*New ticket created:*\n${ticketResult.title}(${ticketResult.ticketCode})`,
        `${product?.name || "Unknown"}(${product?.productCode || "Unknown"})`,
        "description" in ticketResult
          ? `Description: ${ticketResult.description}`
          : null,
        ...(ticketResult.TicketAttachments?.map(
          (attachment: any) => attachment.fileUrl
        ) || []),
        `Created by: ${userName}`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await sendSlackNotification(slackMessage);
      } catch (err) {
        console.error("Failed to send Slack notification:", err);
      }

      return res.status(HTTP_CREATED).json({
        message: SUCCESS_MESSAGES.TICKET_CREATED,
        data: ticketResult,
      });
    } catch (error: any) {
      console.error("❌ Error in createTicket:", error);
      console.error("📜 Error stack:", error.stack);
      console.error("📋 Request body when error occurred:", req.body);
      console.error("📎 Request files when error occurred:", req.files);
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.GENERAL_ERROR,
        details: error.stack || "No stack trace available",
      });
    }
  }

  static async getUserTickets(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userExists = await TicketsService.checkUserExists(userId);
      if (!userExists) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.USER_DOES_NOT_EXIST });
      }

      const userRole = await getUserRole(userId);
      const isAdmin = userRole === "super_admin";

      const queryOptions = {
        orderBy: [{ createdAt: "desc" }],
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              clientCode: true,
              status: true,
            },
          },
          owner: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      };

      const whereCondition: any = {};

      if (!isAdmin) {
        try {
          const client = await clientService.findClientByUserId(userId);
          if (!client || "error" in client) {
            whereCondition.OR = [{ createdBy: userId }];
          } else {
            whereCondition.OR = [
              { createdBy: userId },
              { clientId: client.id },
            ];
          }
        } catch (clientError) {
          whereCondition.OR = [{ createdBy: userId }];
        }
      }

      if (Object.keys(whereCondition).length > 0) {
        (queryOptions as any).where = whereCondition;
      }

      const tickets = await TicketsService.getUserTicketsWithOptions(
        queryOptions
      );

      return res.status(HTTP_OK).json({
        data: tickets || [],
        message: SUCCESS_MESSAGES.TICKETS_RETRIEVED,
      });
    } catch (error: any) {
      console.error("Error in getUserTickets:", error);
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKETS,
      });
    }
  }

  static async getTicketById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ticket = await TicketsService.getTicketById(id);

      if (!ticket) {
        return res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.TICKET_NOT_FOUND });
      }

      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.TICKET_RETRIEVED,
        data: ticket,
      });
    } catch (error) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKET });
    }
  }

  static async getTicketByCode(req: Request, res: Response): Promise<Response> {
    try {
      const { ticketCode } = req.params;
      const ticket = await TicketsService.getTicketByCode(ticketCode);

      if (!ticket) {
        return res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.TICKET_NOT_FOUND });
      }

      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.TICKET_RETRIEVED,
        data: ticket,
      });
    } catch (error) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKET });
    }
  }

  static async updateTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ticket = await TicketsService.updateTicket(id, req.body);

      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.TICKET_UPDATED,
        data: ticket,
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as any).code === "P2025"
      ) {
        return res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.TICKET_NOT_FOUND });
      } else {
        return res
          .status(HTTP_BAD_REQUEST)
          .json({ error: ERROR_MESSAGES.FAILED_TO_UPDATE_TICKET });
      }
    }
  }

  static async deleteTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ticket = await TicketsService.getTicketById(id);

      if (!ticket) {
        return res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.TICKET_NOT_FOUND });
      }

      await TicketsService.deleteTicket(id);
      return res.status(204).json({
        message: SUCCESS_MESSAGES.TICKET_DELETED,
      });
    } catch (error) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: ERROR_MESSAGES.FAILED_TO_DELETE_TICKET });
    }
  }

  static async getAllTickets(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userRole = await getUserRole(userId);
      const isAdmin =
        userRole?.includes("admin") || userRole?.includes("super_admin");

      if (!isAdmin) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const tickets = await TicketsService.getAllTickets();

      return res.status(HTTP_OK).json({
        data: tickets || [],
        message: SUCCESS_MESSAGES.TICKETS_RETRIEVED,
      });
    } catch (error: any) {
      console.error("Error in getAllTickets:", error);
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKETS,
      });
    }
  }

  static async getTicketsCount(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userRole = await getUserRole(userId);
      const isAdmin =
        userRole?.includes("admin") || userRole?.includes("super_admin");

      if (!isAdmin) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const counts = await TicketsService.getTicketsCounts();

      return res.status(HTTP_OK).json({
        data: counts,
        message: "Ticket counts retrieved successfully",
      });
    } catch (error: any) {
      console.error("Error in getTicketsCount:", error);
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKETS,
      });
    }
  }
}

export default TicketsController;
