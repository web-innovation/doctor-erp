import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openingImportUpload = multer({ storage: multer.memoryStorage() });

function parseCsvLine(line = '') {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.map((v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v));
}

function parseCsvText(text = '') {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').toLowerCase().trim());
  const rows = lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const row = { _line: idx + 2 };
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

function normalizeHeaderCell(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').toLowerCase().trim();
}

function parseSheetRows(sheetName, data = []) {
  if (!data.length) return { headers: [], rows: [] };
  const headers = (data[0] || []).map(normalizeHeaderCell);
  const rows = data.slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim().length > 0))
    .map((rowValues, idx) => {
      const row = { _line: idx + 2, _sheet: sheetName };
      headers.forEach((h, i) => { row[h] = rowValues[i] ?? ''; });
      return row;
    });
  return { headers, rows };
}

function parseXlsxBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = [];
  const rows = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const parsed = parseSheetRows(sheetName, data);
    if (parsed.rows.length === 0 && parsed.headers.length === 0) return;
    sheets.push({ name: sheetName, headers: parsed.headers, rows: parsed.rows });
    rows.push(...parsed.rows);
  });
  return { sheets, rows };
}

function parseImportFile(file) {
  const name = file?.originalname || '';
  const ext = path.extname(name).toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();
  const isXlsx = ext === '.xlsx' || mime.includes('spreadsheetml.sheet');
  if (isXlsx) return parseXlsxBuffer(file.buffer);
  const parsedCsv = parseCsvText(file.buffer.toString('utf8'));
  return { sheets: [{ name: 'CSV', headers: parsedCsv.headers, rows: parsedCsv.rows }], rows: parsedCsv.rows };
}

function toNum(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function toInt(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function requiredTemplateColumns() {
  return ['name', 'code', 'batch_number', 'expiry_date', 'quantity', 'mrp', 'purchase_price', 'gst_percent', 'unit', 'category', 'supplier_name'];
}

// GET /stock/opening-import/template - download sample CSV for opening stock import
router.get('/stock/opening-import/template', checkPermission('pharmacy', 'read'), async (req, res, next) => {
  try {
    const templatePath = path.join(__dirname, '../../templates/opening_stock_import_sample.csv');
    return res.download(templatePath, 'opening_stock_import_sample.csv');
  } catch (error) {
    next(error);
  }
});

// POST /stock/opening-import - import opening stock from CSV.
// Supports dry-run preview via body/query dryRun=true.
router.post('/stock/opening-import', checkPermission('pharmacy', 'create'), openingImportUpload.single('file'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const dryRun = String(req.body?.dryRun ?? req.query?.dryRun ?? 'false').toLowerCase() === 'true';
    const openingDateRaw = req.body?.openingDate || req.query?.openingDate;
    const openingDate = openingDateRaw ? new Date(openingDateRaw) : new Date();
    const creditAccountName = (req.body?.creditAccountName || req.query?.creditAccountName || 'Opening Stock Adjustment').toString().trim();

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'CSV or XLSX file is required (multipart field: file)' });
    }
    const { sheets, rows } = parseImportFile(req.file);
    if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty' });

    const requiredCols = requiredTemplateColumns();
    const missingBySheet = sheets
      .map((sheet) => {
        const missing = requiredCols.filter((c) => !sheet.headers.includes(c));
        return missing.length ? { sheet: sheet.name, missing } : null;
      })
      .filter(Boolean);
    if (missingBySheet.length) {
      if (missingBySheet.length === 1 && sheets.length === 1) {
        return res.status(400).json({ success: false, message: `Missing required columns: ${missingBySheet[0].missing.join(', ')}` });
      }
      const details = missingBySheet.map((entry) => `${entry.sheet} (${entry.missing.join(', ')})`).join('; ');
      return res.status(400).json({ success: false, message: `Missing required columns in sheets: ${details}` });
    }

    const errors = [];
    const addError = (row, field, message) => {
      errors.push({ line: row._line, sheet: row._sheet || null, field, message });
    };
    const normalized = rows.map((r) => {
      const name = (r.name || '').trim();
      const code = (r.code || '').trim();
      const quantity = toInt(r.quantity, -1);
      const mrp = toNum(r.mrp, -1);
      const purchasePrice = toNum(r.purchase_price, -1);
      const gstPercent = toNum(r.gst_percent, 0);
      const expiryDate = toDateOrNull((r.expiry_date || '').trim());
      if (!name) addError(r, 'name', 'name is required');
      if (!code) addError(r, 'code', 'code is required');
      if (quantity < 0) addError(r, 'quantity', 'quantity must be >= 0');
      if (mrp < 0) addError(r, 'mrp', 'mrp must be >= 0');
      if (purchasePrice < 0) addError(r, 'purchase_price', 'purchase_price must be >= 0');
      if ((r.expiry_date || '').trim() && !expiryDate) addError(r, 'expiry_date', 'invalid date format');
      return {
        line: r._line,
        sheet: r._sheet || null,
        name,
        code,
        batchNumber: (r.batch_number || '').trim() || null,
        expiryDate,
        quantity: Math.max(0, quantity),
        mrp: Math.max(0, mrp),
        purchasePrice: Math.max(0, purchasePrice),
        gstPercent: Math.max(0, gstPercent),
        unit: (r.unit || 'pcs').trim() || 'pcs',
        category: (r.category || 'GENERAL').trim() || 'GENERAL',
        supplierName: (r.supplier_name || '').trim() || null,
      };
    });

    const seenCodes = new Set();
    normalized.forEach((r) => {
      const key = r.code.toLowerCase();
      if (seenCodes.has(key)) errors.push({ line: r.line, sheet: r.sheet || null, field: 'code', message: `duplicate code in file: ${r.code}` });
      seenCodes.add(key);
    });

    const totalStockValue = normalized.reduce((s, r) => s + (r.purchasePrice * r.quantity), 0);
    if (dryRun || errors.length > 0) {
      return res.json({
        success: errors.length === 0,
        dryRun: true,
        summary: {
          rows: normalized.length,
          totalStockValue: Number(totalStockValue.toFixed(2)),
          ledgerPreview: {
            debitAccount: 'Inventory',
            creditAccount: creditAccountName,
            amount: Number(totalStockValue.toFixed(2)),
            date: openingDate.toISOString()
          }
        },
        errors
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      async function ensureAccount(name, type = null) {
        let acct = await tx.account.findFirst({ where: { clinicId, name } });
        if (!acct) acct = await tx.account.create({ data: { clinicId, name, type: type || undefined, createdById: req.user.id } });
        return acct;
      }

      const inventoryAcct = await ensureAccount('Inventory', 'ASSET');
      const creditAcct = await ensureAccount(creditAccountName, 'EQUITY');

      const imported = [];
      for (const row of normalized) {
        let product = await tx.pharmacyProduct.findFirst({ where: { clinicId, OR: [{ code: row.code }, { name: row.name }] } });
        if (!product) {
          product = await tx.pharmacyProduct.create({
            data: {
              clinicId,
              code: row.code,
              name: row.name,
              category: row.category,
              unit: row.unit,
              mrp: row.mrp,
              purchasePrice: row.purchasePrice,
              sellingPrice: row.mrp || row.purchasePrice,
              gstPercent: row.gstPercent || 0,
              quantity: 0,
              batchNumber: row.batchNumber,
              expiryDate: row.expiryDate
            }
          });
        }

        const previousQty = Number(product.quantity || 0);
        const newQty = previousQty + row.quantity;
        const batch = await tx.stockBatch.create({
          data: {
            productId: product.id,
            batchNumber: row.batchNumber,
            quantity: row.quantity,
            expiryDate: row.expiryDate,
            costPrice: row.purchasePrice
          }
        });

        const productUpdate = {
          quantity: newQty,
          purchasePrice: row.purchasePrice > 0 ? row.purchasePrice : product.purchasePrice,
          mrp: row.mrp > 0 ? row.mrp : product.mrp
        };
        if (row.batchNumber) productUpdate.batchNumber = row.batchNumber;
        if (row.expiryDate) productUpdate.expiryDate = row.expiryDate;
        await tx.pharmacyProduct.update({ where: { id: product.id }, data: productUpdate });

        await tx.stockHistory.create({
          data: {
            productId: product.id,
            batchId: batch.id,
            type: 'OPENING_STOCK',
            quantity: row.quantity,
            previousQty,
            newQty,
            reference: `Opening stock import ${openingDate.toISOString().slice(0, 10)}`,
            notes: 'Imported opening stock',
            createdBy: req.user.id
          }
        });

        await tx.stockTransaction.create({
          data: {
            clinicId,
            productId: product.id,
            changeQty: row.quantity,
            type: 'OPENING_STOCK',
            refType: 'OPENING_STOCK_IMPORT',
            refId: product.id,
            note: 'Imported opening stock'
          }
        });

        imported.push({ productId: product.id, code: row.code, name: row.name, quantity: row.quantity });
      }

      const amount = Number(totalStockValue.toFixed(2));
      if (amount > 0) {
        const refId = `OPENING-STOCK-${Date.now()}`;
        await tx.ledgerEntry.create({
          data: {
            clinicId,
            account: inventoryAcct.name,
            accountId: inventoryAcct.id,
            type: 'DEBIT',
            amount,
            refType: 'OPENING_STOCK_IMPORT',
            refId,
            note: `Opening stock import (${normalized.length} items)`
          }
        });
        await tx.ledgerEntry.create({
          data: {
            clinicId,
            account: creditAcct.name,
            accountId: creditAcct.id,
            type: 'CREDIT',
            amount,
            refType: 'OPENING_STOCK_IMPORT',
            refId,
            note: `Opening stock balancing entry (${normalized.length} items)`
          }
        });
      }

      return { importedCount: imported.length, imported, ledgerAmount: amount, creditAccount: creditAcct.name };
    });

    return res.json({
      success: true,
      dryRun: false,
      summary: {
        rows: normalized.length,
        importedCount: result.importedCount,
        totalStockValue: Number(totalStockValue.toFixed(2)),
        ledgerPosted: {
          debitAccount: 'Inventory',
          creditAccount: result.creditAccount,
          amount: result.ledgerAmount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

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

// GET /products/:id/batches - list stock batches for a product
router.get('/products/:id/batches', checkPermission('pharmacy', 'read'), async (req, res, next) => {
  try {
    const productId = req.params.id;
    // Use product relation include to ensure we fetch batches tied to the product
    const product = await prisma.pharmacyProduct.findUnique({ where: { id: productId }, include: { batches: { orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }] } } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const batches = product.batches || [];
    // If debug flag provided, also return direct query results to help debugging
    if (req.query.debug === '1') {
      const direct = await prisma.stockBatch.findMany({ where: { productId }, orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }] });
      return res.json({ success: true, data: batches, debug: { viaRelation: batches.length, directQuery: direct.length, direct } });
    }
    res.json({ success: true, data: batches });
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

    // helper to ensure account exists
    async function ensureAccount(name, type = null) {
      let a = await prisma.account.findFirst({ where: { clinicId: req.user.clinicId, name } });
      if (!a) a = await prisma.account.create({ data: { clinicId: req.user.clinicId, name, type: type || undefined, createdById: req.user.id } });
      return a;
    }

    // PURCHASE or ADJUSTMENT -> create a new batch
    if (type === 'PURCHASE' || type === 'ADJUSTMENT') {
      // create batch first
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

      // Ensure ledger accounts exist for Inventory and an adjustment account
      const inventoryAcct = await ensureAccount('Inventory', 'ASSET');
      const adjAcct = await ensureAccount('Inventory Adjustment', 'EXPENSE');

      // compute ledger amount from provided costPrice or product purchasePrice as fallback
      const unitCost = Number(costPrice || product.purchasePrice || 0);
      const ledgerAmount = Number((unitCost * qty) || 0);

      // perform product update, stock history and ledger writes in one transaction
      const ops = [
        prisma.pharmacyProduct.update({ where: { id: req.params.id }, data: { quantity: newQty } }),
        prisma.stockHistory.create({ data: { productId: req.params.id, batchId: batch.id, type, quantity: qty, previousQty, newQty, reference, notes, createdBy: req.user.id } })
      ];

      if (ledgerAmount > 0) {
        // determine credit account: if a purchase reference is provided and has supplier, use payable for that supplier
        let creditAcct = adjAcct;
        if (reference) {
          const pur = await prisma.purchase.findUnique({ where: { id: reference }, include: { supplier: true } }).catch(() => null);
          if (pur && pur.supplier) {
            const payableName = `Payable - ${pur.supplier.name}`;
            const payableAcct = await ensureAccount(payableName, 'LIABILITY');
            creditAcct = payableAcct;
          }
        }

        ops.push(prisma.ledgerEntry.create({ data: { clinicId: req.user.clinicId, account: inventoryAcct.name, accountId: inventoryAcct.id, type: 'DEBIT', amount: ledgerAmount, note: `${type} via stock update`, refType: 'STOCK', refId: batch.id } }));
        ops.push(prisma.ledgerEntry.create({ data: { clinicId: req.user.clinicId, account: creditAcct.name, accountId: creditAcct.id, type: 'CREDIT', amount: ledgerAmount, note: `${type} via stock update`, refType: 'STOCK', refId: batch.id } }));
      }

      const results = await prisma.$transaction(ops);
      const updatedProduct = results[0];
      const history = results[1];

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

      // Create ledger entries for stock decrease (if applicable)
      try {
        // ledger amount based on product purchase price fallback
        const unitCost = Number(product.purchasePrice || 0);
        const ledgerAmount = Number(unitCost * qty) || 0;
        if (ledgerAmount > 0) {
          const inventoryAcct = await ensureAccount('Inventory', 'ASSET');

          // determine debit account
          let debitAcct = null;
          if (type === 'SALE') {
            debitAcct = await ensureAccount('Cost of Goods Sold', 'EXPENSE');
          } else if (type === 'RETURN' && reference) {
            // try to resolve a purchase reference to tie to supplier payable
            const pur = await prisma.purchase.findUnique({ where: { id: reference }, include: { supplier: true } }).catch(() => null);
            if (pur && pur.supplier) {
              const payableName = `Payable - ${pur.supplier.name}`;
              debitAcct = await ensureAccount(payableName, 'LIABILITY');
            }
          }
          if (!debitAcct) debitAcct = await ensureAccount('Inventory Adjustment', 'EXPENSE');

          await prisma.$transaction([
            prisma.ledgerEntry.create({ data: { clinicId: req.user.clinicId, account: inventoryAcct.name, accountId: inventoryAcct.id, type: 'CREDIT', amount: ledgerAmount, note: `${type} via stock update`, refType: 'STOCK', refId: req.params.id } }),
            prisma.ledgerEntry.create({ data: { clinicId: req.user.clinicId, account: debitAcct.name, accountId: debitAcct.id, type: 'DEBIT', amount: ledgerAmount, note: `${type} via stock update`, refType: 'STOCK', refId: req.params.id } })
          ]).catch(() => null);
        }
      } catch (e) {
        // non-fatal: continue even if ledger write fails
        console.warn('Failed to create ledger entries for stock decrease', e);
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
