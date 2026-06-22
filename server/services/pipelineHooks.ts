import { prisma } from "../db.js";

/**
 * Automatically evaluates and transitions Lead pipeline stage/status in response to new message events.
 */
export async function evaluatePipelineStateAfterMessage(leadId: string, direction: "IN" | "OUT", content: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return;

    if (lead.customOrderRequired) {
      console.log(`[Pipeline Hooks] Lead "${lead.name}" has customOrderRequired: true. Keeping Custom Order state, skipping auto pipeline updates.`);
      return;
    }

    if (direction === "IN") {
      // Rule 1: Customer asks for a quote/quotation -> Set status to 'Qualified' and currentStage to 'QUALIFICATION'
      const lowContent = content.toLowerCase();
      const quoteKeywords = [
        "quote", "quotation", "quatation", "estimate", "rate list", "price list", 
        "pricing estimation", "pricing details", "how much for", "price sheet", 
        "cost estimate", "bulk pricing", "custom estimate", "how much is", "what's the cost"
      ];
      const matchesQuoteRequest = quoteKeywords.some(k => lowContent.includes(k));

      if (matchesQuoteRequest) {
        let statusUpdated = false;
        let dataToUpdate: any = {};

        if (lead.status !== "Qualified") {
          dataToUpdate.status = "Qualified";
          statusUpdated = true;
        }

        if (lead.currentStage !== "QUALIFICATION") {
          dataToUpdate.currentStage = "QUALIFICATION";
          dataToUpdate.previousStage = lead.currentStage;
          statusUpdated = true;
        }

        if (statusUpdated) {
          console.log(`[Pipeline Hooks] Inbound message requests quotation. Auto-updating lead ${lead.name} to Qualified / QUALIFICATION.`);
          
          await prisma.lead.update({
            where: { id: leadId },
            data: dataToUpdate
          });

          // Log Activity feed
          await prisma.leadActivity.create({
            data: {
              leadId,
              activityType: "STATUS_CHANGE",
              description: `Automated CRM System: Upgraded status to "Qualified" and pipeline stage to "QUALIFICATION" due to incoming quotation request.`
            }
          });

          // Log Stage history Node
          await prisma.leadStageHistory.create({
            data: {
              leadId,
              oldStage: lead.currentStage || "NEW",
              newStage: "QUALIFICATION",
              reason: "Inbound customer quotation request auto-qualifies the lead.",
              confidence: 100
            }
          });
        }
      }
    } else if (direction === "OUT") {
      // Rule 2: Outgoing quotation sent -> Set status to 'Quotation Sent' and currentStage to 'QUOTATION'
      const lowContent = content.toLowerCase();
      const outboundQuoteKeywords = [
        "your quote", "here's the quote", "here is the quote", "quotation is ready", "quotation details",
        "attached pricing", "price breakdown", "cost breakdown", "quoted price", "total cost", 
        "grand total", "pricing option", "price estimate", "formal quotation", "commercial invoice",
        "estimate details", "rate estimate", "sending the quote", "price of"
      ];
      const matchesOutboundQuote = outboundQuoteKeywords.some(k => lowContent.includes(k));

      if (matchesOutboundQuote) {
        let statusUpdated = false;
        let dataToUpdate: any = {};

        if (lead.status !== "Quotation Sent") {
          dataToUpdate.status = "Quotation Sent";
          statusUpdated = true;
        }

        if (lead.currentStage !== "QUOTATION") {
          dataToUpdate.currentStage = "QUOTATION";
          dataToUpdate.previousStage = lead.currentStage;
          statusUpdated = true;
        }

        if (statusUpdated) {
          console.log(`[Pipeline Hooks] Outbound message delivers quotation. Auto-updating lead ${lead.name} to Quotation Sent / QUOTATION.`);

          await prisma.lead.update({
            where: { id: leadId },
            data: dataToUpdate
          });

          // Log Activity feed
          await prisma.leadActivity.create({
            data: {
              leadId,
              activityType: "STATUS_CHANGE",
              description: `Automated CRM System: Updated status to "Quotation Sent" and pipeline stage to "QUOTATION" after outgoing quotation delivery.`
            }
          });

          // Log Stage history Node
          await prisma.leadStageHistory.create({
            data: {
              leadId,
              oldStage: lead.currentStage || "NEW",
              newStage: "QUOTATION",
              reason: "Outgoing message matches commercial quotation signature. Transitioning stage.",
              confidence: 100
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("[Pipeline Hooks Error] Failed to evaluate message hooks:", err);
  }
}
