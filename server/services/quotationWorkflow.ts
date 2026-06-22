import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";
import { generateQuotationPdf } from "./pdfGenerator.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

interface ExtractedSpecs {
  isProductRequest: boolean;
  product: string | null;
  size: string | null;
  quantity: number | null;
}

/**
 * Extracts product specifications from a message using Gemini AI.
 */
export async function extractSpecsFromMessage(message: string): Promise<ExtractedSpecs> {
  try {
    console.log(`[AI Spec Extractor] Extracting product specifications for message: "${message}"`);
    
    const systemInstruction = `You are an expert product spec parser. Extract product request specifications from user messages.
Always return a raw JSON object matching this schema EXACTLY:
{
  "isProductRequest": boolean, // True if the message specifies or requests a specific product/item, size, and/or quantity for an order or quotation.
  "product": string | null,    // Name of the product (e.g., "Paper Bag", "Corrugated Box" etc.)
  "size": string | null,       // Format of dimensions/size (e.g., "H28×W12×G5", "12x12" etc.)
  "quantity": number | null    // Numerical quantity requested (e.g., 5000), parsed to integer.
}
Do not include any markdown format tags like \`\`\`json. Return only the raw JSON string.`;

    const response = await safeGenerateContent(ai, {
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text) as ExtractedSpecs;
    
    // Normalize numeric quantity
    if (parsed.quantity) {
      parsed.quantity = Math.round(Number(parsed.quantity));
    }
    
    return parsed;
  } catch (error) {
    console.error("[AI Spec Extractor Error] Failed to extract specifications:", error);
    return {
      isProductRequest: false,
      product: null,
      size: null,
      quantity: null
    };
  }
}

/**
 * Processes an inbound client message to assess Product Existing vs Product Missing flows.
 */
export async function processInboundMessageWorkflow(leadId: string, message: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { client: true }
    });

    if (!lead) return;
    const client = lead.client;

    // 1. Extract specifications
    const specs = await extractSpecsFromMessage(message);
    if (!specs.isProductRequest || !specs.product) {
      console.log(`[Quotation Workflow] Message doesn't represent a product request. Skipping workflow.`);
      return;
    }

    console.log(`[Quotation Workflow] Extracted specs:`, specs);

    // Save extracted specs on lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        customOrderSpecs: JSON.stringify(specs)
      }
    });

    // 2. Search Products database
    const products = await prisma.productRecord.findMany({
      where: { clientId: client.id },
      include: { values: { include: { productField: true } } }
    });

    // Strategy: Search for exact name match (normalized) or use Gemini comparison
    let matchedProduct: any = null;
    const normalizedQueryProduct = specs.product.toLowerCase().replace(/\s+/g, "");

    for (const p of products) {
      const normalizedName = p.name.toLowerCase().replace(/\s+/g, "");
      if (normalizedName === normalizedQueryProduct) {
        matchedProduct = p;
        break;
      }
    }

    if (!matchedProduct && products.length > 0) {
      // Use lightweight Gemini comparison to cross-check catalog
      console.log(`[Quotation Workflow] Doing semantic verification for catalog matching...`);
      const catalogList = products.map(p => `ID: ${p.id}, Name: ${p.name}`).join("\n");
      const systemInstruction = `Verify if the user requested product '${specs.product}' is already present in this catalog:
${catalogList}
Return the matching ID as JSON {\"matchedId\": \"some-uuid\" | null}. If no highly relevant match exists, return null.`;

      try {
        const response = await safeGenerateContent(ai, {
          model: "gemini-3.5-flash",
          contents: "Find match",
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          }
        });
        const matchResult = JSON.parse(response.text || "{}");
        if (matchResult && matchResult.matchedId) {
          matchedProduct = products.find(p => p.id === matchResult.matchedId);
        }
      } catch (err) {
        console.error("[Quotation Workflow] LLM catalog verify failed:", err);
      }
    }

    // SCENARIO 1 — Product Exists OR SCENARIO 2 — Product Not Found
    if (matchedProduct) {
      console.log(`[Quotation Workflow Match] Found product match: "${matchedProduct.name}" (ID: ${matchedProduct.id})`);
      
      // Determine Price
      let unitPrice = 8.50; // default baseline price
      
      // Look up custom price fields if present
      const priceVal = matchedProduct.values.find((v: any) => 
        v.productField.fieldName.toLowerCase().includes("price") || 
        v.productField.fieldName.toLowerCase().includes("rate")
      );
      if (priceVal && priceVal.value) {
        const parsedPrice = parseFloat(priceVal.value.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          unitPrice = parsedPrice;
        }
      }

      const quantity = specs.quantity || 5000;
      const subtotal = quantity * unitPrice;
      const discount = 0; // standard default
      const gstPercent = 18; // standard GST
      const gstAmount = subtotal * (gstPercent / 100);
      const grandTotal = subtotal + gstAmount;

      const quotationNumber = `QT-${Math.floor(1000 + Math.random() * 9000)}`;

      // Automatically generate quotation record (PENDING_APPROVAL status)
      const quote = await prisma.quotation.create({
        data: {
          clientId: client.id,
          leadId: lead.id,
          quotationNumber,
          status: "PENDING_APPROVAL", // custom status pending owner choice
          products: JSON.stringify([{
            productName: matchedProduct.name,
            description: `Size: ${specs.size || "Standard"}, Requested via Automated AI Assistant.`,
            quantity,
            unitPrice,
            discount: 0,
            gst: gstPercent,
            tax: 0,
            deliveryCharges: 0
          }]),
          subtotal,
          discountPercent: 0,
          discountAmount: 0,
          gstPercent,
          gstAmount,
          taxPercent: 0,
          taxAmount: 0,
          deliveryCharges: 0,
          grandTotal
        }
      });

      // Send WhatsApp approval notification to owner (recorded in simulated OwnerAlert & sent via Meta Graph API if configured)
      const recipientPhone = client.approvalNotificationNumber || client.ownerWhatsApp || "+91 9876543210";
      const leadName = lead.name;

      const alertMessage = `📄 Quotation Approval Required

Lead:
${leadName}

Product:
${matchedProduct.name}

Size:
${specs.size || "Standard"}

Quantity:
${quantity}

Amount:
₹${grandTotal.toLocaleString('en-IN')}

Quotation ID:
${quotationNumber}`;

      const alert = await prisma.ownerAlert.create({
        data: {
          clientId: client.id,
          leadId: lead.id,
          title: "📄 Quotation Approval Required",
          message: alertMessage,
          type: "QUOTATION_APPROVAL",
          status: "PENDING",
          amount: grandTotal,
          quoteId: quote.id,
          specs: JSON.stringify(specs)
        }
      });

      // Actual WhatsApp notification dispatch to Owner's real WhatsApp number
      if (client.whatsappToken && client.whatsappPhoneId && recipientPhone) {
        try {
          const cleanPhone = recipientPhone.replace(/\D/g, "");
          if (cleanPhone) {
            console.log(`[WhatsApp Dispatch] Dispatching approval alert to Owner: ${cleanPhone}`);
            await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${client.whatsappToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "text",
                text: { body: alertMessage }
              })
            });
          }
        } catch (dispatchErr) {
          console.error(`[WhatsApp Dispatch Error] Failed to send approval alert via WhatsApp to Owner:`, dispatchErr);
        }
      }

      console.log(`[Quotation Workflow] Generated Quotation ${quotationNumber} with PENDING_APPROVAL status. Alert ID: ${alert.id}`);

    } else {
      console.log(`[Quotation Workflow Missing] Product "${specs.product}" not found. Executing Scenario 2.`);

      // Flag custom order mismatch on Lead - transition status to "Custom Order" and stage to "CUSTOM_ORDER"
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          customOrderRequired: true,
          status: "Custom Order",
          currentStage: "CUSTOM_ORDER"
        }
      });

      // Send WhatsApp custom order alert to owner
      const recipientPhone = client.approvalNotificationNumber || client.ownerWhatsApp || "+91 9876543210";
      const alertMessage = `🚨 Custom Order Alert!

Lead:
${lead.name}

Product:
${specs.product}

Size:
${specs.size || "H28×W12×G5"}

Quantity:
${specs.quantity || 5000}

This product does *not* exist in your Products database. Owner action is required.`;

      const alert = await prisma.ownerAlert.create({
        data: {
          clientId: client.id,
          leadId: lead.id,
          title: "🚨 Custom Order Alert!",
          message: alertMessage,
          type: "CUSTOM_ORDER_ALERT",
          status: "PENDING",
          specs: JSON.stringify(specs)
        }
      });

      // Actual WhatsApp notification dispatch to Owner's real WhatsApp number for custom orders
      if (client.whatsappToken && client.whatsappPhoneId && recipientPhone) {
        try {
          const cleanPhone = recipientPhone.replace(/\D/g, "");
          if (cleanPhone) {
            console.log(`[WhatsApp Dispatch] Dispatching custom order alert to Owner: ${cleanPhone}`);
            await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${client.whatsappToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "text",
                text: { body: alertMessage }
              })
            });
          }
        } catch (dispatchErr) {
          console.error(`[WhatsApp Dispatch Error] Failed to send custom order alert via WhatsApp to Owner:`, dispatchErr);
        }
      }

      // Add a nice visual activity note to lead timelines
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          activityType: "STATUS_CHANGE",
          description: `CRM AI Warning: Custom order "${specs.product}" (size: ${specs.size || "N/A"}, qty: ${specs.quantity || "N/A"}) requested but NOT found in matching product listings. Owner alerts sent.`
        }
      });

      // Log Stage history Node
      await prisma.leadStageHistory.create({
        data: {
          leadId: lead.id,
          oldStage: lead.currentStage || "NEW",
          newStage: "CUSTOM_ORDER",
          reason: "Product is missing from standard catalog. Transitioning to CUSTOM_ORDER pipeline stage.",
          confidence: 100
        }
      });

      console.log(`[Quotation Workflow] Custom order registered for Lead. Alert ID: ${alert.id}`);
    }

  } catch (error) {
    console.error(`[Quotation Workflow Error] Error executing automation:`, error);
  }
}
