import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";

export interface AIAssistantOutput {
  message: string;
  actionType: "READ" | "WRITE" | "DELETE" | "NONE";
  requestedAction?: {
    type: 
      | "CREATE_LEAD"
      | "UPDATE_LEAD_STATUS"
      | "UPDATE_LEAD_PRIORITY"
      | "ADD_NOTE"
      | "UPDATE_TAG"
      | "MODIFY_FOLLOWUP"
      | "CREATE_FOLLOWUP"
      | "DELETE_LEAD"
      | "DELETE_NOTE"
      | "DELETE_FOLLOWUP"
      | "DELETE_ALL_FOLLOWUPS_FOR_LEAD"
      | "DELETE_MULTIPLE_LEADS"
      | "MOVE_HOT_LEADS_TO_TODAY";
    params: any;
  };
  suggestions: string[];
  warnings: string[];
  dataSummary?: {
    totalLeads: number;
    hotLeads: number;
    missedFollowUps: number;
    pendingFollowUps: number;
    potentialRevenueScore: string;
  };
}

/**
 * Handle user co-pilot commands in a full-stack context:
 * 1. Gather comprehensive CRM & Decision context.
 * 2. Feed prompt to Gemini 3.5 Flash to determine intent and potential actions.
 * 3. Handle WRITE/DELETE safety checks (confirmation required).
 * 4. Execute approved actions and log to AIActionsLog table.
 * 5. Log chat history into AIChatHistory.
 * 6. Return standard structured response.
 */
export async function handleAICommand(
  input: string,
  clientId: string,
  options?: {
    confirm?: boolean;
    pendingActionId?: string;
    adminOverride?: boolean;
  }
): Promise<any> {
  const confirm = options?.confirm ?? false;
  const pendingActionId = options?.pendingActionId;

  // 1. Fetch Client profile
  const clientInfo = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!clientInfo) {
    throw new Error("Client business profile was not found.");
  }

  // 2. Fetch CRM Context of this client
  const leads = await prisma.lead.findMany({
    where: { clientId },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      tags: true,
      followUps: true,
      messages: {
        orderBy: { timestamp: "desc" },
        take: 3,
      },
    },
  });

  const aiConfig = await prisma.aIConfiguration.findUnique({
    where: { clientId },
  });

  const decisionLogs = await prisma.aIDecisionLog.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // Calculate high-level statistics for AI awareness
  const totalLeadsCount = leads.length;
  const hotLeadsCount = leads.filter(l => l.priority === "Hot" && l.status !== "Lost").length;
  const now = new Date();
  
  // Calculate missed & pending follow-ups
  let missedFollowUpsCount = 0;
  let pendingFollowUpsCount = 0;
  leads.forEach(l => {
    l.followUps.forEach(f => {
      if (f.status === "Pending") {
        if (new Date(f.scheduledAt) < now) {
          missedFollowUpsCount++;
        } else {
          pendingFollowUpsCount++;
        }
      }
    });
  });

  // Check if writing/deleting is disabled per client (simulated permission check if needed)
  const isWriteRestricted = clientInfo.accountStatus === "Suspended";

  // --- CONFIRMATION EXECUTION WORKFLOW ---
  // If the user is confirming a previously identified pending operation:
  if (confirm && pendingActionId) {
    const pendingLog = await prisma.aIActionsLog.findUnique({
      where: { id: pendingActionId },
    });

    if (pendingLog && pendingLog.status === "Pending" && pendingLog.clientId === clientId) {
      if (isWriteRestricted) {
        await prisma.aIActionsLog.update({
          where: { id: pendingActionId },
          data: { status: "Failed", actionDescription: pendingLog.actionDescription + " - Restrained by Admin Policy" },
        });
        return {
          message: "Could not execute this action. Write/Delete privileges are restricted for this profile by administrative override settings.",
          actionType: "NONE",
          suggestions: ["Check transaction quotas", "Contact LeadSmart administrator"],
          warnings: ["Operation prohibited on security policies."],
        };
      }

      try {
        const params = JSON.parse(pendingLog.actionDescription);
        const { type } = params;
        let executionMessage = "";

        // Execute action based on actionType
        switch (type) {
          case "CREATE_LEAD": {
            const newLead = await prisma.lead.create({
              data: {
                clientId,
                name: params.name || "Unnamed Prospect",
                phoneNumber: params.phoneNumber || "+00000000",
                email: params.email || null,
                source: params.source || "Manual",
                status: params.status || "New",
                priority: params.priority || "Warm",
                leadScore: params.priority === "Hot" ? 70 : 40,
                urgencyLevel: params.priority === "Hot" ? "High" : "Medium",
              },
            });
            executionMessage = `Successfully created lead "${newLead.name}" (${newLead.phoneNumber}) under status ${newLead.status}.` + 
              (params.note ? ` Adding first CRM Note.` : "");

            if (params.note) {
              await prisma.leadNote.create({
                data: { leadId: newLead.id, note: params.note },
              });
            }
            break;
          }

          case "UPDATE_LEAD_STATUS": {
            const updated = await prisma.lead.update({
              where: { id: params.leadId },
              data: { status: params.status },
            });
            executionMessage = `Status updated successfully. Lead "${updated.name}" is now categorised under "${updated.status}".`;
            break;
          }

          case "UPDATE_LEAD_PRIORITY": {
            const updated = await prisma.lead.update({
              where: { id: params.leadId },
              data: { priority: params.priority },
            });
            executionMessage = `Priority updated successfully. Lead "${updated.name}" has been adjusted to ${updated.priority} priority.`;
            break;
          }

          case "ADD_NOTE": {
            const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
            await prisma.leadNote.create({
              data: { leadId: params.leadId, note: params.note },
            });
            executionMessage = `Note added successfully to lead "${leadObj?.name || "Prospect"}": "${params.note}"`;
            break;
          }

          case "UPDATE_TAG": {
            const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
            await prisma.leadTag.create({
              data: { leadId: params.leadId, tag: params.tag },
            });
            executionMessage = `Added tag [${params.tag}] successfully to "${leadObj?.name || "Prospect"}".`;
            break;
          }

          case "MODIFY_FOLLOWUP": {
            const updated = await prisma.followUp.update({
              where: { id: params.followUpId },
              data: { scheduledAt: new Date(params.scheduledAt) },
            });
            executionMessage = `Rescheduled follow-up task ${updated.id} to occur at ${new Date(params.scheduledAt).toLocaleString()}.`;
            break;
          }

          case "CREATE_FOLLOWUP": {
            let finalLeadId = params.leadId;
            let finalLeadName = params.leadName || "Prospect";
            if (!finalLeadId && params.leadName) {
              const newLead = await prisma.lead.create({
                data: {
                  clientId,
                  name: params.leadName,
                  phoneNumber: params.phoneNumber || "+1 (555) 019-2834",
                  source: "Manual",
                  status: "New",
                  priority: "Warm",
                  leadScore: 40,
                  urgencyLevel: "Medium",
                }
              });
              finalLeadId = newLead.id;
              finalLeadName = newLead.name;
            }

            const created = await prisma.followUp.create({
              data: {
                leadId: finalLeadId,
                scheduledAt: new Date(params.scheduledAt),
                status: "Pending",
                message: params.message || "Scheduled follow-up reminder requested",
                followUpType: params.followUpType || "Soft",
              }
            });
            executionMessage = `Successfully scheduled a follow-up task for lead "${finalLeadName}" on ${new Date(params.scheduledAt).toLocaleString()}.`;
            break;
          }

          case "DELETE_LEAD": {
            const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
            await prisma.lead.delete({
              where: { id: params.leadId },
            });
            executionMessage = `Lead "${leadObj?.name || "Prospect"}" has been successfully deleted along with notes and followups.`;
            break;
          }

          case "DELETE_NOTE": {
            await prisma.leadNote.delete({
              where: { id: params.noteId },
            });
            executionMessage = `CRM Lead Note was successfully removed.`;
            break;
          }

          case "DELETE_FOLLOWUP": {
            await prisma.followUp.delete({
              where: { id: params.followUpId },
            });
            executionMessage = `Scheduled follow-up reminder has been canceled and deleted.`;
            break;
          }

          case "DELETE_ALL_FOLLOWUPS_FOR_LEAD": {
            const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
            const result = await prisma.followUp.deleteMany({
              where: { leadId: params.leadId },
            });
            executionMessage = `Successfully deleted all (${result.count}) follow-up tasks of lead "${leadObj?.name || "Prospect"}".`;
            break;
          }

          case "DELETE_MULTIPLE_LEADS": {
            const count = params.leadIds?.length || 0;
            if (count > 0) {
              await prisma.lead.deleteMany({
                where: {
                  id: { in: params.leadIds },
                  clientId: clientId,
                },
              });
            }
            executionMessage = `Purged and cleared ${count} junk leads from the CRM system successfully.`;
            break;
          }

          case "MOVE_HOT_LEADS_TO_TODAY": {
            const hotLeadIds = leads.filter(l => l.priority === "Hot" && l.status !== "Lost").map(l => l.id);
            let rescheduledCount = 0;
            const todayEnd = new Date();
            todayEnd.setHours(17, 0, 0, 0);

            for (const leadId of hotLeadIds) {
              // Create a pending follow-up scheduled for today
              await prisma.followUp.create({
                data: {
                  leadId,
                  scheduledAt: todayEnd,
                  status: "Pending",
                  message: "High priority same-day follow-up arranged by LeadSmart Business Advisor",
                  followUpType: "Soft",
                },
              });
              rescheduledCount++;
            }
            executionMessage = `Restructured client activities. Successfully created same-day urgent followups for all (${rescheduledCount}) Active Hot prospects.`;
            break;
          }

          default:
            throw new Error(`Unimplemented action type: ${type}`);
        }

        // Update the Action log status to Executed
        await prisma.aIActionsLog.update({
          where: { id: pendingActionId },
          data: {
            status: "Executed",
            actionDescription: `Executed Action: ${pendingLog.actionType}. ${executionMessage}`,
          },
        });

        // Save AIChatHistory log
        await prisma.aIChatHistory.create({
          data: {
            clientId,
            message: input,
            response: `[Confirmed Executed] ${executionMessage}`,
          },
        });

        return {
          message: executionMessage,
          actionType: pendingLog.actionType as any,
          suggestions: ["Ask me to run sales checkups", "Inquire about top active leads"],
          warnings: [],
          dataSummary: {
            totalLeads: totalLeadsCount,
            hotLeads: hotLeadsCount,
            missedFollowUps: missedFollowUpsCount,
            pendingFollowUps: pendingFollowUpsCount,
            potentialRevenueScore: "Healthy Pipeline Growth",
          },
        };
      } catch (err: any) {
        console.error("Failed to execute confirmed action:", err);
        await prisma.aIActionsLog.update({
          where: { id: pendingActionId },
          data: { status: "Failed", actionDescription: `Failed to execute action. Error: ${err.message}` },
        });

        return {
          message: `Execution failed: ${err.message}`,
          actionType: "NONE",
          suggestions: ["Ensure lead parameters are logical", "Check for structural database values"],
          warnings: ["System halted action processing."],
        };
      }
    }
  }

  // --- GEMINI PROCESSOR WORKFLOW ---
  // Create Gemini client
  let geminiOutput: AIAssistantOutput = {
    message: "Analyzing your request based on current system data...",
    actionType: "NONE",
    suggestions: ["List current hot leads", "Assess pipeline statistics"],
    warnings: [],
  };

  const activeApiKey = clientInfo.aiApiKey || process.env.GEMINI_API_KEY;
  let useFallback = !activeApiKey;

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

      // Prepare rich prompt with complete business context
      const leadsContext = leads.map(l => {
        const lastMsg = l.messages[0];
        return {
          id: l.id,
          name: l.name,
          phone: l.phoneNumber,
          status: l.status,
          priority: l.priority,
          leadScore: l.leadScore ?? 0,
          notes: l.notes.map(n => n.note),
          tags: l.tags.map(t => t.tag),
          followUps: l.followUps.map(f => ({ id: f.id, scheduledAt: f.scheduledAt, status: f.status, type: f.followUpType })),
          lastCustomerMsg: lastMsg && lastMsg.direction === "IN" ? lastMsg.content : ""
        };
      });

      const bizProfile = aiConfig ? JSON.parse(aiConfig.businessProfile || "{}") : {};
      const salesBeh = aiConfig ? JSON.parse(aiConfig.salesBehavior || "{}") : {};

      const contextString = `
      CLIENT PROFILE DETAILS:
      - Company Name: ${clientInfo.companyName}
      - Phone: ${clientInfo.phone || "None"}
      - Industry & Goals: ${clientInfo.industry || "General Retail"} / ${clientInfo.businessType || "B2B SaaS"}
      - Description: ${clientInfo.description || "Inbound Sales Lead Processing Center"}
      ${aiConfig ? `- CRM Target Products: ${aiConfig.productIntelligence}` : ""}

      CRM LEADS SNAPSHOT (${leads.length} leads in total):
      ${JSON.stringify(leadsContext.slice(0, 30))} // Providing top 30 leads for token safety

      RECENT AI DECISIONS REVIEWED:
      ${JSON.stringify(decisionLogs.map(d => ({ leadId: d.leadId, score: d.leadScore, conversionProb: d.conversionProbability, nba: d.nextBestAction })))}
      `;

      const systemInstruction = `You are the ${clientInfo.aiAssistantName || "LeadSmart"} Chief Sales Officer (CSO) and virtual Business Growth Executive.
      You act as a senior business analyst, CRM pipeline advisor, and automated operations co-pilot.
      Analyze the client's current CRM pipeline context consisting of Leads, notes, follow-up queues, decisions, and system profiles.
      Answer the user's prompt intelligently, offering high-value proactive summaries or formulating exact commands to modify the database.
      
      You must respond in structured JSON format according to strict instructions.
      The JSON output property keys must match these EXACTLY:
      - "message": A verbose, high-value advisor response. It must be professional, reassuring, and highly specific to the data provided. Use the factual lead names, scores, and statistics.
      - "actionType": Must be exactly one of: "READ", "WRITE", "DELETE", or "NONE".
        Choose "WRITE" or "DELETE" only if the user explicitly commanded to "create", "update", "delete", "remove", "add", "move", "clear", "purge", or "modify" a lead, note, tag, status, prioritize action, or follow-up.
       - "requestedAction": REQUIRED if actionType is "WRITE" or "DELETE". Do not include if actionType is "READ" or "NONE". If included, it MUST feature properties:
          - "type": Choose exactly from: "CREATE_LEAD", "UPDATE_LEAD_STATUS", "UPDATE_LEAD_PRIORITY", "ADD_NOTE", "UPDATE_TAG", "MODIFY_FOLLOWUP", "CREATE_FOLLOWUP", "DELETE_LEAD", "DELETE_NOTE", "DELETE_FOLLOWUP", "DELETE_ALL_FOLLOWUPS_FOR_LEAD", "DELETE_MULTIPLE_LEADS", "MOVE_HOT_LEADS_TO_TODAY"
          - "params": Objectcontaining key parameters for execution (e.g. leadId, name, phoneNumber, email, source, status, priority, note, tag, followUpId, noteId, scheduledAt, leadIds, leadName, message, followUpType).
            * For UPDATE_LEAD_STATUS, require "leadId" (String) and "status" (String, matches CRM statuses: "New" or "Contacted" or "Interested" or "Qualified" or "Quotation Sent" or "Negotiation" or "Won" or "Lost").
            * For UPDATE_LEAD_PRIORITY, require "leadId" (String) and "priority" (String, matches: "Hot", "Warm", "Cold").
            * For ADD_NOTE, require "leadId" (String) and "note" (String).
            * For CREATE_LEAD, require "name" (String) and "phoneNumber" (String) and optional "email", "status", "priority", "note".
            * For UPDATE_TAG, require "leadId" (String) and "tag" (String).
            * For DELETE_LEAD, require "leadId" (String).
            * For DELETE_MULTIPLE_LEADS, require "leadIds" (Array of String).
            * For MODIFY_FOLLOWUP, require "followUpId" (String) and "scheduledAt" (String, ISO-8601 string representing target rescheduled time).
            * For CREATE_FOLLOWUP, require either "leadId" (String) OR "leadName" (String) if the lead is not registered yet, and "scheduledAt" (String, ISO-8601 string representing target scheduled time) and optional "message" (String) and "followUpType" ("Soft", "Medium", "Hard", "Final").
            * For DELETE_ALL_FOLLOWUPS_FOR_LEAD, require "leadId" (String).
      - "suggestions": An array of 2-3 custom command suggestions the user might want to run next (e.g. ["Analyze my buying intent conversion distribution", "Draft a followup text for John Doe"]).
      - "warnings": An array of warnings if anomalies (such as overdue follow-ups, hot leads sitting under Cold priority, or empty tags) are present.
      - "dataSummary": Object containing global pipeline statistics:
          - "totalLeads": Integer count.
          - "hotLeads": Integer count.
          - "missedFollowUps": Integer count.
          - "pendingFollowUps": Integer count.
          - "potentialRevenueScore": String metric describing pipeline health.
          
      Ensure strict JSON validation. Do not hallucinate IDs; only use IDs present in the CRM LEADS SNAPSHOT. If the user asks to delete "all junk leads", find the leads with status "Lost" or priority "Cold" or "junk" label, collect their IDs, and request type DELETE_MULTIPLE_LEADS with those IDs.`;

      const response = await client.models.generateContent({
        model: clientInfo.aiModel || "gemini-2.0-flash",
        contents: [
          { role: "user", parts: [{ text: `CRM CO-PILOT BUSINESS DATABASE CONTEXT:\n${contextString}\n\nUSER COMMAND INPUT: "${input}"` }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              actionType: { type: Type.STRING },
              requestedAction: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  params: {
                    type: Type.OBJECT,
                    properties: {
                      leadId: { type: Type.STRING },
                      name: { type: Type.STRING },
                      phoneNumber: { type: Type.STRING },
                      email: { type: Type.STRING },
                      status: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      note: { type: Type.STRING },
                      tag: { type: Type.STRING },
                      followUpId: { type: Type.STRING },
                      scheduledAt: { type: Type.STRING },
                      leadIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      leadName: { type: Type.STRING },
                      message: { type: Type.STRING },
                      followUpType: { type: Type.STRING }
                    }
                  }
                },
                required: ["type", "params"]
              },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              dataSummary: {
                type: Type.OBJECT,
                properties: {
                  totalLeads: { type: Type.INTEGER },
                  hotLeads: { type: Type.INTEGER },
                  missedFollowUps: { type: Type.INTEGER },
                  pendingFollowUps: { type: Type.INTEGER },
                  potentialRevenueScore: { type: Type.STRING }
                },
                required: ["totalLeads", "hotLeads", "missedFollowUps", "pendingFollowUps", "potentialRevenueScore"]
              }
            },
            required: ["message", "actionType", "suggestions", "warnings", "dataSummary"]
          }
        }
      });

      const parsedResponse = response.text ? JSON.parse(response.text) : null;
      if (parsedResponse) {
        geminiOutput = {
          message: parsedResponse.message,
          actionType: parsedResponse.actionType,
          requestedAction: parsedResponse.requestedAction,
          suggestions: parsedResponse.suggestions || [],
          warnings: parsedResponse.warnings || [],
          dataSummary: parsedResponse.dataSummary,
        };
      } else {
        useFallback = true;
      }
    } catch (err: any) {
      console.log(`Gemini AI Copilot generator info: key/access fallback used (using robust local strategy)`);
      useFallback = true;
    }
  }

  if (useFallback) {
    const lowInput = input.toLowerCase();
    
    // Default fallback values
    let fallbackMsg = `Hello! I am your ${clientInfo.aiAssistantName || "LeadSmart"} Chief Sales Executive. I have analyzed your pipeline context.
    
Here are our current business metrics:
- **Total Registered Leads**: ${totalLeadsCount} prospects
- **Active Hot Leads**: ${hotLeadsCount} high-intent customers
- **Missed Reminders**: ${missedFollowUpsCount} overdue alerts requiring attention
- **Upcoming Schedulers**: ${pendingFollowUpsCount} pending touches

How can I help you optimize your CRM sales strategy today?`;
    let fallbackActionType: "READ" | "WRITE" | "DELETE" | "NONE" = "NONE";
    let fallbackRequestedAction: any = undefined;
    let fallbackSuggestions = ["Analyze my pipeline health", "Show hot focus leads", "Create a new prospect"];
    let fallbackWarnings: string[] = [];

    if (missedFollowUpsCount > 0) {
      fallbackWarnings.push(`Detected ${missedFollowUpsCount} overdue follow-up tasks! This delay is a primary driver behind drops in sales.`);
    }

    // Try to find if input targets an existing lead by scanning our list of active leads
    const matchedLeadOfCommand = leads.find(l => {
      const nameL = l.name.toLowerCase();
      // Ensure name is non-trivial and match case-insensitive substring or full word
      return nameL.length >= 2 && (lowInput.includes(nameL) || lowInput.replace(/[^a-z0-9 ]/g, "").split(" ").includes(nameL));
    });

    let actionParsed = false;

    const isDeleteCmd = lowInput.includes("delete") || lowInput.includes("remove") || lowInput.includes("purge") || lowInput.includes("clear") || lowInput.includes("cancel") || lowInput.includes("dismiss");
    const isFollowUpCmd = (lowInput.includes("schedule") || lowInput.includes("follow up") || lowInput.includes("follow-up") || lowInput.includes("remind") || lowInput.includes("appointment")) && !isDeleteCmd;

    if (isFollowUpCmd) {
      actionParsed = true;
      const targetDate = parseNaturalLanguageDateTime(input);
      
      if (matchedLeadOfCommand) {
        fallbackActionType = "WRITE";
        fallbackRequestedAction = {
          type: "CREATE_FOLLOWUP",
          params: {
            leadId: matchedLeadOfCommand.id,
            scheduledAt: targetDate.toISOString(),
            message: `Scheduled follow-up reminder requested by Chief Sales Officer Advisor`,
            followUpType: "Soft"
          }
        };
        fallbackMsg = `Preparing database action to schedule a follow-up for **${matchedLeadOfCommand.name}** on **${targetDate.toLocaleString()}**...`;
      } else {
        let extractedName = "";
        const nameMatch = /(?:for|with|to|of|on)\s+([A-Za-z0-9_]+)/i.exec(input);
        if (nameMatch && nameMatch[1]) {
          const candidate = nameMatch[1].trim();
          const ignoreWords = ["tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "am", "pm", "next", "week", "follow", "up", "a", "an", "the"];
          if (!ignoreWords.includes(candidate.toLowerCase())) {
            extractedName = candidate;
          }
        }
        const finalName = extractedName ? extractedName.charAt(0).toUpperCase() + extractedName.slice(1) : "New Prospect Contact";

        const phoneRegex = /(\+?\d[\d-\s]{8,15}\d)/;
        const matchPhone = phoneRegex.exec(input);
        const detectedPhone = matchPhone ? matchPhone[0].trim() : "+1 (555) 019-2834";

        fallbackActionType = "WRITE";
        fallbackRequestedAction = {
          type: "CREATE_FOLLOWUP",
          params: {
            leadName: finalName,
            phoneNumber: detectedPhone,
            scheduledAt: targetDate.toISOString(),
            message: `First touch follow-up reminder requested by Chief Sales Officer Advisor`,
            followUpType: "Soft"
          }
        };
        fallbackMsg = `I couldn't find an existing CRM lead matching your query. I have drafted an action to register **${finalName}** as a brand-new prospect and arrange a follow-up reminder on **${targetDate.toLocaleString()}**! Please authorize via the co-pilot action board.`;
      }
    } else if (matchedLeadOfCommand) {
      // User is targeting an existing lead! Inspect priority, status scale, and note logs
      const priorities = ["hot", "warm", "cold"];
      let targetPriority = "";
      
      // Look for a target priority (e.g. after 'to' or 'as')
      const toIndex = lowInput.lastIndexOf("to ");
      const asIndex = lowInput.lastIndexOf("as ");
      const searchStartIndex = Math.max(toIndex, asIndex);
      
      if (searchStartIndex !== -1) {
        const afterPart = lowInput.substring(searchStartIndex);
        const priorityInAfter = priorities.find(p => afterPart.includes(p));
        if (priorityInAfter) {
          targetPriority = priorityInAfter;
        }
      }
      
      if (!targetPriority) {
        let lastIdx = -1;
        for (const p of priorities) {
          const idx = lowInput.lastIndexOf(p);
          if (idx > lastIdx) {
            lastIdx = idx;
            targetPriority = p;
          }
        }
      }

      // Check for target pipeline status
      const statuses = [
        { label: "New", aliases: ["new", "fresh"] },
        { label: "Contacted", aliases: ["contacted", "called", "touched", "pinged"] },
        { label: "Interested", aliases: ["interested", "keen", "showing interest"] },
        { label: "Qualified", aliases: ["qualified", "good fit", "fit"] },
        { label: "Quotation Sent", aliases: ["quotation sent", "quote sent", "pricing sent", "quotation"] },
        { label: "Negotiation", aliases: ["negotiation", "negotiating", "discounting"] },
        { label: "Won", aliases: ["won", "deal done", "closed won", "success"] },
        { label: "Lost", aliases: ["lost", "closed lost", "dropped", "no deal", "junk"] }
      ];
      
      let targetStatus = "";
      if (searchStartIndex !== -1) {
        const afterPart = lowInput.substring(searchStartIndex);
        const statusObj = statuses.find(s => s.aliases.some(alias => afterPart.includes(alias)));
        if (statusObj) {
          targetStatus = statusObj.label;
        }
      }
      
      if (!targetStatus) {
        let lastIdx = -1;
        for (const s of statuses) {
          for (const alias of s.aliases) {
            const idx = lowInput.lastIndexOf(alias);
            if (idx > lastIdx) {
              lastIdx = idx;
              targetStatus = s.label;
            }
          }
        }
      }

      const isNoteCmd = lowInput.includes("note") || lowInput.includes("remark") || lowInput.includes("comment");

      if (isDeleteCmd) {
        actionParsed = true;
        const isFollowUpTarget = lowInput.includes("follow up") || lowInput.includes("follow-up") || lowInput.includes("reminder") || lowInput.includes("appointment") || lowInput.includes("task");
        
        if (isFollowUpTarget) {
          fallbackActionType = "DELETE";
          fallbackRequestedAction = {
            type: "DELETE_ALL_FOLLOWUPS_FOR_LEAD",
            params: { leadId: matchedLeadOfCommand.id }
          };
          fallbackMsg = `Preparing database action to remove all scheduled follow-ups and reminders for lead **${matchedLeadOfCommand.name}** completely.`;
        } else {
          fallbackActionType = "DELETE";
          fallbackRequestedAction = {
            type: "DELETE_LEAD",
            params: { leadId: matchedLeadOfCommand.id }
          };
          fallbackMsg = `Preparing database action to remove lead **${matchedLeadOfCommand.name}** completely.`;
        }
      } else if (isNoteCmd) {
        actionParsed = true;
        let noteText = "";
        const noteIndex = Math.max(lowInput.indexOf("note"), lowInput.indexOf("remark"), lowInput.indexOf("comment"));
        if (noteIndex !== -1) {
          let rawNote = input.substring(noteIndex);
          rawNote = rawNote.replace(/^(note|remark|comment)s?(:|\s+to|\s+for|\s+on)?/i, "").trim();
          const nameReg = new RegExp(matchedLeadOfCommand.name, "gi");
          rawNote = rawNote.replace(nameReg, "").trim();
          rawNote = rawNote.replace(/^(to|for|with|about)\s+/i, "").trim();
          noteText = rawNote;
        }
        if (!noteText) {
          noteText = "Note logged as requested by Chief Sales Officer Advisor.";
        }

        fallbackActionType = "WRITE";
        fallbackRequestedAction = {
          type: "ADD_NOTE",
          params: { leadId: matchedLeadOfCommand.id, note: noteText }
        };
        fallbackMsg = `Preparing database action to log a CRM note on **${matchedLeadOfCommand.name}**: "${noteText}"...`;
      } else if (targetStatus && (lowInput.includes("status") || lowInput.includes("stage") || lowInput.includes("mark") || lowInput.includes("set") || lowInput.includes("change") || lowInput.includes("update"))) {
        actionParsed = true;
        fallbackActionType = "WRITE";
        fallbackRequestedAction = {
          type: "UPDATE_LEAD_STATUS",
          params: { leadId: matchedLeadOfCommand.id, status: targetStatus }
        };
        fallbackMsg = `Preparing database action to adjust **${matchedLeadOfCommand.name}** pipeline stage to **${targetStatus}**...`;
      } else if (targetPriority && (lowInput.includes("priority") || lowInput.includes("temp") || lowInput.includes("make") || lowInput.includes("set") || lowInput.includes("change") || lowInput.includes("update") || lowInput.includes("warm") || lowInput.includes("hot") || lowInput.includes("cold"))) {
        actionParsed = true;
        const priorityCap = targetPriority.charAt(0).toUpperCase() + targetPriority.slice(1);
        fallbackActionType = "WRITE";
        fallbackRequestedAction = {
          type: "UPDATE_LEAD_PRIORITY",
          params: { leadId: matchedLeadOfCommand.id, priority: priorityCap }
        };
        fallbackMsg = `Preparing database action to adjust **${matchedLeadOfCommand.name}** priority level to **${priorityCap}**...`;
      }
    }

    if (actionParsed) {
      // Intentionally bypassed to execute the parsed database operations directly
    } else if (lowInput.includes("create") || lowInput.includes("creat") || lowInput.includes("add") || lowInput.includes("new") || lowInput.includes("register") || lowInput.includes("insert") || lowInput.includes("save")) {
      const phoneRegex = /(\+?\d[\d-\s]{8,15}\d)/;
      const matchPhone = phoneRegex.exec(input);
      const detectedPhone = matchPhone ? matchPhone[0].trim() : "+1 (555) 019-2834";
      
      let detectedName = "New Prospect";
      const nameIndicators = [
        /name\s+is\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /name:?\s*([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /named\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /creat(?:e)?\s+a?\s*new?\s*lead\s*named?\s*([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /creat(?:e)?\s+a?\s*new?\s*lead\s*([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /add\s+lead\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /lead\s*name\s*is?\s*([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
        /lead\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i,
      ];
      
      for (const pattern of nameIndicators) {
        const match = pattern.exec(input);
        if (match && match[1]) {
          const possibleName = match[1].trim();
          // Avoid matching stop words like "new", "lead", "prospect"
          const stopWords = ["new", "lead", "prospect", "name", "mob", "mobile", "phone", "whatpp", "whatsapp"];
          if (!stopWords.includes(possibleName.toLowerCase())) {
            detectedName = possibleName;
            break;
          }
        }
      }

      if (detectedName) {
        const words = detectedName.split(/\s+/);
        const filteredWords = [];
        for (const w of words) {
          const lw = w.toLowerCase();
          if (["mob", "mobile", "phone", "whatpp", "whatsapp", "lead", "new", "prospect", "name"].includes(lw)) {
            break;
          }
          filteredWords.push(w);
        }
        if (filteredWords.length > 0) {
          detectedName = filteredWords.join(" ");
        }
      }

      fallbackActionType = "WRITE";
      fallbackRequestedAction = {
        type: "CREATE_LEAD",
        params: {
          name: detectedName,
          phoneNumber: detectedPhone,
          status: "New",
          priority: "Warm",
          note: "Drafted by CSO assistant co-pilot"
        }
      };
      
      fallbackMsg = `I have successfully drafted a CRM database transaction action to register a new lead:
- Name: **${detectedName}**
- Contact: **${detectedPhone}**

Please authorize this operation using the confirmation board below to commit the record!`;
      fallbackSuggestions = ["Who are my hot leads?", "Show pipeline audit summary"];
    } else if (lowInput.includes("sales") || lowInput.includes("drop") || lowInput.includes("why") || lowInput.includes("report") || lowInput.includes("today") || lowInput.includes("summary") || lowInput.includes("performance") || lowInput.includes("metric") || lowInput.includes("status")) {
      fallbackMsg = `### 📊 Chief Sales Officer Executive Pipeline Audit
      
Our comprehensive diagnostics for **${clientInfo.companyName}** indicate the following strategic performance metrics:

1. **Volume Diagnostics**:
   - Total Leads: **${totalLeadsCount}**
   - High-priority (Hot) leads: **${hotLeadsCount}**
   
2. **Follow-Up Back Funnel Analysis**:
   - Active scheduled follow-ups: **${pendingFollowUpsCount}**
   - Overdue unanswered touchpoints: **${missedFollowUpsCount}**
   
3. **Primary Sales Leak Cause**:
   ${missedFollowUpsCount > 0 
     ? `We have isolated **${missedFollowUpsCount} overdue WhatsApp/CRM follow-up tasks**. Response speed is the single most critical factor in modern sales conversion. Delayed contacts directly explain dropping sales tables.` 
     : `Excellent pipeline hygiene! You have **0** overdue follow-up tasks currently. Your main leverage point now is converting the ${hotLeadsCount} premium prospects registered under 'Hot' status.`}

4. **Action recommendation**:
   ${hotLeadsCount > 0 
     ? `Reschedule same-day follow-ups for all high-intent Hot prospects to restore active engagement.` 
     : `Register high-priority prospects to build a healthy pipeline.`}`;
      
      fallbackSuggestions = ["Who are my hot leads?", "Move all hot leads to today's schedule"];
    } else if (lowInput.includes("hot") || lowInput.includes("focus") || lowInput.includes("lead") || lowInput.includes("priority") || lowInput.includes("prospect")) {
      const hotLeadsList = leads.filter((l: any) => l.priority === "Hot" && l.status !== "Lost");
      if (hotLeadsList.length > 0) {
        const details = hotLeadsList.map((l: any, i: number) => `   - **${l.name}** (${l.phoneNumber || "No Phone"}) — Status: *${l.status}* (${l.notes.length} CRM notes recorded, Score: ${l.leadScore || 50}/100)`).join("\n");
        fallbackMsg = `### 🔥 Premium Focus Pipeline Listing

Here are the highest performing prosects currently designated under **Hot Priority** in your LeadSmart CRM:

${details}

These prospects require immediate business contact to keep discussions active and prevent engagement cooling.`;
      } else {
        fallbackMsg = `There are currently no active prospects flagged under **Hot** priority in the database. 

I recommend scanning your registered leads to designate the most promising ones as high-priority, or let me create a new high-priority lead for you!`;
      }
      fallbackSuggestions = ["Create a new lead", "Show pipeline statistics", "Why are my sales dropping?"];
    } else if (lowInput.includes("industry") || lowInput.includes("business") || lowInput.includes("profile") || lowInput.includes("product") || lowInput.includes("company") || lowInput.includes("about") || lowInput.includes("role") || lowInput.includes("who")) {
      fallbackMsg = `### 🏢 LeadSmart CRM Enterprise Profile
      
We have compiled the following operational structure for **${clientInfo.companyName}**:

1. **Industry Sector**: **${clientInfo.industry || "General SME"}**
2. **Business Portfolio Category**: **${clientInfo.businessType || "B2B Operation"}**
3. **Core Target Products**: ${aiConfig?.productIntelligence || "Automated CRM communication integrations"}
4. **Primary Description**: *${clientInfo.description || "Active sales and follow-up lead tracking."}*

Our system acts as your Chief Sales Officer (CSO) advisor tailored for the **${clientInfo.industry || "Services"}** market segment. Do you want me to analyze hot leads or draft automated responses?`;
      fallbackSuggestions = ["Show hot focus leads", "Analyze my pipeline health", "Create a new prospect"];
    }

    geminiOutput = {
      message: fallbackMsg,
      actionType: fallbackActionType,
      requestedAction: fallbackRequestedAction,
      suggestions: fallbackSuggestions,
      warnings: fallbackWarnings,
      dataSummary: {
        totalLeads: totalLeadsCount,
        hotLeads: hotLeadsCount,
        missedFollowUps: missedFollowUpsCount,
        pendingFollowUps: pendingFollowUpsCount,
        potentialRevenueScore: hotLeadsCount > 3 ? "Highly High Yield Trajectory" : "Stable Pipeline Velocity",
      }
    };
  }

  // Inject computed stats if gemini didn't provide them or they are misformed
  if (!geminiOutput.dataSummary) {
    geminiOutput.dataSummary = {
      totalLeads: totalLeadsCount,
      hotLeads: hotLeadsCount,
      missedFollowUps: missedFollowUpsCount,
      pendingFollowUps: pendingFollowUpsCount,
      potentialRevenueScore: "Stable Commercial Growth",
    };
  }

  // --- WRITE / DELETE CONFIRMATION INTERRUPT STEP ---
  if (geminiOutput.actionType === "WRITE" || geminiOutput.actionType === "DELETE") {
    // Check restriction
    if (isWriteRestricted) {
      geminiOutput.message = `Prohibited Command: Modify privileges have been suspended for safety compliance override policies, or your dashboard is operating under Read-Only restrictions. Please resolve your subscription or contact administration.`;
      geminiOutput.actionType = "NONE";
      geminiOutput.requestedAction = undefined;
    } else {
      // Fetch AI permissions to check if this operation is authorized for auto-execution
      const permissions = await prisma.aIPermission.findMany({ where: { clientId } });
      const permMap: Record<string, boolean> = {};
      permissions.forEach(p => permMap[p.permissionName] = p.enabled);

      const actionType = geminiOutput.requestedAction?.type;

      let isAuthorizedForAutoExec = false;

      if (actionType === "CREATE_LEAD" && permMap["add_leads"]) isAuthorizedForAutoExec = true;
      if (actionType === "UPDATE_LEAD_STATUS" && (permMap["change_lead_status"] || permMap["edit_leads"])) isAuthorizedForAutoExec = true;
      if (actionType === "UPDATE_LEAD_PRIORITY" && (permMap["change_lead_priority"] || permMap["edit_leads"])) isAuthorizedForAutoExec = true;
      if (actionType === "ADD_NOTE" && permMap["add_notes"]) isAuthorizedForAutoExec = true;
      if (actionType === "UPDATE_TAG" && (permMap["add_tags"] || permMap["edit_leads"])) isAuthorizedForAutoExec = true;
      if (actionType === "MODIFY_FOLLOWUP" && permMap["edit_followups"]) isAuthorizedForAutoExec = true;
      if (actionType === "CREATE_FOLLOWUP" && permMap["create_followups"]) isAuthorizedForAutoExec = true;
      if (actionType === "DELETE_LEAD" && permMap["delete_leads"]) isAuthorizedForAutoExec = true;
      if (actionType === "DELETE_NOTE" && permMap["delete_notes"]) isAuthorizedForAutoExec = true;
      if ((actionType === "DELETE_FOLLOWUP" || actionType === "DELETE_ALL_FOLLOWUPS_FOR_LEAD") && permMap["delete_followups"]) isAuthorizedForAutoExec = true;
      if (actionType === "DELETE_MULTIPLE_LEADS" && permMap["delete_leads"]) isAuthorizedForAutoExec = true;
      if (actionType === "MOVE_HOT_LEADS_TO_TODAY" && (permMap["edit_followups"] || permMap["create_followups"])) isAuthorizedForAutoExec = true;

      // If the user wants to forcefully bypass for some admin cases, or if authorized
      if (options?.adminOverride || isAuthorizedForAutoExec) {
        try {
          const params = geminiOutput.requestedAction.params;
          let executionMessage = "";

          switch (actionType) {
            case "CREATE_LEAD": {
              const newLead = await prisma.lead.create({
                data: {
                  clientId,
                  name: params.name || "Unnamed Prospect",
                  phoneNumber: params.phoneNumber || "+00000000",
                  email: params.email || null,
                  source: params.source || "Manual",
                  status: params.status || "New",
                  priority: params.priority || "Warm",
                  leadScore: params.priority === "Hot" ? 70 : 40,
                  urgencyLevel: params.priority === "Hot" ? "High" : "Medium",
                },
              });
              executionMessage = `Successfully created lead "${newLead.name}" (${newLead.phoneNumber}) under status ${newLead.status}.` + 
                (params.note ? ` Adding first CRM Note.` : "");

              if (params.note) {
                await prisma.leadNote.create({
                  data: { leadId: newLead.id, note: params.note },
                });
              }
              break;
            }

            case "UPDATE_LEAD_STATUS": {
              const updated = await prisma.lead.update({
                where: { id: params.leadId },
                data: { status: params.status },
              });
              executionMessage = `Status updated successfully. Lead "${updated.name}" is now categorised under "${updated.status}".`;
              break;
            }

            case "UPDATE_LEAD_PRIORITY": {
              const updated = await prisma.lead.update({
                where: { id: params.leadId },
                data: { priority: params.priority },
              });
              executionMessage = `Priority updated successfully. Lead "${updated.name}" has been adjusted to ${updated.priority} priority.`;
              break;
            }

            case "ADD_NOTE": {
              const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
              await prisma.leadNote.create({
                data: { leadId: params.leadId, note: params.note },
              });
              executionMessage = `Note added successfully to lead "${leadObj?.name || "Prospect"}": "${params.note}"`;
              break;
            }

            case "UPDATE_TAG": {
              const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
              await prisma.leadTag.create({
                data: { leadId: params.leadId, tag: params.tag },
              });
              executionMessage = `Added tag [${params.tag}] successfully to "${leadObj?.name || "Prospect"}".`;
              break;
            }

            case "MODIFY_FOLLOWUP": {
              const updated = await prisma.followUp.update({
                where: { id: params.followUpId },
                data: { scheduledAt: new Date(params.scheduledAt) },
              });
              executionMessage = `Rescheduled follow-up task ${updated.id} to occur at ${new Date(params.scheduledAt).toLocaleString()}.`;
              break;
            }

            case "CREATE_FOLLOWUP": {
              let finalLeadId = params.leadId;
              let finalLeadName = params.leadName || "Prospect";
              if (!finalLeadId && params.leadName) {
                const newLead = await prisma.lead.create({
                  data: {
                    clientId,
                    name: params.leadName,
                    phoneNumber: params.phoneNumber || "+1 (555) 019-2834",
                    source: "Manual",
                    status: "New",
                    priority: "Warm",
                    leadScore: 40,
                    urgencyLevel: "Medium",
                  }
                });
                finalLeadId = newLead.id;
                finalLeadName = newLead.name;
              }

              const created = await prisma.followUp.create({
                data: {
                  leadId: finalLeadId,
                  scheduledAt: new Date(params.scheduledAt),
                  status: "Pending",
                  message: params.message || "Scheduled follow-up reminder requested",
                  followUpType: params.followUpType || "Soft",
                }
              });
              executionMessage = `Successfully scheduled a follow-up task for lead "${finalLeadName}" on ${new Date(params.scheduledAt).toLocaleString()}.`;
              break;
            }

            case "DELETE_LEAD": {
              const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
              await prisma.lead.delete({
                where: { id: params.leadId },
              });
              executionMessage = `Lead "${leadObj?.name || "Prospect"}" has been successfully deleted along with notes and followups.`;
              break;
            }

            case "DELETE_NOTE": {
              await prisma.leadNote.delete({
                where: { id: params.noteId },
              });
              executionMessage = `CRM Lead Note was successfully removed.`;
              break;
            }

            case "DELETE_FOLLOWUP": {
              await prisma.followUp.delete({
                where: { id: params.followUpId },
              });
              executionMessage = `Scheduled follow-up reminder has been canceled and deleted.`;
              break;
            }

            case "DELETE_ALL_FOLLOWUPS_FOR_LEAD": {
              const leadObj = await prisma.lead.findUnique({ where: { id: params.leadId } });
              const result = await prisma.followUp.deleteMany({
                where: { leadId: params.leadId },
              });
              executionMessage = `Successfully deleted all (${result.count}) follow-up tasks of lead "${leadObj?.name || "Prospect"}".`;
              break;
            }

            case "DELETE_MULTIPLE_LEADS": {
              const count = params.leadIds?.length || 0;
              if (count > 0) {
                await prisma.lead.deleteMany({
                  where: {
                    id: { in: params.leadIds },
                    clientId: clientId,
                  },
                });
              }
              executionMessage = `Purged and cleared ${count} junk leads from the CRM system successfully.`;
              break;
            }

            case "MOVE_HOT_LEADS_TO_TODAY": {
              const hotLeadIds = leads.filter(l => l.priority === "Hot" && l.status !== "Lost").map(l => l.id);
              let rescheduledCount = 0;
              const todayEnd = new Date();
              todayEnd.setHours(17, 0, 0, 0);

              for (const leadId of hotLeadIds) {
                await prisma.followUp.create({
                  data: {
                    leadId,
                    scheduledAt: todayEnd,
                    status: "Pending",
                    message: "High priority same-day follow-up arranged by LeadSmart Business Advisor",
                    followUpType: "Soft",
                  },
                });
                rescheduledCount++;
              }
              executionMessage = `Restructured client activities. Successfully created same-day urgent followups for all (${rescheduledCount}) Active Hot prospects.`;
              break;
            }
          }

          // Register Action Log in DB as executed directly
          await prisma.aIActionsLog.create({
            data: {
              clientId,
              actionType: actionType,
              targetEntity: getEntityFromActionType(actionType),
              targetId: params.leadId || params.followUpId || "multiple",
              actionDescription: `Directly Executed: ${executionMessage}`,
              status: "Executed",
            },
          });

          // Save AIChatHistory log
          await prisma.aIChatHistory.create({
            data: {
              clientId,
              message: input,
              response: `[Auto-Executed] ${executionMessage}`,
            },
          });

          // Return response directly with requiresConfirmation: false
          return {
            message: `🎉 **Action Executed Directly:**\n\n${executionMessage}`,
            actionType: "NONE",
            suggestions: ["Who are my hot leads?", "Show pipeline audit summary", "Analyze pipeline health"],
            warnings: [],
            dataSummary: {
              totalLeads: await prisma.lead.count({ where: { clientId } }),
              hotLeads: await prisma.lead.count({ where: { clientId, priority: "Hot" } }),
              missedFollowUps: missedFollowUpsCount,
              pendingFollowUps: pendingFollowUpsCount,
              potentialRevenueScore: "Healthy Pipeline Trajectory",
            },
          };

        } catch (execErr: any) {
          console.error("Direct lead operation execution failed:", execErr);
          // Fall back to standard confirmation loop below if execution fails
        }
      }

      // Create pending action record in DB
      let descriptionStr = JSON.stringify({
        type: geminiOutput.requestedAction?.type,
        ...geminiOutput.requestedAction?.params,
      });

      const pendingLog = await prisma.aIActionsLog.create({
        data: {
          clientId,
          actionType: geminiOutput.requestedAction?.type || "SYSTEM_MODIFY",
          targetEntity: getEntityFromActionType(geminiOutput.requestedAction?.type),
          targetId: geminiOutput.requestedAction?.params?.leadId || geminiOutput.requestedAction?.params?.followUpId || "multiple",
          actionDescription: descriptionStr,
          status: "Pending",
        },
      });

      // Inject the pendingActionId inside the return payload
      return {
        ...geminiOutput,
        pendingActionId: pendingLog.id,
        requiresConfirmation: true,
      };
    }
  }

  // --- STANDARD READ / NONE LOGGING & TERMINATION ---
  // Save AIChatHistory log
  await prisma.aIChatHistory.create({
    data: {
      clientId,
      message: input,
      response: geminiOutput.message,
    },
  });

  return geminiOutput;
}

function getEntityFromActionType(actionType?: string): string {
  if (!actionType) return "System";
  if (actionType.includes("FOLLOWUP")) return "FollowUp";
  if (actionType.includes("LEAD")) return "Lead";
  if (actionType.includes("NOTE")) return "Note";
  return "System";
}

function parseNaturalLanguageDateTime(input: string): Date {
  const targetDate = new Date();
  const lowInput = input.toLowerCase();

  if (lowInput.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lowInput.includes("next week")) {
    targetDate.setDate(targetDate.getDate() + 7);
  } else if (lowInput.includes("day after tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else {
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < 7; i++) {
      if (lowInput.includes(daysOfWeek[i])) {
        const currentDay = targetDate.getDay();
        let daysToAdd = i - currentDay;
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        break;
      }
    }
  }

  let hours = 9;
  let minutes = 0;

  const pmRegex = /(\d{1,2})\s*(?:pm|p\.m\.)/i;
  const amRegex = /(\d{1,2})\s*(?:am|a\.m\.)/i;
  const colonTimeRegex = /(\d{1,2}):(\d{2})/i;

  const pmMatch = pmRegex.exec(lowInput);
  const amMatch = amRegex.exec(lowInput);
  const colonMatch = colonTimeRegex.exec(lowInput);

  if (colonMatch) {
    hours = parseInt(colonMatch[1], 10);
    minutes = parseInt(colonMatch[2], 10);
    if (lowInput.includes("pm") && hours < 12) {
      hours += 12;
    }
  } else if (pmMatch) {
    const matchedHour = parseInt(pmMatch[1], 10);
    hours = matchedHour === 12 ? 12 : matchedHour + 12;
  } else if (amMatch) {
    const matchedHour = parseInt(amMatch[1], 10);
    hours = matchedHour === 12 ? 0 : matchedHour;
  } else {
    const atNumberMatch = /at\s+(\d{1,2})/i.exec(lowInput);
    if (atNumberMatch) {
      const num = parseInt(atNumberMatch[1], 10);
      if (num < 8) {
        hours = num + 12;
      } else {
        hours = num;
      }
    }
  }

  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}
