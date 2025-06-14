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
import { ERROR_MESSAGES, RESPONSE_STATUS } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import { c } from "../constants/errorMessages";

const clientService = new ClientService();

export class ClientController {
  async createClient(req: Request, res: Response) {
    try {
      const clientData: CreateClientDto = req.body;
      const client = await clientService.createClient(clientData); return res.status(HTTP_CREATED).json({
        status: RESPONSE_STATUS.SUCCESS,
        data: client,
        message: SUCCESS_MESSAGES.CLIENT_CREATED,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === ERROR_MESSAGES.USER_EMAIL_EXISTS) {
          return res.status(HTTP_BAD_REQUEST).json({
            status: RESPONSE_STATUS.ERROR,
            message: ERROR_MESSAGES.USER_EMAIL_EXISTS,
          });
        }
      }

      return res.status(500).json({
        status: RESPONSE_STATUS.ERROR,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.CLIENT_CREATE_FAILED,
      });
    }
  }

  async getClientByUserId(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: RESPONSE_STATUS.ERROR,
          message: ERROR_MESSAGES.INVALID_CREDENTIALS
        });
      }
      const client = await clientService.findClientByUserId(userId);

      if (!client) {
        return res.status(HTTP_NOT_FOUND).json({
          status: RESPONSE_STATUS.ERROR,
          message: ERROR_MESSAGES.CLIENT_NOT_FOUND
        });
      }
      return res.status(HTTP_OK).json({ status: "success", data: client });
    } catch (error) {
      return res.status(500).json({
        status: RESPONSE_STATUS.ERROR,
        message: ERROR_MESSAGES.GENERAL_ERROR
      });
    }
  }

  async getAllClients(_req: Request, res: Response) {
    const clients = await clientService.findAllClients(); res.status(HTTP_OK).json({
      status: RESPONSE_STATUS.SUCCESS,
      data: clients,
    });
  }

  async getClientById(req: Request, res: Response) {
    const { clientCode } = req.params;
    const client = await clientService.findClientById(clientCode); if (!client) {
      return res.status(HTTP_NOT_FOUND).json({
        status: RESPONSE_STATUS.ERROR,
        message: ERROR_MESSAGES.CLIENT_NOT_FOUND,
      });
    }

    return res.status(HTTP_OK).json({
      status: RESPONSE_STATUS.SUCCESS,
      data: client,
    });
  }

  async updateClient(req: Request, res: Response) {
    try {
      const { clientCode } = req.params;
      const updateData = req.body; const client = await clientService.updateClient(clientCode, updateData);
      return res.status(HTTP_OK).json({
        status: RESPONSE_STATUS.SUCCESS,
        data: client,
        message: SUCCESS_MESSAGES.CLIENT_UPDATED,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HTTP_BAD_REQUEST).json({
          status: RESPONSE_STATUS.ERROR,
          message: error.message
        });
      }
      return res.status(HTTP_BAD_REQUEST).json({
        status: RESPONSE_STATUS.ERROR,
        message: ERROR_MESSAGES.GENERAL_ERROR
      });
    }
  }
  async deleteClient(req: Request, res: Response) {
    try {
      const { clientCode } = req.params; await clientService.deleteClient(clientCode);
      return res.status(HTTP_OK).json({
        status: RESPONSE_STATUS.SUCCESS,
        message: SUCCESS_MESSAGES.CLIENT_DELETED
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HTTP_BAD_REQUEST).json({
          status: RESPONSE_STATUS.ERROR,
          message: error.message
        });
      }
      return res.status(HTTP_BAD_REQUEST).json({
        status: RESPONSE_STATUS.ERROR
      });
    }
  }

  async updateClientStatus(req: Request, res: Response) {
    const { clientCode } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ status: RESPONSE_STATUS.ERROR, message: "Invalid status value" });
    }
    const client = await clientService.updateClientStatus(clientCode, status);
    return res.status(200).json({
      status: RESPONSE_STATUS.SUCCESS,
      data: client,
      message: `Client status updated to ${status}`,
    });
  } async getProductsForClient(req: Request, res: Response) {
    try {
      const { clientCode } = req.params;
      const products = await clientService.getProductsForClient(clientCode);
      return res.status(HTTP_OK).json({
        status: RESPONSE_STATUS.SUCCESS,
        data: { products }
      });
    } catch (error) {
      return res.status(HTTP_BAD_REQUEST).json({
        status: RESPONSE_STATUS.ERROR,
        message: error instanceof Error ? error.message : c.FAILED_TO_RETRIEVE_PRODUCTS_FOR_CLIENT
      });
    }
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
