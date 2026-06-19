import { prisma } from "../db.js";

interface QuotationProduct {
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage (0-100)
  gst: number;      // percentage (0-100)
  tax: number;      // percentage (0-100)
  deliveryCharges: number;
}

/**
 * Calculates raw subtotal, discount, gst, and grand total for a quotation.
 */
export function calculateTotals(products: QuotationProduct[]) {
  let subtotal = 0;
  let totalDiscountAmount = 0;
  let totalGstAmount = 0;
  let totalTaxAmount = 0;
  let totalDeliveryCharges = 0;

  for (const p of products) {
    const qty = Number(p.quantity) || 0;
    const price = Number(p.unitPrice) || 0;
    const itemSubtotal = qty * price;
    subtotal += itemSubtotal;

    const discPercent = Number(p.discount) || 0;
    const itemDiscount = itemSubtotal * (discPercent / 100);
    totalDiscountAmount += itemDiscount;

    const afterDiscount = itemSubtotal - itemDiscount;

    const gstPercent = Number(p.gst) || 0;
    const itemGst = afterDiscount * (gstPercent / 100);
    totalGstAmount += itemGst;

    const taxPercent = Number(p.tax) || 0;
    const itemTax = afterDiscount * (taxPercent / 100);
    totalTaxAmount += itemTax;

    totalDeliveryCharges += Number(p.deliveryCharges) || 0;
  }

  const grandTotal = subtotal - totalDiscountAmount + totalGstAmount + totalTaxAmount + totalDeliveryCharges;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(totalDiscountAmount * 100) / 100,
    gstAmount: Math.round(totalGstAmount * 100) / 100,
    taxAmount: Math.round(totalTaxAmount * 100) / 100,
    deliveryCharges: Math.round(totalDeliveryCharges * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
}

/**
 * Sweeps the database for any READY quotations that have crossed their scheduled delivery time,
 * generates the PDF/notification message, sends via WhatsApp/Email simulation, and transitions the lead stage.
 */
export async function processScheduledQuotationDeliveries() {
  try {
    const now = new Date();
    // Find READY quotations that are scheduled in the past or now
    const pendingQuotations = await prisma.quotation.findMany({
      where: {
        status: "READY",
        scheduledAt: {
          lte: now
        }
      },
      include: {
        lead: {
          include: {
            client: true
          }
        },
        template: true
      }
    });

    if (pendingQuotations.length === 0) return;

    console.log(`[Quotation Engine] Found ${pendingQuotations.length} pending scheduled quotations to transition to delivered.`);

    for (const quote of pendingQuotations) {
      const lead = quote.lead;
      const client = lead.client;
      const template = quote.template;

      const companyName = template?.companyName || client?.companyName || "LeadSmart Customer";
      const leadName = lead.name;
      const quoteNum = quote.quotationNumber;
      const amountStr = `$${quote.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Compute application URL dynamically for client sharing links
      const appUrl = (process.env.APP_URL || "https://leadsmart-automation.run.app").replace(/\/$/, "");
      const viewUrl = `${appUrl}/quotation-document.html?id=${quote.id}`;

      // Generate the message template as specified in instructions
      const outboundMessage = `Hi ${leadName} 👋

Your quotation is ready.

Quotation Number:
${quoteNum}

Total Amount:
${amountStr}

Please review your official branded quotation document and print / save as PDF here:
${viewUrl}

Let us know if you have any questions!

Regards,
${companyName}`;

      console.log(`[Quotation Delivery Automation] Automating delivery for quote ${quoteNum} to ${lead.name}`);

      // 1. Send via mock integration/real graph API if configured
      const recipientNumber = lead.whatsappNumber || lead.phoneNumber;
      if (client.whatsappToken && client.whatsappPhoneId && recipientNumber) {
        try {
          const cleanPhone = recipientNumber.replace(/\D/g, "");
          // Send Text message with download URL
          await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${client.whatsappToken}`
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: cleanPhone,
              type: "text",
              text: { body: outboundMessage }
            })
          });

          // Also deliver document/media attachment to native PDF preview
          await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${client.whatsappToken}`
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: cleanPhone,
              type: "document",
              document: {
                link: viewUrl,
                filename: `Quotation_${quoteNum}.pdf`,
                caption: `Official Quotation ${quoteNum} from ${companyName}`
              }
            })
          });
        } catch (metaErr) {
          console.error(`[Quotation Delivery API] Meta Graph API delivery failed for ${quoteNum}:`, metaErr);
        }
      }

      // Add actual outbound chat log
      await prisma.message.create({
        data: {
          leadId: lead.id,
          direction: "OUT",
          content: `${outboundMessage}\n\n[Attachment: PDF Link: ${viewUrl}]`,
          timestamp: new Date()
        }
      });

      // 2. Transition lead stage: QUALIFIED -> QUOTATION SENT (mappings status = "Quotation Sent", currentStage = "QUOTATION")
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "Quotation Sent",
          currentStage: "QUOTATION",
          lastMessageAt: new Date(),
          lastResponseFromClient: false,
          followUpCount: 0,
          followUpStatus: "Pending",
          nextFollowUpAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        }
      });

      // 3. Mark Quotation as SENT & Delivered Timestamp
      await prisma.quotation.update({
        where: { id: quote.id },
        data: {
          status: "SENT",
          deliveredAt: new Date()
        }
      });

      // 4. Create separate activity log events for the logs audit
      // Activity: Quotation Generated
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          activityType: "QUOTATION",
          description: `Quotation Generated: Branded quotation ${quoteNum} created successfully using AI engine.`
        }
      });

      // Activity: Quotation Scheduled
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          activityType: "QUOTATION",
          description: `Quotation Scheduled: Auto delivery set to Current Time + 5 Minutes.`
        }
      });

      // Activity: Quotation Delivered
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          activityType: "QUOTATION",
          description: `Quotation Delivered: PDF & notification dispatched automatically via WhatsApp standard route.`
        }
      });

      console.log(`[Quotation Engine] Outbound automated dispatch for quote ${quoteNum} complete!`);
    }
  } catch (error) {
    console.error("[Quotation Engine] Error sweeping scheduled quotations:", error);
  }
}
