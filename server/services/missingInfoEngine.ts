import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";

export interface MissingInfoResult {
  missingFields: string[];
  nextRequiredField: string;
  nextQuestion: string;
  completionPercentage: number;
}

/**
 * Normalizes any business type string to one of our three core target industries:
 * "Packaging", "Real Estate", or "Jewellery".
 */
export function normalizeBusinessType(typeInput: string | null | undefined): "Packaging" | "Real Estate" | "Jewellery" {
  if (!typeInput) return "Jewellery"; // Default for Mukunda Jewellers

  const input = typeInput.toLowerCase();
  if (input.includes("pack") || input.includes("box") || input.includes("carton") || input.includes("manufactur")) {
    return "Packaging";
  }
  if (input.includes("real") || input.includes("est") || input.includes("property") || input.includes("apartment") || input.includes("home") || input.includes("land")) {
    return "Real Estate";
  }
  if (input.includes("jewel") || input.includes("gold") || input.includes("silver") || input.includes("diamond") || input.includes("gem") || input.includes("ornament")) {
    return "Jewellery";
  }

  // Fallback default
  return "Jewellery";
}

/**
 * Determines missing info, collected info, and the next best single question to ask.
 */
export async function analyzeMissingInformation(
  businessTypeRaw: string,
  leadStage: string,
  leadMemoryStr: string,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<MissingInfoResult> {
  const normalizedType = normalizeBusinessType(businessTypeRaw);

  // Retrieve default fallback keys
  let apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  let clientModel = modelOverride || "gemini-3.5-flash";

  if (!apiKey) {
    console.warn("[Missing Info Engine] No Gemini API key available. Returning blank default response.");
    return {
      missingFields: normalizedType === "Packaging" ? ["product", "quantity", "size", "location"] : 
                     normalizedType === "Real Estate" ? ["propertyType", "budget", "location", "purchaseTimeline"] :
                     ["product", "budget", "occasion", "purchaseDate"],
      nextRequiredField: normalizedType === "Packaging" ? "product" :
                         normalizedType === "Real Estate" ? "propertyType" : "product",
      nextQuestion: "How can we help you today?",
      completionPercentage: 0
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-missing-info-engine',
        },
        timeout: 120000,
      }
    });

    const systemInstruction = `You are LeadSmart AI Missing Information Engine.
Your job is NOT to answer the customer directly. Your job is exclusively to analyze conversation logs (Lead Memory) to audit a sales lead against a strict industry qualification checklist.

The industry requirements are:

1. For Packaging Businesses:
   Required Fields: "product", "quantity", "size", "location"

2. For Real Estate:
   Required Fields: "propertyType", "budget", "location", "purchaseTimeline"

3. For Jewellery:
   Required Fields: "product", "budget", "occasion", "purchaseDate"

RULES:
- Evaluate which of the 4 required fields for the user's business type have already been answered/provided in the Lead Memory, and which are still missing.
- Define "missingFields" as the array of fields that are still missing (use exact camelCase names from the list of 4 fields).
- State the "nextRequiredField" as the most critical/important missing field that should be collected next.
- Craft the "nextQuestion" as a single, friendly, highly professional, non-pushy WhatsApp or SMS sales question to ask the customer to obtain that single missing field. Ask for only ONE piece of missing information at a time.
- Avoid asking for any information already explicitly or implicitly provided in the chat history.
- Calculate the "completionPercentage" as the percentage representing how many of the 4 required fields have been successfully collected (e.g. 0 collected = 0%, 1 collected = 25%, 2 collected = 50%, 3 collected = 75%, all 4 collected = 100%).

OUTPUT FORMAT:
Your response must be strict JSON with the following exact structure:
{
  "missingFields": ["field1", "field2"],
  "nextRequiredField": "field1",
  "nextQuestion": "Could you let us know the...",
  "completionPercentage": 50
}
Do not include markdown wrappers or talk, return pure JSON.`;

    const userPrompt = `
Business Type:
${normalizedType}

Lead Stage:
${leadStage}

Lead Memory:
${leadMemoryStr || "No chat history logged yet."}
`;

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
            missingFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of fields still missing from the required checklist."
            },
            nextRequiredField: {
              type: Type.STRING,
              description: "The name of the next single required field we need to ask for right now."
            },
            nextQuestion: {
              type: Type.STRING,
              description: "A professional, personalized, and humble contextual follow-up question to collect that key parameter."
            },
            completionPercentage: {
              type: Type.INTEGER,
              description: "Completion score from 0, 25, 50, 75, to 100."
            }
          },
          required: ["missingFields", "nextRequiredField", "nextQuestion", "completionPercentage"]
        }
      }
    });

    if (response?.text) {
      const parsed = JSON.parse(response.text.trim());
      return {
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
        nextRequiredField: String(parsed.nextRequiredField || ""),
        nextQuestion: String(parsed.nextQuestion || ""),
        completionPercentage: typeof parsed.completionPercentage === "number" ? parsed.completionPercentage : 0
      };
    }
  } catch (err) {
    console.error("[Missing Info Engine Error] Failed to evaluate checklist via Gemini:", err);
  }

  // Safe fallback
  return {
    missingFields: normalizedType === "Packaging" ? ["product", "quantity", "size", "location"] : 
                   normalizedType === "Real Estate" ? ["propertyType", "budget", "location", "purchaseTimeline"] :
                   ["product", "budget", "occasion", "purchaseDate"],
    nextRequiredField: normalizedType === "Packaging" ? "product" :
                       normalizedType === "Real Estate" ? "propertyType" : "product",
    nextQuestion: "How can we help you today with your transaction details?",
    completionPercentage: 0
  };
}

/**
 * Convenience helper to evaluate missing info directly from database by pre-loading lead details.
 */
export async function analyzeLeadMissingInformation(leadId: string): Promise<MissingInfoResult & { resolvedBusinessType: string }> {
  // 1. Fetch Lead details with cumulative messages
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: {
        orderBy: { timestamp: "asc" }
      }
    }
  });

  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  // 2. Format lead messages memory representation
  const messagesStr = lead.messages.length > 0
    ? lead.messages.map(m => `[${m.direction}] ${m.timestamp.toISOString()}: ${m.content}`).join("\n")
    : "No chat history logged yet.";

  // 3. Obtain client's custom business type
  let businessTypeRaw = "Jewellery";
  let apiKey = process.env.GEMINI_API_KEY;
  let clientModel = "gemini-3.5-flash";

  try {
    const clientInfo = await prisma.client.findUnique({
      where: { id: lead.clientId }
    });
    if (clientInfo) {
      if (clientInfo.businessType) {
        businessTypeRaw = clientInfo.businessType;
      }
      if (clientInfo.aiApiKey) {
        apiKey = clientInfo.aiApiKey;
      }
      if (clientInfo.aiModel) {
        clientModel = clientInfo.aiModel;
      }
    }
  } catch (err) {
    console.error("[Missing Info Helper] Error loading client properties:", err);
  }

  const result = await analyzeMissingInformation(
    businessTypeRaw,
    lead.currentStage || "NEW",
    messagesStr,
    apiKey || undefined,
    clientModel
  );

  return {
    ...result,
    resolvedBusinessType: normalizeBusinessType(businessTypeRaw)
  };
}
