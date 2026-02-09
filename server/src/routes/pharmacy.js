import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /products - List products
router.get('/products', checkPermission('pharmacy', 'read'), async (req, res, next) => {
  try {
    const { search, category, stockStatus, isActive, expiringWithin, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { clinicId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { genericName: { contains: search } }
      ];
    }
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (stockStatus === 'low') where.quantity = { lte: 10 };
    else if (stockStatus === 'out') where.quantity = { lte: 0 };
    
    // Filter by expiring within N days
    if (expiringWithin) {
      const daysFromNow = parseInt(expiringWithin, 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysFromNow);
      where.expiryDate = { lte: futureDate, gte: new Date() };
    }

    const [products, total] = await Promise.all([
      prisma.pharmacyProduct.findMany({
        where, skip, take: limitNum,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.pharmacyProduct.count({ where })
    ]);

    res.json({
      success: true, data: products,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/low-stock - Low stock items
router.get('/products/low-stock', checkPermission('pharmacy', 'read'), async (req, res, next) => {
  try {
    const products = await prisma.pharmacyProduct.findMany({
      where: { clinicId: req.user.clinicId, isActive: true, quantity: { lte: 10 } },
      orderBy: { quantity: 'asc' }
    });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// GET /products/:id - Get product
router.get('/products/:id', checkPermission('pharmacy', 'read'), async (req, res, next) => {
  try {
    const product = await prisma.pharmacyProduct.findUnique({
      where: { id: req.params.id },
      include: { stockHistory: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// POST /products - Create product
router.post('/products', checkPermission('pharmacy', 'create'), async (req, res, next) => {
  try {
    const { code, name, genericName, manufacturer, category, mrp, purchasePrice, sellingPrice, gstPercent, quantity, minStock, unit, batchNumber, expiryDate, rackNumber } = req.body;
    
    const product = await prisma.pharmacyProduct.create({
      data: {
        code, name, genericName, manufacturer, category,
        mrp, purchasePrice, sellingPrice, gstPercent: gstPercent || 12,
        quantity: quantity || 0, minStock: minStock || 10, unit: unit || 'pcs',
        batchNumber, expiryDate: expiryDate ? new Date(expiryDate) : null, rackNumber,
        clinicId: req.user.clinicId
      }
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Product code already exists' });
    next(error);
  }
});

// PUT /products/:id - Update product
router.put('/products/:id', checkPermission('pharmacy', 'update'), async (req, res, next) => {
  try {
    const { name, genericName, manufacturer, category, mrp, purchasePrice, sellingPrice, gstPercent, minStock, unit, batchNumber, expiryDate, rackNumber, isActive } = req.body;
    
    const product = await prisma.pharmacyProduct.update({
      where: { id: req.params.id },
      data: {
        name, genericName, manufacturer, category,
        mrp, purchasePrice, sellingPrice, gstPercent, minStock, unit, batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined, rackNumber, isActive
      }
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// POST /products/:id/stock - Update stock
router.post('/products/:id/stock', checkPermission('pharmacy', 'update'), async (req, res, next) => {
  try {
    const { type, quantity, reference, notes } = req.body;
    const product = await prisma.pharmacyProduct.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const previousQty = product.quantity;
    let newQty = previousQty;
    if (type === 'PURCHASE' || type === 'ADJUSTMENT') newQty += quantity;
    else if (type === 'SALE' || type === 'RETURN' || type === 'EXPIRED' || type === 'DAMAGED') newQty -= quantity;

    const [updatedProduct, history] = await prisma.$transaction([
      prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { quantity: newQty } }),
      prisma.stockHistory.create({
        data: { productId: req.params.id, type, quantity, previousQty, newQty, reference, notes, createdBy: req.user.id }
      })
    ]);

    res.json({ success: true, data: { product: updatedProduct, history } });
  } catch (error) {
    next(error);
  }
});

// GET /stock-history - Stock history
router.get('/stock-history', checkPermission('pharmacy', 'read'), async (req, res, next) => {
  try {
    const { productId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = { product: { clinicId: req.user.clinicId } };
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [history, total] = await Promise.all([
      prisma.stockHistory.findMany({
        where, skip, take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, code: true, name: true } } }
      }),
      prisma.stockHistory.count({ where })
    ]);

    res.json({
      success: true, data: history,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
