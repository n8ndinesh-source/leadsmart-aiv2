import PDFDocument from "pdfkit";

function parseBase64Image(dataStr: string): Buffer | null {
  if (!dataStr) return null;
  if (dataStr.startsWith("data:image")) {
    const matches = dataStr.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (matches && matches[2]) {
      return Buffer.from(matches[2], "base64");
    }
  }
  // If it's a solid base64 block without the header
  if (!dataStr.includes("/") && !dataStr.includes(":") && dataStr.length > 100) {
    return Buffer.from(dataStr, "base64");
  }
  return null;
}

function priceFormat(num: number) {
  if (!num || isNaN(num)) return "0.00";
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToEnglishWords(amount: number, currencyCode: string): string {
  if (amount === 0) return "Zero Rupees Only";
  
  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const doubleDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(num: number): string {
    let str = "";
    if (num >= 100) {
      str += singleDigits[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 10 && num < 20) {
      str += doubleDigits[num - 10] + " ";
    } else if (num >= 20 || num > 0) {
      str += tensDigits[Math.floor(num / 10)] + " ";
      str += singleDigits[num % 10] + " ";
    }
    return str;
  }

  let words = "";
  let roundedAmount = Math.round(amount);
  
  if (currencyCode === 'INR' || currencyCode === '₹') {
    let crores = Math.floor(roundedAmount / 10000000);
    roundedAmount %= 10000000;
    let lakhs = Math.floor(roundedAmount / 100000);
    roundedAmount %= 100000;
    let thousands = Math.floor(roundedAmount / 1000);
    roundedAmount %= 1000;
    
    if (crores > 0) words += convertGroup(crores) + "Crore ";
    if (lakhs > 0) words += convertGroup(lakhs) + "Lakh ";
    if (thousands > 0) words += convertGroup(thousands) + "Thousand ";
    if (roundedAmount > 0) words += convertGroup(roundedAmount);
    
    return words.trim() + " Rupees Only";
  } else {
    let millions = Math.floor(roundedAmount / 1000000);
    roundedAmount %= 1000000;
    let thousands = Math.floor(roundedAmount / 1000);
    roundedAmount %= 1000;

    if (millions > 0) words += convertGroup(millions) + "Million ";
    if (thousands > 0) words += convertGroup(thousands) + "Thousand ";
    if (roundedAmount > 0) words += convertGroup(roundedAmount);

    const suffix = currencyCode === 'USD' || currencyCode === '$' ? "Dollars Only" : (currencyCode === 'EUR' || currencyCode === '€' ? "Euros Only" : "Units Only");
    return words.trim() + " " + suffix;
  }
}

/**
 * Generates an elegant brand vector PDF Document on A4 format as a binary Buffer using PDFKit.
 */
export function generateQuotationPdf(quotation: any, client: any, lead: any, template: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margins: { top: 40, bottom: 5, left: 40, right: 40 } 
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Primary color scheme configurations
      const primaryColor = "#0C353A";
      const goldAccent = "#E2A326";

      // BACKGROUND WATERMARK (Behind items and text layers)
      doc.save();
      const watermarkOpacity = template?.watermarkOpacity !== undefined ? template.watermarkOpacity : 15;
      doc.fillOpacity(watermarkOpacity / 300); // Elegant soft opacity for paper print
      
      doc.translate(187.64, 310.94);
      doc.scale(2.2);

      if (template?.watermark) {
        try {
          doc.image(template.watermark, 0, 0, { width: 100, height: 100, align: "center", valign: "center" });
        } catch (imgErr) {
          doc.path("M50 15 C30 35, 30 65, 50 85 C55 75, 55 55, 50 45 C45 35, 45 25, 50 15").fill(goldAccent);
          doc.path("M50 15 C65 30, 68 55, 56 68 C45 50, 48 35, 50 15").fill(primaryColor);
        }
      } else {
        doc.path("M50 15 C30 35, 30 65, 50 85 C55 75, 55 55, 50 45 C45 35, 45 25, 50 15").fill(goldAccent);
        doc.path("M50 15 C65 30, 68 55, 56 68 C45 50, 48 35, 50 15").fill(primaryColor);
      }
      doc.restore();

      // 1. Top Graphic Banner Header (Render custom template headerBanner if present; otherwise fallback to geometric art)
      let hasHeaderBanner = false;
      if (template?.headerBanner) {
        try {
          const headerBin = parseBase64Image(template.headerBanner);
          if (headerBin) {
            doc.image(headerBin, 0, 0, { width: 595.28, height: 90 });
            hasHeaderBanner = true;
          } else if (template.headerBanner.startsWith("http")) {
            doc.image(template.headerBanner, 0, 0, { width: 595.28, height: 90 });
            hasHeaderBanner = true;
          }
        } catch (imgErr) {
          console.warn("Could not draw template.headerBanner in PDF:", imgErr);
        }
      }

      if (!hasHeaderBanner) {
        doc.moveTo(0, 0)
           .lineTo(595.28, 0)
           .lineTo(595.28, 65)
           .lineTo(430, 95)
           .lineTo(220, 70)
           .lineTo(0, 80)
           .closePath()
           .fill(primaryColor);

        // Gold accent decorative diagonal ribbon layer
        doc.moveTo(0, 80)
           .lineTo(220, 70)
           .lineTo(430, 95)
           .lineTo(595.28, 65)
           .lineTo(595.28, 80)
           .lineTo(430, 110)
           .lineTo(220, 85)
           .lineTo(0, 95)
           .closePath()
           .fill(goldAccent);

        // Translucent white vector highlights
        doc.save();
        doc.fillOpacity(0.15);
        doc.moveTo(120, 0)
           .lineTo(180, 30)
           .lineTo(220, 0)
           .closePath()
           .fill("#FFFFFF");
        doc.restore();

        doc.save();
        doc.fillOpacity(0.10);
        doc.moveTo(350, 0)
           .lineTo(390, 20)
           .lineTo(440, 0)
           .closePath()
           .fill("#FFFFFF");
        doc.restore();
      }

      // Circular Logo Badge / Icon bounding box
      doc.circle(64, 92, 24).fill("#FFFFFF");
      let logoExposed = false;
      if (template?.logo) {
        try {
          doc.save();
          doc.circle(64, 92, 22).clip();
          doc.image(template.logo, 42, 70, { width: 44, height: 44 });
          doc.restore();
          logoExposed = true;
        } catch (err) {
          console.warn("Could not draw template logo in PDF, falling back to corporate vector:", err);
        }
      }
      if (!logoExposed) {
        doc.circle(64, 92, 20).fill("#0C353A");
        doc.circle(64, 92, 17).strokeColor("#E2A326").lineWidth(1.5).stroke();
        doc.circle(64, 92, 8).fill("#E2A326");
      }

      // Title header texts matching HTML style
      doc.fillColor("#1E293B").fontSize(13.5).font("Helvetica-Bold").text(
        template?.companyName || client?.companyName || "EcoPek Ltd",
        100,
        80
      );
      doc.fillColor("#94A3B8").fontSize(8.5).font("Helvetica-Bold").text(
        "Automated Sales Division",
        100,
        97
      );

      doc.fillColor("#94A3B8").fontSize(9).font("Helvetica-Bold").text(
        "OFFICIAL PROPOSAL",
        435,
        88,
        { align: "right", width: 120 }
      );

      // 2. Metadata Section inline headers
      doc.fillColor("#475569").fontSize(9.5).font("Helvetica-Bold").text("QUOTATION NUMBER:", 40, 131);
      doc.fillColor("#E11D48").fontSize(10).font("Courier-Bold").text(quotation.quotationNumber, 155, 130.5);
      
      doc.fillColor("#475569").fontSize(9.5).font("Helvetica-Bold").text("Issue Date:", 350, 131);
      const dateStr = quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("en-GB") : "N/A";
      doc.fillColor("#0F172A").fontSize(10).font("Courier-Bold").text(dateStr, 415, 130.5);

      // 3. Side-by-Side Billing Blocks
      const topOffset = 153;
      const boxHeight = 85;
      const boxWidth = 242;

      // FROM Box
      doc.lineJoin("round").lineWidth(0.5).rect(40, topOffset, boxWidth, boxHeight).fillAndStroke("#F8FAFC", "#E2E8F0");
      doc.fillColor("#4338CA").fontSize(7.5).font("Helvetica-Bold").text("QUOTATION FROM", 50, topOffset + 10);
      doc.fillColor("#1E293B").fontSize(10).font("Helvetica-Bold").text(
        template?.companyName || client?.companyName || "EcoPek Ltd",
        50,
        topOffset + 22
      );
      const fromAddr = `${client?.city || ""}, ${client?.state || ""}, ${client?.country || ""}\nGSTIN: 27AAHCM9628G1Z3\nPhone: ${client?.phone || "N/A"}`;
      doc.fillColor("#475569").fontSize(7.8).font("Helvetica").text(fromAddr, 50, topOffset + 36, { width: boxWidth - 20, lineGap: 2.5 });

      // FOR Box
      doc.lineJoin("round").lineWidth(0.5).rect(313, topOffset, boxWidth, boxHeight).fillAndStroke("#F8FAFC", "#E2E8F0");
      doc.fillColor("#4338CA").fontSize(7.5).font("Helvetica-Bold").text("PREPARED FOR", 323, topOffset + 10);
      doc.fillColor("#1E293B").fontSize(10).font("Helvetica-Bold").text(
        lead?.name || "Customer Lead Client",
        323,
        topOffset + 22
      );
      const toAddr = `${lead?.companyName || "Corporate Client Location"}\nGSTIN: N/A\nPhone: ${lead?.phoneNumber || lead?.whatsappNumber || "N/A"}`;
      doc.fillColor("#475569").fontSize(7.8).font("Helvetica").text(toAddr, 323, topOffset + 36, { width: boxWidth - 20, lineGap: 2.5 });

      // 4. Place of Supply line
      const supplyTop = topOffset + boxHeight + 10;
      doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("Country of Supply: ", 40, supplyTop);
      doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold").text(client?.country || "India", 125, supplyTop);
      doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("Place of Supply (GST): ", 313, supplyTop);
      doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold").text((client?.state || "Maharashtra") + " (" + (client?.country === 'India' ? '27' : 'INT') + ")", 415, supplyTop);

      // 5. Items Grid Table
      const tableTop = supplyTop + 18;
      doc.rect(40, tableTop, 515, 20).fill("#4338CA");

      // Draw Grid Header text descriptors
      doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
      doc.text("Item Name & Description", 45, tableTop + 6, { width: 170 });
      doc.text("GST %", 225, tableTop + 6, { width: 40, align: "center" });
      doc.text("Qty", 270, tableTop + 6, { width: 28, align: "center" });
      doc.text("Rate", 303, tableTop + 6, { width: 55, align: "right" });
      doc.text("CGST", 363, tableTop + 6, { width: 45, align: "right" });
      doc.text("SGST", 413, tableTop + 6, { width: 45, align: "right" });
      doc.text("Total", 463, tableTop + 6, { width: 85, align: "right" });

      let currentY = tableTop + 20;
      const isInternational = client?.country && client?.country !== "India";
      const curr = isInternational ? "$" : "₹";

      let parsedProducts: any[] = [];
      try {
        parsedProducts = JSON.parse(quotation.products || "[]");
      } catch (e) {
        console.error("Failed to parse products catalog string:", e);
      }

      parsedProducts.forEach((item, index) => {
        // Draw alternate rows
        if (index % 2 === 1) {
          doc.rect(40, currentY, 515, 26).fill("#F8FAFC");
        }

        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice || item.price || 0);
        const itemAmount = qty * price;
        const discPercent = Number(item.discount) || 0;
        const discountVal = itemAmount * (discPercent / 100);
        const afterDiscount = itemAmount - discountVal;
        
        const gstPercent = Number(item.gst) || 0;
        const taxPercent = Number(item.tax) || 0;
        const itemCgst = afterDiscount * ((gstPercent / 2) / 100);
        const itemSgst = afterDiscount * ((gstPercent / 2) / 100);
        const itemTax = afterDiscount * (taxPercent / 100);
        const rowTotal = afterDiscount + itemCgst + itemSgst + itemTax;

        // Render Title
        doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold");
        doc.text(`${index + 1}. ${item.productName || item.name || "Product"}`, 45, currentY + 4, { width: 170 });
        
        // Render Description
        doc.fillColor("#64748B").fontSize(6.5).font("Helvetica");
        const descText = item.description || "No item description catalog specification.";
        doc.text(descText, 45, currentY + 13, { width: 170, height: 10, ellipsis: true });

        doc.fillColor("#334155").fontSize(8).font("Helvetica-Bold");
        doc.text(`${gstPercent}%`, 225, currentY + 8, { width: 40, align: "center" });
        doc.text(`${qty}`, 270, currentY + 8, { width: 28, align: "center" });
        doc.text(`${curr}${priceFormat(price)}`, 303, currentY + 8, { width: 55, align: "right" });
        doc.text(`${curr}${priceFormat(itemCgst)}`, 363, currentY + 8, { width: 45, align: "right" });
        doc.text(`${curr}${priceFormat(itemSgst)}`, 413, currentY + 8, { width: 45, align: "right" });
        doc.text(`${curr}${priceFormat(rowTotal)}`, 463, currentY + 8, { width: 85, align: "right" });

        // Draw Row Separator line
        doc.lineWidth(0.5).strokeColor("#E2E8F0").moveTo(40, currentY + 26).lineTo(555, currentY + 26).stroke();
        currentY += 26;
      });

      // 6. Totals & Terms Split Area
      const summaryTop = currentY + 10;
      doc.lineWidth(0.5).strokeColor("#E2E8F0").moveTo(40, summaryTop - 3).lineTo(555, summaryTop - 3).stroke();

      // LEFT: Terms and Conditions
      doc.fillColor("#4338CA").fontSize(8.5).font("Helvetica-Bold").text("Terms and Conditions", 40, summaryTop);
      let termsList = [
        "Applicable taxes will be extra.",
        "Work will resume after advance payment.",
        "Goods once sold will not be returned."
      ];
      const rawTerms = quotation.paymentTerms || "";
      if (rawTerms.trim()) {
        termsList = rawTerms.split("\n").filter((t: any) => t.trim());
      }

      let termsY = summaryTop + 14;
      termsList.forEach((term, idx) => {
        doc.fillColor("#475569").fontSize(7.5).font("Helvetica");
        doc.text(`${idx + 1}. ${term}`, 40, termsY, { width: 230 });
        termsY += 12;
      });

      // Dispatch block
      const delTerms = quotation.deliveryTerms || "Standard dispatch and logistics applies.";
      doc.rect(40, termsY + 4, 230, 42).fillAndStroke("#F8FAFC", "#E2E8F0");
      doc.fillColor("#0F172A").fontSize(7).font("Helvetica-Bold").text("Corporate Supply & Delivery Clause:", 46, termsY + 9);
      doc.fillColor("#475569").fontSize(7).font("Helvetica").text(delTerms, 46, termsY + 18, { width: 218 });

      // RIGHT: Calculations
      let calcY = summaryTop;
      const rightXLabel = 313;
      const rightXVal = 445;
      const valColWidth = 110;

      function renderCalcRow(label: string, val: string, isBold = false) {
        doc.fillColor(isBold ? "#0F172A" : "#475569").fontSize(8).font(isBold ? "Helvetica-Bold" : "Helvetica");
        doc.text(label, rightXLabel, calcY);
        doc.text(val, rightXVal, calcY, { width: valColWidth, align: "right" });
        calcY += 13;
      }

      renderCalcRow("Amount:", `${curr}${priceFormat(quotation.subtotal)}`);
      if (quotation.discountAmount > 0) {
        renderCalcRow(`Corporate Disc (${quotation.discountPercent}%):`, `-${curr}${priceFormat(quotation.discountAmount)}`);
      }
      renderCalcRow("CGST (Central):", `${curr}${priceFormat(quotation.gstAmount / 2)}`);
      renderCalcRow("SGST (State):", `${curr}${priceFormat(quotation.gstAmount / 2)}`);
      if (quotation.taxAmount > 0) {
        renderCalcRow("Custom Surcharge:", `${curr}${priceFormat(quotation.taxAmount)}`);
      }
      renderCalcRow("Delivery/Logistics:", `${curr}${priceFormat(quotation.deliveryCharges)}`);

      // Grand Total
      calcY += 2;
      doc.lineWidth(0.8).strokeColor("#1E293B").moveTo(313, calcY).lineTo(555, calcY).stroke();
      calcY += 3;
      renderCalcRow("Grand Total:", `${curr}${priceFormat(quotation.grandTotal)}`, true);
      calcY += 1;
      doc.lineWidth(0.8).strokeColor("#1E293B").moveTo(313, calcY).lineTo(555, calcY).stroke();

      // Words representation
      calcY += 6;
      const amountCurrency = isInternational ? "USD" : "INR";
      const totalWords = numberToEnglishWords(quotation.grandTotal, amountCurrency);
      doc.fillColor("#64748B").fontSize(7).font("Helvetica-Bold").text("Total (in words):", rightXLabel, calcY);
      calcY += 9;
      doc.fillColor("#0F172A").fontSize(7.5).font("Helvetica-Bold").text(totalWords.toUpperCase(), rightXLabel, calcY, { width: boxWidth, lineGap: 1.5 });

      // 7. Footer Contact Bar & Double Ribbon diagonal geometric paths
      const footerY = 758;
      
      const brandLower = (template?.companyName || client?.companyName || "").toLowerCase().replace(/\s+/g, "");
      doc.fillColor("#64748B").fontSize(7).font("Helvetica-Bold");
      doc.text(`HQ: www.${brandLower || "leadsmartecommerce"}.com`, 40, footerY, { lineBreak: false });
      doc.text(`Mob: ${client?.phone || "+91 99999 99999"}`, 240, footerY, { align: "center", width: 115, lineBreak: false });
      doc.text(`Email: sales@${brandLower || "thevelocity"}.com`, 400, footerY, { align: "right", width: 155, lineBreak: false });

      doc.lineWidth(0.5).strokeColor("#E2E8F0").moveTo(40, footerY + 12).lineTo(555, footerY + 12).stroke();

      // Temporarily expand bottom margin so absolute footer positioning does not trigger automatic multi-page breaks
      doc.page.margins.bottom = -150;

      const footerStartY = 776;
      const footerHeight = 841.89 - footerStartY;
      let hasFooterBanner = false;

      if (template?.footerBanner) {
        try {
          const footerBin = parseBase64Image(template.footerBanner);
          if (footerBin) {
            doc.image(footerBin, 0, footerStartY, { width: 595.28, height: footerHeight });
            hasFooterBanner = true;
          } else if (template.footerBanner.startsWith("http")) {
            doc.image(template.footerBanner, 0, footerStartY, { width: 595.28, height: footerHeight });
            hasFooterBanner = true;
          }
        } catch (imgErr) {
          console.warn("Could not draw template.footerBanner in PDF:", imgErr);
        }
      }

      if (!hasFooterBanner) {
        // Geometrical layered diagonal ribbons matching HTML footer
        const ribbonTop = footerStartY + 15;

        // Gold diagonal ribbon path matching d="M0 15 L180 8 L390 22 L595 5 V20 H0 Z"
        doc.moveTo(0, ribbonTop + 15)
           .lineTo(180, ribbonTop + 8)
           .lineTo(390, ribbonTop + 22)
           .lineTo(595.28, ribbonTop + 5)
           .lineTo(595.28, ribbonTop + 20)
           .lineTo(0, ribbonTop + 20)
           .closePath()
           .fill(goldAccent);

        // Dark green diagonal ribbon path matching d="M0 20 L180 13 L390 27 L595 10 V48 H0 Z"
        doc.moveTo(0, ribbonTop + 20)
           .lineTo(180, ribbonTop + 13)
           .lineTo(390, ribbonTop + 27)
           .lineTo(595.28, ribbonTop + 10)
           .lineTo(595.28, 841.89)
           .lineTo(0, 841.89)
           .closePath()
           .fill(primaryColor);
      }

      // Finalize the PDF kits pipeline stream
      doc.end();

    } catch (pdfErr) {
      reject(pdfErr);
    }
  });
}
