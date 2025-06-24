import { Request, Response } from "express";
import { ClientService } from "../services/client.service";
import { CreateClientDto } from "../types/client";
import {
  HTTP_CREATED,
  HTTP_OK,
  HTTP_NO_CONTENT,
  HTTP_BAD_REQUEST,
} from "../constants/httpStatusCodes";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

const clientService = new ClientService();

export class ClientController {
  static async createClient(req: Request, res: Response): Promise<Response> {
    try {
      const clientData: CreateClientDto = req.body;
      const client = await clientService.createClient(clientData);
      return res.status(HTTP_CREATED).json({
        message: SUCCESS_MESSAGES.CLIENT_CREATED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getClientByUserId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id as string;
      const client = await clientService.findClientByUserId(userId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENTS_RETRIEVED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getAllClients(req: Request, res: Response): Promise<Response> {
    try {
      const includeSoftDeleted = req.query.includeSoftDeleted === "true";
      const clients = await clientService.findAllClients({
        onlySoftDeleted: includeSoftDeleted,
      });
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENTS_RETRIEVED,
        data: clients,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getClientById(req: Request, res: Response): Promise<Response> {
    try {
      const { clientId } = req.params;
      const client = await clientService.findClientByIdField(clientId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENTS_RETRIEVED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async updateClient(req: Request, res: Response): Promise<Response> {
    try {
      const { clientId } = req.params;
      const client = await clientService.updateClient(clientId, req.body);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENT_UPDATED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async deleteClient(req: Request, res: Response): Promise<Response> {
    try {
      const { clientId } = req.params;
      await clientService.deleteClient(clientId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENT_DELETED,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async updateClientStatus(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { clientId } = req.params;
      const { status } = req.body;
      const client = await clientService.updateClientStatus(clientId, status);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENT_UPDATED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async getProductsForClient(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { clientId } = req.params;
      const products = await clientService.getProductsForClient(clientId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.PRODUCTS_RETRIEVED,
        data: { products },
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async addProductToClient(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { clientId, productId } = req.params;
      const clientProduct = await clientService.addProductToClient(
        clientId,
        productId
      );
      return res.status(HTTP_CREATED).json({
        message: SUCCESS_MESSAGES.CLIENT_ADDED_TO_PRODUCT,
        data: clientProduct,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async removeProductFromClient(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { clientId, productId } = req.params;
      await clientService.removeProductFromClient(clientId, productId);
      return res.status(HTTP_NO_CONTENT).send();
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async softDeleteClient(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { clientId } = req.params;
      const client = await clientService.softDeleteClient(clientId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENT_SOFT_DELETED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async restoreClient(req: Request, res: Response): Promise<Response> {
    try {
      const { clientId } = req.params;
      const client = await clientService.restoreClient(clientId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.CLIENT_RESTORED,
        data: client,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }
}
