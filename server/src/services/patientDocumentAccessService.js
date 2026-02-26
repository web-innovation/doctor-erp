import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_BUCKET = process.env.S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const SIGN_TTL_SECONDS = Number(process.env.PATIENT_DOCUMENT_SIGNED_URL_TTL || 900);

let s3Client = null;
if (S3_BUCKET && AWS_REGION) {
  s3Client = new S3Client({ region: AWS_REGION });
}

function toS3KeyFromPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  if (filePath.startsWith('/uploads/')) return null;
  try {
    const u = new URL(filePath);
    const key = decodeURIComponent((u.pathname || '').replace(/^\/+/, ''));
    return key || null;
  } catch {
    return null;
  }
}

export async function buildPatientDocumentAccessUrl(filePath) {
  if (!filePath) return null;
  const key = toS3KeyFromPath(filePath);
  if (!key || !s3Client || !S3_BUCKET) return filePath;
  try {
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return await getSignedUrl(s3Client, cmd, { expiresIn: SIGN_TTL_SECONDS });
  } catch {
    return filePath;
  }
}

export async function attachAccessUrlToDocuments(docs = []) {
  return Promise.all((docs || []).map(async (doc) => ({
    ...doc,
    accessUrl: await buildPatientDocumentAccessUrl(doc.filePath),
  })));
}
