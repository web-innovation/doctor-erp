// Google Document AI adapter (skeleton).
// Requires Google credentials and processor configuration. This file provides a
// placeholder interface; implement actual Document AI calls when credentials are available.

async function parse(filePath, opts = {}) {
  // Expect opts to contain { projectId, location, processorId }
  try {
    // Try dynamic import so this module still works if @google-cloud/documentai is not installed
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').catch(() => ({}));
    if (!DocumentProcessorServiceClient) {
      return {
        provider: 'google_doc_ai',
        rawText: null,
        items: [],
        invoiceNo: null,
        invoiceDate: null,
        subtotal: null,
        taxAmount: null,
        totalAmount: null,
        warnings: ['@google-cloud/documentai not installed. Install package to enable Document AI.']
      };
    }

    const client = new DocumentProcessorServiceClient();
    const name = `projects/${opts.projectId}/locations/${opts.location}/processors/${opts.processorId}`;
    const fs = await import('fs');
    const fileBytes = fs.readFileSync(filePath).toString('base64');
    const request = {
      name,
      rawDocument: { content: fileBytes, mimeType: opts.mimeType || 'application/pdf' }
    };

    const [result] = await client.processDocument(request);
    // Basic normalization: return raw text and empty items. Detailed parsing should be added.
    const docText = result.document?.text || null;
    return {
      provider: 'google_doc_ai',
      rawText: docText,
      items: [],
      invoiceNo: null,
      invoiceDate: null,
      subtotal: null,
      taxAmount: null,
      totalAmount: null,
      providerResponse: result
    };
  } catch (err) {
    return {
      provider: 'google_doc_ai',
      rawText: null,
      items: [],
      invoiceNo: null,
      invoiceDate: null,
      subtotal: null,
      taxAmount: null,
      totalAmount: null,
      warnings: ['Document AI parse failed', String(err)]
    };
  }
}

export default { parse };
