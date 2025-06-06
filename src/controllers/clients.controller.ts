import { Request, Response } from "express";
import { ClientService } from "../services/client.service";
import { CreateClientDto } from "../types/client";
import {
  HTTP_CREATED,
  HTTP_OK,
  HTTP_NOT_FOUND,
  HTTP_NO_CONTENT,
  HTTP_BAD_REQUEST,
} from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

const clientService = new ClientService();

export class ClientController {
  async createClient(req: Request, res: Response) {
    try {
      const clientData: CreateClientDto = req.body;
      console.log('Creating client with data:', clientData);

      const client = await clientService.createClient(clientData);

      return res.status(HTTP_CREATED).json({
        status: "success",
        data: client,
        message: SUCCESS_MESSAGES.CLIENT_CREATED,
      });
    } catch (error) {
      console.error('Error in createClient controller:', error);

      if (error instanceof Error) {
        if (error.message === "A user with this email already exists") {
          return res.status(HTTP_BAD_REQUEST).json({
            status: "error",
            message: "A user with this email already exists",
          });
        }
      }

      return res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to create client",
      });
    }
  }

  async getAllClients(_req: Request, res: Response) {
    const clients = await clientService.findAllClients();

    res.status(HTTP_OK).json({
      status: "success",
      data: clients,
    });
  }

  async getClientById(req: Request, res: Response) {
    const { clientCode } = req.params;
    const client = await clientService.findClientById(clientCode);

    if (!client) {
      return res.status(HTTP_NOT_FOUND).json({
        status: "error",
        message: ERROR_MESSAGES.CLIENT_NOT_FOUND,
      });
    }

    return res.status(HTTP_OK).json({
      status: "success",
      data: client,
    });
  }

  async updateClient(req: Request, res: Response) {
    try {
      const { clientCode } = req.params;
      const updateData = req.body;
      const client = await clientService.updateClient(clientCode, updateData);
      return res.status(HTTP_OK).json({
        status: "success",
        data: client,
        message: SUCCESS_MESSAGES.CLIENT_UPDATED,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HTTP_BAD_REQUEST).json({
          status: "error",
          message: error.message
        });
      }
      return res.status(HTTP_BAD_REQUEST).json({
        status: "error",
        message: ERROR_MESSAGES.GENERAL_ERROR
      });
    }
  }
  async deleteClient(req: Request, res: Response) {
    try {
      const { clientCode } = req.params;
      await clientService.deleteClient(clientCode);
      return res.status(HTTP_OK).json({
        status: "success",
        message: SUCCESS_MESSAGES.CLIENT_DELETED
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HTTP_BAD_REQUEST).json({
          status: "error",
          message: error.message
        });
      }
      return res.status(HTTP_BAD_REQUEST).json({
        status: "error"
      });
    }
  }

  async updateClientStatus(req: Request, res: Response) {
    const { clientCode } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid status value" });
    }
    const client = await clientService.updateClientStatus(clientCode, status);
    return res.status(200).json({
      status: "success",
      data: client,
      message: `Client status updated to ${status}`,
    });
  }

  async getProductsForClient(req: Request, res: Response) {
    const { clientCode } = req.params;
    const products = await clientService.getProductsForClient(clientCode);
    res.status(HTTP_OK).json(products);
  }

  async addProductToClient(req: Request, res: Response) {
    const { clientCode, productId } = req.params;
    const clientProduct = await clientService.addProductToClient(clientCode, productId);
    res.status(HTTP_CREATED).json(clientProduct);
  }

  async removeProductFromClient(req: Request, res: Response) {
    const { clientCode, productId } = req.params;
    await clientService.removeProductFromClient(clientCode, productId);
    res.status(HTTP_NO_CONTENT).send();
  }
}
