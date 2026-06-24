import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";

// List of supported intents
export const SUPPORTED_INTENTS = [
  "GREETING",
  "PRODUCT_INQUIRY",
  "QUOTE_REQUEST",
  "PRICE_INQUIRY",
  "MOQ_INQUIRY",
  "PRODUCT_INFO",
  "FOLLOWUP_STATUS",
  "OBJECTION",
  "MEETING_REQUEST",
  "PURCHASE_READY",
  "GENERAL_QUESTION",
  "UNKNOWN"
] as const;

export type LeadIntentType = typeof SUPPORTED_INTENTS[number];

export interface IntentDetectionResult {
  intent: LeadIntentType;
  confidence: number;
}

/**
 * Detects the intent of a customer message using the Gemini API.
 */
export async function detectMessageIntent(messageText: string, clientId?: string): Promise<IntentDetectionResult> {
  if (!messageText || !messageText.trim()) {
    return { intent: "UNKNOWN", confidence: 0 };
  }

  // Retrieve API key
  let apiKey = process.env.GEMINI_API_KEY;
  let clientModel = "gemini-3.5-flash";

  if (clientId) {
    try {
      const clientInfo = await prisma.client.findUnique({
        where: { id: clientId }
      });
      if (clientInfo) {
        if (clientInfo.aiApiKey) {
          apiKey = clientInfo.aiApiKey;
        }
        if (clientInfo.aiModel) {
          clientModel = clientInfo.aiModel;
        }
      }
    } catch (err) {
      console.error("[Intent Detect] Error looking up custom client config:", err);
    }
  }

  if (!apiKey) {
    console.warn("[Intent Detect] No Gemini API Key configured. Defaulting to UNKNOWN.");
    return { intent: "UNKNOWN", confidence: 0 };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-intent-detector',
        },
        timeout: 120000,
      }
    });

    const systemInstruction = `You are an expert NLP classifier built for high-performance CRM customer message intent detection. 
Classify the following customer message into EXACTLY ONE of the supported intents listed below.

SUPPORTED INTENTS:
- GREETING: Hello, hi, standard pleasantries, checking if anyone is there, introducing oneself.
- PRODUCT_INQUIRY: Asking about product details, availability, variants, or general options.
- QUOTE_REQUEST: Explicitly asking for a formal quote, pricing pdf, estimation sheet, catalog with prices, or complete cost estimate of a specific volume.
- PRICE_INQUIRY: Asking what the price of an item is, "how much?", cost/budget expectations.
- MOQ_INQUIRY: Asking about Minimum Order Quantity (MOQ) requirements, pack sizes, bulk constraints.
- PRODUCT_INFO: Deep technical specifications, certification, safety data sheets, material composition questions.
- FOLLOWUP_STATUS: Inquiring about order status, shipping timeframe, tracking, "where is my order?", delivery updates.
- OBJECTION: Complaining about price being too high, lead time too long, or raising doubts about material/brand.
- MEETING_REQUEST: Requesting a phone call, Zoom meeting, site visit, or physical meeting arrangement.
- PURCHASE_READY: Showing direct intent to buy immediately, e.g., "Where to pay?", "Draft the invoice", "I want to buy now", "Send me bank coordinates".
- GENERAL_QUESTION: Questions about office hours, business address, country of operation, general company info.
- UNKNOWN: Out of domain, emojis only, unintelligible text, gibberish.

Your output must be strict JSON matching this structure:
{
  "intent": "INTENT_NAME",
  "confidence": <integer percentage from 0 to 100>
}
Only output the JSON. Do not include markdown formatting or extra commentary.`;

    const userPrompt = `Message: "${messageText}"`;

    const response = await safeGenerateContent(ai, {
      model: clientModel,
      contents: [
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { 
              type: Type.STRING,
              description: "The primary classified intent of the message (one of the supported intents)."
            },
            confidence: { 
              type: Type.INTEGER, 
              description: "The detection confidence percentage from 0 to 100."
            }
          },
          required: ["intent", "confidence"]
        }
      }
    });

    if (response?.text) {
      const parsed = JSON.parse(response.text.trim());
      // Validate that parsed intent is indeed supported
      let detected = String(parsed.intent).toUpperCase().trim() as LeadIntentType;
      if (!SUPPORTED_INTENTS.includes(detected as any)) {
        detected = "UNKNOWN";
      }
      return {
        intent: detected,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50
      };
    }
  } catch (err) {
    console.error("[Intent Detect Error] Failed to classify message using Gemini:", err);
  }

  return { intent: "UNKNOWN", confidence: 0 };
}

/**
 * Handles intent detection and database storage / lead profile updates for a customer message.
 */
export async function processAndSaveMessageIntent(leadId: string, messageText: string): Promise<IntentDetectionResult> {
  // 1. Fetch lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });

  if (!lead) {
    console.warn(`[Intent System] Lead ${leadId} not found, skipping storage.`);
    return { intent: "UNKNOWN", confidence: 0 };
  }

  // 2. Call Intent Engine
  const result = await detectMessageIntent(messageText, lead.clientId);

  try {
    // 3. Save to lead_intents table
    await prisma.leadIntent.create({
      data: {
        leadId,
        message: messageText,
        intent: result.intent,
        confidence: result.confidence
      }
    });

    // 4. Update Lead profile (latestIntent and intentHistory)
    const currentHistoryStr = lead.intentHistory || "[]";
    let history: string[] = [];
    try {
      history = JSON.parse(currentHistoryStr);
    } catch (_) {
      // If of format "GREETING, PRICE_INQUIRY" instead of JSON, split it
      if (typeof currentHistoryStr === "string" && currentHistoryStr.trim()) {
        history = currentHistoryStr.split(",").map(i => i.trim());
      }
    }

    // Append new intent
    history.push(result.intent);
    
    // Keep last 50 intents in history
    if (history.length > 50) {
      history.shift();
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        latestIntent: result.intent,
        intentHistory: JSON.stringify(history)
      }
    });

    console.log(`[Intent System] Successfully detected and stored intent '${result.intent}' for Lead: ${lead.name} (${lead.phoneNumber}) with confidence ${result.confidence}%`);
  } catch (dbErr) {
    console.error("[Intent System DB Error] Failed to save/update lead intent attributes:", dbErr);
  }

  return result;
}
