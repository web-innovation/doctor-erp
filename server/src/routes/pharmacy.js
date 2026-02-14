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
    // If an initial quantity or batch info is provided, create an initial stock batch and stock history
    if (quantity && parseInt(quantity, 10) > 0) {
      const qty = parseInt(quantity, 10);
      const batch = await prisma.stockBatch.create({
        data: {
          productId: product.id,
          batchNumber: batchNumber || null,
          quantity: qty,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: purchasePrice || undefined
        }
      });
      await prisma.stockHistory.create({
        data: {
          productId: product.id,
          batchId: batch.id,
          type: 'PURCHASE',
          quantity: qty,
          previousQty: 0,
          newQty: qty,
          notes: 'Initial stock',
          createdBy: req.user.id
        }
      });
      // Update product aggregate fields
      await prisma.pharmacyProduct.update({ where: { id: product.id }, data: { quantity: qty, expiryDate: batch.expiryDate || null } });
    }
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
    const { type, quantity, reference, notes, expiryDate, batchNumber, costPrice } = req.body;
    const product = await prisma.pharmacyProduct.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'Invalid quantity' });

    // PURCHASE or ADJUSTMENT -> create a new batch
    if (type === 'PURCHASE' || type === 'ADJUSTMENT') {
      const batch = await prisma.stockBatch.create({
        data: {
          productId: req.params.id,
          batchNumber: batchNumber || null,
          quantity: qty,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: costPrice || undefined
        }
      });

      const previousQty = product.quantity;
      const newQty = previousQty + qty;
      const [updatedProduct, history] = await prisma.$transaction([
        prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { quantity: newQty } }),
        prisma.stockHistory.create({ data: { productId: req.params.id, batchId: batch.id, type, quantity: qty, previousQty, newQty, reference, notes, createdBy: req.user.id } })
      ]);

      // Update product expiryDate to earliest non-null batch expiry
      const agg = await prisma.stockBatch.findFirst({ where: { productId: req.params.id, expiryDate: { not: null } }, orderBy: { expiryDate: 'asc' } });
      if (agg && agg.expiryDate) {
        await prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { expiryDate: agg.expiryDate } });
      }

      return res.json({ success: true, data: { product: updatedProduct, history } });
    }

    // SALE / RETURN / EXPIRED / DAMAGED -> consume from batches using FEFO (earliest expiry first)
    if (type === 'SALE' || type === 'EXPIRED' || type === 'DAMAGED' || type === 'RETURN') {
      let remaining = qty;
      const batches = await prisma.stockBatch.findMany({ where: { productId: req.params.id, quantity: { gt: 0 } }, orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }] });
      const historyEntries = [];
      let changed = false;

      for (const b of batches) {
        if (remaining <= 0) break;
        const take = Math.min(b.quantity, remaining);
        if (take <= 0) continue;
        // update batch quantity
        await prisma.stockBatch.update({ where: { id: b.id }, data: { quantity: b.quantity - take } });
        // record history per batch
        const prevQty = (await prisma.pharmacyProduct.findUnique({ where: { id: req.params.id } })).quantity;
        const newQty = prevQty - take;
        const h = await prisma.stockHistory.create({ data: { productId: req.params.id, batchId: b.id, type, quantity: take, previousQty: prevQty, newQty, reference, notes, createdBy: req.user.id } });
        historyEntries.push(h);
        remaining -= take;
        changed = true;
      }

      if (remaining > 0) return res.status(400).json({ success: false, message: 'Insufficient stock to complete this operation' });

      // Recalculate total product quantity from batches
      const total = await prisma.stockBatch.aggregate({ _sum: { quantity: true }, where: { productId: req.params.id } });
      const totalQty = total._sum.quantity || 0;
      const upd = await prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { quantity: totalQty } });

      // Update product expiryDate to earliest non-null batch expiry
      const agg2 = await prisma.stockBatch.findFirst({ where: { productId: req.params.id, expiryDate: { not: null } }, orderBy: { expiryDate: 'asc' } });
      if (agg2 && agg2.expiryDate) {
        await prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { expiryDate: agg2.expiryDate } });
      } else {
        await prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { expiryDate: null } });
      }

      return res.json({ success: true, data: { product: upd, history: historyEntries } });
    }

    return res.status(400).json({ success: false, message: 'Unsupported stock transaction type' });
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
