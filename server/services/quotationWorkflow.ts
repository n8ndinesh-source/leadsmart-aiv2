import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../db.js";
import { safeGenerateContent } from "./geminiHelper.js";
import { generateQuotationPdf } from "./pdfGenerator.js";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Quotation Workflow] GEMINI_API_KEY is not defined in environment variables!");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 120000,
      }
    });
  }
  return aiClient;
}

interface ExtractedSpecs {
  isProductRequest: boolean;
  product: string | null;
  size: string | null;
  quantity: number | null;
  productCode?: string | null;
  deliveryAddress?: string | null;
  isCustomRequest?: boolean;
  customProductDetails?: string | null;
}

/**
 * Extracts product specifications from a message using Gemini AI.
 */
export async function extractSpecsFromMessage(message: string, context?: string): Promise<ExtractedSpecs> {
  try {
    console.log(`[AI Spec Extractor] Extracting product specifications for message: "${message}". Context provided: ${!!context}`);
    
    const systemInstruction = `You are an expert product spec parser. Extract product request specifications from user messages.
We also provide some recent conversation context to help you resolve pronouns, implicit products, or codes (e.g., if the assistant asks "what size bagasse plate do you want?" and the customer replies "10 inches, no compartment", then the product is "Bagasse Plate", the size is "10 inches, no compartment").

Analyze the message to see if they mentioned a product code (e.g. BP-10N, areca-01) or if they are requesting a custom-made product that does not have a standard catalog code.

Always return a raw JSON object matching this schema EXACTLY:
{
  "isProductRequest": boolean,         // True if the message specifies or requests a specific product/item, code, size, and/or quantity for an order or quotation.
  "product": string | null,            // Name of the product (e.g., "Paper Bag", "Corrugated Box", "Bagasse Plate", etc.)
  "size": string | null,               // Format of dimensions/size (e.g., "H28×W12×G5", "10 inches", "12x12" etc.)
  "quantity": number | null,           // Numerical quantity requested (e.g., 5000), parsed to integer.
  "productCode": string | null,        // Product code if mentioned by the customer (e.g., "BP-10N", "ARECA-01")
  "deliveryAddress": string | null,    // Delivery address if provided
  "isCustomRequest": boolean,          // True if the user asks for a customized, custom-designed, or bespoke product that doesn't seem to be a standard catalog code item.
  "customProductDetails": string | null // Details of the custom request
}
Do not include any markdown format tags like \`\`\`json. Return only the raw JSON string.`;

    const instructionsAndContent = context
      ? `Recent Conversation Context:\n${context}\n\nLatest Customer Message to parse:\n"${message}"`
      : message;

    const response = await safeGenerateContent(getGeminiClient(), {
      model: "gemini-3.5-flash",
      contents: instructionsAndContent,
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
    console.error("[AI Spec Extractor Error] Failed to extract specifications with Gemini. Applying regex fallback...", error);
    try {
      return parseSpecsFallback(message);
    } catch (fallbackError) {
      console.error("[AI Spec Extractor Fallback Error] Regex fallback also failed:", fallbackError);
      return {
        isProductRequest: false,
        product: null,
        size: null,
        quantity: null
      };
    }
  }
}

/**
 * Deterministic regex fallback parsing for extracting specs when the AI is down.
 */
function parseSpecsFallback(message: string): ExtractedSpecs {
  console.log(`[AI Spec Extractor Fallback] Attempting deterministic regex parsing on: "${message}"`);
  
  const specs: ExtractedSpecs = {
    isProductRequest: false,
    product: null,
    size: null,
    quantity: null,
    productCode: null,
    deliveryAddress: null,
    isCustomRequest: false,
    customProductDetails: null
  };

  const lowMsg = message.toLowerCase();

  // 1. Extract Pincode (6-digit Indian PIN)
  const pincodeMatch = message.match(/\b\d{6}\b/) || message.match(/(?:pincode|pin|zip|pincod)\s*:?\s*(\d+)/i);
  if (pincodeMatch) {
    specs.deliveryAddress = pincodeMatch[0].replace(/[^0-9]/g, "");
  }

  // 2. Extract Quantity
  // Match numbers followed by piece/pcs/unit/qty/etc.
  const qtyPattern = /(\d+)\s*(?:piece|pcs|unit|qty|quantity|packet|box|no|nos|plate|bowl|bag|cup)/i;
  const qtyMatch = message.match(qtyPattern);
  if (qtyMatch) {
    specs.quantity = parseInt(qtyMatch[1], 10);
  } else {
    // Look for any number that is NOT a 6-digit pincode and has 2-6 digits
    const allNumbers = message.match(/\b\d{2,5}\b/g) || message.match(/\b\d{7,8}\b/g);
    if (allNumbers) {
      // Find the first one that isn't the pincode
      for (const numStr of allNumbers) {
        if (numStr !== specs.deliveryAddress) {
          specs.quantity = parseInt(numStr, 10);
          break;
        }
      }
    }
  }

  // 3. Extract Product Code
  // Look for "code TVE10BP" or similar
  const codeExplicitMatch = message.match(/(?:code|sku|id)\s*:?\s*([A-Za-z0-9_-]+)/i);
  if (codeExplicitMatch) {
    specs.productCode = codeExplicitMatch[1].toUpperCase();
  } else {
    // Look for uppercase alphanumeric words with length >= 4 that contain both letters and numbers
    const words = message.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^A-Za-z0-9_-]/g, "");
      if (cleanWord.length >= 4 && /[A-Za-z]/.test(cleanWord) && /[0-9]/.test(cleanWord)) {
        specs.productCode = cleanWord.toUpperCase();
        break;
      }
    }
  }

  // 4. Extract Product Name
  const productKeywords = ["plate", "bowl", "bag", "box", "cup", "spoon", "fork", "knife", "container", "clamshell"];
  for (const kw of productKeywords) {
    if (lowMsg.includes(kw)) {
      specs.product = kw.charAt(0).toUpperCase() + kw.slice(1);
      break;
    }
  }

  if (specs.productCode || specs.product) {
    specs.isProductRequest = true;
  }

  console.log(`[AI Spec Extractor Fallback] Regex result:`, specs);
  return specs;
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

    // Fetch last 6 messages of conversation history to resolve pronouns or conversational context
    const recentMessages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { timestamp: "desc" },
      take: 6
    });
    // Reverse chronologically
    recentMessages.reverse();
    const context = recentMessages
      .map(m => `${m.direction === "IN" ? "Customer" : "Assistant"}: ${m.content}`)
      .join("\n");

    // 1. Extract specifications with conversation context
    const specs = await extractSpecsFromMessage(message, context);
    if (!specs.isProductRequest && !specs.productCode && !specs.isCustomRequest) {
      console.log(`[Quotation Workflow] Message doesn't represent a product request or custom request. Skipping workflow.`);
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

    // Strategy: Search for exact product code first, then exact name match (normalized) or use Gemini comparison
    let matchedProduct: any = null;

    // Check by product code first
    if (specs.productCode) {
      const normalizedQueryCode = specs.productCode.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const p of products) {
        if (p.code) {
          const normalizedCode = p.code.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (normalizedCode === normalizedQueryCode) {
            matchedProduct = p;
            break;
          }
        }
      }
    }

    // Fallback to name matching if code doesn't match and they didn't explicitly request custom
    if (!matchedProduct && !specs.isCustomRequest && specs.product) {
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
        const catalogList = products.map(p => `ID: ${p.id}, Code: ${p.code || "N/A"}, Name: ${p.name}`).join("\n");
        const systemInstruction = `Verify if the user requested product '${specs.product}' or code '${specs.productCode || ""}' is already present in this catalog:
${catalogList}
Return the matching ID as JSON {\"matchedId\": \"some-uuid\" | null}. If no highly relevant match exists, return null.`;

        try {
          const response = await safeGenerateContent(getGeminiClient(), {
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

      // Fetch the default template for the client to ensure the quotation is created with correct branding design
      const defaultTemplate = await prisma.quotationTemplate.findFirst({
        where: { clientId: client.id }
      });

      // Automatically generate quotation record (PENDING_APPROVAL status)
      const quote = await prisma.quotation.create({
        data: {
          clientId: client.id,
          leadId: lead.id,
          templateId: defaultTemplate?.id || null,
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/messages`, {
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
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log(`[WhatsApp Dispatch] Meta API status: ${metaResponse.status} ${metaResponse.statusText}`);
            if (!metaResponse.ok) {
              const errBody = await metaResponse.text();
              console.error(`[WhatsApp Dispatch Error] Meta API returned non-OK response:`, errBody);
            } else {
              console.log(`[WhatsApp Dispatch] Approval alert successfully sent to Owner.`);
            }
          }
        } catch (dispatchErr) {
          console.error(`[WhatsApp Dispatch Error] Failed to send approval alert via WhatsApp to Owner:`, dispatchErr);
        }
      }

      console.log(`[Quotation Workflow] Generated Quotation ${quotationNumber} with PENDING_APPROVAL status. Alert ID: ${alert.id}`);

    } else {
      console.log(`[Quotation Workflow Missing] Product not found or custom request. Executing Scenario 2.`);

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
${specs.product || specs.productCode || "Custom Product"}

Size:
${specs.size || "Custom / Specs Requested"}

Quantity:
${specs.quantity || "N/A"}

Details:
${specs.customProductDetails || "Custom product specifications requested by customer."}

This product does *not* exist in your Products database or is marked as custom. Owner action is required.`;

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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${client.whatsappPhoneId}/messages`, {
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
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log(`[WhatsApp Dispatch] Meta API status for Custom Order: ${metaResponse.status} ${metaResponse.statusText}`);
            if (!metaResponse.ok) {
              const errBody = await metaResponse.text();
              console.error(`[WhatsApp Dispatch Error] Meta API returned non-OK response for Custom Order:`, errBody);
            } else {
              console.log(`[WhatsApp Dispatch] Custom order alert successfully sent to Owner.`);
            }
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
