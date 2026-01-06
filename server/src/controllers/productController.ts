import { Request, Response } from 'express';
import Product from '../models/Product';
import Invoice from '../models/Invoice';
import SupplierInvoice from '../models/SupplierInvoice';
import Buyer from '../models/Buyer';
import Supplier from '../models/Supplier';
import Entry from '../models/Entry';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await Product.find({});

        // Migration: Ensure all products have custom id field
        let needsSave = false;
        for (const product of products) {
            if (!product.id) {
                product.id = `p_${product._id}`;
                await product.save();
                needsSave = true;
            }
        }

        // Refetch if we made changes
        const finalProducts = needsSave ? await Product.find({}) : products;

        // Explicitly map to ensure id field is present
        const productsWithId = finalProducts.map(p => ({
            id: p.id || `p_${p._id}`,
            productName: p.productName,
            displayName: p.displayName
        }));

        res.json(productsWithId);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Try to find by custom id first
        let product = await Product.findOne({ id });

        // If not found and the id looks like a MongoDB ObjectId, try finding by _id
        if (!product && id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(id);
        }

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { productName, displayName } = req.body;

        const newProduct = await Product.create({
            id: `p_${Date.now()}`,
            productName,
            displayName: displayName || productName,
        });

        res.status(201).json(newProduct);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (product) {
            product.productName = req.body.productName || product.productName;
            product.displayName = req.body.displayName || product.displayName;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (product) {
            await Product.deleteOne({ id: req.params.id });
            res.json({ id: req.params.id });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProductDetails = async (req: Request, res: Response) => {
    try {
        const { id: productId } = req.params;
        const { startDate, endDate } = req.query;

        console.log(`[ProductDetails] Fetching details for product: ${productId}`);

        // Find the product
        let product = await Product.findOne({ id: productId });
        if (!product && productId.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(productId);
        }

        if (!product) {
            console.log(`[ProductDetails] Product not found: ${productId}`);
            return res.status(404).json({ message: 'Product not found' });
        }

        console.log(`[ProductDetails] Found product: ${product.productName}`);

        // Fetch all invoices that contain this product
        const allInvoices = await Invoice.find({});
        console.log(`[ProductDetails] Total invoices in DB: ${allInvoices.length}`);

        const invoicesWithProduct = allInvoices.filter(inv =>
            inv.items && inv.items.some((item: any) => item.productId === productId)
        );
        console.log(`[ProductDetails] Invoices with this product: ${invoicesWithProduct.length}`);

        // Build all sales for this product
        interface ProductSaleItem {
            id: string;
            invoiceId: string;
            invoiceNumber: string;
            buyerId: string;
            buyerName: string;
            date: Date;
            quantity: number;
            rate: number;
            subTotal: number;
        }

        const allSalesForProduct: ProductSaleItem[] = [];
        for (const inv of invoicesWithProduct) {
            const buyer = await Buyer.findOne({ id: inv.buyerId });
            for (const item of inv.items) {
                if ((item as any).productId === productId) {
                    allSalesForProduct.push({
                        id: `${inv.id}-${(item as any).id}`,
                        invoiceId: inv.id,
                        invoiceNumber: inv.invoiceNumber,
                        buyerId: inv.buyerId,
                        buyerName: buyer?.buyerName || 'Unknown',
                        date: new Date(inv.createdAt),
                        quantity: (item as any).quantity,
                        rate: (item as any).ratePerQuantity,
                        subTotal: (item as any).subTotal,
                    });
                }
            }
        }

        console.log(`[ProductDetails] Total sales items: ${allSalesForProduct.length}`);

        // Sort by date descending
        allSalesForProduct.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Apply date filters
        let salesToDisplay = [...allSalesForProduct];
        if (startDate) {
            const start = new Date(startDate as string);
            start.setHours(0, 0, 0, 0);
            salesToDisplay = salesToDisplay.filter(sale => new Date(sale.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            salesToDisplay = salesToDisplay.filter(sale => new Date(sale.date) <= end);
        }

        // If no filters, limit to most recent 20
        if (!startDate && !endDate) {
            salesToDisplay = salesToDisplay.slice(0, 20);
        }

        // Calculate stats
        const totalQuantitySold = allSalesForProduct.reduce((sum, s) => sum + s.quantity, 0);
        const totalSalesValue = allSalesForProduct.reduce((sum, s) => sum + s.subTotal, 0);
        const averagePrice = totalQuantitySold > 0 ? totalSalesValue / totalQuantitySold : 0;

        // Get unique buyer count
        const uniqueBuyers = new Set(allSalesForProduct.map(s => s.buyerId));
        const buyerCount = uniqueBuyers.size;

        // Get unique supplier count from entries
        const allEntries = await Entry.find({});
        const entriesWithProduct = allEntries.filter(entry =>
            entry.items && entry.items.some((item: any) => item.productId === productId)
        );
        const uniqueSuppliers = new Set(entriesWithProduct.map(e => e.supplierId));
        const supplierCount = uniqueSuppliers.size;

        const stats = {
            totalQuantitySold,
            totalSalesValue,
            averagePrice,
            buyerCount,
            supplierCount,
        };

        console.log(`[ProductDetails] Stats calculated:`, stats);

        // Monthly sales (last 12 months)
        const monthlySalesMap = new Map<string, number>();
        allSalesForProduct.forEach(sale => {
            const monthKey = `${sale.date.getFullYear()}-${(sale.date.getMonth() + 1).toString().padStart(2, '0')}`;
            monthlySalesMap.set(monthKey, (monthlySalesMap.get(monthKey) || 0) + sale.subTotal);
        });
        const monthlySales = Array.from(monthlySalesMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(-12);

        // Top buyers by value
        const topBuyersMap = new Map<string, number>();
        allSalesForProduct.forEach(sale => {
            topBuyersMap.set(sale.buyerId, (topBuyersMap.get(sale.buyerId) || 0) + sale.subTotal);
        });
        const topBuyers = Array.from(topBuyersMap.entries())
            .map(([id, value]) => {
                const buyer = allSalesForProduct.find(s => s.buyerId === id);
                return { id, name: buyer?.buyerName || 'Unknown', value };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Top suppliers by quantity
        const topSuppliersMap = new Map<string, number>();
        for (const entry of entriesWithProduct) {
            for (const item of entry.items) {
                if ((item as any).productId === productId) {
                    topSuppliersMap.set(entry.supplierId, (topSuppliersMap.get(entry.supplierId) || 0) + (item as any).quantity);
                }
            }
        }
        const topSuppliers = [];
        for (const [id, value] of Array.from(topSuppliersMap.entries())) {
            const supplier = await Supplier.findOne({ id });
            topSuppliers.push({ id, name: supplier?.supplierName || 'Unknown', value });
        }
        topSuppliers.sort((a, b) => b.value - a.value);
        const topSuppliersSliced = topSuppliers.slice(0, 5);

        const response = {
            product: {
                id: product.id,
                productName: product.productName,
                displayName: product.displayName,
            },
            stats,
            monthlySales,
            topBuyers,
            topSuppliers: topSuppliersSliced,
            recentSales: salesToDisplay,
        };

        console.log(`[ProductDetails] Sending response with ${salesToDisplay.length} sales items`);
        res.json(response);
    } catch (error: any) {
        console.error('[ProductDetails] Error:', error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};
