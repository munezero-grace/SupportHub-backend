import { Request, Response } from 'express';
import { ProductsService } from '../services/ProductsService';
import {
    HTTP_OK,
    HTTP_CREATED,
    HTTP_NO_CONTENT,
    HTTP_NOT_FOUND,
    HTTP_BAD_REQUEST
} from '../constants/httpStatusCodes';
import { ERROR_MESSAGES } from '../constants/response/errors';
import { SUCCESS_MESSAGES } from '../constants/response/successMessages';

const productService = new ProductsService();

class ProductsController {
    static async getAllProducts(_req: Request, res: Response): Promise<void> {
        try {
            const products = await productService.getAllProducts();
            const mappedProducts = products.map(product => ({
                ...product,
                id: product.id
            }));
            res.status(HTTP_OK).json(mappedProducts);
        } catch (error) {
            res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to retrieve products' });
        }
    }

    static async getProductById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const product = await productService.getProductById(id);

            if (!product) {
                res.status(HTTP_NOT_FOUND).json({ error: 'Product not found' });
                return;
            }

            res.status(HTTP_OK).json(product);
        } catch (error) {
            res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to retrieve product' });
        }
    }

    static async getProductByCode(req: Request, res: Response): Promise<void> {
        try {
            const { productCode } = req.params;
            const product = await productService.getProductByCode(productCode);

            if (!product) {
                res.status(HTTP_NOT_FOUND).json({ error: 'Product not found' });
                return;
            }

            res.status(HTTP_OK).json(product);
        } catch (error) {
            res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to retrieve product' });
        }
    }

    static async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const product = await productService.createProduct(req.body);
            res.status(HTTP_CREATED).json(product);
        } catch (error) {
            console.error('Error creating product:', error);
            if (error instanceof Error) {
                res.status(HTTP_BAD_REQUEST).json({ error: error.message });
            } else {
                res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to create product' });
            }
        }
    }

    static async updateProduct(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const product = await productService.updateProduct(id, req.body);
            res.status(HTTP_OK).json(product);
        } catch (error: any) {
            if (error?.code === 'P2025') {
                res.status(HTTP_NOT_FOUND).json({ error: 'Product not found' });
            } else {
                res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to update product' });
            }
        }
    }

    static async deleteProduct(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const product = await productService.getProductById(id);

            if (!product) {
                res.status(HTTP_NOT_FOUND).json({ error: 'Product not found' });
                return;
            }

            await productService.deleteProduct(id);
            res.status(HTTP_NO_CONTENT).send();
        } catch (error: any) {
            res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to delete product' });
        }
    }
    static async getClientsForProduct(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        const clients = await productService.getClientsForProduct(id);
        return res.status(HTTP_OK).json(clients);
    }
    static async addClientToProduct(req: Request, res: Response): Promise<Response> {
        const { id, clientId } = req.params;
        const product = await productService.getProductById(id);
        if (!product) {
            return res.status(HTTP_NOT_FOUND).json({ error: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
        }
        const clientService = new (await import('../services/client.service')).ClientService();
        const client = await clientService.findClientByUUID(clientId);
        if (!client) {
            return res.status(HTTP_NOT_FOUND).json({ error: ERROR_MESSAGES.CLIENT_NOT_FOUND });
        }
        const clientProduct = await productService.addClientToProduct(id, clientId);
        return res.status(HTTP_CREATED).json({ message: SUCCESS_MESSAGES.CLIENT_ADDED_TO_PRODUCT || 'Client added to product successfully', data: clientProduct });
    }
    static async removeClientFromProduct(req: Request, res: Response): Promise<Response> {
        const { id, clientId } = req.params;
        await productService.removeClientFromProduct(id, clientId);
        return res.status(HTTP_OK).json({ message: SUCCESS_MESSAGES.CLIENT_REMOVED_FROM_PRODUCT || 'Client removed from product successfully' });
    }
}
export default ProductsController;
