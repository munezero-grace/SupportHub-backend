import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import TicketsService from '../services/tickets.service';
import cloudinary from '../utils/cloudinary';
import { ClientService } from '../services/client.service';
import {
  HTTP_OK,
  HTTP_CREATED,
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_ACCESS_DENIED,
} from '../constants/httpStatusCodes';

const clientService = new ClientService();

class TicketsController {
  static async createTicket(req: Request, res: Response): Promise<Response> {
    try {

      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(HTTP_ACCESS_DENIED).json({ error: 'Unauthorized' });
      }


      const userExists = await TicketsService.checkUserExists(userId);
      if (!userExists) {
        return res.status(HTTP_ACCESS_DENIED).json({ error: 'User does not exist' });
      }


      const client = await clientService.findClientByUserId(userId);
      if (!client) {
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Client not found for user' });
      }

      let imageUrl;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'tickets',
        });
        imageUrl = result.secure_url;
      }


      const ticketData = {
        ...req.body,
        imageUrl,
        clientId: client.id, 
      };
      const ticket = await TicketsService.createTicket(userId, ticketData);
      return res.status(HTTP_CREATED).json(ticket);
    } catch (error: any) {
      console.error('Error creating ticket:', error.message, error.stack);
      if (error.isJoi) {
        return res.status(HTTP_BAD_REQUEST).json({ error: error.details.map((d: any) => d.message) });
      }
      return res.status(HTTP_BAD_REQUEST).json({ error: error.message || 'Failed to create ticket' });
    }
  }

  static async getUserTickets(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(HTTP_ACCESS_DENIED).json({ error: 'Unauthorized' });
      }

      const tickets = await TicketsService.getUserTickets(userId);

      return res.status(HTTP_OK).json(tickets);
    } catch (error) {
      return res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to retrieve tickets' });
    }
  }

  static async getTicketById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ticket = await TicketsService.getTicketById(id);

      if (!ticket) {
        return res.status(HTTP_NOT_FOUND).json({ error: 'Ticket not found' });
      }

      return res.status(HTTP_OK).json(ticket);
    } catch (error) {
      return res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to retrieve ticket' });
    }
  }

  static async updateTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ticket = await TicketsService.updateTicket(id, req.body);

      return res.status(HTTP_OK).json(ticket);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2025') {
        return res.status(HTTP_NOT_FOUND).json({ error: 'Ticket not found' });
      } else {
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to update ticket' });
      }
    }
  }

  static async deleteTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ticket = await TicketsService.getTicketById(id);

      if (!ticket) {
        return res.status(HTTP_NOT_FOUND).json({ error: 'Ticket not found' });
      }

      await TicketsService.deleteTicket(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to delete ticket' });
    }
  }
}

export default TicketsController;
