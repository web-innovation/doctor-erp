import express from 'express';
import multer from 'multer';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import geminiAdapter from '../services/ocr/geminiAdapter.js';
import openaiAdapter from '../services/ocr/openaiAdapter.js';
import { ensurePurchaseUploadTempDir, persistPurchaseUpload } from '../services/purchaseStorageService.js';

const router = express.Router();
router.use(authenticate);

// GET /suppliers?q= - simple supplier search for current clinic
router.get('/suppliers', checkPermission('purchases', 'read'), async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString();
    const clinicId = req.user.clinicId;
    const where = { clinicId };
    if (q) where['name'] = { contains: q, mode: 'insensitive' };
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

// PUT /suppliers/:id - update supplier
router.put('/suppliers/:id', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const s = await prisma.supplier.findUnique({ where: { id } });
    if (!s || s.clinicId !== clinicId) return res.status(404).json({ success: false, message: 'Supplier not found' });
    const { name, phone, email, address, gstNumber, notes } = req.body;
    const updated = await prisma.supplier.update({ where: { id }, data: { name: name || s.name, phone: phone || s.phone, email: email || s.email, address: address || s.address, gstNumber: gstNumber || s.gstNumber, notes: notes || s.notes } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /suppliers/:id - delete supplier (soft-delete by setting isActive=false if model had it, else hard delete)
router.delete('/suppliers/:id', checkPermission('purchases', 'delete'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const s = await prisma.supplier.findUnique({ where: { id } });
    if (!s || s.clinicId !== clinicId) return res.status(404).json({ success: false, message: 'Supplier not found' });
    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) { next(err); }
});

// GET /suppliers/:id - fetch supplier by id for current clinic
router.get('/suppliers/:id', checkPermission('purchases', 'read'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const s = await prisma.supplier.findUnique({ where: { id } });
    if (!s || s.clinicId !== clinicId) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: s });
  } catch (err) { next(err); }
});

// GET / - list purchases for current clinic (supports status, page, limit)
router.get('/', checkPermission('purchases', 'read'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const status = req.query.status;
    const page = parseInt(req.query.page || '1', 10) || 1;
    const limit = parseInt(req.query.limit || '20', 10) || 20;
    const where = { clinicId };
    if (status) where.status = status;

    const total = await prisma.purchase.count({ where });
    const purchases = await prisma.purchase.findMany({
      where,
      include: { items: true, supplier: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    res.json({ success: true, data: purchases, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

const uploadTempDir = ensurePurchaseUploadTempDir();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadTempDir);
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, unique);
  }
});

const upload = multer({ storage });

async function getClinicUploadLimits(clinicId) {
  try {
    const row = await prisma.clinicSettings.findUnique({
      where: { clinicId_key: { clinicId, key: 'super_admin_controls' } },
      select: { value: true }
    });
    const parsed = row?.value ? JSON.parse(row.value) : null;
    const monthly = Number(parsed?.invoiceUploadLimit?.monthly);
    const yearly = Number(parsed?.invoiceUploadLimit?.yearly);
    return {
      monthly: Number.isFinite(monthly) && monthly >= 0 ? monthly : null,
      yearly: Number.isFinite(yearly) && yearly >= 0 ? yearly : null
    };
  } catch (_err) {
    return { monthly: null, yearly: null };
  }
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').replace(/[^\d.+-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeGstin(gstin) {
  if (!gstin || typeof gstin !== 'string') return null;
  const normalized = gstin.replace(/\s+/g, '').toUpperCase().trim();
  return normalized || null;
}

function extractRoundOff(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const candidates = [
    parsed.roundOff,
    parsed.round_off,
    parsed?.totals?.roundOff,
    parsed?.totals?.round_off,
    parsed?.totals?.roundoff
  ];
  for (const c of candidates) {
    const n = toNullableNumber(c);
    if (n !== null) return n;
  }
  return null;
}

function normalizeParsedInvoice(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const roundOff = extractRoundOff(parsed);
  const items = Array.isArray(parsed.items)
    ? parsed.items.map((it) => {
        const mrp = toNullableNumber(it?.mrp ?? it?.MRP ?? it?.mrp_value);
        return mrp === null ? it : { ...it, mrp };
      })
    : [];
  return { ...parsed, items, roundOff };
}

function mergePurchaseWithParsedJson(purchase, upload) {
  if (!purchase || !upload?.parsedJson) return purchase;
  try {
    const parsed = typeof upload.parsedJson === 'string' ? JSON.parse(upload.parsedJson) : upload.parsedJson;
    const roundOff = extractRoundOff(parsed);
    const parsedItems = Array.isArray(parsed?.items) ? parsed.items : [];
    const items = Array.isArray(purchase.items)
      ? purchase.items.map((it, idx) => {
          const parsedMrp = toNullableNumber(parsedItems[idx]?.mrp ?? parsedItems[idx]?.MRP ?? parsedItems[idx]?.mrp_value);
          return parsedMrp === null ? { ...it, mrp: Number(it?.mrp || 0) } : { ...it, mrp: parsedMrp };
        })
      : purchase.items;
    return {
      ...purchase,
      items,
      roundOff: roundOff ?? purchase.roundOff ?? 0,
      roundoff: roundOff ?? purchase.roundoff ?? 0
    };
  } catch (e) {
    return purchase;
  }
}

// POST /upload - upload purchase invoice image/pdf
router.post('/upload', checkPermission('purchases', 'create'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const clinicId = req.user.clinicId;
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const limits = await getClinicUploadLimits(clinicId);
    if (limits.monthly !== null || limits.yearly !== null) {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startYear = new Date(now.getFullYear(), 0, 1);
      const [monthCount, yearCount] = await Promise.all([
        limits.monthly !== null ? prisma.purchaseUpload.count({ where: { clinicId, createdAt: { gte: startMonth } } }) : Promise.resolve(0),
        limits.yearly !== null ? prisma.purchaseUpload.count({ where: { clinicId, createdAt: { gte: startYear } } }) : Promise.resolve(0)
      ]);
      if (limits.monthly !== null && monthCount >= limits.monthly) {
        return res.status(429).json({
          success: false,
          message: `Monthly invoice upload limit reached (${limits.monthly}). Please contact Docsy ERP team to increase the limit.`
        });
      }
      if (limits.yearly !== null && yearCount >= limits.yearly) {
        return res.status(429).json({
          success: false,
          message: `Yearly invoice upload limit reached (${limits.yearly}). Please contact Docsy ERP team to increase the limit.`
        });
      }
    }

    // Use OpenAI adapter for parsing by default for now
    const provider = 'openai';
    const pu = await prisma.purchaseUpload.create({ data: {
      filename: req.file.originalname,
      path: req.file.path,
      status: 'UPLOADED',
      provider,
      clinicId,
      uploadedById: req.user.id
    }});

    // Respond immediately; parsing will happen in background so frontend doesn't time out.
    const responseRecord = await prisma.purchaseUpload.findUnique({ where: { id: pu.id } });
    res.status(201).json({ success: true, data: responseRecord });

    // Background parse (non-blocking)
    (async function backgroundParse(uploadId, filePath, originalName) {
      try {
        // small delay to yield
        await new Promise((r) => setTimeout(r, 50));
        // re-load upload to check for cancellation
        const current = await prisma.purchaseUpload.findUnique({ where: { id: uploadId } });
        if (!current || current.status === 'CANCELLED') {
          console.log('Background parse aborted: upload cancelled or missing', uploadId);
          return;
        }

        let parsed = null;
        try {
          parsed = await openaiAdapter.parse(filePath);
        } catch (e) {
          console.error('OpenAI parse failed, falling back to Gemini:', e?.message || e);
          try { parsed = await geminiAdapter.parse(filePath); } catch (e2) { console.error('Gemini fallback also failed', e2?.message || e2); throw e; }
        }
        parsed = normalizeParsedInvoice(parsed);

        // Before writing result, ensure upload wasn't cancelled
        const beforeUpdate = await prisma.purchaseUpload.findUnique({ where: { id: uploadId } });
        if (!beforeUpdate || beforeUpdate.status === 'CANCELLED') {
          console.log('Skipping write: upload cancelled', uploadId);
          return;
        }

        // Auto-link/create supplier from seller details only and only by GSTIN.
        let supplierId = null;
        try {
          const seller = parsed?.pharmacy_details || null;
          const gstin = normalizeGstin(seller?.gstin || seller?.gstNumber);
          if (gstin) {
            const found = await prisma.supplier.findFirst({ where: { clinicId: beforeUpdate.clinicId, gstNumber: gstin } });
            if (found) {
              supplierId = found.id;
            } else {
              const created = await prisma.supplier.create({
                data: {
                  clinicId: beforeUpdate.clinicId,
                  name: (seller?.name || `Supplier ${gstin}`).trim(),
                  phone: seller?.phone || null,
                  email: seller?.email || null,
                  address: seller?.address || null,
                  gstNumber: gstin
                }
              });
              supplierId = created.id;
            }
          }
        } catch (e) {
          console.error('Auto-create supplier failed', e?.message || e);
        }

        // If parsed contains items, create a draft purchase automatically and link it to the upload
        let createdPurchase = null;
        try {
          // ensure we don't create duplicate purchase if already linked
          const existing = beforeUpdate.purchaseId ? await prisma.purchase.findUnique({ where: { id: beforeUpdate.purchaseId } }) : null;
          if (!existing) {
            const itemsToUse = Array.isArray(parsed?.items) ? parsed.items : [];
            // normalize items similar to /from-upload
            const normalizedItems = itemsToUse.map((it, i) => {
              const qty = parseInt(it.quantity || it.qty || 1, 10) || 1;
              const unitPrice = parseFloat(it.unitPrice || it.unit_price || it.rate || it.price || 0) || 0;
              const amount = parseFloat(it.amount || it.lineTotal || it.line_total || (qty * unitPrice)) || +(qty * unitPrice).toFixed(2);
              const taxAmount = parseFloat(it.taxAmount || it.tax_amount || it.gstAmount || 0) || 0;
              let batchNumber = it.batchNumber || it.batch_number || it.batch || null;
              const expiryRaw = it.expiryDate || it.expiry_date || it.expiry || null;
              const expiryDate = expiryRaw ? (isNaN(Date.parse(expiryRaw)) ? null : expiryRaw) : null;
              if (!batchNumber) batchNumber = `MANB-${Date.now() % 100000}-${i}`;
              return { ...it, quantity: qty, unitPrice, amount, taxAmount, batchNumber, expiryDate };
            });

            const purchaseData = {
              invoiceNo: parsed?.invoiceNo || `INV-${Date.now()}`,
              invoiceDate: parsed?.invoiceDate ? new Date(parsed.invoiceDate) : new Date(),
              status: 'DRAFT',
              notes: parsed?.notes || null,
              subtotal: Number(parsed?.subtotal || parsed?.totals?.sub_total || 0),
              taxAmount: Number(parsed?.taxAmount || 0),
              totalAmount: Number(parsed?.totalAmount || parsed?.totals?.net_amount || 0),
              clinicId: beforeUpdate.clinicId,
              supplierId: supplierId || undefined,
              createdById: null
            };

            createdPurchase = await prisma.purchase.create({ data: purchaseData });
            if (normalizedItems && normalizedItems.length) {
              for (const it of normalizedItems) {
                await prisma.purchaseItem.create({ data: { purchaseId: createdPurchase.id, productId: it.productId || undefined, name: it.name || it.description || 'Item', quantity: parseInt(it.quantity || 1, 10), unitPrice: parseFloat(it.unitPrice || 0), taxAmount: parseFloat(it.taxAmount || 0), amount: parseFloat(it.amount || 0), batchNumber: it.batchNumber || null, expiryDate: it.expiryDate ? new Date(it.expiryDate) : null } });
              }
            }

            // link upload -> purchase
            await prisma.purchaseUpload.update({ where: { id: uploadId }, data: { purchaseId: createdPurchase.id } });
          }
        } catch (e) {
          console.error('Auto-create purchase failed', e?.message || e);
        }

        let finalStoredPath = filePath;
        let storageMeta = null;
        try {
          const persisted = await persistPurchaseUpload({
            tempFilePath: filePath,
            clinicId: beforeUpdate.clinicId,
            supplierId: createdPurchase?.supplierId || supplierId || 'unknown-supplier',
            invoiceDate: createdPurchase?.invoiceDate || parsed?.invoiceDate,
            invoiceNo: createdPurchase?.invoiceNo || parsed?.invoiceNo || uploadId,
            originalName: originalName || beforeUpdate.filename,
            uploadId
          });
          finalStoredPath = persisted.path;
          storageMeta = `storage=${persisted.provider};key=${persisted.key}`;
        } catch (storageErr) {
          console.error('Purchase upload persist failed, keeping temp path', storageErr?.message || storageErr);
        }

        // finally save parsed JSON and mark as PARSED
        await prisma.purchaseUpload.update({
          where: { id: uploadId },
          data: {
            status: 'PARSED',
            parsedJson: JSON.stringify(parsed),
            path: finalStoredPath,
            providerMeta: storageMeta || undefined
          }
        });
        console.log('Background parse complete for upload', uploadId, 'purchaseCreated=', !!createdPurchase);
      } catch (err) {
        console.error('Background parsing failed for upload', uploadId, err?.message || err);
        try {
          await prisma.purchaseUpload.update({ where: { id: uploadId }, data: { status: 'FAILED', providerMeta: String(err?.message || err) } });
        } catch (e2) { console.error('Failed to update upload status after background error', e2); }
      }
    })(pu.id, req.file.path, req.file.originalname).catch((e) => { console.error('Background parse launcher error', e); });
  } catch (error) {
    next(error);
  }
});

// POST /upload/:id/cancel - cancel background parsing/upload
router.post('/upload/:id/cancel', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const up = await prisma.purchaseUpload.findUnique({ where: { id } });
    if (!up) return res.status(404).json({ success: false, message: 'Upload not found' });
    if (up.status === 'PARSED' || up.status === 'RECEIVED') return res.status(400).json({ success: false, message: 'Cannot cancel a completed upload' });
    await prisma.purchaseUpload.update({ where: { id }, data: { status: 'CANCELLED', providerMeta: 'Cancelled by user' } });
    return res.json({ success: true, message: 'Upload cancelled' });
  } catch (err) { next(err); }
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
    const { supplierId, createAndReceive, items: overrideItems, invoiceNo, invoiceDate, subtotal, taxAmount, totalAmount, notes, roundOff } = req.body;
    const up = await prisma.purchaseUpload.findUnique({ where: { id: uploadId } });
    if (!up) return res.status(404).json({ success: false, message: 'Upload not found' });
    const parsed = normalizeParsedInvoice(up.parsedJson ? JSON.parse(up.parsedJson) : null);

    // Use override items if provided, otherwise fall back to parsed items
    const itemsToUse = Array.isArray(overrideItems) ? overrideItems : (parsed?.items || []);

    // Normalize and validate items coming from parsed JSON or override
    function normalizeItem(it, idx) {
      const qty = parseInt(it.quantity || it.qty || 1, 10) || 1;
      const unitPrice = parseFloat(it.unitPrice || it.unit_price || it.rate || it.price || 0) || 0;
      const amount = parseFloat(it.amount || it.lineTotal || it.line_total || (qty * unitPrice)) || +(qty * unitPrice).toFixed(2);
      const taxAmount = parseFloat(it.taxAmount || it.tax_amount || it.gstAmount || 0) || 0;
      // accept various keys for batch/expiry
      let batchNumber = it.batchNumber || it.batch_number || it.batch || null;
      const expiryRaw = it.expiryDate || it.expiry_date || it.expiry || null;
      const expiryDate = expiryRaw ? (isNaN(Date.parse(expiryRaw)) ? null : expiryRaw) : null;
      // Auto-generate batch if missing
      if (!batchNumber) {
        batchNumber = `MANB-${Date.now() % 100000}-${idx}`;
      }
      return { ...it, quantity: qty, unitPrice, amount, taxAmount, batchNumber, expiryDate };
    }

    const normalizedItems = Array.isArray(itemsToUse) ? itemsToUse.map((it, i) => normalizeItem(it, i)) : [];

    const purchase = await prisma.purchase.create({ data: {
      invoiceNo: invoiceNo || parsed?.invoiceNo || `INV-${Date.now()}`,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : (parsed?.invoiceDate ? new Date(parsed.invoiceDate) : new Date()),
      status: 'DRAFT',
      notes: notes || parsed?.notes || null,
      subtotal: typeof subtotal === 'number' ? subtotal : (parsed?.subtotal || 0),
      taxAmount: typeof taxAmount === 'number' ? taxAmount : (parsed?.taxAmount || 0),
      totalAmount: typeof totalAmount === 'number' ? totalAmount : (parsed?.totalAmount || 0),
      clinicId: up.clinicId,
      supplierId: supplierId || undefined,
      createdById: req.user.id
    }});

    // Persist roundOff + item mrp in upload parsed JSON for draft UI hydration.
    const uploadParsed = parsed && typeof parsed === 'object' ? { ...parsed } : {};
    if (roundOff !== undefined) {
      const ro = toNullableNumber(roundOff);
      uploadParsed.roundOff = ro;
      if (uploadParsed.totals && typeof uploadParsed.totals === 'object') {
        uploadParsed.totals = { ...uploadParsed.totals, round_off: ro };
      }
    }
    if (Array.isArray(normalizedItems) && normalizedItems.length) {
      const priorItems = Array.isArray(uploadParsed.items) ? uploadParsed.items : [];
      uploadParsed.items = normalizedItems.map((it, idx) => ({
        ...(priorItems[idx] || {}),
        ...(it || {}),
        mrp: toNullableNumber(it?.mrp ?? priorItems[idx]?.mrp) ?? 0
      }));
    }
    await prisma.purchaseUpload.update({ where: { id: up.id }, data: { parsedJson: JSON.stringify(uploadParsed) } });

    // create items if present (use itemsToUse)
    if (normalizedItems && Array.isArray(normalizedItems) && normalizedItems.length) {
      const itemsData = normalizedItems.map((it) => ({
        purchaseId: purchase.id,
        productId: it.productId || undefined,
        name: it.name || it.description || 'Item',
        quantity: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.unitPrice || 0),
        taxAmount: parseFloat(it.taxAmount || 0),
        amount: parseFloat(it.amount || ((it.quantity || 1) * (it.unitPrice || 0)) || 0),
        batchNumber: it.batchNumber || it.batch_number || it.batch || null,
        expiryDate: it.expiryDate ? new Date(it.expiryDate) : null
      }));
      for (const d of itemsData) await prisma.purchaseItem.create({ data: d });
    }

    // link upload -> purchase
    await prisma.purchaseUpload.update({ where: { id: up.id }, data: { purchaseId: purchase.id } });

    // Optionally receive immediately (update stock + ledger)
    let receiveResult = null;
    if (createAndReceive) {
      // perform same processing as /:id/receive
      const toProcess = await prisma.purchase.findUnique({ where: { id: purchase.id }, include: { items: true, supplier: true } });
      if (toProcess) {
        await prisma.$transaction(async (tx) => {
          async function ensureAccount(name, type = null) {
            let a = await tx.account.findFirst({ where: { clinicId: toProcess.clinicId, name } });
            if (!a) a = await tx.account.create({ data: { clinicId: toProcess.clinicId, name, type: type || undefined, createdById: req.user.id } });
            return a;
          }

          for (const item of toProcess.items) {
            if (item.productId) {
              const prod = await tx.pharmacyProduct.findUnique({ where: { id: item.productId } });
              const batch = await tx.stockBatch.create({ data: { productId: item.productId, quantity: item.quantity, costPrice: item.unitPrice, batchNumber: item.batchNumber || null, expiryDate: item.expiryDate ? new Date(item.expiryDate) : null } });
              const previousQty = prod?.quantity || 0;
              const newQty = previousQty + item.quantity;
              const productUpdate = { quantity: newQty, purchasePrice: item.unitPrice };
              if (item.batchNumber) productUpdate.batchNumber = item.batchNumber;
              if (item.expiryDate) productUpdate.expiryDate = new Date(item.expiryDate);
              await tx.pharmacyProduct.update({ where: { id: item.productId }, data: productUpdate });
              await tx.stockHistory.create({ data: { productId: item.productId, batchId: batch.id, type: 'PURCHASE', quantity: item.quantity, previousQty, newQty, notes: `Received for purchase ${toProcess.invoiceNo}`, createdBy: req.user.id } });
              await tx.stockTransaction.create({ data: { clinicId: toProcess.clinicId, productId: item.productId, changeQty: item.quantity, type: 'PURCHASE', refType: 'PURCHASE', refId: toProcess.id, note: `Purchase receive ${toProcess.invoiceNo}` } });
            }
          }

          const inventoryAcct = await ensureAccount('Inventory', 'ASSET');
          const gstInputAcct = await ensureAccount('GST Input', 'ASSET');
          const payableAcctName = toProcess.supplier?.name ? `Payable - ${toProcess.supplier.name}` : 'Accounts Payable';
          const payableAcct = await ensureAccount(payableAcctName, 'LIABILITY');

          await tx.ledgerEntry.create({ data: { clinicId: toProcess.clinicId, account: inventoryAcct.name, accountId: inventoryAcct.id, type: 'DEBIT', amount: Number(toProcess.subtotal || 0), refType: 'PURCHASE', refId: toProcess.id, note: `Purchase ${toProcess.invoiceNo} inventory` } });
          if (Number(toProcess.taxAmount || 0) > 0) {
            await tx.ledgerEntry.create({ data: { clinicId: toProcess.clinicId, account: gstInputAcct.name, accountId: gstInputAcct.id, type: 'DEBIT', amount: Number(toProcess.taxAmount || 0), refType: 'PURCHASE', refId: toProcess.id, note: `GST input for ${toProcess.invoiceNo}` } });
          }
          await tx.ledgerEntry.create({ data: { clinicId: toProcess.clinicId, account: payableAcct.name, accountId: payableAcct.id, type: 'CREDIT', amount: Number(toProcess.totalAmount || 0), refType: 'PURCHASE', refId: toProcess.id, note: `Purchase payable ${toProcess.invoiceNo}` } });

          await tx.purchase.update({ where: { id: toProcess.id }, data: { status: 'RECEIVED' } });
        });

        const productIds = toProcess.items.filter(i => i.productId).map(i => i.productId);
        const updatedProducts = productIds.length ? await prisma.pharmacyProduct.findMany({ where: { id: { in: productIds } } }) : [];
        receiveResult = { message: 'Purchase received and stock updated', products: updatedProducts };
      }
    }

    res.status(201).json({ success: true, data: purchase, received: receiveResult });
  } catch (error) { next(error); }
});

// POST /:id/receive - mark purchase RECEIVED and update stock + ledger (basic implementation)
router.post('/:id/receive', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id }, include: { items: true, supplier: true } });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (purchase.status === 'RECEIVED') return res.status(400).json({ success: false, message: 'Already received' });
    // Wrap stock + ledger updates in a single transaction for atomicity
    await prisma.$transaction(async (tx) => {
      async function ensureAccount(name, type = null) {
        let a = await tx.account.findFirst({ where: { clinicId: purchase.clinicId, name } });
        if (!a) a = await tx.account.create({ data: { clinicId: purchase.clinicId, name, type: type || undefined, createdById: req.user.id } });
        return a;
      }

      for (const item of purchase.items) {
        if (item.productId) {
          const prod = await tx.pharmacyProduct.findUnique({ where: { id: item.productId } });
          const batch = await tx.stockBatch.create({ data: { productId: item.productId, quantity: item.quantity, costPrice: item.unitPrice, batchNumber: item.batchNumber || null, expiryDate: item.expiryDate ? new Date(item.expiryDate) : null } });
          const previousQty = prod?.quantity || 0;
          const newQty = previousQty + item.quantity;
          const productUpdate = { quantity: newQty, purchasePrice: item.unitPrice };
          if (item.batchNumber) productUpdate.batchNumber = item.batchNumber;
          if (item.expiryDate) productUpdate.expiryDate = new Date(item.expiryDate);
          await tx.pharmacyProduct.update({ where: { id: item.productId }, data: productUpdate });
          await tx.stockHistory.create({ data: { productId: item.productId, batchId: batch.id, type: 'PURCHASE', quantity: item.quantity, previousQty, newQty, notes: `Received for purchase ${purchase.invoiceNo}`, createdBy: req.user.id } });
          await tx.stockTransaction.create({ data: { clinicId: purchase.clinicId, productId: item.productId, changeQty: item.quantity, type: 'PURCHASE', refType: 'PURCHASE', refId: purchase.id, note: `Purchase receive ${purchase.invoiceNo}` } });
          console.log(`Stock updated (receive) product=${item.productId} prev=${previousQty} new=${newQty}`);
        }
      }

      // Ledger entries: Debit Inventory, Debit GST Input (if any), Credit Payable - Supplier
      const inventoryAcct = await ensureAccount('Inventory', 'ASSET');
      const gstInputAcct = await ensureAccount('GST Input', 'ASSET');
      const payableAcctName = purchase.supplier?.name ? `Payable - ${purchase.supplier.name}` : 'Accounts Payable';
      const payableAcct = await ensureAccount(payableAcctName, 'LIABILITY');

      await tx.ledgerEntry.create({ data: { clinicId: purchase.clinicId, account: inventoryAcct.name, accountId: inventoryAcct.id, type: 'DEBIT', amount: Number(purchase.subtotal || 0), refType: 'PURCHASE', refId: purchase.id, note: `Purchase ${purchase.invoiceNo} inventory` } });
      if (Number(purchase.taxAmount || 0) > 0) {
        await tx.ledgerEntry.create({ data: { clinicId: purchase.clinicId, account: gstInputAcct.name, accountId: gstInputAcct.id, type: 'DEBIT', amount: Number(purchase.taxAmount || 0), refType: 'PURCHASE', refId: purchase.id, note: `GST input for ${purchase.invoiceNo}` } });
      }
      await tx.ledgerEntry.create({ data: { clinicId: purchase.clinicId, account: payableAcct.name, accountId: payableAcct.id, type: 'CREDIT', amount: Number(purchase.totalAmount || 0), refType: 'PURCHASE', refId: purchase.id, note: `Purchase payable ${purchase.invoiceNo}` } });

      await tx.purchase.update({ where: { id: purchase.id }, data: { status: 'RECEIVED' } });
    });

    // fetch updated product quantities to return for client convenience
    const productIds = purchase.items.filter(i => i.productId).map(i => i.productId);
    const updatedProducts = productIds.length ? await prisma.pharmacyProduct.findMany({ where: { id: { in: productIds } } }) : [];

    res.json({ success: true, data: { message: 'Purchase received and stock updated', products: updatedProducts } });
  } catch (error) { next(error); }
});

// GET /:id - fetch a single purchase (items + supplier)
router.get('/:id', checkPermission('purchases', 'read'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const p = await prisma.purchase.findUnique({ where: { id }, include: { items: true, supplier: true } });
    if (!p || p.clinicId !== clinicId) return res.status(404).json({ success: false, message: 'Purchase not found' });

    // try to fetch linked upload (if any) so client can show invoice image / parsed JSON
    const upload = await prisma.purchaseUpload.findFirst({ where: { purchaseId: id }, select: { id: true, filename: true, path: true, parsedJson: true, status: true } });

    res.json({ success: true, data: mergePurchaseWithParsedJson({ ...p, upload: upload || null }, upload) });
  } catch (err) { next(err); }
});

// PATCH /:id - update basic purchase fields (supplier, invoice fields, totals)
router.patch('/:id', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const p = await prisma.purchase.findUnique({ where: { id } });
    if (!p || p.clinicId !== clinicId) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const { supplierId, invoiceNo, invoiceDate, notes, subtotal, taxAmount, totalAmount, status, items, roundOff } = req.body;
    const data = {};
    if (supplierId !== undefined) data.supplierId = supplierId || null;
    if (invoiceNo !== undefined) data.invoiceNo = invoiceNo;
    if (invoiceDate !== undefined) data.invoiceDate = invoiceDate ? new Date(invoiceDate) : null;
    if (notes !== undefined) data.notes = notes;
    if (subtotal !== undefined) data.subtotal = Number(subtotal) || 0;
    if (taxAmount !== undefined) data.taxAmount = Number(taxAmount) || 0;
    if (totalAmount !== undefined) data.totalAmount = Number(totalAmount) || 0;
    if (status !== undefined) data.status = status;

    // If items provided, replace existing items atomically (only allowed for DRAFT purchases)
    if (Array.isArray(items)) {
      await prisma.$transaction(async (tx) => {
        // Update purchase metadata first
        await tx.purchase.update({ where: { id }, data });

        // remove existing items
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

        // create new items
        for (const it of items) {
          const qty = Number(it.quantity || 0) || 0;
          const unitPrice = Number(it.unitPrice || it.unit_price || it.rate || it.price || 0) || 0;
          // Always derive line amount from quantity x unit price so edited rate is the source of truth.
          const amount = Number((qty * unitPrice).toFixed(2));
          const taxAmountItem = Number(it.taxAmount || it.tax_amount || 0) || 0;
          await tx.purchaseItem.create({ data: {
            purchaseId: id,
            productId: it.productId || undefined,
            name: it.name || it.description || 'Item',
            quantity: qty,
            unitPrice: unitPrice,
            taxAmount: taxAmountItem,
            amount: amount,
            batchNumber: it.batchNumber || it.batch_number || null,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null
          } });
        }
      });
    } else {
      // No items provided — simple update
      await prisma.purchase.update({ where: { id }, data });
    }

    if (roundOff !== undefined || Array.isArray(items)) {
      try {
        const up = await prisma.purchaseUpload.findFirst({ where: { purchaseId: id } });
        if (up) {
          const parsed = up.parsedJson ? (typeof up.parsedJson === 'string' ? JSON.parse(up.parsedJson) : up.parsedJson) : {};
          const nextParsed = parsed && typeof parsed === 'object' ? { ...parsed } : {};
          if (roundOff !== undefined) {
            const ro = toNullableNumber(roundOff);
            nextParsed.roundOff = ro;
            if (nextParsed.totals && typeof nextParsed.totals === 'object') {
              nextParsed.totals = { ...nextParsed.totals, round_off: ro };
            }
          }
          if (Array.isArray(items)) {
            const priorItems = Array.isArray(nextParsed.items) ? nextParsed.items : [];
            nextParsed.items = items.map((it, idx) => ({
              ...(priorItems[idx] || {}),
              ...(it || {}),
              mrp: toNullableNumber(it?.mrp ?? priorItems[idx]?.mrp) ?? 0
            }));
          }
          await prisma.purchaseUpload.update({ where: { id: up.id }, data: { parsedJson: JSON.stringify(nextParsed) } });
        }
      } catch (persistErr) {
        console.error('Failed to persist parsed draft fields', persistErr?.message || persistErr);
      }
    }

    const result = await prisma.purchase.findUnique({ where: { id }, include: { items: true, supplier: true } });
    const upload = await prisma.purchaseUpload.findFirst({ where: { purchaseId: id }, select: { id: true, filename: true, path: true, parsedJson: true, status: true } });
    res.json({ success: true, data: mergePurchaseWithParsedJson({ ...result, upload: upload || null }, upload) });
  } catch (err) { next(err); }
});

// DELETE /:id - delete a draft purchase
router.delete('/:id', checkPermission('purchases', 'delete'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const clinicId = req.user.clinicId;
    const p = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!p || p.clinicId !== clinicId) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (p.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only draft purchases can be deleted' });

    // delete items then purchase in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Purchase deleted' });
  } catch (err) { next(err); }
});

// POST /:id/return - create returns for purchase items
router.post('/:id/return', checkPermission('purchases', 'update'), async (req, res, next) => {
  try {
    const purchaseId = req.params.id;
    const { items, note } = req.body; // items: [{ purchaseItemId, quantity, gstPercent?, gstAmount? }]
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items provided for return' });

    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId }, include: { items: true, supplier: true } });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const clinicId = purchase.clinicId;
    if (clinicId !== req.user.clinicId) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const ledgerEntries = [];

    await prisma.$transaction(async (tx) => {
      async function ensureAccount(name, type = null) {
        let a = await tx.account.findFirst({ where: { clinicId, name } });
        if (!a) a = await tx.account.create({ data: { clinicId, name, type: type || undefined, createdById: req.user.id } });
        return a;
      }

      const inventoryAcct = await ensureAccount('Inventory', 'ASSET');
      const gstInputAcct = await ensureAccount('GST Input', 'ASSET');
      const payableAccountName = purchase.supplier?.name ? `Payable - ${purchase.supplier.name}` : 'Accounts Payable';
      const payableAcct = await ensureAccount(payableAccountName, 'LIABILITY');
      // For returns from ledger UI, GST is auto-computed on selected return subtotal
      // using overall effective GST rate of the original purchase.
      const effectiveGstPercent = Number(purchase.subtotal || 0) > 0
        ? (Number(purchase.taxAmount || 0) / Number(purchase.subtotal || 1)) * 100
        : 0;

      for (const it of items) {
        const pi = purchase.items.find(p => p.id === it.purchaseItemId);
        if (!pi) throw new Error('Purchase item not found');
        const qtyToReturn = Number(it.quantity || 0);
        if (qtyToReturn <= 0 || qtyToReturn > pi.quantity) throw new Error('Invalid return quantity');

        // update product quantity and create stock history + transaction if product exists
        if (pi.productId) {
          const prod = await tx.pharmacyProduct.findUnique({ where: { id: pi.productId } });
          const previousQty = prod?.quantity || 0;
          const newQty = Math.max(0, previousQty - qtyToReturn);
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
        let taxAmount = Number((baseAmount * (effectiveGstPercent / 100)).toFixed(2));
        // Backward compatibility for old clients that still send gstAmount.
        const clientGstAmount = Number(it.gstAmount ?? NaN);
        if (!Number.isNaN(clientGstAmount)) taxAmount = clientGstAmount;
        const amount = baseAmount + taxAmount;
        if (amount > 0) {
          // Return reverses purchase entries: Cr Inventory, Cr GST Input, Dr Payable - Supplier
          if (baseAmount > 0) {
            ledgerEntries.push({
              clinicId,
              account: inventoryAcct.name,
              accountId: inventoryAcct.id,
              type: 'CREDIT',
              amount: baseAmount,
              refType: 'RETURN',
              refId: purchase.id,
              note: `Return inventory: ${pi.name}`,
            });
          }
          if (taxAmount > 0) {
            ledgerEntries.push({
              clinicId,
              account: gstInputAcct.name,
              accountId: gstInputAcct.id,
              type: 'CREDIT',
              amount: taxAmount,
              refType: 'RETURN',
              refId: purchase.id,
              note: `Return GST: ${pi.name}`,
            });
          }
          ledgerEntries.push({
            clinicId,
            account: payableAcct.name,
            accountId: payableAcct.id,
            type: 'DEBIT',
            amount,
            refType: 'RETURN',
            refId: purchase.id,
            note: `Return payable: ${pi.name}`,
          });
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
