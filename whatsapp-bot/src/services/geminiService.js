import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are DocClinic's WhatsApp assistant for a medical clinic. 
You help with:
- Booking appointments
- Checking medicine stock
- Answering general clinic queries
- Processing payment images
- Updating pharmacy stock from bill images

Be concise, friendly, and professional. Use simple language.
If asked about medical advice, always recommend consulting the doctor.`;

export const geminiService = {
  // Classify user intent
  async classifyIntent(message) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `Classify the following message into one of these intents:
      - BOOK_APPOINTMENT: User wants to book/schedule an appointment
      - CHECK_STOCK: User asking about medicine availability/stock
      - APPOINTMENT_STATUS: User checking their appointment status
      - PRESCRIPTION: User wants their prescription
      - GREETING: Simple greeting/hello
      - GENERAL_QUERY: General question about clinic
      - OTHER: Anything else

      Also extract any relevant entities like medicine name, date, etc.

      Message: "${message}"

      Respond in JSON format:
      { "type": "INTENT_TYPE", "medicine": "extracted medicine if any", "date": "extracted date if any" }`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { type: 'OTHER' };
    } catch (error) {
      console.error('Gemini intent classification error:', error);
      return { type: 'OTHER' };
    }
  },

  // Generate contextual response
  async generateResponse(message, phone) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `${SYSTEM_PROMPT}

User message: "${message}"

Provide a helpful, concise response. If you need more information to help, ask for it.
Keep response under 200 words. Use WhatsApp formatting (*bold*, _italic_).`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini response generation error:', error);
      return "I'm having trouble understanding. Could you try rephrasing or use /help for available commands?";
    }
  },

  // Analyze payment image
  async analyzePaymentImage(imageData) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      
      const prompt = `Analyze this payment screenshot/receipt and extract:
      1. Payment amount (number only)
      2. Payment method (UPI/Cash/Card/Bank Transfer)
      3. Transaction reference/ID if visible
      4. Date if visible

      Respond in JSON format:
      { "amount": 1000, "method": "UPI", "reference": "ABC123", "date": "2024-01-15" }
      
      If you cannot determine a field, use null.`;

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Payment image analysis error:', error);
      return null;
    }
  },

  // Analyze bill image for stock update
  async analyzeBillImage(imageData) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      
      const prompt = `Analyze this purchase bill/invoice for pharmacy stock and extract all products with their quantities.

      For each product, extract:
      - Product name/code
      - Quantity purchased
      - Rate/price if visible
      - Batch number if visible
      - Expiry date if visible

      Respond in JSON format:
      {
        "products": [
          { "name": "Paracetamol 500mg", "quantity": 100, "rate": 2.5, "batch": "B123", "expiry": "2025-12" },
          ...
        ],
        "totalAmount": 5000,
        "invoiceNo": "INV-001",
        "supplier": "ABC Distributors"
      }`;

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Bill image analysis error:', error);
      return null;
    }
  }
};
