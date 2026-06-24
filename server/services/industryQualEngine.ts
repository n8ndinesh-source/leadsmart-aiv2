import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";

export interface IndustryQualResult {
  industry: string;
  requiredFields: Array<{ field: string; question: string }>;
  recommendedFields: Array<{ field: string; question: string }>;
  leadScoringFactors: string[];
}

/**
 * Determines qualification requirements and scoring criteria based on custom business types and specifications.
 */
export async function analyzeQualificationSpecs(
  businessCategory: string,
  businessDescription: string,
  productsOrServices: string,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<IndustryQualResult> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  const clientModel = modelOverride || "gemini-3.5-flash";

  if (!apiKey) {
    console.warn("[Industry Qual Engine] No Gemini API key available. Returning baseline industry template.");
    return getFallbackQualSpecs(businessCategory);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-industry-qual-engine',
        },
        timeout: 120000,
      }
    });

    const systemInstruction = `You are LeadSmart AI Industry Qualification Engine.
Your job is to determine the qualification requirements based on the client's business type.
Analyze the business category, description, and products list to design an optimal inbound sales qualification funnel.

RULES:
- If the business is in the Real Estate space, the REQUIRED FIELDS must strictly be: "propertyType", "budget", "location", and "purchaseTimeline".
- If the business is in the Jewellery space, the REQUIRED FIELDS must strictly be: "product", "budget", "occasion", and "purchaseDate".
- If the business is in the Packaging space, the REQUIRED FIELDS must strictly be: "product", "quantity", "size", and "location".
- For other business categories, generate 3-4 sensible, logical qualification checklist parameters.
- Provide professional user-facing "questions" to ask candidates relative to each field.
- Suggest 2-3 optional "recommendedFields" to collect next once primary eligibility is verified.
- Highlight 3-4 commercial "leadScoringFactors" (e.g. volume scale, transaction ticket, urgency score, long-term intent) for our scoring algorithm.

Your output must be strict JSON matching this format exactly:
{
  "industry": "Packaging",
  "requiredFields": [
    { "field": "product", "question": "Which product are you interested in?" },
    { "field": "quantity", "question": "What quantity do you require?" }
  ],
  "recommendedFields": [
    { "field": "deliveryTimeline", "question": "When do you need delivery?" }
  ],
  "leadScoringFactors": ["quantity", "urgency", "repeatOrderPotential"]
}
Do not include talk, return pure JSON.`;

    const userPrompt = `
Business Category:
${businessCategory || "General SME"}

Business Description:
${businessDescription || "Inbound trade customer support desk."}

Products or Services:
${productsOrServices || "Custom commercial wholesale goods."}
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
            industry: { type: Type.STRING },
            requiredFields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  question: { type: Type.STRING }
                },
                required: ["field", "question"]
              }
            },
            recommendedFields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  question: { type: Type.STRING }
                },
                required: ["field", "question"]
              }
            },
            leadScoringFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["industry", "requiredFields", "recommendedFields", "leadScoringFactors"]
        }
      }
    });

    if (response?.text) {
      return JSON.parse(response.text.trim()) as IndustryQualResult;
    }
  } catch (err) {
    console.error("[Industry Qual Engine] Error evaluating qualificaiton rules:", err);
  }

  return getFallbackQualSpecs(businessCategory);
}

/**
 * Procedural fallback rules for qualification definitions.
 */
function getFallbackQualSpecs(category: string): IndustryQualResult {
  const lowCat = category.toLowerCase();

  if (lowCat.includes("real") || lowCat.includes("property") || lowCat.includes("estate")) {
    return {
      industry: "Real Estate",
      requiredFields: [
        { field: "propertyType", question: "What property type (e.g. apartment, villa, commercial space) are you interested in?" },
        { field: "budget", question: "Could you share your approximate budget or price bracket for this property?" },
        { field: "location", question: "Which specific areas or preferred locations would you prefer us to look into?" },
        { field: "purchaseTimeline", question: "When are you planning to make the purchase or move in?" }
      ],
      recommendedFields: [
        { field: "financingStatus", question: "Are you self-financing or looking into pre-approved home mortgages?" }
      ],
      leadScoringFactors: ["budget", "urgency", "financingStatus"]
    };
  }

  if (lowCat.includes("jewel") || lowCat.includes("gold") || lowCat.includes("silver") || lowCat.includes("diamond")) {
    return {
      industry: "Jewellery",
      requiredFields: [
        { field: "product", question: "What category of jewellery (e.g., gold necklace, diamond ring, bespoke bracelet) are you looking for?" },
        { field: "budget", question: "To help us show relevant options, what is your budget target?" },
        { field: "occasion", question: "Is this purchase for a special occasion like a wedding, anniversary, or birthday gift?" },
        { field: "purchaseDate", question: "When do you need the custom design completed or picked up?" }
      ],
      recommendedFields: [
        { field: "metalPurity", question: "Do you have a metal purity preference such as 18k or 22k gold?" }
      ],
      leadScoringFactors: ["budget", "urgency", "repeatPotential"]
    };
  }

  // Default block (Packaging)
  return {
    industry: "Packaging",
    requiredFields: [
      { field: "product", question: "What kind of packaging product or bag design (e.g. loop handles, D-cut bags) do you require?" },
      { field: "quantity", question: "What approximate order volume or batch quantity are you targeting for this project?" },
      { field: "size", question: "Could you let us know the exact dimensions or sizing criteria?" },
      { field: "location", question: "What is the final delivery location or pincode for shipping calculation?" }
    ],
    recommendedFields: [
      { field: "brandingRequirement", question: "Do you prefer a custom-branded printed logo or plain/standard bags?" }
    ],
    leadScoringFactors: ["quantity", "urgency", "repeatOrderPotential"]
  };
}
