import PDFDocument from "pdfkit";

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
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Primary color scheme configurations
      const primaryColor = "#0C353A";
      const goldAccent = "#E2A326";

      // 1. Top Graphic Banner Header
      doc.rect(0, 0, 595.28, 90).fill(primaryColor);
      doc.rect(0, 90, 595.28, 8).fill(goldAccent);

      // Logo/Header Text
      doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text(
        template?.companyName || client?.companyName || "EcoPek Ltd",
        40,
        32
      );
      doc.fillColor(goldAccent).fontSize(9).font("Helvetica-Bold").text(
        "OFFICIAL PROPOSAL",
        435,
        40,
        { align: "right", width: 120 }
      );

      // 2. Metadata Section inline headers
      doc.fillColor("#334155").fontSize(9.5).font("Helvetica-Bold").text("QUOTATION NUMBER:", 40, 120);
      doc.fillColor("#E11D48").fontSize(10).font("Courier-Bold").text(quotation.quotationNumber, 155, 119.5);
      
      doc.fillColor("#334155").fontSize(9.5).font("Helvetica-Bold").text("Issue Date:", 350, 120);
      const dateStr = quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("en-GB") : "N/A";
      doc.fillColor("#0F172A").fontSize(10).font("Courier-Bold").text(dateStr, 415, 119.5);

      // 3. Side-by-Side Billing Blocks
      const topOffset = 145;
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
      doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold").text((client?.state || "Maharashtra") + " (27)", 415, supplyTop);

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

      // 7. Footer Contact Bar & Double Ribbon
      const footerY = 788;
      doc.lineWidth(0.5).strokeColor("#E2E8F0").moveTo(40, footerY).lineTo(555, footerY).stroke();

      const brandLower = (template?.companyName || client?.companyName || "").toLowerCase().replace(/\s+/g, "");
      doc.fillColor("#64748B").fontSize(7).font("Helvetica-Bold");
      doc.text(`HQ: www.${brandLower || "leadsmartecommerce"}.com`, 40, footerY + 8);
      doc.text(`Mob: ${client?.phone || "+91 99999 99999"}`, 240, footerY + 8, { align: "center", width: 115 });
      doc.text(`Email: sales@${brandLower || "leadsmart"}.com`, 400, footerY + 8, { align: "right", width: 155 });

      // Edge double colored ribbons at the bottom limit
      doc.rect(0, 810, 595.28, 4).fill(goldAccent);
      doc.rect(0, 814, 595.28, 28).fill(primaryColor);

      // Finalize the PDF kits pipeline stream
      doc.end();

    } catch (pdfErr) {
      reject(pdfErr);
    }
  });
}
