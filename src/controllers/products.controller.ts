import { Request, Response } from "express";
import { ProductsService } from "../services/products.service";
import {
  HTTP_OK,
  HTTP_CREATED,
  HTTP_NO_CONTENT,
  HTTP_NOT_FOUND,
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
} from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";
import { c } from "../constants/errorMessages";
import { ClientService } from "../services/client.service";
import { PrismaClient } from "@prisma/client";

const productService = new ProductsService();
const clientService = new ClientService();
const prisma = new PrismaClient();

export default class ProductsController {
  static async getProductsByClientCode(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { clientCode } = req.params;
      if (!clientCode) {
        return res
          .status(HTTP_BAD_REQUEST)
          .json({ error: ERROR_MESSAGES.CLIENT_CODE_IS_REQUIRED });
      }

      const products = await productService.getProductsByClient(clientCode);
      return res.status(HTTP_OK).json(products);
    } catch (error) {
      return res
        .status(HTTP_INTERNAL_SERVER_ERROR)
        .json({ error: c.FAILED_TO_RETRIEVE_PRODUCTS_FOR_CLIENT });
    }
  }

  static async getAllProducts(_req: Request, res: Response): Promise<Response> {
    try {
      const products = await productService.getAllProducts();
      if (!products || !Array.isArray(products)) {
        return res
          .status(HTTP_BAD_REQUEST)
          .json({ error: ERROR_MESSAGES.INVALID_PRODUCT_DATA });
      }
      return res.status(HTTP_OK).json(products);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.PRODUCT_RETRIEVE_ALL_FAILED;
      return res.status(HTTP_BAD_REQUEST).json({ error: errorMessage });
    }
  }

  static async getProductsByClient(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(HTTP_BAD_REQUEST)
          .json({ error: ERROR_MESSAGES.USER_ID_REQUIRED });
      }

      const client = await clientService.findClientByUserId(userId);
      if (!client || "error" in client) {
        return res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.CLIENT_NOT_FOUND_FOR_USER });
      }

      const products = await productService.getProductsByClient(
        client.clientCode
      );
      return res.status(HTTP_OK).json({ data: products });
    } catch (error) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: c.FAILED_TO_RETRIEVE_PRODUCTS_FOR_CLIENT });
    }
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      const product = await productService.getProductById(id);

      if (!product) {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
        return;
      }
      if (user && user.role === "client") {
        const clientId = (user as any).clientId;
        if (clientId) {
          const clientProduct = await prisma.clientProduct.findFirst({
            where: {
              productId: id,
              clientId: clientId,
            },
          });
          if (!clientProduct) {
            res
              .status(HTTP_BAD_REQUEST)
              .json({ error: "You are not authorized to view this product." });
            return;
          }
        }
      }

      res.status(HTTP_OK).json(product);
    } catch (error) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: ERROR_MESSAGES.PRODUCT_RETRIEVE_FAILED });
    }
  }

  static async getProductByCode(req: Request, res: Response): Promise<void> {
    try {
      const { productCode } = req.params;
      const product = await productService.getProductByCode(productCode);

      if (!product) {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
        return;
      }

      res.status(HTTP_OK).json(product);
    } catch (error) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: ERROR_MESSAGES.PRODUCT_RETRIEVE_FAILED });
    }
  }

  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.createProduct(req.body);
      res.status(HTTP_CREATED).json(product);
    } catch (error) {
      if (error instanceof Error) {
        res.status(HTTP_BAD_REQUEST).json({ error: error.message });
      } else {
        res
          .status(HTTP_BAD_REQUEST)
          .json({ error: ERROR_MESSAGES.PRODUCT_CREATE_FAILED });
      }
    }
  }

  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(id, req.body);
      res.status(HTTP_OK).json(product);
    } catch (error: any) {
      if (error?.code === "P2025") {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
      } else {
        res
          .status(HTTP_BAD_REQUEST)
          .json({ error: ERROR_MESSAGES.PRODUCT_UPDATE_FAILED });
      }
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      if (!product) {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
        return;
      }

      await productService.deleteProduct(id);
      res.status(HTTP_NO_CONTENT).send();
    } catch (error: any) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: ERROR_MESSAGES.PRODUCT_DELETE_FAILED });
    }
  }
  static async getClientsForProduct(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const clients = await productService.getClientsForProduct(id);
    return res.status(HTTP_OK).json(clients);
  }
  static async addClientToProduct(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { productId, clientId } = req.params;

      if (!productId || !clientId) {
        return res.status(HTTP_BAD_REQUEST).json({
          error: ERROR_MESSAGES.PRODUCT_CLIENT_IDS_REQUIRED,
        });
      }

      try {
        const clientProduct = await productService.addClientToProduct(
          productId,
          clientId
        );
        return res.status(HTTP_CREATED).json({
          message: SUCCESS_MESSAGES.CLIENT_ADDED_TO_PRODUCT,
          data: clientProduct,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === ERROR_MESSAGES.PRODUCT_NOT_FOUND) {
            return res.status(HTTP_NOT_FOUND).json({
              error: ERROR_MESSAGES.PRODUCT_NOT_FOUND,
            });
          }
          if (error.message === ERROR_MESSAGES.CLIENT_NOT_FOUND) {
            return res.status(HTTP_NOT_FOUND).json({
              error: ERROR_MESSAGES.CLIENT_NOT_FOUND,
            });
          }
        }
        throw error;
      }
    } catch (error) {
      return res.status(HTTP_INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.PRODUCT_ADD_CLIENT_FAILED,
      });
    }
  }
  static async removeClientFromProduct(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { productId, clientId } = req.params;
    await productService.removeClientFromProduct(productId, clientId);
    return res
      .status(HTTP_OK)
      .json({ message: SUCCESS_MESSAGES.CLIENT_REMOVED_FROM_PRODUCT });
  }
}
