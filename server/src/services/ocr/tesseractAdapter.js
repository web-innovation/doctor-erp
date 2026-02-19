import fs from 'fs';
import path from 'path';
// Placeholder tesseract adapter. For MVP this will run simple OCR or return raw text.
// In production, integrate node-tesseract-ocr or other libs and improve table extraction.

async function parse(filePath) {
  // Minimal implementation: return a stub parsed object with rawText field.
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    // Not a text file — in real impl run tesseract OCR here
    raw = '';
  }

  // Return a basic parsed structure. Frontend will allow edits.
  return {
    provider: 'tesseract',
    rawText: raw,
    items: [],
    invoiceNo: null,
    invoiceDate: null,
    subtotal: null,
    taxAmount: null,
    totalAmount: null,
    warnings: ['Tesseract adapter is a placeholder — no line-item extraction yet']
  };
}

export default { parse };
