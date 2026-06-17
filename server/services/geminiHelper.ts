import { GoogleGenAI } from "@google/genai";

// List of deprecated or prohibited models that must never be used
const DEPRECATED_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking"
];

/**
 * Sanitizes the model name to prevent calling prohibited or deprecated models.
 * Defaults all deprecated/prohibited models to gemini-3.5-flash.
 */
export function sanitizeModelName(modelName: string | null | undefined): string {
  if (!modelName) {
    return "gemini-3.5-flash";
  }
  const cleaned = modelName.trim();
  if (DEPRECATED_MODELS.includes(cleaned)) {
    console.log(`[Gemini Model Sanitizer] Rewriting deprecated model '${cleaned}' to 'gemini-3.5-flash'`);
    return "gemini-3.5-flash";
  }
  return cleaned;
}

/**
 * Executes a generateContent call on the Gemini client with automatic retries and model fallbacks
 * to gracefully handle transient network errors, rate limits (429), or service high-demands (503).
 */
export async function safeGenerateContent(
  client: any,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
): Promise<any> {
  // 1. Sanitize model name first
  let targetModel = sanitizeModelName(params.model);
  let attempts = 0;
  let delay = 1000; // start with 1s delay

  while (attempts <= maxRetries) {
    try {
      console.log(`[Gemini AI Call] Querying model='${targetModel}' (Attempt ${attempts + 1}/${maxRetries + 1})`);
      
      const response = await client.models.generateContent({
        ...params,
        model: targetModel
      });

      return response;
    } catch (err: any) {
      attempts++;
      const errStr = String(err);
      
      // Check if this is a transient/rate-limiting error (429, 503, RESOURCE_EXHAUSTED, UNAVAILABLE)
      const isTransient = 
        errStr.includes("429") || 
        errStr.includes("503") || 
        errStr.includes("RESOURCE_EXHAUSTED") || 
        errStr.includes("UNAVAILABLE") || 
        errStr.includes("high demand") || 
        errStr.includes("quota exceeded") ||
        errStr.includes("rate-limit") ||
        (err.status && (err.status === 429 || err.status === 503));

      if (isTransient) {
        console.warn(`[Gemini AI Retry Warning] Transient error calling Gemini API with model '${targetModel}':`, errStr);
        
        // If we still have retry attempts, sleep and retry
        if (attempts <= maxRetries) {
          console.log(`[Gemini AI Retry] Waiting ${delay}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          continue;
        }

        // Out of retries for primary model. Let's try falling back to gemini-3.1-flash-lite!
        if (targetModel !== "gemini-3.1-flash-lite") {
          console.warn(`[Gemini AI Fallback] Both retries failed for model '${targetModel}'. Attempting fallback to 'gemini-3.1-flash-lite'...`);
          targetModel = "gemini-3.1-flash-lite";
          attempts = 0; // Reset attempts to try the fallback model
          delay = 1000;
          continue;
        }
      }

      // If it's a non-transient error or we exhausted all fallbacks, propagate the error
      console.error(`[Gemini AI Fatal Error] Failed to generate content:`, err);
      throw err;
    }
  }

  throw new Error("Gemini AI safeGenerateContent execution failed after retries and fallback.");
}
