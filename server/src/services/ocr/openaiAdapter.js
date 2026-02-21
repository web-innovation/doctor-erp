import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 4000);
const RETRY_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_RETRY_MAX_OUTPUT_TOKENS || 7000);

if (!KEY) {
  // do not throw during import; parse() will error if key missing
}

const _client = new OpenAI({ apiKey: KEY });

function sanitizeModelOutput(out) {
  if (!out || typeof out !== 'string') return '';
  const fence = out.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) return fence[1].trim();
  const firstObj = out.indexOf('{');
  const lastObj = out.lastIndexOf('}');
  const firstArr = out.indexOf('[');
  const lastArr = out.lastIndexOf(']');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) return out.slice(firstObj, lastObj + 1).trim();
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) return out.slice(firstArr, lastArr + 1).trim();
  return out.trim();
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').replace(/[^\d.+-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeParsedInvoice(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const roundOffCandidates = [
    parsed.roundOff,
    parsed.round_off,
    parsed?.totals?.roundOff,
    parsed?.totals?.round_off,
    parsed?.totals?.roundoff
  ];
  let normalizedRoundOff = null;
  for (const candidate of roundOffCandidates) {
    const maybe = parseNullableNumber(candidate);
    if (maybe !== null) {
      normalizedRoundOff = maybe;
      break;
    }
  }
  return {
    ...parsed,
    roundOff: normalizedRoundOff
  };
}

async function callOpenAIWithText(prompt) {
  if (!KEY) throw new Error('OPENAI_API_KEY not set. Set OPENAI_API_KEY in environment.');
  try {
    console.log('[openaiAdapter] calling OpenAI model', MODEL, 'promptLen=', (prompt || '').length);
    const res = await _client.responses.create({
      model: MODEL,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      max_output_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      text: { format: { type: 'json_object' } }
    });
    // log keys
    try { console.log('[openaiAdapter] OpenAI raw response keys:', Object.keys(res || {})); } catch (e) {}
    const textOut = res?.output_text || '';
    if (typeof textOut !== 'string') throw new Error('unexpected response shape from OpenAI');
    console.log('[openaiAdapter] OpenAI returned text length=', textOut.length, 'preview=', textOut.slice(0,500).replace(/\n/g,' '));
    return textOut;
  } catch (e) {
    console.error('[openaiAdapter] OpenAI client error', e?.message || e);
    throw new Error(`OpenAI client error: ${e?.message || e}`);
  }
}

function makeExtractionPromptForText(ocrText) {
  return `You are an assistant that extracts invoice data and prepares a ledger review entry.\nReturn JSON only with this structure:\n{\n  invoiceNo: string|null,\n  invoiceDate: ISO yyyy-mm-dd|null,\n  dueDate: ISO yyyy-mm-dd|null,\n  refNo: string|null,\n  pharmacy_details: { name, address, phone, email, gstin, dl_no },\n  buyer_details: { name, address, phone, email, gstin, dl_no },\n  items: [{\n    sr_no: integer|null,\n    hsn_code: string|null,\n    description: string,\n    pack: string|null,\n    manufacturer: string|null,\n    qty: number,\n    free: number|null,\n    mrp: number|null,\n    rate: number|null,\n    unitPrice: number|null,\n    discount_percent: number|null,\n    gst_percent: number|null,\n    lineTotal: number|null,\n    amount: number|null,\n    batchNumber: string|null,\n    expiryDate: ISO yyyy-mm-dd|null\n  }],\n  tax_summary: [{ gst_percent, taxable_amount, sgst_amount, cgst_amount, igst_amount, tax_amount }],\n  subtotal: number|null,\n  taxAmount: number|null,\n  roundOff: number|null,\n  totalAmount: number|null,\n  totals: { sub_total, discount, cgst_igst, sgst, round_off, net_amount, total_quantity },\n  bank_details: { bank_name, account_no, ifsc_code },\n  terms_conditions: string[],\n  ledgerEntry: { debitAccount, creditAccount, debitAmount, creditAmount, narration }\n}\n\nIf a field is not present in the invoice, return null (or [] for arrays).\nIf any item does not have a batchNumber or expiryDate, return null for those fields.\n\nInput text:\n\n${ocrText}\n\nRespond with JSON only.`;
}

function makeExtractionPromptForImageBase64() {
  return `You are an assistant that extracts invoice data and prepares a ledger review entry.\nExtract and return JSON only with this structure:\n{\n  invoiceNo: string|null,\n  invoiceDate: ISO yyyy-mm-dd|null,\n  dueDate: ISO yyyy-mm-dd|null,\n  refNo: string|null,\n  pharmacy_details: { name, address, phone, email, gstin, dl_no },\n  buyer_details: { name, address, phone, email, gstin, dl_no },\n  items: [{\n    sr_no: integer|null,\n    hsn_code: string|null,\n    description: string,\n    pack: string|null,\n    manufacturer: string|null,\n    qty: number,\n    free: number|null,\n    mrp: number|null,\n    rate: number|null,\n    unitPrice: number|null,\n    discount_percent: number|null,\n    gst_percent: number|null,\n    lineTotal: number|null,\n    amount: number|null,\n    batchNumber: string|null,\n    expiryDate: ISO yyyy-mm-dd|null\n  }],\n  tax_summary: [{ gst_percent, taxable_amount, sgst_amount, cgst_amount, igst_amount, tax_amount }],\n  subtotal: number|null,\n  taxAmount: number|null,\n  roundOff: number|null,\n  totalAmount: number|null,\n  totals: { sub_total, discount, cgst_igst, sgst, round_off, net_amount, total_quantity },\n  bank_details: { bank_name, account_no, ifsc_code },\n  terms_conditions: string[],\n  ledgerEntry: { debitAccount, creditAccount, debitAmount, creditAmount, narration }\n}\nIf a field is not present, return null (or [] for arrays).\nDo not include markdown, prose, or code fences.`;
}

async function callOpenAIWithImageBase64(prompt, b64, mimeType, maxOutputTokens = MAX_OUTPUT_TOKENS) {
  if (!KEY) throw new Error('OPENAI_API_KEY not set. Set OPENAI_API_KEY in environment.');
  try {
    console.log('[openaiAdapter] calling OpenAI model', 'gpt-4.1-mini', 'imageBase64Len=', (b64 || '').length);
    const res = await _client.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: `data:${mimeType};base64,${b64}` }
          ]
        }
      ],
      max_output_tokens: maxOutputTokens,
      temperature: 0,
      text: { format: { type: 'json_object' } }
    });
    try { console.log('[openaiAdapter] OpenAI raw response keys:', Object.keys(res || {})); } catch (e) {}
    const textOut = res?.output_text || '';
    if (typeof textOut !== 'string') throw new Error('unexpected response shape from OpenAI');
    console.log('[openaiAdapter] OpenAI returned image text length=', textOut.length, 'preview=', textOut.slice(0,500).replace(/\n/g,' '));
    return textOut;
  } catch (e) {
    console.error('[openaiAdapter] OpenAI image client error', e?.message || e);
    throw new Error(`OpenAI image client error: ${e?.message || e}`);
  }
}

export async function parse(filePath) {
  if (!KEY) throw new Error('OPENAI_API_KEY not set. Set OPENAI_API_KEY in environment.');

  const ext = path.extname(filePath).toLowerCase();
  const textExts = ['.txt', '.md', '.json'];
  if (textExts.includes(ext)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const prompt = makeExtractionPromptForText(raw);
    console.log('[openaiAdapter] text prompt length=', prompt.length, 'file=', filePath);
    const out = await callOpenAIWithText(prompt);
    console.log('[openaiAdapter] OpenAI output preview (text):', (out || '').slice(0,1000).replace(/\n/g,' '));
    const cleaned = sanitizeModelOutput(out);
    try { return normalizeParsedInvoice(JSON.parse(cleaned)); } catch (e) { console.error('[openaiAdapter] JSON parse failed for OpenAI text output', e?.message || e); return { items: [], invoiceNo: null, invoiceDate: null, subtotal: null, taxAmount: null, roundOff: null, totalAmount: null, ledgerEntry: null, warnings: ['OpenAI did not return JSON', out] }; }
  }

  const b = await fs.promises.readFile(filePath);
  const b64 = b.toString('base64');
  const prompt = makeExtractionPromptForImageBase64();
  const mimeByExt = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  const mimeType = mimeByExt[ext] || 'image/png';
  console.log('[openaiAdapter] sending base64 image to OpenAI, base64Len=', b64.length, 'file=', filePath);
  const out = await callOpenAIWithImageBase64(prompt, b64, mimeType, MAX_OUTPUT_TOKENS);
  console.log('[openaiAdapter] OpenAI output preview (image):', (out || '').slice(0,1000).replace(/\n/g,' '));
  const cleanedImg = sanitizeModelOutput(out);
  try {
    return normalizeParsedInvoice(JSON.parse(cleanedImg));
  } catch (e) {
    console.error('[openaiAdapter] JSON parse failed for OpenAI image output (attempt 1)', e?.message || e);
    const compactPrompt = `${prompt}\nReturn compact minified JSON in a single line and ensure it is complete and valid.`;
    console.log('[openaiAdapter] retrying image extraction with compact JSON instruction');
    const retryOut = await callOpenAIWithImageBase64(compactPrompt, b64, mimeType, RETRY_MAX_OUTPUT_TOKENS);
    const retryCleaned = sanitizeModelOutput(retryOut);
    try {
      return normalizeParsedInvoice(JSON.parse(retryCleaned));
    } catch (retryErr) {
      console.error('[openaiAdapter] JSON parse failed for OpenAI image output (attempt 2)', retryErr?.message || retryErr);
      return { items: [], invoiceNo: null, invoiceDate: null, subtotal: null, taxAmount: null, roundOff: null, totalAmount: null, ledgerEntry: null, warnings: ['OpenAI did not return JSON', retryOut] };
    }
  }
}

export default { parse };
