import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";
import { processAndSaveMessageIntent } from "./intentDetector.js";

// AI Input Types
export interface DecisionEngineOutput {
  leadScore: number;
  intent: string;
  conversionProbability: string;
  nextBestAction: string;
  followUpRecommendation: string;
  suggestedReply: string;
  revenueImpact: string;
}

/**
 * AI Decision Engine Service - Core Intelligence Layer for LeadSmart AI
 * Analyzes conversational flow, response delays, configurations and generates strategic reports.
 */
export async function analyzeLead(leadId: string): Promise<DecisionEngineOutput> {
  // 1. Fetch Lead data
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: {
        orderBy: { timestamp: "asc" }
      },
      followUps: {
        orderBy: { scheduledAt: "asc" }
      }
    }
  });

  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  // Detect intent BEFORE generating any AI response / analyzing lead
  const lastInboundMsg = lead.messages
    .filter(m => m.direction === "IN")
    .slice(-1)[0];

  if (lastInboundMsg) {
    const alreadyProcessed = await prisma.leadIntent.findFirst({
      where: {
        leadId: leadId,
        message: lastInboundMsg.content
      }
    });

    if (!alreadyProcessed) {
      console.log(`[Intent Detection Engine] Automatically detecting intent for message: "${lastInboundMsg.content}" before AI analysis.`);
      await processAndSaveMessageIntent(leadId, lastInboundMsg.content);
      // Re-fetch lead so we have latestIntent and intentHistory populated in memory!
      const updatedLead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          messages: {
            orderBy: { timestamp: "asc" }
          },
          followUps: {
            orderBy: { scheduledAt: "asc" }
          }
        }
      });
      if (updatedLead) {
        Object.assign(lead, updatedLead);
      }
    }
  }

  // 2. Fetch AI Configuration
  const aiConfig = await prisma.aIConfiguration.findUnique({
    where: { clientId: lead.clientId }
  });

  // Extract variables of interest
  const hasIncoming = lead.messages.some(m => m.direction === "IN");
  const messagesIn = lead.messages.filter(m => m.direction === "IN");
  const messagesOut = lead.messages.filter(m => m.direction === "OUT");
  const conversationsLength = lead.messages.length;

  const followUpCount = lead.followUpCount;
  const lastMsg = lead.messages[lead.messages.length - 1];
  const lastMsgContent = lastMsg ? lastMsg.content : "";
  const lastMsgTime = lastMsg ? new Date(lastMsg.timestamp) : new Date(lead.createdAt);

  // 3. Fallback Heuristics (Deterministic Rules Engine)
  let ruleScore = 35; // Default Baseline

  // Priority adjustment
  if (lead.priority === "Hot") ruleScore += 25;
  else if (lead.priority === "Warm") ruleScore += 12;
  else if (lead.priority === "Cold") ruleScore -= 10;

  // Lead status updates
  if (lead.status === "Interested" || lead.status === "Qualified") ruleScore += 20;
  if (lead.status === "Quotation Sent" || lead.status === "Negotiation") ruleScore += 25;
  if (lead.status === "Won") ruleScore = 100;
  if (lead.status === "Lost") ruleScore = 0;

  // Message sentiment / keywords matching logic
  const contentLower = lastMsgContent.toLowerCase();
  let detectedIntent = "Inquiry Only";

  if (contentLower) {
    if (
      contentLower.includes("price") || 
      contentLower.includes("pricing") || 
      contentLower.includes("cost") || 
      contentLower.includes("how much") || 
      contentLower.includes("quote") ||
      contentLower.includes("quotation") ||
      contentLower.includes("budget")
    ) {
      detectedIntent = "Price Comparison";
      ruleScore += 10;
    }
    
    if (
      contentLower.includes("buy") || 
      contentLower.includes("order") || 
      contentLower.includes("purchase") || 
      contentLower.includes("checkout") || 
      contentLower.includes("interested") || 
      contentLower.includes("get started") ||
      contentLower.includes("sign up") ||
      contentLower.includes("yes") ||
      contentLower.includes("want")
    ) {
      detectedIntent = "Buying Intent";
      ruleScore += 20;
    }

    if (
      contentLower.includes("schedule") || 
      contentLower.includes("call") || 
      contentLower.includes("meet") || 
      contentLower.includes("meeting") || 
      contentLower.includes("zoom") || 
      contentLower.includes("appointment") ||
      contentLower.includes("demo")
    ) {
      detectedIntent = "Buying Intent";
      ruleScore += 15;
    }

    if (
      contentLower.includes("support") || 
      contentLower.includes("help") || 
      contentLower.includes("issue") || 
      contentLower.includes("broken") || 
      contentLower.includes("error") || 
      contentLower.includes("fail") ||
      contentLower.includes("problem")
    ) {
      detectedIntent = "Support Request";
      ruleScore += 5;
    }

    const isOptOut = 
      contentLower === "no" || 
      contentLower === "no." || 
      contentLower === "no thanks" || 
      contentLower === "no thank you" || 
      contentLower === "no, thanks" || 
      contentLower === "no, thank you" || 
      contentLower.includes("stop") || 
      contentLower.includes("unsubscribe") || 
      contentLower.includes("not interested") || 
      contentLower.includes("dont need") || 
      contentLower.includes("don't need") ||
      contentLower.includes("wrong number") ||
      contentLower.includes("cancel");

    if (isOptOut) {
      detectedIntent = "Not Interested";
      ruleScore = 10;
    }
  }

  // Follow-up interaction check
  if (followUpCount > 2 && !lead.lastResponseFromClient) {
    // Spam penalty
    ruleScore -= 15;
  }

  if (lead.lastResponseFromClient && hasIncoming) {
    ruleScore += 10;
  }

  // Clamp rulescore
  ruleScore = Math.max(0, Math.min(100, ruleScore));

  // Determine conversion probability
  let ruleProb = "Medium";
  if (ruleScore >= 71) ruleProb = "High";
  else if (ruleScore <= 30) ruleProb = "Low";

  // Determine Next Best Action (NBA)
  let ruleNba = "Send follow-up message now";
  if (detectedIntent === "Not Interested" || ruleScore < 15) {
    ruleNba = "Mark as lost lead";
  } else if (detectedIntent === "Support Request") {
    ruleNba = "Escalate to human sales agent";
  } else if (detectedIntent === "Buying Intent" && ruleScore > 75) {
    ruleNba = "Schedule call";
  } else if (detectedIntent === "Price Comparison") {
    ruleNba = "Send quotation";
  } else if (!lead.lastResponseFromClient && Date.now() - lastMsgTime.getTime() < 12 * 60 * 60 * 1000) {
    ruleNba = "Wait 24 hours";
  } else if (ruleScore > 40 && ruleScore < 70 && lead.status === "Contacted") {
    ruleNba = "Offer discount";
  }

  // Follow-up recommendation
  let ruleFollowUpRec = "Restart follow-ups if re-engaged (Active queue restored)";
  if (ruleScore >= 71) {
    ruleFollowUpRec = "Increase urgency for hot leads (Next check-in in 2 hours)";
  } else if (ruleScore <= 30) {
    if (!lead.lastResponseFromClient && followUpCount > 3) {
      ruleFollowUpRec = "Stop follow-ups if user is not responding (Auto-silenced to protect WhatsApp number)";
    } else {
      ruleFollowUpRec = "Reduce spam for cold leads (Next check-in in 48 hours)";
    }
  }

  // suggested reply preparation (deterministic fallback template)
  let businessType = "Our Company";
  let fallbackTone = "warm and professional";
  if (aiConfig) {
    try {
      const bProfile = JSON.parse(aiConfig.businessProfile);
      businessType = bProfile.companyName || bProfile.businessType || businessType;
      const sBehavior = JSON.parse(aiConfig.salesBehavior || "{}");
      fallbackTone = sBehavior.tone || fallbackTone;
    } catch (_) {}
  }

  // Smart dynamic fallback block if AI model rate limits or fails:
  const lastMsgOut = messagesOut[messagesOut.length - 1];
  const lastOutContent = lastMsgOut ? lastMsgOut.content.toLowerCase() : "";

  // Check what keywords exist in the incoming message
  const hasDimensions = /h\d+|w\d+|g\d+|\d+\s*x\s*\d+|\b\d{2}\s*\*\s*\d{2}\b|\*/i.test(contentLower);
  const hasQuantity = /\b\d{3,7}\b|qty|\b\d+k\b|thousand|pieces|pcs/i.test(contentLower);
  const hasPincode = /\b\d{6}\b|pincode|pin code|zipcode|location|delivery to/i.test(contentLower);
  const hasPrintingPreference = /print|logo|plain|brand|custom/i.test(contentLower);

  let ruleReply = `Hello ${lead.name}, thank you for contacting us! How can we assist you with your packaging needs today?`;

  if (detectedIntent === "Not Interested") {
    ruleReply = `Understood, ${lead.name}. We will close this inquiry. Thank you for your time!`;
  } else if (detectedIntent === "Support Request") {
    ruleReply = `Hello ${lead.name}, I am connecting you to our support team to assist you further. One moment!`;
  } else {
    // Stage-based conversational funnel
    if (hasPincode) {
      ruleReply = `Thank you! Our wholesale team is preparing your custom quotation right now and will share the pricing shortly.`;
    } else if (hasPrintingPreference) {
      ruleReply = `Got it! To calculate the exact pricing and shipping timeline, could you please provide your delivery location or pincode?`;
    } else if (hasDimensions || lastOutContent.includes("size") || lastOutContent.includes("dimension")) {
      ruleReply = `Great, understood on the dimensions! Do you require custom logo printing or plain bags?`;
    } else if (hasQuantity || lastOutContent.includes("how can we help") || lastOutContent.includes("welcome")) {
      ruleReply = `We can absolutely help with your order! Could you please let us know the specific size or dimensions you are looking for?`;
    } else {
      // Default warm-up greeting
      ruleReply = `Hello ${lead.name}! We'd love to help you with your eco-friendly packaging needs. What product are you looking for, and what is your approximate quantity?`;
    }
  }

  // Revenue Impact evaluation
  let ruleRevImpact = "Medium";
  if (ruleScore >= 70 && detectedIntent !== "Not Interested") {
    ruleRevImpact = "High";
  } else if (ruleScore <= 30 || detectedIntent === "Not Interested") {
    ruleRevImpact = "Low";
  }

  // 4. Try Google Gemini API model reasoning if key is initialized
  let decision: DecisionEngineOutput = {
    leadScore: ruleScore,
    intent: detectedIntent,
    conversionProbability: ruleProb,
    nextBestAction: ruleNba,
    followUpRecommendation: ruleFollowUpRec,
    suggestedReply: ruleReply,
    revenueImpact: ruleRevImpact
  };

  const clientInfo = await prisma.client.findUnique({
    where: { id: lead.clientId }
  });
  const activeApiKey = clientInfo?.aiApiKey || process.env.GEMINI_API_KEY;

  if (activeApiKey) {
    try {
      const client = new GoogleGenAI({
        apiKey: activeApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare context block
      const chatHistoryStr = lead.messages
        .map(m => `[${m.direction === "IN" ? "Customer" : "AI Assistant"} at ${new Date(m.timestamp).toLocaleTimeString()}]: ${m.content}`)
        .join("\n");

      const systemInstruction = `You are a Senior Sales Manager and Business Strategy Auditor analyzing a key client pipeline lead prospect for LeadSmart AI.
Analyze the provided client file consisting of WhatsApp logs, metadata, follow-up history records, customer intent memory signals (latest intent and progressive intent history), and Client AI Rules.
You must output a single JSON document. Your output must strictly match the following properties exactly:
- "leadScore": Integer score between 0 and 100 based on interest & interactions.
- "intent": Exactly one of "Buying Intent", "Inquiry Only", "Price Comparison", "Support Request", or "Not Interested".
- "conversionProbability": Exactly one of "Low", "Medium", "High".
- "nextBestAction": A clear action like: "Send follow-up message now", "Offer discount", "Schedule call", "Send quotation", "Wait 24 hours", "Mark as lost lead", or "Escalate to human sales agent". Choose the absolute single best action for this sales opportunity.
- "followUpRecommendation": Dynamic recommendation to adjust followups (e.g. "Increase urgency for hot leads", "Reduce spam for cold leads", "Stop follow-ups if user is not responding", "Restart follow-ups if re-engaged").
- "suggestedReply": The absolute best response message text based on the customer's overall requirements, cumulative conversation history, and classified intent memory.
  CRITICAL RESPONSE STYLE RULES FOR "suggestedReply":
  1. KEEP IT EXTREMELY BRIEF: Limit the suggestedReply to EXACTLY 1 OR 2 SENTENCES (Maximum 35-40 words). No exceptions.
  2. NO LISTS OR BULLET POINTS: Under no circumstances should you list multiple questions, options, or numbered inquiries (such as "1. What size? 2. What printing?").
  3. ONE STEP AT A TIME: Ask for only ONE detail next or answer ONE question at a time. Guide the customer step-by-step through a natural conversational sequence.
  4. NO CORPORATE TEMPLATE FLUFF: Do not start with generic corporate greetings or advertisement boilerplates like "Thank you for reaching out to Ecopek! We specialize in premium bagasse plates and decompostable areca leaf tableware...". Jump straight into a conversational, helpful human-like tone, e.g., "We can absolutely help you with an order of [Quantity] [Product]. [Ask one simple question for next step]" or "Thanks for the details! Understood on [Specification]. Could we get your [Next Detail, e.g. delivery pincode] to calculate shipping?"
  5. NATURAL ENVELOPIST STYLE: Address actual, core business needs (such as quantities, sizes, printing, or specifications) mentioned anywhere in their recent messages. Maintain extreme brevity and casual-yet-highly-professional human sales energy.
- "revenueImpact": Exactly one of "Low", "Medium", "High".

Analyze correctly as a smart sales manager prioritizing high conversion, minimum spam, highlighting high priority revenue lines, and using the customer message intent memory signals.`;

      const userPrompt = `
LEAD PROFILE:
- Name: ${lead.name}
- Current Status: ${lead.status}
- Current Priority: ${lead.priority}
- Origin Source: ${lead.source}
- Follow-up attempts count: ${lead.followUpCount}
- Is Last Response From Client: ${lead.lastResponseFromClient}
- Latest Detected Customer Intent: ${lead.latestIntent || "UNKNOWN"}
- Customer Intent Journey / History: ${lead.intentHistory || "[]"}

WHATSAPP CHAT EXCHANGES LOGGER:
${chatHistoryStr || "No messages logged yet."}

CRM AI BUSINESS CONFIGURATION CONTEXT:
${aiConfig ? `
- Business Profile Profile: ${aiConfig.businessProfile}
- Product Information: ${aiConfig.productIntelligence}
- Sales Rules and Guidelines: ${aiConfig.salesBehavior}
- Tone Strategy & Control: ${aiConfig.responseControl}
` : "No custom configuration configured yet. Apply helpful commercial responses."}
`;

      const response = await safeGenerateContent(client, {
        model: clientInfo?.aiModel || "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [{ text: userPrompt }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              leadScore: { type: Type.INTEGER },
              intent: { type: Type.STRING },
              conversionProbability: { type: Type.STRING },
              nextBestAction: { type: Type.STRING },
              followUpRecommendation: { type: Type.STRING },
              suggestedReply: { type: Type.STRING },
              revenueImpact: { type: Type.STRING }
            },
            required: ["leadScore", "intent", "conversionProbability", "nextBestAction", "followUpRecommendation", "suggestedReply", "revenueImpact"]
          }
        }
      });

      const bodyText = response.text;
      if (bodyText) {
        const parsed = JSON.parse(bodyText);
        decision = {
          leadScore: typeof parsed.leadScore === "number" ? parsed.leadScore : ruleScore,
          intent: parsed.intent || detectedIntent,
          conversionProbability: parsed.conversionProbability || ruleProb,
          nextBestAction: parsed.nextBestAction || ruleNba,
          followUpRecommendation: parsed.followUpRecommendation || ruleFollowUpRec,
          suggestedReply: parsed.suggestedReply || ruleReply,
          revenueImpact: parsed.revenueImpact || ruleRevImpact
        };
      }
    } catch (err: any) {
      console.error("Gemini AI Decision Error in analyzeLead:", err);
      console.log(`Gemini AI Decision info: fallback evaluated successfully`);
    }
  }

  // 5. Update Lead metrics in DB
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: decision.leadScore,
      aiRecommendation: decision.nextBestAction,
      urgencyLevel: decision.conversionProbability // place in lead.urgencyLevel as specified in schema
    }
  });

  // 6. DB Log - Create an entry in table AIDecisionLog
  await prisma.aIDecisionLog.create({
    data: {
      clientId: lead.clientId,
      leadId: leadId,
      leadScore: decision.leadScore,
      intent: decision.intent,
      conversionProbability: decision.conversionProbability,
      nextBestAction: decision.nextBestAction,
      suggestedReply: decision.suggestedReply,
      revenueImpact: decision.revenueImpact
    }
  });

  return decision;
}
