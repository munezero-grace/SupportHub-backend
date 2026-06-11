import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TicketsService } from "../services/tickets.service";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_ACCESS_DENIED,
} from "../constants/httpStatusCodes";
import { handleServiceResult } from "../helpers/responseHelper";
import { ticketListIncludes } from "../utils/ticketPrismaIncludes";

const prisma = new PrismaClient();

class TicketsController {
  static async createTicket(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as string;
      const files = Array.isArray(req.files)
        ? req.files
        : req.files
          ? [req.files]
          : [];
      const result = await TicketsService.createTicketWithUploadsAndNotify(
        userId,
        req.body,
        files,
      );
      return handleServiceResult(
        res,
        result,
        SUCCESS_MESSAGES.TICKET_CREATED,
        ERROR_MESSAGES.GENERAL_ERROR,
        201,
        HTTP_BAD_REQUEST,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getUserTickets(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as string;
      const result = await TicketsService.getUserTicketsControllerLogic(userId);
      return handleServiceResult(
        res,
        { data: result },
        SUCCESS_MESSAGES.TICKETS_RETRIEVED,
        ERROR_MESSAGES.GENERAL_ERROR,
        HTTP_OK,
        HTTP_BAD_REQUEST,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getTicketById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const user = req.user;
      const ticket = await TicketsService.getTicketByIdWithAuth(id, user);
      return handleServiceResult(
        res,
        { data: ticket },
        SUCCESS_MESSAGES.TICKET_RETRIEVED,
        ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKET,
        HTTP_OK,
        HTTP_BAD_REQUEST,
      );
    } catch (error: any) {
      return res.status(error.status).json({
        error: error.message,
      });
    }
  }

  static async getTicketByCode(req: Request, res: Response): Promise<Response> {
    try {
      const { ticketCode } = req.params;
      const ticket = await TicketsService.getTicketByCode(ticketCode);
      return handleServiceResult(
        res,
        { data: ticket },
        SUCCESS_MESSAGES.TICKET_RETRIEVED,
        ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKET,
        HTTP_OK,
        HTTP_BAD_REQUEST,
      );
    } catch (error: any) {
      return res.status(error.status).json({
        error: error.message,
      });
    }
  }

  static async updateTicket(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.user;
      const { id } = req.params;
      const files = Array.isArray(req.files)
        ? req.files
        : req.files
          ? [req.files]
          : [];
      const result = await TicketsService.updateTicketWithValidation(
        user,
        id,
        req.body,
        files,
      );
      return handleServiceResult(
        res,
        result,
        SUCCESS_MESSAGES.TICKET_UPDATED,
        ERROR_MESSAGES.FAILED_TO_UPDATE_TICKET,
        HTTP_OK,
        result.status || 400,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async deleteTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const user = req.user;
      await TicketsService.deleteTicketWithAuth(id, user);
      return res.status(204).json({
        message: SUCCESS_MESSAGES.TICKET_DELETED,
      });
    } catch (error: any) {
      return res.status(error.status || HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getAllTickets(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as string;
      const tickets = await TicketsService.getAllTicketsControllerLogic(userId);
      return handleServiceResult(
        res,
        tickets,
        SUCCESS_MESSAGES.TICKETS_RETRIEVED,
        ERROR_MESSAGES.GENERAL_ERROR,
        HTTP_OK,
        HTTP_ACCESS_DENIED,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async addComment(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user?.id as string;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }
    const result = await TicketsService.addComment(id, userId, text.trim());
    return handleServiceResult(res, result, "Comment added", "Failed to add comment", 201, 400);
  }

  static async addNote(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user?.id as string;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Note text is required" });
    }
    const result = await TicketsService.addNote(id, userId, text.trim());
    return handleServiceResult(res, result, "Note added", "Failed to add note", 201, 400);
  }

  static async getAssignedTickets(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as string;
      const tickets = await TicketsService.getDeveloperAssignedTickets(userId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.TICKETS_RETRIEVED,
        data: tickets,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({ error: error.message });
    }
  }

  static async getTicketsForUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const tickets = await TicketsService.getTicketsAssignedToUser(userId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.TICKETS_RETRIEVED,
        data: tickets,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({ error: error.message });
    }
  }

  static async assignTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { assigneeId, deadline } = req.body;
      if (!assigneeId)
        return res.status(400).json({ error: "assigneeId is required" });
      const result = await TicketsService.assignTicket(
        id,
        assigneeId,
        req.user?.id as string,
        deadline,
      );
      return handleServiceResult(
        res,
        result,
        "Ticket assigned successfully",
        ERROR_MESSAGES.GENERAL_ERROR,
        HTTP_OK,
        HTTP_BAD_REQUEST,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({ error: error.message });
    }
  }

  static async getRankedTickets(
    _req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const tickets = await prisma.tickets.findMany({
        where: {
          status: { in: ["new", "in_progress", "assigned", "awaiting_client"] },
        },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
        include: ticketListIncludes,
      });
      return handleServiceResult(
        res,
        { data: tickets },
        SUCCESS_MESSAGES.TICKETS_RETRIEVED,
        ERROR_MESSAGES.GENERAL_ERROR,
        HTTP_OK,
        HTTP_BAD_REQUEST,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({ error: error.message });
    }
  }

  static async getTicketsCount(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as string;
      const result =
        await TicketsService.getTicketsCountsControllerLogic(userId);
      return handleServiceResult(
        res,
        result,
        SUCCESS_MESSAGES.TICKET_COUNT_RETRIEVED_SUCCESSFULLY,
        ERROR_MESSAGES.GENERAL_ERROR,
        HTTP_OK,
        HTTP_ACCESS_DENIED,
      );
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }
}

export default TicketsController;
