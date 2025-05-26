import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';

const productService = new ProductService();

class ProductController {
    static async getAllProducts(_req: Request, res: Response): Promise<void> {
        try {
            const products = await productService.getAllProducts();
            res.json(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ error: 'Failed to retrieve products' });
        }
    }

    static async getProductById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const product = await productService.getProductById(id);
            
            if (!product) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            
            res.json(product);
        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({ error: 'Failed to retrieve product' });
        }
    }

    static async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const product = await productService.createProduct(req.body);
            res.status(201).json(product);
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ error: 'Failed to create product' });
        }
    }

    static async updateProduct(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const product = await productService.updateProduct(id, req.body);
            res.json(product);
        } catch (error: any) {
            console.error('Error updating product:', error);
            if (error?.code === 'P2025') {
                res.status(404).json({ error: 'Product not found' });
            } else {
                res.status(500).json({ error: 'Failed to update product' });
            }
        }
    }

    static async deleteProduct(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await productService.deleteProduct(id);
            res.status(204).send();
        } catch (error: any) {
            console.error('Error deleting product:', error);
            if (error?.code === 'P2025') {
                res.status(404).json({ error: 'Product not found' });
            } else {
                res.status(500).json({ error: 'Failed to delete product' });
            }
        }
    }
}

export default ProductController;