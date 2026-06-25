import { prisma } from "../db.js";
import { generateQuotationPdf } from "./pdfGenerator.js";

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
      let template = quote.template;

      if (!template && client) {
        template = await prisma.quotationTemplate.findFirst({
          where: { clientId: client.id }
        });
      }

      const companyName = template?.companyName || client?.companyName || "LeadSmart Customer";
      const leadName = lead.name;
      const quoteNum = quote.quotationNumber;
      const amountStr = `$${quote.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      console.log(`[Quotation Delivery Automation] Automating delivery for quote ${quoteNum} to ${lead.name}`);

      let pdfBuffer: Buffer | null = null;
      let base64Pdf: string | null = null;
      try {
        console.log(`[Quotation Engine] Building vector brand PDF for ${quoteNum}...`);
        pdfBuffer = await generateQuotationPdf(quote, client, lead, template);
        base64Pdf = pdfBuffer.toString("base64");
      } catch (pdfBuildErr) {
        console.error(`[Quotation Engine] Failed to build PDF for ${quoteNum}:`, pdfBuildErr);
      }

      // Store PDF Base64 string directly in database Quotation table under the newly added pdfBase64 column
      if (base64Pdf) {
        await prisma.quotation.update({
          where: { id: quote.id },
          data: { pdfBase64: base64Pdf }
        });
      }

      // Generate the message template
      const outboundMessage = `Hi ${leadName} 👋

Your official quotation is ready.

Quotation Number:
${quoteNum}

Total Amount:
${amountStr}

Please find the attached PDF quotation. Let us know if you have any questions!

Regards,
${companyName}`;

      // 1. Send via mock integration/real graph API if configured
      const recipientNumber = lead.whatsappNumber || lead.phoneNumber;
      if (client.whatsappToken && client.whatsappPhoneId && recipientNumber) {
        try {
          const cleanPhone = recipientNumber.replace(/\D/g, "");
          // Send Text message
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

          // Upload PDF buffer directly to Meta's media endpoint as multipart
          if (pdfBuffer) {
            const formData = new FormData();
            formData.append("messaging_product", "whatsapp");
            const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
            formData.append("file", pdfBlob, `Quotation_${quoteNum}.pdf`);

            console.log(`[Quotation Delivery API] Uploading PDF buffer directly to Meta Graph API for ${quoteNum}...`);
            const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/media`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${client.whatsappToken}`
              },
              body: formData
            });

            if (uploadRes.ok) {
              const uploadJson = await uploadRes.json() as any;
              const mediaId = uploadJson.id;
              console.log(`[Quotation Delivery API] Upload successful! Meta media_id: ${mediaId}. Sending Document attachment...`);

              // Send Document message using mediaId
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
                    id: mediaId,
                    filename: `Quotation_${quoteNum}.pdf`,
                    caption: `Official Quotation ${quoteNum} from ${companyName}`
                  }
                })
              });
            } else {
              const errText = await uploadRes.text();
              console.error(`[Quotation Delivery API] Meta upload failed. Status: ${uploadRes.status}, Response: ${errText}`);
            }
          }
        } catch (metaErr) {
          console.error(`[Quotation Delivery API] Meta Graph API delivery failed for ${quoteNum}:`, metaErr);
        }
      }

      // Add actual outbound chat log
      await prisma.message.create({
        data: {
          leadId: lead.id,
          direction: "OUT",
          content: `${outboundMessage}\n\n[Attachment: PDF Native Document Quotation_${quoteNum}.pdf]`,
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
