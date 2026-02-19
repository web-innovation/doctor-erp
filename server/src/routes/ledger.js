import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { prisma } from '../index.js';

const router = express.Router();
router.use(authenticate);

// GET / - list ledger entries with filters & pagination
router.get('/', checkPermission('ledger', 'read'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
    const account = req.query.account || undefined;
    const type = req.query.type || undefined; // 'DEBIT'|'CREDIT'
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    const where = { clinicId };
    if (account) where.account = account;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const total = await prisma.ledgerEntry.count({ where });
    const items = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// (old simple manual POST removed) - use the later /manual implementation below

// GET /summary - aggregated totals per account + overall balances
router.get('/summary', checkPermission('ledger', 'read'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const account = req.query.account || undefined;
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    const where = { clinicId };
    if (account) where.account = account;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    // Group by accountId (preferred) and type to compute debit/credit sums per account
    const groups = await prisma.ledgerEntry.groupBy({
      by: ['accountId', 'type'],
      where,
      _sum: { amount: true },
    });

    const map = {};
    const acctIds = [...new Set(groups.map(g => g.accountId).filter(Boolean))];
    let acctMap = {};
    if (acctIds.length) {
      const accts = await prisma.account.findMany({ where: { id: { in: acctIds } } });
      acctMap = accts.reduce((m, a) => ({ ...m, [a.id]: a.name }), {});
    }

    for (const g of groups) {
      const acctKey = g.accountId || g.account || 'Unspecified';
      const acctName = g.accountId ? (acctMap[g.accountId] || g.account || 'Unknown') : (g.account || 'Unspecified');
      if (!map[acctKey]) map[acctKey] = { accountId: g.accountId || null, account: acctName, debit: 0, credit: 0 };
      const s = g._sum?.amount || 0;
      if (g.type === 'DEBIT') map[acctKey].debit = Number(s);
      else if (g.type === 'CREDIT') map[acctKey].credit = Number(s);
    }

    const accounts = Object.values(map).map((a) => ({ ...a, balance: Number((a.debit || 0) - (a.credit || 0)) }));

    // Overall totals
    const totals = accounts.reduce(
      (acc, cur) => ({ debit: acc.debit + (cur.debit || 0), credit: acc.credit + (cur.credit || 0) }),
      { debit: 0, credit: 0 }
    );
    totals.balance = totals.debit - totals.credit;

    res.json({ success: true, data: { accounts, totals } });
  } catch (err) {
    next(err);
  }
});

// POST /manual - create a manual journal entry (debit + credit)
router.post('/manual', checkPermission('ledger', 'create'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const {
      debitAccountId, creditAccountId, debitAccountName, creditAccountName, amount, note, date, refType, refId
    } = req.body;

    if ((!debitAccountId && !debitAccountName) || (!creditAccountId && !creditAccountName)) return res.status(400).json({ success: false, message: 'Both debit and credit accounts are required (id or name)' });
    const amt = Number(amount || 0);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, message: 'Amount must be a positive number' });

    // Helper to get or create an account by id or name within the clinic
    async function resolveAccount({ id, name }) {
      if (id) {
        const a = await prisma.account.findFirst({ where: { id, clinicId } });
        if (!a) throw new AppError('Account not found', 404);
        return a;
      }
      const trimmed = (name || '').trim();
      if (!trimmed) throw new AppError('Invalid account name', 400);
      let acct = await prisma.account.findFirst({ where: { clinicId, name: trimmed } });
      if (!acct) {
        acct = await prisma.account.create({ data: { clinicId, name: trimmed, createdById: req.user.id } });
      }
      return acct;
    }

    const debitAcct = await resolveAccount({ id: debitAccountId, name: debitAccountName });
    const creditAcct = await resolveAccount({ id: creditAccountId, name: creditAccountName });

    if (debitAcct.id === creditAcct.id) return res.status(400).json({ success: false, message: 'Debit and credit accounts must be different' });

    // Create two ledger entries in a transaction: debit + credit
    const entries = await prisma.$transaction([
      prisma.ledgerEntry.create({ data: { clinicId, account: debitAcct.name, accountId: debitAcct.id, type: 'DEBIT', amount: amt, note: note || null, refType: refType || null, refId: refId || null, createdAt: date ? new Date(date) : undefined } }),
      prisma.ledgerEntry.create({ data: { clinicId, account: creditAcct.name, accountId: creditAcct.id, type: 'CREDIT', amount: amt, note: note || null, refType: refType || null, refId: refId || null, createdAt: date ? new Date(date) : undefined } })
    ]);

    res.json({ success: true, data: { entries } });
  } catch (err) {
    next(err);
  }
});

// POST /manual/purchase - create manual purchase or return, update stock and create ledger entries
router.post('/manual/purchase', checkPermission('purchases', 'create'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const { mode = 'PURCHASE', supplierName, items = [], note, date } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'At least one item is required' });

    // Validate items
    for (const it of items) {
      if (!it.name && !it.productId) return res.status(400).json({ success: false, message: 'Each item requires name or productId' });
      if (!it.quantity || Number(it.quantity) <= 0) return res.status(400).json({ success: false, message: 'Invalid item quantity' });
      if (typeof it.unitPrice === 'undefined' || Number(it.unitPrice) < 0) return res.status(400).json({ success: false, message: 'Invalid unitPrice' });
    }

    // Create supplier record if provided name
    let supplier = null;
    if (supplierName) {
      supplier = await prisma.supplier.findFirst({ where: { clinicId, name: supplierName } });
      if (!supplier) {
        supplier = await prisma.supplier.create({ data: { clinicId, name: supplierName } });
      }
    }

    // Create purchase record (use status RECEIVED for purchases, RETURNED for returns)
    const invoiceNo = `MAN-${Date.now()}`;
    const status = mode === 'RETURN' ? 'RETURNED' : 'RECEIVED';
    const purchase = await prisma.purchase.create({ data: { invoiceNo, invoiceDate: date ? new Date(date) : new Date(), status, notes: note || null, clinicId, supplierId: supplier?.id || null } });

    // Process items: create PurchaseItem, update/create product, stock batch, stock history/transaction
    let subtotal = 0;
    let taxTotal = 0;
    const createdItems = [];

    for (const it of items) {
      const qty = Number(it.quantity);
      const unitPrice = Number(it.unitPrice);
      const gstPercent = Number(it.gstPercent || 0);
      const taxAmount = Number(((unitPrice * qty) * gstPercent) / 100);
      const amount = unitPrice * qty;
      subtotal += amount;
      taxTotal += taxAmount;

      // resolve product
      let product = null;
      if (it.productId) product = await prisma.pharmacyProduct.findFirst({ where: { id: it.productId, clinicId } });
      if (!product) product = await prisma.pharmacyProduct.findFirst({ where: { clinicId, name: it.name } });

      // If not found, create a minimal product record
      if (!product) {
        product = await prisma.pharmacyProduct.create({ data: { clinicId, name: it.name, code: `MAN-${Math.random().toString(36).slice(2,8)}`, category: it.category || 'medicine', purchasePrice: unitPrice, sellingPrice: it.sellingPrice || unitPrice, gstPercent: gstPercent || 0, quantity: 0 } });
      }

      // create purchase item
      const pitem = await prisma.purchaseItem.create({ data: { purchaseId: purchase.id, productId: product.id, name: it.name || product.name, quantity: qty, unitPrice, taxAmount, amount, batchNumber: it.batchNumber || null, expiryDate: it.expiryDate ? new Date(it.expiryDate) : null } });
      createdItems.push(pitem);

      // stock change: for PURCHASE add, for RETURN subtract
      const changeQty = mode === 'RETURN' ? -qty : qty;
      const prev = await prisma.pharmacyProduct.findUnique({ where: { id: product.id } });
      const previousQty = prev?.quantity || 0;
      const newQty = Math.max(0, previousQty + changeQty);

      // create stock batch for additions
      let batch = null;
      if (mode !== 'RETURN') {
        batch = await prisma.stockBatch.create({ data: { productId: product.id, quantity: qty, costPrice: unitPrice, batchNumber: it.batchNumber || null, expiryDate: it.expiryDate ? new Date(it.expiryDate) : null, clinicId } }).catch(() => null);
      }

      // update product quantity
      await prisma.pharmacyProduct.update({ where: { id: product.id }, data: { quantity: newQty, purchasePrice: unitPrice } }).catch(() => null);

      // create stock history and transaction
      await prisma.stockHistory.create({ data: { productId: product.id, batchId: batch?.id || null, type: mode === 'RETURN' ? 'RETURN' : 'PURCHASE', quantity: changeQty, previousQty, newQty, reference: `Manual ${mode} ${invoiceNo}`, notes: note || null, createdBy: req.user.id } }).catch(() => null);
      await prisma.stockTransaction.create({ data: { clinicId, productId: product.id, changeQty, type: mode === 'RETURN' ? 'RETURN' : 'PURCHASE', refType: 'PURCHASE', refId: purchase.id, note: `Manual ${mode}` } }).catch(() => null);
    }

    const total = subtotal + taxTotal;
    // update purchase totals
    await prisma.purchase.update({ where: { id: purchase.id }, data: { subtotal, taxAmount: taxTotal, totalAmount: total } });

    // Ledger entries: Inventory +/- subtotal, GST (as separate) and Payable
    const payableAccountName = supplier ? `Payable - ${supplier.name}` : 'Accounts Payable';
    const inventoryAcct = await prisma.account.findFirst({ where: { clinicId, name: 'Inventory' } });
    const payableAcct = await prisma.account.findFirst({ where: { clinicId, name: payableAccountName } });
    const gstAcct = await prisma.account.findFirst({ where: { clinicId, name: 'GST Payable' } });

    // Build ledger creations
    const entriesToCreate = [];
    if (mode === 'PURCHASE') {
      // Debit Inventory (subtotal)
      entriesToCreate.push(prisma.ledgerEntry.create({ data: { clinicId, account: inventoryAcct?.name || 'Inventory', accountId: inventoryAcct?.id || null, type: 'DEBIT', amount: subtotal, refType: 'PURCHASE', refId: purchase.id, note: `Manual purchase ${invoiceNo}` } }));
      if (taxTotal > 0) entriesToCreate.push(prisma.ledgerEntry.create({ data: { clinicId, account: gstAcct?.name || 'GST Payable', accountId: gstAcct?.id || null, type: 'DEBIT', amount: taxTotal, refType: 'PURCHASE', refId: purchase.id, note: `GST for manual purchase ${invoiceNo}` } }));
      entriesToCreate.push(prisma.ledgerEntry.create({ data: { clinicId, account: payableAcct?.name || payableAccountName, accountId: payableAcct?.id || null, type: 'CREDIT', amount: total, refType: 'PURCHASE', refId: purchase.id, note: `Manual purchase payable ${invoiceNo}` } }));
    } else {
      // RETURN: Credit Inventory, Credit GST (if any), Debit Payable
      entriesToCreate.push(prisma.ledgerEntry.create({ data: { clinicId, account: inventoryAcct?.name || 'Inventory', accountId: inventoryAcct?.id || null, type: 'CREDIT', amount: subtotal, refType: 'RETURN', refId: purchase.id, note: `Manual return ${invoiceNo}` } }));
      if (taxTotal > 0) entriesToCreate.push(prisma.ledgerEntry.create({ data: { clinicId, account: gstAcct?.name || 'GST Payable', accountId: gstAcct?.id || null, type: 'CREDIT', amount: taxTotal, refType: 'RETURN', refId: purchase.id, note: `GST on manual return ${invoiceNo}` } }));
      entriesToCreate.push(prisma.ledgerEntry.create({ data: { clinicId, account: payableAcct?.name || payableAccountName, accountId: payableAcct?.id || null, type: 'DEBIT', amount: total, refType: 'RETURN', refId: purchase.id, note: `Manual return payable ${invoiceNo}` } }));
    }

    const createdEntries = await prisma.$transaction(entriesToCreate);

    res.json({ success: true, data: { purchase, items: createdItems, ledgerEntries: createdEntries } });
  } catch (err) {
    next(err);
  }
});

// GET /:id - detailed view for a ledger entry (purchase items, payments, adjustments)
router.get('/:id', checkPermission('ledger', 'read'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const entry = await prisma.ledgerEntry.findFirst({ where: { id, clinicId } });
    if (!entry) return res.status(404).json({ success: false, message: 'Ledger entry not found' });

    const result = { entry };

    if (entry.refType && entry.refId) {
      // If this references a purchase, include purchase + items
      if (entry.refType === 'PURCHASE') {
        const purchase = await prisma.purchase.findUnique({ where: { id: entry.refId }, include: { items: true, supplier: true } });
        result.purchase = purchase;

        // Find related payments/adjustments ledger entries for this purchase
        const related = await prisma.ledgerEntry.findMany({
          where: { clinicId, refId: entry.refId, refType: { in: ['PAYMENT', 'ADJUSTMENT', 'PURCHASE'] } },
          orderBy: { createdAt: 'asc' }
        });
        result.relatedEntries = related;
      } else {
        // Generic: fetch ledger entries that share the same refId/refType
        const related = await prisma.ledgerEntry.findMany({ where: { clinicId, refId: entry.refId, refType: entry.refType } });
        result.relatedEntries = related;
      }
    } else {
      result.relatedEntries = [];
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
