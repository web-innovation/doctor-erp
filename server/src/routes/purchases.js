import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import tesseractAdapter from '../services/ocr/tesseractAdapter.js';
import googleDocAiAdapter from '../services/ocr/googleDocAiAdapter.js';

const router = express.Router();
router.use(authenticate);

// GET /suppliers?q= - simple supplier search for current clinic
router.get('/suppliers', checkPermission('purchases', 'read'), async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString();
    const clinicId = req.user.clinicId;
    const where = { clinicId };
    if (q) where['name'] = { contains: q };
    const list = await prisma.supplier.findMany({ where, take: 20, orderBy: { name: 'asc' } });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

// POST /suppliers - create supplier in current clinic
router.post('/suppliers', checkPermission('purchases', 'create'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const { name, phone, email, address, gstNumber, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    const s = await prisma.supplier.create({ data: { name: name.trim(), phone: phone || null, email: email || null, address: address || null, gstNumber: gstNumber || null, notes: notes || null, clinicId } });
    res.status(201).json({ success: true, data: s });
  } catch (err) { next(err); }
});

const uploadDir = path.join(process.cwd(), 'uploads', 'purchases');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, unique);
  }
});

const upload = multer({ storage });

// POST /upload - upload purchase invoice image/pdf
router.post('/upload', checkPermission('purchases', 'create'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const clinicId = req.user.clinicId;
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });

    const provider = clinic?.documentAiEnabled ? 'google_doc_ai' : 'tesseract';
    const pu = await prisma.purchaseUpload.create({ data: {
      filename: req.file.originalname,
      path: req.file.path,
      status: 'UPLOADED',
      provider,
      clinicId,
      uploadedById: req.user.id
    }});

    // Synchronous parsing for MVP. In production consider background job.
    try {
      let parsed = null;
      if (provider === 'google_doc_ai') {
        parsed = await googleDocAiAdapter.parse(req.file.path, clinic?.documentAiConfig ? JSON.parse(clinic.documentAiConfig) : {});
      } else {
        parsed = await tesseractAdapter.parse(req.file.path);
      }
      await prisma.purchaseUpload.update({ where: { id: pu.id }, data: { status: 'PARSED', parsedJson: JSON.stringify(parsed) } });
      // If provider was google, record usage stub
      if (provider === 'google_doc_ai') {
        await prisma.documentAiUsage.create({ data: { clinicId, uploadId: pu.id, provider: provider, details: JSON.stringify({ parsed: true }) } });
      }
      const updated = await prisma.purchaseUpload.findUnique({ where: { id: pu.id } });
      return res.status(201).json({ success: true, data: updated });
    } catch (parseErr) {
      await prisma.purchaseUpload.update({ where: { id: pu.id }, data: { status: 'FAILED', providerMeta: String(parseErr) } });
      return res.status(201).json({ success: true, data: await prisma.purchaseUpload.findUnique({ where: { id: pu.id } }) });
    }
  } catch (error) {
    next(error);
  }
});

// GET /upload/:id - fetch upload and parsed result
router.get('/upload/:id', checkPermission('purchases', 'read'), async (req, res, next) => {
  try {
    const u = await prisma.purchaseUpload.findUnique({ where: { id: req.params.id } });
    if (!u) return res.status(404).json({ success: false, message: 'Upload not found' });
    res.json({ success: true, data: u });
  } catch (error) { next(error); }
});

// POST /from-upload/:id - create purchase draft from parsed upload (confirm)
router.post('/from-upload/:id', checkPermission('purchases', 'create'), async (req, res, next) => {
  try {
    const uploadId = req.params.id;
    const { supplierId, createAndReceive, items: overrideItems, invoiceNo, invoiceDate, subtotal, taxAmount, totalAmount, notes } = req.body;
    const up = await prisma.purchaseUpload.findUnique({ where: { id: uploadId } });
    if (!up) return res.status(404).json({ success: false, message: 'Upload not found' });
    const parsed = up.parsedJson ? JSON.parse(up.parsedJson) : null;

    // Use override items if provided, otherwise fall back to parsed items
    const itemsToUse = Array.isArray(overrideItems) ? overrideItems : (parsed?.items || []);

    const purchase = await prisma.purchase.create({ data: {
      invoiceNo: invoiceNo || parsed?.invoiceNo || `INV-${Date.now()}`,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : (parsed?.invoiceDate ? new Date(parsed.invoiceDate) : new Date()),
      status: parsed ? 'PARSED' : 'DRAFT',
      notes: notes || parsed?.notes || null,
      subtotal: typeof subtotal === 'number' ? subtotal : (parsed?.subtotal || 0),
      taxAmount: typeof taxAmount === 'number' ? taxAmount : (parsed?.taxAmount || 0),
      totalAmount: typeof totalAmount === 'number' ? totalAmount : (parsed?.totalAmount || 0),
      clinicId: up.clinicId,
      supplierId: supplierId || undefined,
      createdById: req.user.id
    }});

    // create items if present (use itemsToUse)
    if (itemsToUse && Array.isArray(itemsToUse) && itemsToUse.length) {
      const itemsData = itemsToUse.map((it) => ({
        purchaseId: purchase.id,
        productId: it.productId || undefined,
        name: it.name || it.description || 'Item',
        quantity: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.unitPrice || 0),
        taxAmount: parseFloat(it.taxAmount || 0),
        amount: parseFloat(it.amount || ((it.quantity || 1) * (it.unitPrice || 0)) || 0),
        batchNumber: it.batchNumber || null,
        expiryDate: it.expiryDate ? new Date(it.expiryDate) : null
      }));
      for (const d of itemsData) await prisma.purchaseItem.create({ data: d });
    }

    // link upload -> purchase
    await prisma.purchaseUpload.update({ where: { id: up.id }, data: { purchaseId: purchase.id } });

    // Optionally receive immediately (update stock) - recommend using /:id/receive for full processing
    if (createAndReceive) {
      await prisma.purchase.update({ where: { id: purchase.id }, data: { status: 'RECEIVED' } });
    }

    res.status(201).json({ success: true, data: purchase });
  } catch (error) { next(error); }
});

// POST /:id/receive - mark purchase RECEIVED and update stock + ledger (basic implementation)
router.post('/:id/receive', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (purchase.status === 'RECEIVED') return res.status(400).json({ success: false, message: 'Already received' });
    // Wrap stock + ledger updates in a single transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        if (item.productId) {
          const prod = await tx.pharmacyProduct.findUnique({ where: { id: item.productId } });
          const batch = await tx.stockBatch.create({ data: { productId: item.productId, quantity: item.quantity, costPrice: item.unitPrice, batchNumber: item.batchNumber || null, expiryDate: item.expiryDate ? new Date(item.expiryDate) : null } });
          const previousQty = prod?.quantity || 0;
          const newQty = previousQty + item.quantity;
          await tx.pharmacyProduct.update({ where: { id: item.productId }, data: { quantity: newQty } });
          await tx.stockHistory.create({ data: { productId: item.productId, batchId: batch.id, type: 'PURCHASE', quantity: item.quantity, previousQty, newQty, notes: `Received for purchase ${purchase.invoiceNo}`, createdBy: req.user.id } });
          await tx.stockTransaction.create({ data: { clinicId: purchase.clinicId, productId: item.productId, changeQty: item.quantity, type: 'PURCHASE', refType: 'PURCHASE', refId: purchase.id, note: `Purchase receive ${purchase.invoiceNo}` } });
          console.log(`Stock updated (receive) product=${item.productId} prev=${previousQty} new=${newQty}`);
        }
      }

      // Ledger entries (simplified): Debit Inventory, Credit Accounts Payable (supplier)
      await tx.ledgerEntry.create({ data: { clinicId: purchase.clinicId, account: 'Inventory', type: 'DEBIT', amount: purchase.subtotal, refType: 'PURCHASE', refId: purchase.id } });
      await tx.ledgerEntry.create({ data: { clinicId: purchase.clinicId, account: 'Accounts Payable', type: 'CREDIT', amount: purchase.totalAmount, refType: 'PURCHASE', refId: purchase.id } });

      await tx.purchase.update({ where: { id: purchase.id }, data: { status: 'RECEIVED' } });
    });

    // fetch updated product quantities to return for client convenience
    const productIds = purchase.items.filter(i => i.productId).map(i => i.productId);
    const updatedProducts = productIds.length ? await prisma.pharmacyProduct.findMany({ where: { id: { in: productIds } } }) : [];

    res.json({ success: true, data: { message: 'Purchase received and stock updated', products: updatedProducts } });
  } catch (error) { next(error); }
});

// POST /:id/return - create returns for purchase items
router.post('/:id/return', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const purchaseId = req.params.id;
    const { items, note } = req.body; // items: [{ purchaseItemId, quantity, gstAmount? }]
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items provided for return' });

    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId }, include: { items: true, supplier: true } });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const clinicId = purchase.clinicId;

    const ledgerEntries = [];

    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const pi = purchase.items.find(p => p.id === it.purchaseItemId);
        if (!pi) throw new Error('Purchase item not found');
        const qtyToReturn = Number(it.quantity || 0);
        if (qtyToReturn <= 0 || qtyToReturn > pi.quantity) throw new Error('Invalid return quantity');

        // update product quantity and create stock history + transaction if product exists
        if (pi.productId) {
          const prod = await tx.pharmacyProduct.findUnique({ where: { id: pi.productId } });
          const previousQty = prod?.quantity || 0;
          const newQty = previousQty - qtyToReturn;
          await tx.pharmacyProduct.update({ where: { id: pi.productId }, data: { quantity: newQty } });

          await tx.stockHistory.create({ data: {
            productId: pi.productId,
            batchId: null,
            type: 'RETURN',
            quantity: -qtyToReturn,
            previousQty,
            newQty,
            reference: `Return for purchase ${purchase.invoiceNo}`,
            notes: note || `Return ${qtyToReturn} x ${pi.name}`,
            createdBy: req.user.id
          }});

          await tx.stockTransaction.create({ data: {
            clinicId,
            productId: pi.productId,
            changeQty: -qtyToReturn,
            type: 'RETURN',
            refType: 'PURCHASE',
            refId: purchase.id,
            note: note || `Return ${qtyToReturn} x ${pi.name}`
          }});
          console.log(`Stock updated (return) product=${pi.productId} prev=${previousQty} new=${newQty}`);
        }

        // compute amount including GST/tax
        const baseAmount = Number(pi.unitPrice || 0) * qtyToReturn;
        // taxPerUnit derived from stored pi.taxAmount (total for the original item quantity)
        const taxPerUnit = (Number(pi.taxAmount || 0) / (pi.quantity || 1));
        let taxAmount = taxPerUnit * qtyToReturn;
        // allow override from client (gstAmount provided for this returned qty)
        const clientGst = Number(it.gstAmount ?? NaN);
        if (!Number.isNaN(clientGst)) {
          taxAmount = clientGst;
        }
        const amount = baseAmount + taxAmount;
        if (amount > 0) {
          // Inventory CREDIT (reduce asset)
          ledgerEntries.push({ clinicId, account: 'Inventory', type: 'CREDIT', amount, refType: 'PURCHASE', refId: purchase.id, note: `Return: ${pi.name}` });
          // Payable DEBIT (reduce payable) - use supplier name if available
          const payableAccount = purchase.supplier?.name ? `Payable - ${purchase.supplier.name}` : 'Accounts Payable';
          ledgerEntries.push({ clinicId, account: payableAccount, type: 'DEBIT', amount, refType: 'PURCHASE', refId: purchase.id, note: `Return: ${pi.name}` });
        }
      }

      if (ledgerEntries.length) {
        await tx.ledgerEntry.createMany({ data: ledgerEntries });
      }
    });

    // return updated product quantities
    const returnedProductIds = items.map(i => purchase.items.find(p => p.id === i.purchaseItemId)?.productId).filter(Boolean);
    const updatedProducts = returnedProductIds.length ? await prisma.pharmacyProduct.findMany({ where: { id: { in: returnedProductIds } } }) : [];

    res.json({ success: true, data: { message: 'Return processed', products: updatedProducts } });
  } catch (err) {
    next(err);
  }
});
export default router;
