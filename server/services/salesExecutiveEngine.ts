import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";

export interface SalesResponseResult {
  message: string;
  source: "AI" | "Fallback";
}

/**
 * Generate the next sales executive response to move the lead closer to conversion.
 */
export async function generateSalesResponse(
  businessProfile: string,
  leadMemory: string,
  leadStage: string,
  intent: string,
  missingFieldsStr: string,
  customerMessage: string,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<SalesResponseResult> {
  let apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  let clientModel = modelOverride || "gemini-3.5-flash";

  if (!apiKey) {
    console.warn("[Sales Executive Engine] No Gemini API key available. Using fallback template generator.");
    return {
      message: getFallbackSalesResponse(intent, missingFieldsStr, customerMessage),
      source: "Fallback"
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-sales-executive-engine',
        }
      }
    });

    const systemInstruction = `You are LeadSmart AI, an expert, professional human-like sales executive working for the business owner.
Your goal is NOT simply to answer questions. Your ultimate goal is to move the lead toward conversion (quotation, meeting, site visit, demo/call booking, or direct purchase).

RULES:
1. Never repeat questions that have already been answered.
2. Never repeat company or business information unnecessarily.
3. Ask only ONE question at a time to guide the conversation step-by-step.
4. Always move the conversation forward. Look at the missing items as opportunities to guide them.
5. Review the Lead Memory fully to avoid redundancies.
6. If critical qualification fields are missing, ask for the highest-priority missing field first in a natural, polite sales manner.
7. If all required qualification fields are completed, move toward the next logical commitment (e.g. scheduling a call/meeting, preparing a formal quote, booking a walkthrough, or setting up a personal consultation).
8. Be warm, conversational, encouraging, and enthusiastic yet professional.
9. Sound like an expert human sales manager, never like a machine, AI, chatbot or robotic system.
10. KEEP THE RESPONSE STRICTLY UNDER 80 WORDS (usually 1-3 highly punchy sentences).
11. NEVER mention internal terms like "lead stage", "intent scoring", "qualification checkpoint", "missing fields list", "memory state", or "AI system".

Your output must be the generated message text directly. Do not include markdown wraps or conversation headers.`;

    const userPrompt = `
Business Profile:
${businessProfile || "A professional retail and commercial provider."}

Lead Memory:
${leadMemory || "No raw chat logs yet."}

Current Lead Stage:
${leadStage || "NEW"}

Detected Intent:
${intent || "Inquiry Only"}

Missing Fields:
${missingFieldsStr || "None"}

Customer Message:
${customerMessage}

Generate the best next sales response.
`;

    const response = await safeGenerateContent(ai, {
      model: clientModel,
      contents: [
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.25,
        responseMimeType: "text/plain"
      }
    });

    if (response?.text) {
      return {
        message: response.text.trim(),
        source: "AI"
      };
    }
  } catch (err) {
    console.error("[Sales Executive Engine] Gemini execution failed, reverting to local fallback:", err);
  }

  return {
    message: getFallbackSalesResponse(intent, missingFieldsStr, customerMessage),
    source: "Fallback"
  };
}

/**
 * Procedural fallback builder for Sales Responses when Gemini is missing/fails.
 */
function getFallbackSalesResponse(intent: string, missingFieldsStr: string, customerMessage: string): string {
  const lowMsg = customerMessage.toLowerCase();
  
  // High Priority parsing
  if (missingFieldsStr.toLowerCase().includes("budget") || lowMsg.includes("price") || lowMsg.includes("cost") || lowMsg.includes("how much")) {
    return "We'd love to put together custom pricing for you! To give you an accurate estimate, could you let us know your approximate budget or preferred price range?";
  }
  
  if (missingFieldsStr.toLowerCase().includes("location") || lowMsg.includes("deliver") || lowMsg.includes("ship")) {
    return "We'd be glad to arrange fast shipping for you. Could you share your delivery location or pin code so we can check delivery times and shipping rates?";
  }

  if (missingFieldsStr.toLowerCase().includes("quantity")) {
    return "That sounds wonderful! To make sure we give you the best wholesale volume price, what quantity do you think you'll need for this order?";
  }

  if (missingFieldsStr.toLowerCase().includes("product") || missingFieldsStr.toLowerCase().includes("type")) {
    return "We have several custom configurations and styles available. What specific product or design option caught your eye today?";
  }

  // All filled or general conversion push
  return "That's great! Understood perfectly. Should we set up a quick 5-minute call tomorrow morning to walk you through the options, or would you like me to prepare a drafted quote right now?";
}
