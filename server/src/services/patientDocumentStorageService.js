import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_MODE =
  (process.env.PATIENT_DOCUMENT_STORAGE || process.env.PURCHASE_UPLOAD_STORAGE || '').toLowerCase() ||
  ((process.env.S3_BUCKET && process.env.AWS_REGION) ? 's3' : 'local');
const S3_BUCKET = process.env.S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL || '';
const LOCAL_ROOT = path.resolve(__dirname, '../../uploads/patient-documents');

let s3Client = null;
if (STORAGE_MODE === 's3') {
  s3Client = new S3Client({ region: AWS_REGION });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeSegment(value, fallback = 'unknown') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw
    .replace(/[^\w\-./]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.\./g, '.')
    .slice(0, 120) || fallback;
}

function s3UrlForKey(key) {
  const cleanKey = key.split(path.sep).join('/');
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${cleanKey}`;
  }
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${cleanKey}`;
}

function buildStorageKey({ clinicId, patientId, prescriptionId, category, originalName }) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const ext = path.extname(originalName || '') || '.bin';
  const base = path.basename(originalName || `document${ext}`, ext);
  const fileName = `${stamp}-${sanitizeSegment(base, 'document')}${ext}`;

  const clinicSeg = sanitizeSegment(clinicId, 'clinic');
  const patientSeg = sanitizeSegment(patientId, 'patient');
  const categorySeg = sanitizeSegment((category || 'document').toLowerCase(), 'document');
  const prescriptionSeg = prescriptionId ? sanitizeSegment(prescriptionId, 'prescription') : 'general';

  return `medicaldoc/patient/${clinicSeg}/${patientSeg}/${datePart}/${prescriptionSeg}/${categorySeg}/${fileName}`;
}

export function getLocalPatientDocumentRoot() {
  return LOCAL_ROOT;
}

export function getPatientDocumentStorageMode() {
  return STORAGE_MODE;
}

export async function persistPatientDocumentUpload({
  buffer,
  mimeType,
  originalName,
  clinicId,
  patientId,
  prescriptionId = null,
  category = null,
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Document buffer is required');
  }
  const key = buildStorageKey({ clinicId, patientId, prescriptionId, category, originalName });

  if (STORAGE_MODE === 's3') {
    if (!s3Client || !S3_BUCKET) {
      throw new Error('S3 storage selected but S3 client/bucket is not configured');
    }
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
    }));
    return {
      provider: 's3',
      key,
      path: s3UrlForKey(key),
    };
  }

  ensureDir(LOCAL_ROOT);
  const localRelative = key.replace(/^medicaldoc\/patient\//, '');
  const localPath = path.join(LOCAL_ROOT, localRelative);
  ensureDir(path.dirname(localPath));
  fs.writeFileSync(localPath, buffer);

  return {
    provider: 'local',
    key,
    path: `/uploads/patient-documents/${localRelative.split(path.sep).join('/')}`,
  };
}
