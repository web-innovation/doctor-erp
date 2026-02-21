import fs from 'fs';
import os from 'os';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const STORAGE_MODE = (process.env.PURCHASE_UPLOAD_STORAGE || '').toLowerCase() || ((process.env.S3_BUCKET && process.env.AWS_REGION) ? 's3' : 'local');
const S3_BUCKET = process.env.S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL || '';
const LOCAL_ROOT = process.env.PURCHASE_UPLOAD_BASE_DIR || path.join(os.homedir(), '.docclinic-uploads', 'purchases');
const TEMP_DIR = path.join(LOCAL_ROOT, '_tmp');

let _s3Client = null;
if (STORAGE_MODE === 's3') {
  _s3Client = new S3Client({ region: AWS_REGION });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeSegment(value, fallback = 'unknown') {
  const raw = `${value || ''}`.trim();
  if (!raw) return fallback;
  return raw
    .replace(/[^\w\-./]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.\./g, '.')
    .slice(0, 120) || fallback;
}

function normalizeDatePart(isoDateLike) {
  const d = isoDateLike ? new Date(isoDateLike) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function buildFinalKey({ clinicId, supplierId, invoiceDate, invoiceNo, originalName, uploadId }) {
  const ext = path.extname(originalName || '') || '.bin';
  const base = path.basename(originalName || `invoice-${uploadId || Date.now()}${ext}`, ext);
  const fileName = `${sanitizeSegment(base, 'invoice')}-${Date.now()}${ext}`;
  const clinicSeg = sanitizeSegment(clinicId, 'clinic');
  const supplierSeg = sanitizeSegment(supplierId, 'unknown-supplier');
  const dateSeg = normalizeDatePart(invoiceDate);
  const invSeg = sanitizeSegment(invoiceNo, 'invoice');
  return `${clinicSeg}/${supplierSeg}/${dateSeg}-${invSeg}/${fileName}`;
}

function contentTypeForExt(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function s3UrlForKey(key) {
  const cleanKey = key.split(path.sep).join('/');
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/+$/,'')}/${cleanKey}`;
  }
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${cleanKey}`;
}

export function getPurchaseUploadMode() {
  return STORAGE_MODE;
}

export function getLocalPurchaseUploadRoot() {
  return LOCAL_ROOT;
}

export function ensurePurchaseUploadTempDir() {
  ensureDir(TEMP_DIR);
  return TEMP_DIR;
}

export async function persistPurchaseUpload({
  tempFilePath,
  clinicId,
  supplierId,
  invoiceDate,
  invoiceNo,
  originalName,
  uploadId
}) {
  if (!tempFilePath) throw new Error('tempFilePath is required');
  if (!fs.existsSync(tempFilePath)) throw new Error(`Temp upload not found: ${tempFilePath}`);

  const finalKey = buildFinalKey({ clinicId, supplierId, invoiceDate, invoiceNo, originalName, uploadId });

  if (STORAGE_MODE === 's3') {
    if (!_s3Client || !S3_BUCKET) throw new Error('S3 storage selected but S3 client/bucket is not configured');
    const body = fs.createReadStream(tempFilePath);
    await _s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: finalKey,
      Body: body,
      ContentType: contentTypeForExt(originalName || tempFilePath)
    }));
    try { fs.unlinkSync(tempFilePath); } catch (e) {}
    return {
      provider: 's3',
      key: finalKey,
      path: s3UrlForKey(finalKey)
    };
  }

  const targetPath = path.join(LOCAL_ROOT, finalKey);
  ensureDir(path.dirname(targetPath));
  await fs.promises.rename(tempFilePath, targetPath);
  return {
    provider: 'local',
    key: finalKey,
    path: `/uploads/purchases/${finalKey.split(path.sep).join('/')}`
  };
}

