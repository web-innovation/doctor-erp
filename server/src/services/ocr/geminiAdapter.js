import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!KEY) {
  // do not throw during import; parse() will error if key missing
}

// Initialize Google GenAI client using the configured key
const _aiClient = new GoogleGenAI({ apiKey: KEY });

async function callGeminiWithText(text) {
  // Use @google/genai client to call the model. This mirrors the example provided by the user.
  try {
    console.log('[geminiAdapter] calling GenAI model', MODEL, 'payloadLen=', (text || '').length);
    const res = await _aiClient.models.generateContent({ model: MODEL, contents: text });
    // Log a compact summary of the raw response for debugging
    try { console.log('[geminiAdapter] GenAI raw response keys:', Object.keys(res || {})); } catch (e) { /* ignore */ }
    // Normalize output: the library may expose text on different properties depending on version
    // Try common locations: res.text, res.outputText, res?.candidates
    if (!res) throw new Error('empty response from genai client');
    const textOut = res.text || res.outputText || (res?.candidates?.[0]?.content?.map(c => c.text).join('')) || (Array.isArray(res?.outputs) ? (res.outputs[0]?.content || '') : '');
    if (typeof textOut !== 'string') {
      console.error('[geminiAdapter] unexpected response shape from GenAI model', JSON.stringify(Object.keys(res || {})));
      throw new Error('unexpected response shape from genai client');
    }
    console.log('[geminiAdapter] GenAI returned text length=', (textOut || '').length, 'preview=', (textOut || '').slice(0,500).replace(/\n/g,' '));
    return textOut;
  } catch (e) {
    console.error('[geminiAdapter] GenAI client error', e?.message || e);
    // Re-throw with a descriptive prefix so upstream logging is clear
    throw new Error(`GenAI client error: ${e?.message || e}`);
  }
}

// Helper: sanitize model text response to extract JSON payload
function sanitizeModelOutput(out) {
  if (!out || typeof out !== 'string') return '';
  // 1) If there's a fenced code block like ```json ... ``` extract inner content
  const fence = out.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) return fence[1].trim();

  // 2) Otherwise try to extract first JSON object or array by finding braces
  const firstObj = out.indexOf('{');
  const lastObj = out.lastIndexOf('}');
  const firstArr = out.indexOf('[');
  const lastArr = out.lastIndexOf(']');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    return out.slice(firstObj, lastObj + 1).trim();
  }
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    return out.slice(firstArr, lastArr + 1).trim();
  }

  // 3) fallback: return trimmed output (may not parse)
  return out.trim();
}

function makeExtractionPromptForText(ocrText) {
  return `You are an assistant that extracts invoice data and prepares a ledger review entry.
Return JSON only with fields: invoiceNo (string|null), invoiceDate (ISO yyyy-mm-dd|null), items: [{description, qty (integer), unitPrice (number), lineTotal (number), batchNumber (string|null), expiryDate (ISO yyyy-mm-dd|null)}], subtotal (number|null), taxAmount (number|null), totalAmount (number|null), ledgerEntry: {debitAccount, creditAccount, debitAmount, creditAmount, narration}.

If any item does not have a batchNumber or expiryDate, return null for those fields.

Input text:\n\n${ocrText}\n\nRespond with JSON only.`;
}

function makeExtractionPromptForImageBase64(b64) {
  return `You are an assistant that extracts invoice data and prepares a ledger review entry.
The invoice is provided as base64 PNG/JPEG/PDF. If you can decode the image, extract and return JSON only with fields: invoiceNo (string|null), invoiceDate (ISO yyyy-mm-dd|null), items: [{description, qty (integer), unitPrice (number), lineTotal (number), batchNumber (string|null), expiryDate (ISO yyyy-mm-dd|null)}], subtotal (number|null), taxAmount (number|null), totalAmount (number|null), ledgerEntry: {debitAccount, creditAccount, debitAmount, creditAmount, narration}.
If you cannot decode images with this API, reply with the literal string: CANNOT_DECODE_IMAGE.
Begin base64:\n${b64}\nEnd base64.`;
}

export async function parse(filePath) {
  if (!KEY) throw new Error('GEMINI_API_KEY not set. Set GEMINI_API_KEY in environment.');

  const ext = path.extname(filePath).toLowerCase();
  const textExts = ['.txt', '.md', '.json'];
  if (textExts.includes(ext)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const prompt = makeExtractionPromptForText(raw);
    console.log('[geminiAdapter] text prompt length=', prompt.length, 'file=', filePath);
    const out = await callGeminiWithText(prompt);
    console.log('[geminiAdapter] GenAI output preview (text):', (out || '').slice(0,1000).replace(/\n/g,' '));
    // sanitize model output (strip fences or surrounding text) before parsing
    const cleaned = sanitizeModelOutput(out);
    console.log('[geminiAdapter] cleaned output preview:', (cleaned || '').slice(0,1000).replace(/\n/g,' '));
    try { return JSON.parse(cleaned); } catch (e) { console.error('[geminiAdapter] JSON parse failed for GenAI text output', e?.message || e); return { items: [], invoiceNo: null, invoiceDate: null, subtotal: null, taxAmount: null, totalAmount: null, ledgerEntry: null, warnings: ['Gemini did not return JSON', out] }; }
  }

  // For binary files, send base64 in prompt. May fail if model/account doesn't accept images via this endpoint.
  const b = await fs.promises.readFile(filePath);
  const b64 = b.toString('base64');
  const prompt = makeExtractionPromptForImageBase64(b64);
  console.log('[geminiAdapter] sending base64 image to GenAI, base64Len=', b64.length, 'file=', filePath);
  console.log('[geminiAdapter] base64 preview=', b64.slice(0,200));
  const out = await callGeminiWithText(prompt);
  console.log('[geminiAdapter] GenAI output preview (image):', (out || '').slice(0,1000).replace(/\n/g,' '));
  if (out.trim().startsWith('CANNOT_DECODE_IMAGE')) {
    return { items: [], invoiceNo: null, invoiceDate: null, subtotal: null, taxAmount: null, totalAmount: null, ledgerEntry: null, warnings: ['Gemini cannot decode images with current configuration; provide OCR text or enable vision model'] };
  }
  // sanitize model output before parsing
  const cleanedImg = sanitizeModelOutput(out);
  console.log('[geminiAdapter] cleaned image output preview:', (cleanedImg || '').slice(0,1000).replace(/\n/g,' '));
  try { return JSON.parse(cleanedImg); } catch (e) { console.error('[geminiAdapter] JSON parse failed for GenAI image output', e?.message || e); return { items: [], invoiceNo: null, invoiceDate: null, subtotal: null, taxAmount: null, totalAmount: null, ledgerEntry: null, warnings: ['Gemini did not return JSON', out] }; }
}

export default { parse };
