import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";

// List of supported stages
export const SUPPORTED_STAGES = [
  "NEW",
  "INQUIRY",
  "QUALIFICATION",
  "CUSTOM_ORDER",
  "QUOTATION",
  "NEGOTIATION",
  "FOLLOWUP",
  "WON",
  "LOST"
] as const;

export type LeadStageType = typeof SUPPORTED_STAGES[number];

export interface StageDetectionResult {
  leadStage: LeadStageType;
  confidence: number;
  reason: string;
}

/**
 * Audit and determine the exact pipeline stage of a lead using cumulative conversation context and metadata signals.
 */
export async function detectLeadStage(leadId: string): Promise<StageDetectionResult> {
  // 1. Fetch Lead details with messages, notes, tags
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: {
        orderBy: { timestamp: "asc" }
      },
      notes: {
        orderBy: { createdAt: "desc" }
      },
      tags: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  // 2. Format lead data details
  const messagesStr = lead.messages.length > 0
    ? lead.messages.map(m => `[${m.direction}] ${m.timestamp.toISOString()}: ${m.content}`).join("\n")
    : "No chat history logged yet.";

  const notesStr = lead.notes.length > 0
    ? lead.notes.map(n => `- Note: ${n.note} (Logged: ${n.createdAt.toISOString()})`).join("\n")
    : "No internal notes logged.";

  const tagsStr = lead.tags.length > 0
    ? lead.tags.map(t => t.tag).join(", ")
    : "No tags applied.";

  // Retrieve client-specific API key/configs
  let apiKey = process.env.GEMINI_API_KEY;
  let clientModel = "gemini-3.5-flash";

  try {
    const clientInfo = await prisma.client.findUnique({
      where: { id: lead.clientId }
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
    console.error("[Stage Engine] Error querying client API configs:", err);
  }

  if (!apiKey) {
    console.warn("[Stage Engine] No Gemini API Key. Defaulting current stage to NEW.");
    return { leadStage: "NEW", confidence: 100, reason: "Gemini API key is missing. Reverted to default stage." };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-lead-stage-engine',
        }
      }
    });

    const systemInstruction = `You are a Senior Strategic Pipeline Auditor and CRM Data Analyst evaluating the sales readiness of a lead.
Given the full profile, chat logs (Memory), tags, notes, previous detected intent, and current configuration of a lead, you must classify the lead into EXACTLY ONE of the supported sales pipeline stages listed below.

SUPPORTED PIPELINE STAGES:
1. NEW: Recently captured or created lead. There are no sales dialogues, or only basic greetings exchanges with no meaningful inquiries.
2. INQUIRY: Contact is initiated. The customer is asking very high-level, exploratory questions (such as product categories, catalog/location availability, office hours, or general operational questions).
3. QUALIFICATION: Deep requirement gathering is in progress. Discussing specific volumes, sizes, dimensions, custom branding request, delivery locations, custom timelines, and checking client/order requirements.
4. QUOTATION: A formal price quote, commercial invoice design, layout estimate, draft mockup, or pricing checklist is being prepared, requested, sent, or actively walked through.
5. NEGOTIATION: Customer is requesting discounts, lower MOQ, free shipping, faster schedules, negotiating final unit costs, raising strong pricing objections, or finalizing purchase decisions.
6. FOLLOWUP: The lead is in a follow-up pause (waiting for their feedback post-quotation or after previous discussions, or checking if we should reignite contact).
7. WON: Customer has agreed to the sale, completed final payments, transferred deposits, shared invoice receipts, or authorized the order officially.
8. LOST: Lead outright rejected the offering, requested to stop contact, stated they bought elsewhere, did not match criteria, or are completely unresponsive over a long period.

Your output must be strict JSON matching this structure:
{
  "leadStage": "STAGE_NAME",
  "confidence": <integer percentage from 0 to 100>,
  "reason": "Provide a precise, human sales auditor explanation of why this stage is assigned based on explicit conversational signals or notes."
}
Only output the JSON. Do not include markdown formatting or extra commentary.`;

    const userPrompt = `
LEAD PROFILE SUMMARY:
- Name: ${lead.name}
- Origin Source: ${lead.source}
- System Status: ${lead.status}
- Current Computed Stage: ${lead.currentStage || "NEW"}
- Previous Computed Stage: ${lead.previousStage || "None"}
- Intent Memory: ${lead.latestIntent || "UNKNOWN"}
- Intent Journey: ${lead.intentHistory || "[]"}
- Tags: [${tagsStr}]

INTERNAL BUSINESS NOTES & CALLBACK REMARKS:
${notesStr}

CUMULATIVE WHATSAPP CHAT LOGS (LEAD MEMORY):
${messagesStr}
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
            leadStage: { 
              type: Type.STRING,
              description: "The primary pipeline stage assigned (one of the 8 supported stage names)."
            },
            confidence: { 
              type: Type.INTEGER, 
              description: "Audit confidence percentage from 0 to 100."
            },
            reason: {
              type: Type.STRING,
              description: "Explicit sales reason explaining why this stage matches the messages or notes perfectly."
            }
          },
          required: ["leadStage", "confidence", "reason"]
        }
      }
    });

    if (response?.text) {
      const parsed = JSON.parse(response.text.trim());
      let detectedStage = String(parsed.leadStage).toUpperCase().trim() as LeadStageType;
      
      if (!SUPPORTED_STAGES.includes(detectedStage)) {
        // Find best fallback or keep existing
        detectedStage = (lead.currentStage as LeadStageType) || "NEW";
      }

      return {
        leadStage: detectedStage,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 80,
        reason: parsed.reason || "Stage auto-audited by Pipeline Engine."
      };
    }
  } catch (err) {
    console.error("[Stage Engine Error] Failed to evaluate current stage utilizing Gemini:", err);
  }

  return {
    leadStage: (lead.currentStage as LeadStageType) || "NEW",
    confidence: 50,
    reason: "Failed to query Pipeline Stage Auditor. Fallback to existing."
  };
}

export function mapStageToStatus(stage: string): string {
  switch (stage) {
    case "NEW": return "New";
    case "INQUIRY": return "Interested";
    case "QUALIFICATION": return "Qualified";
    case "CUSTOM_ORDER": return "Custom Order";
    case "QUOTATION": return "Quotation Sent";
    case "NEGOTIATION": return "Negotiation";
    case "FOLLOWUP": return "Contacted";
    case "WON": return "Won";
    case "LOST": return "Lost";
    default: return "New";
  }
}

export function mapStatusToStage(status: string): string {
  switch (status) {
    case "New": return "NEW";
    case "Contacted": return "FOLLOWUP";
    case "Interested": return "INQUIRY";
    case "Qualified": return "QUALIFICATION";
    case "Custom Order": return "CUSTOM_ORDER";
    case "Quotation Sent": return "QUOTATION";
    case "Negotiation": return "NEGOTIATION";
    case "Won": return "WON";
    case "Lost": return "LOST";
    default: return "NEW";
  }
}

/**
 * Process lead pipeline stage updates, log a stage history node if updated, and store inside Lead profile.
 */
export async function processAndSaveLeadStage(leadId: string): Promise<any> {
  // 1. Load lead memory
  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });

  if (!lead) {
    console.warn(`[Stage Engine] Lead ${leadId} not found, skipping stage evaluation.`);
    return null;
  }

  // 2. Run stage engine to audit & determine current stage
  const auditResult = await detectLeadStage(leadId);
  const oldStage = lead.currentStage || "NEW";
  const newStage = auditResult.leadStage;
  const targetStatus = mapStageToStatus(newStage);

  // 3. Update stage if required or if status is out of sync
  if (oldStage !== newStage || lead.status !== targetStatus) {
    console.log(`[Stage Transition] Lead ${lead.name} transitioning from ${oldStage} -> ${newStage} (status: "${lead.status}" -> "${targetStatus}") with confidence ${auditResult.confidence}%`);

    // Parse existing stage history
    let stageJourney: string[] = [];
    try {
      stageJourney = JSON.parse(lead.stageHistory || "[]");
    } catch (_) {
      if (typeof lead.stageHistory === "string" && lead.stageHistory.trim()) {
        stageJourney = lead.stageHistory.split(",").map(s => s.trim());
      }
    }

    if (stageJourney.length === 0 && oldStage) {
      stageJourney.push(oldStage);
    }
    stageJourney.push(newStage);

    // Keep history clean
    if (stageJourney.length > 50) {
      stageJourney.shift();
    }

    // Acknowledge transition: Update Lead profile (both currentStage AND status)
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        currentStage: newStage,
        previousStage: oldStage,
        stageHistory: JSON.stringify(stageJourney),
        status: targetStatus
      }
    });

    // 4. Save to lead_stage_history database table
    const storedHistory = await prisma.leadStageHistory.create({
      data: {
        leadId,
        oldStage,
        newStage,
        reason: auditResult.reason,
        confidence: auditResult.confidence
      }
    });

    // Create an Activity log for visual chronological transparency
    await prisma.leadActivity.create({
      data: {
        leadId,
        activityType: "STAGE_CHANGE", // Custom activity code reflecting transition
        description: `Pipeline stage updated from ${oldStage} to ${newStage}. Reason: ${auditResult.reason}`
      }
    });

    return {
      previousStage: oldStage,
      currentStage: newStage,
      confidence: auditResult.confidence,
      reason: auditResult.reason,
      historyId: storedHistory.id
    };
  }

  return {
    previousStage: oldStage,
    currentStage: oldStage,
    confidence: auditResult.confidence,
    reason: "Stage verified as remaining unchanged.",
    historyId: null
  };
}
