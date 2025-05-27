import { Request, Response } from 'express';
import { ProductsService } from '../services/ProductsService';
import {
    HTTP_OK,
    HTTP_CREATED,
    HTTP_NO_CONTENT,
    HTTP_NOT_FOUND,
    HTTP_BAD_REQUEST
} from '../constants/httpStatusCodes';

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

    static async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const product = await productService.createProduct(req.body);
            res.status(HTTP_CREATED).json(product);
        } catch (error) {
            res.status(HTTP_BAD_REQUEST).json({ error: 'Failed to create product' });
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
}

export default ProductsController;
