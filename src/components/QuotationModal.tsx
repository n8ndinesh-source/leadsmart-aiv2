import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Clock, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Send,
  Info,
  DollarSign,
  Upload,
  Copy,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BookOpen,
  Signature,
  Briefcase
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  companyName?: string;
  industry?: string;
  status: string;
}

interface ProductItem {
  id: string;
  name: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
  gst: number; // percentage
  taxName: string;
  taxRate: number; // percentage
  dbRecordId?: string;
  customFields?: Record<string, { fieldName: string, value: string, fieldType: string }>;
}

function buildRowFromDbRecord(record: any, customId?: string): ProductItem {
  const rowId = customId || `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  if (!record) {
    return {
      id: rowId,
      name: "",
      code: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      gst: 18,
      taxName: "VAT",
      taxRate: 0
    };
  }

  // Find price/currency if any
  let price = 0;
  const curFieldVal = record.values?.find((v: any) => 
    v.productField?.fieldType === "Currency" || 
    v.productField?.fieldName?.toLowerCase().includes("price")
  );
  if (curFieldVal) {
    price = Number(curFieldVal.value) || 0;
  } else {
    // Fallback to any numeric field value containing currency or price or numeric
    const numFieldVal = record.values?.find((v: any) => 
      v.productField?.fieldType === "Number" && 
      !v.productField?.fieldName?.toLowerCase().includes("moq") &&
      !v.productField?.fieldName?.toLowerCase().includes("hsn")
    );
    if (numFieldVal) {
      price = Number(numFieldVal.value) || 0;
    }
  }

  // Find HSN/SAC code if any
  let code = "";
  const codeFieldVal = record.values?.find((v: any) => {
    const nameLower = v.productField?.fieldName?.toLowerCase() || "";
    return nameLower.includes("hsn") || nameLower.includes("sac") || nameLower.includes("code");
  });
  if (codeFieldVal) {
    code = codeFieldVal.value;
  }

  // Build dynamic description
  const specs: Record<string, { fieldName: string, value: string, fieldType: string }> = {};
  const specParts: string[] = [];
  
  if (record.values && record.values.length > 0) {
    record.values.forEach((v: any) => {
      if (!v.productField) return;
      const fName = v.productField.fieldName;
      const fType = v.productField.fieldType;
      const fVal = v.value;
      
      specs[fName] = {
        fieldName: fName,
        value: fVal,
        fieldType: fType
      };

      if (fVal && fType !== "Image Upload" && fType !== "File Upload") {
        specParts.push(`${fName.toUpperCase()} : ${fVal}`);
      }
    });
  }

  const description = specParts.join("\n");

  return {
    id: rowId,
    name: record.name || "",
    code: code || "",
    description: description || `Category: ${record.category || "General"}`,
    quantity: 1,
    unitPrice: price,
    discount: 0,
    gst: 18,
    taxName: "VAT",
    taxRate: 0,
    dbRecordId: record.id,
    customFields: specs
  };
}

interface TemplateSelection {
  id: string;
  name: string;
  companyName: string;
  logo: string | null;
  headerBanner: string | null;
  footerBanner: string | null;
  watermark: string | null;
  watermarkOpacity: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  products: string; // JSON
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  taxAmount: number;
  deliveryCharges: number;
  grandTotal: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  validity?: string;
  additionalNotes?: string;
  templateId?: string | null;
  scheduledAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

interface QuotationModalProps {
  lead: Lead;
  onClose: () => void;
  onQuotationCreated?: () => void;
}

// Preset products for quick-select (disabled)
const PRESET_PRODUCTS: Array<{ name: string; code: string; price: number; desc: string }> = [];

// Helper to convert number to words of currency
function numberToEnglishWords(amount: number, currencyCode: string): string {
  if (amount === 0) {
    if (currencyCode === 'INR') return "Zero Rupees Only";
    if (currencyCode === 'USD') return "Zero Dollars Only";
    if (currencyCode === 'EUR') return "Zero Euros Only";
    return "Zero Units Only";
  }
  
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
  
  if (currencyCode === 'INR') {
    let crores = Math.floor(amount / 10000000);
    amount %= 10000000;
    let lakhs = Math.floor(amount / 100000);
    amount %= 100000;
    let thousands = Math.floor(amount / 1000);
    amount %= 1000;
    
    if (crores > 0) words += convertGroup(crores) + "Crore ";
    if (lakhs > 0) words += convertGroup(lakhs) + "Lakh ";
    if (thousands > 0) words += convertGroup(thousands) + "Thousand ";
    if (amount > 0) words += convertGroup(amount);
    
    return words.trim() + " Rupees Only";
  } else {
    let millions = Math.floor(amount / 1000000);
    amount %= 1000000;
    let thousands = Math.floor(amount / 1000);
    amount %= 1000;

    if (millions > 0) words += convertGroup(millions) + "Million ";
    if (thousands > 0) words += convertGroup(thousands) + "Thousand ";
    if (amount > 0) words += convertGroup(amount);

    const suffix = currencyCode === 'USD' ? "Dollars Only" : (currencyCode === 'EUR' ? "Euros Only" : "Units Only");
    return words.trim() + " " + suffix;
  }
}

export default function QuotationModal({ lead, onClose, onQuotationCreated }: QuotationModalProps) {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<TemplateSelection[]>([]);
  const [previousQuotes, setPreviousQuotes] = useState<Quotation[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [quotationNumber, setQuotationNumber] = useState(`QT-${Date.now().toString().slice(-6)}`);
  const [isSubmitInProgress, setIsSubmitInProgress] = useState(false);
  const [activeTab, setActiveTab ] = useState<"create" | "history">("create");
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [confirmDeleteQuoteId, setConfirmDeleteQuoteId] = useState<string | null>(null);
  const [confirmReadyQuoteId, setConfirmReadyQuoteId] = useState<string | null>(null);

  // Form product rows list
  const [productsList, setProductsList] = useState<ProductItem[]>([
    {
      id: "row-1",
      name: "",
      code: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      gst: 18,
      taxName: "VAT",
      taxRate: 0
    }
  ]);

  // Customizable branding inside modal creator
  const [branding, setBranding] = useState({
    logo: "",
    watermark: "",
    headerBanner: "",
    footerBanner: "",
    watermarkOpacity: 15,
    watermarkVisible: true
  });

  // Client and vendor address blocks
  const [vendorDetails, setVendorDetails] = useState({
    name: "ECOPEK",
    address: "Maharashtra, India - 500100",
    gstin: "27AAHCM9628G1Z3",
    pan: "AAHCM9628G",
    phone: "+91 98565 47854"
  });

  const [clientDetails, setClientDetails] = useState({
    name: lead.name || "THE VELOCITY EXPORTS",
    address: lead.companyName || "Maharashtra, India",
    gstin: "27AAHCM9628G1Z3",
    pan: "AAHCM9628G",
    phone: lead.phoneNumber || "+91 79852 48632"
  });

  // Supply settings
  const [meta, setMeta] = useState({
    currency: "INR",
    stateOfSupply: "Maharashtra (27)",
    countryOfSupply: "India",
    showPDFTotals: true,
    showWords: true
  });

  // Delivery total fields
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0); // Corporate Discount
  const [deliveryTerms, setDeliveryTerms] = useState("Immediate air courier shipment. Lead time: 3 business days.");
  const [paymentTerms, setPaymentTerms] = useState("Net 15 days bank wire transfer. Standard terms apply.");
  const [validityDays, setValidityDays] = useState("30 Days");
  const [additionalNotes, setAdditionalNotes] = useState("We appreciate your business. Please contact our account managers for any questions.");

  // Terms and Conditions lines Array
  const [terms, setTerms] = useState<string[]>([
    "APPLICABLE TAXESS",
    "WORK WILL START AFTER GETTING ADVANCE",
    "THIS QUOTATION VALID ONLY 1 WEEK FROM SEDING DATE"
  ]);

  // Modal helper states for terms edit and signature upload
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatoryName, setSignatoryName] = useState("Authorized Signatory");

  // For visual feedback card
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Product Catalog states
  const [dbRecords, setDbRecords] = useState<any[]>([]);
  const [dbFields, setDbFields] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplatesAndHistory();
  }, [lead.id]);

  const fetchTemplatesAndHistory = async () => {
    try {
      // 1. Fetch available brand layouts
      const tmplList = await api.get<TemplateSelection[]>("/quotation-templates");
      setTemplates(tmplList || []);
      if (tmplList && tmplList.length > 0) {
        setSelectedTemplateId(tmplList[0].id);
        applySelectedTemplateBranding(tmplList[0]);
      }

      // 2. Fetch history for this lead
      const historyList = await api.get<Quotation[]>(`/leads/${lead.id}/quotations`);
      setPreviousQuotes(historyList || []);
      if (historyList && historyList.length > 0) {
        setActiveTab("history");
      }

      // 3. Fetch products master database
      try {
        const fetchedFields = await api.get<any[]>("/products/fields");
        const fetchedRecords = await api.get<any[]>("/products/records");
        setDbFields(fetchedFields || []);
        setDbRecords(fetchedRecords || []);

        if (!editingQuotationId) {
          if (fetchedRecords && fetchedRecords.length > 0) {
            const defaultProd = buildRowFromDbRecord(fetchedRecords[0], "row-1");
            setProductsList([defaultProd]);
          } else {
            setProductsList([
              {
                id: "row-1",
                name: "",
                code: "",
                description: "",
                quantity: 1,
                unitPrice: 0,
                discount: 0,
                gst: 18,
                taxName: "VAT",
                taxRate: 0
              }
            ]);
          }
        }
      } catch (prodErr) {
        console.error("Non-critical error loading products metadata:", prodErr);
      }
    } catch (err: any) {
      console.error("Failed to load modal prefetch data:", err);
    }
  };

  const applySelectedTemplateBranding = (tmpl: TemplateSelection) => {
    setBranding({
      logo: tmpl.logo || "",
      headerBanner: tmpl.headerBanner || "",
      footerBanner: tmpl.footerBanner || "",
      watermark: tmpl.watermark || "",
      watermarkOpacity: tmpl.watermarkOpacity || 15,
      watermarkVisible: true
    });
    if (tmpl.companyName) {
      setVendorDetails(v => ({
        ...v,
        name: tmpl.companyName
      }));
    }
  };

  const handleTemplateDropdownChange = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) {
      applySelectedTemplateBranding(found);
    }
  };

  const handleEditQuotationClick = (quote: Quotation) => {
    setEditingQuotationId(quote.id);
    setQuotationNumber(quote.quotationNumber);
    setSelectedTemplateId(quote.templateId || "");

    // Process products loaded
    try {
      const parsedProds = typeof quote.products === "string" ? JSON.parse(quote.products) : quote.products;
      if (Array.isArray(parsedProds)) {
        setProductsList(parsedProds.map((p: any, idx: number) => ({
          id: `row-${idx}-${Date.now()}-${Math.random()}`,
          name: p.productName || p.name || "",
          code: p.code || p.hsn || p.codeValue || "",
          description: p.description || "",
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
          discount: p.discount || 0,
          gst: p.gst || p.gstRate || 18,
          taxName: p.taxName || "VAT",
          taxRate: p.tax || p.taxRate || 0,
          dbRecordId: p.dbRecordId,
          customFields: p.customFields
        })));
        
        // Extract delivery charges if any
        if (parsedProds[0]?.deliveryCharges) {
          setDeliveryCharges(parsedProds[0].deliveryCharges);
        } else {
          setDeliveryCharges(quote.deliveryCharges || 0);
        }
      }
    } catch (e) {
      console.error("Error parsing quote products", e);
    }

    // Set terms, validity
    if (quote.deliveryTerms) setDeliveryTerms(quote.deliveryTerms);
    if (quote.paymentTerms) setPaymentTerms(quote.paymentTerms);
    if (quote.validity) setValidityDays(quote.validity);

    // Parse metadata in additionalNotes
    if (quote.additionalNotes) {
      try {
        const metadata = JSON.parse(quote.additionalNotes);
        if (metadata && typeof metadata === "object") {
          if (metadata.remarks !== undefined) setAdditionalNotes(metadata.remarks);
          if (metadata.meta) setMeta(prev => ({ ...prev, ...metadata.meta }));
          if (metadata.vendor) setVendorDetails(prev => ({ ...prev, ...metadata.vendor }));
          if (metadata.client) setClientDetails(prev => ({ ...prev, ...metadata.client }));
          if (metadata.termsList) setTerms(metadata.termsList);
          if (metadata.signatureUrl !== undefined) setSignatureUrl(metadata.signatureUrl);
          if (metadata.signatoryName !== undefined) setSignatoryName(metadata.signatoryName);
          if (metadata.discountPercent !== undefined) setDiscountPercent(metadata.discountPercent);
        } else {
          setAdditionalNotes(quote.additionalNotes);
          setSignatureUrl(null);
          setSignatoryName("Authorized Signatory");
        }
      } catch (e) {
        setAdditionalNotes(quote.additionalNotes);
        setSignatureUrl(null);
        setSignatoryName("Authorized Signatory");
      }
    } else {
      setSignatureUrl(null);
      setSignatoryName("Authorized Signatory");
    }

    setActiveTab("create");
  };

  const handleAddProductRow = () => {
    const newRow = dbRecords && dbRecords.length > 0 
      ? buildRowFromDbRecord(dbRecords[0])
      : {
          id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: "",
          code: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          gst: 18,
          taxName: "VAT",
          taxRate: 0
        };
    setProductsList([...productsList, newRow]);
  };

  const handleSelectCatalogProduct = (rec: any) => {
    // Collect non-empty custom parameters for description
    const propsList: string[] = [];
    let detectedPrice = 0;
    const specs: Record<string, { fieldName: string, value: string, fieldType: string }> = {};

    rec.values?.forEach((valObj: any) => {
      const fName = valObj.productField?.fieldName || "";
      const fVal = valObj.value;
      const fType = valObj.productField?.fieldType || "Text";
      if (fName && fVal) {
        specs[fName] = {
          fieldName: fName,
          value: fVal,
          fieldType: fType
        };

        if (fName.toLowerCase().includes("price") && !isNaN(Number(fVal))) {
          detectedPrice = Number(fVal);
        } else if (fType !== "Image Upload" && fType !== "File Upload") {
          propsList.push(`${fName.toUpperCase()} : ${fVal}`);
        }
      }
    });

    const descriptionText = propsList.join("\n");

    const newProduct = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: rec.name,
      code: `${rec.businessType.substring(0, 3).toUpperCase()}-${rec.id.substring(0, 4).toUpperCase()}`,
      description: descriptionText,
      quantity: 1,
      unitPrice: detectedPrice || 0,
      discount: 0,
      gst: 18,
      taxName: "VAT",
      taxRate: 0,
      dbRecordId: rec.id,
      customFields: specs
    };

    setProductsList([...productsList, newProduct]);
  };

  const handleRemoveProductRow = (id: string) => {
    if (productsList.length === 1) return;
    setProductsList(productsList.filter(p => p.id !== id));
  };

  const handleDuplicateProductRow = (item: ProductItem) => {
    setProductsList([
      ...productsList,
      {
        ...item,
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      }
    ]);
  };

  const handleMoveProductRow = (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < productsList.length) {
      const copy = [...productsList];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      setProductsList(copy);
    }
  };

  const updateProductRow = (id: string, field: keyof ProductItem, value: any) => {
    setProductsList(
      productsList.map(row => {
        if (row.id !== id) return row;
        
        let updated = { ...row, [field]: value };
        
        // Auto-complete presets if Product Name changed
        if (field === "name" && value !== "") {
          const matched = PRESET_PRODUCTS.find(p => p.name === value);
          if (matched) {
            updated.code = matched.code;
            updated.unitPrice = matched.price;
            updated.description = matched.desc;
            updated.dbRecordId = undefined;
            updated.customFields = undefined;
          }
        }
        return updated;
      })
    );
  };

  const handleProductSelect = (rowId: string, selectValue: string) => {
    if (!selectValue) {
      setProductsList(
        productsList.map(row => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            name: "",
            code: "",
            description: "",
            unitPrice: 0,
            dbRecordId: undefined,
            customFields: undefined
          };
        })
      );
      return;
    }

    if (selectValue.startsWith("db-")) {
      const recordId = selectValue.substring(3);
      const record = dbRecords.find(r => r.id === recordId);
      if (record) {
        // Find price/currency if any
        let price = 0;
        const curFieldVal = record.values?.find((v: any) => 
          v.productField?.fieldType === "Currency" || 
          v.productField?.fieldName?.toLowerCase().includes("price")
        );
        if (curFieldVal) {
          price = Number(curFieldVal.value) || 0;
        } else {
          // Fallback to any numeric field value containing currency or price or numeric
          const numFieldVal = record.values?.find((v: any) => 
            v.productField?.fieldType === "Number" && 
            !v.productField?.fieldName?.toLowerCase().includes("moq") &&
            !v.productField?.fieldName?.toLowerCase().includes("hsn")
          );
          if (numFieldVal) {
            price = Number(numFieldVal.value) || 0;
          }
        }

        // Find HSN/SAC code if any
        let code = "";
        const codeFieldVal = record.values?.find((v: any) => {
          const nameLower = v.productField?.fieldName?.toLowerCase() || "";
          return nameLower.includes("hsn") || nameLower.includes("sac") || nameLower.includes("code");
        });
        if (codeFieldVal) {
          code = codeFieldVal.value;
        }

        // Build dynamic description by joining all fields that are not empty and not images
        const specs: Record<string, { fieldName: string, value: string, fieldType: string }> = {};
        const specParts: string[] = [];
        
        if (record.values && record.values.length > 0) {
          record.values.forEach((v: any) => {
            if (!v.productField) return;
            const fName = v.productField.fieldName;
            const fType = v.productField.fieldType;
            const fVal = v.value;
            
            specs[fName] = {
              fieldName: fName,
              value: fVal,
              fieldType: fType
            };

            if (fVal && fType !== "Image Upload" && fType !== "File Upload") {
              specParts.push(`${fName.toUpperCase()} : ${fVal}`);
            }
          });
        }

        const description = specParts.join("\n");

        setProductsList(
          productsList.map(row => {
            if (row.id !== rowId) return row;
            // UPDATE EVERYTHING EXCEPT quantity, discount, gst
            return {
              ...row,
              name: record.name,
              code: code || row.code,
              description: description || `Category: ${record.category || "General"}`,
              unitPrice: price > 0 ? price : row.unitPrice,
              dbRecordId: record.id,
              customFields: specs
            };
          })
        );
      }
    } else if (selectValue.startsWith("preset-")) {
      const pName = selectValue.substring(7);
      const matched = PRESET_PRODUCTS.find(p => p.name === pName);
      if (matched) {
        setProductsList(
          productsList.map(row => {
            if (row.id !== rowId) return row;
            return {
              ...row,
              name: matched.name,
              code: matched.code,
              description: matched.desc,
              unitPrice: matched.price,
              dbRecordId: undefined,
              customFields: undefined
            };
          })
        );
      }
    }
  };

  // Preset Address triggers
  const handleVendorPresetChange = (preset: string) => {
    const presets: Record<string, typeof vendorDetails> = {
      ECOPEK: {
        name: "ECOPEK",
        address: "Maharashtra, India - 500100",
        gstin: "27AAHCM9628G1Z3",
        pan: "AAHCM9628G",
        phone: "+91 98565 47854"
      },
      THYNK: {
        name: "THYNK DESIGNS CREATIVE",
        address: "Cyber City, Hyderabad, Telangana - 500081",
        gstin: "36AAHCM1234S1Z9",
        pan: "ABCPG4321A",
        phone: "+91 80088 12345"
      },
      VELOCITY: {
        name: "THE VELOCITY EXPORTS",
        address: "Maharashtra, India",
        gstin: "27AAHCM9628G1Z3",
        pan: "AAHCM9628G",
        phone: "+91 79852 48632"
      },
      CRAFT: {
        name: "CRAFT LOGISTICS CORP",
        address: "Port Road, Chennai, Tamil Nadu - 600001",
        gstin: "33AAHCM5678B1Z7",
        pan: "ACMPK3342D",
        phone: "+91 90001 54321"
      }
    };

    if (presets[preset]) {
      setVendorDetails(presets[preset]);
    }
  };

  const handleClientPresetChange = (preset: string) => {
    const presets: Record<string, typeof clientDetails> = {
      ALPHADIAG: {
        name: "Alpha Diagnostics Ltd",
        address: "Tech Zone Block B, Delhi - 110001",
        gstin: "07AAHCA9999K1Z4",
        pan: "AAHCA9999K",
        phone: "+91 99991 12345"
      },
      LEAD_DEFAULT: {
        name: lead.name,
        address: lead.companyName || "Lead HQ Campus Site",
        gstin: "27AAHCM9628G1Z3",
        pan: "AAHCM9628G",
        phone: lead.phoneNumber
      }
    };

    if (presets[preset]) {
      setClientDetails(presets[preset]);
    }
  };

  // Customizable branding file uploads base64 read helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "headerBanner" | "footerBanner" | "watermark") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum support size is 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBranding(prev => ({
        ...prev,
        [field]: dataUrl
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // reset input
  };

  const handleRemoveBrandingField = (field: "logo" | "headerBanner" | "footerBanner" | "watermark") => {
    setBranding(prev => ({
      ...prev,
      [field]: ""
    }));
  };

  // Save current customized uploading assets permanently to template
  const handleSaveToSelectedTemplate = async () => {
    if (!selectedTemplateId) {
      alert("Please select a valid layout design template style first!");
      return;
    }
    try {
      setIsSubmitInProgress(true);
      const activeTmpl = templates.find(t => t.id === selectedTemplateId);
      await api.post("/quotation-templates", {
        id: selectedTemplateId,
        name: activeTmpl?.name || "Corporate Template Layout",
        companyName: vendorDetails.name || "ECOPEK",
        logo: branding.logo || null,
        headerBanner: branding.headerBanner || null,
        footerBanner: branding.footerBanner || null,
        watermark: branding.watermark || null,
        watermarkOpacity: branding.watermarkOpacity
      });
      alert("Template layouts updated in database successfully!");
      await fetchTemplatesAndHistory();
    } catch (err: any) {
      alert(`Failed to save template assets: ${err.message}`);
    } finally {
      setIsSubmitInProgress(false);
    }
  };

  // Quick edit popups for fast configurations
  const handleEditTerms = () => {
    const promptCount = prompt("How many Terms and Conditions lines do you wish to specify?", terms.length.toString());
    const count = parseInt(promptCount || "") || terms.length;
    let nextTerms: string[] = [];
    for (let i = 0; i < count; i++) {
      const line = prompt(`Enter Term #${i + 1}:`, terms[i] || `Work will resume after advance payment.`);
      if (line) {
        nextTerms.push(line);
      }
    }
    if (nextTerms.length > 0) {
      setTerms(nextTerms);
    }
  };

  const handleEditGstFlat = () => {
    const gstPrompt = prompt("Enter standard flat GST Rate to apply across all items in percentage (e.g. 18, 12, 5, 0):", "18");
    if (gstPrompt !== null) {
      const pct = parseFloat(gstPrompt) || 0;
      setProductsList(p => p.map(row => ({ ...row, gst: pct })));
    }
  };

  // Mathematical Calculations
  const currencySymbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€"
  };
  const curr = currencySymbols[meta.currency] || "₹";

  let computedSubtotal = 0;
  let computedCgstSum = 0;
  let computedSgstSum = 0;
  let computedCustomTaxSum = 0;

  const calculatedRows = productsList.map((row) => {
    const quantity = Number(row.quantity) || 0;
    const price = Number(row.unitPrice) || 0;
    const amount = quantity * price;
    computedSubtotal += amount;

    const discPercent = Number(row.discount) || 0;
    const rowDiscountVal = amount * (discPercent / 100);
    const afterDiscount = amount - rowDiscountVal;

    const gstPercent = Number(row.gst) || 0;
    const cgstAmount = afterDiscount * (gstPercent / 200);
    const sgstAmount = afterDiscount * (gstPercent / 200);

    computedCgstSum += cgstAmount;
    computedSgstSum += sgstAmount;

    const customTaxPercent = Number(row.taxRate) || 0;
    const customTaxAmount = afterDiscount * (customTaxPercent / 100);
    computedCustomTaxSum += customTaxAmount;

    const rowTotal = afterDiscount + cgstAmount + sgstAmount + customTaxAmount;

    return {
      ...row,
      amount,
      cgstAmount,
      sgstAmount,
      customTaxAmount,
      rowTotal
    };
  });

  const corporateDiscountAmount = computedSubtotal * (discountPercent / 100);
  const calculatedGrandTotal = (computedSubtotal - corporateDiscountAmount) + computedCgstSum + computedSgstSum + computedCustomTaxSum + Number(deliveryCharges || 0);

  const wordsOfGrandTotal = numberToEnglishWords(Math.round(calculatedGrandTotal), meta.currency);

  // Submit and save proposal document
  const handleSaveQuotation = async (status: "DRAFT" | "READY") => {
    setIsSubmitInProgress(true);
    setAlertInfo(null);

    // Filter invalid rows
    const validProducts = productsList.filter(p => p.name.trim() !== "" && p.quantity > 0);
    if (validProducts.length === 0) {
      setAlertInfo({ type: "error", text: "Please enter at least one valid product with name and quantity." });
      setIsSubmitInProgress(false);
      return;
    }

    try {
      // Map to exact required backend product keys!
      // In first product, attach the deliveryCharges so backend handles it elegantly
      const backendProducts = validProducts.map((p, idx) => ({
        productName: p.name,
        description: p.description || "",
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        discount: Number(p.discount) || 0,
        gst: Number(p.gst) || 0,
        tax: Number(p.taxRate) || 0,
        deliveryCharges: idx === 0 ? Number(deliveryCharges || 0) : 0,
        dbRecordId: p.dbRecordId,
        customFields: p.customFields
      }));

      const payload = {
        templateId: selectedTemplateId || null,
        quotationNumber,
        status,
        products: backendProducts,
        deliveryTerms,
        paymentTerms,
        validity: validityDays,
        // serialize our complex metadata blocks gracefully inside additionalNotes notes block
        additionalNotes: JSON.stringify({
          remarks: additionalNotes,
          meta,
          vendor: vendorDetails,
          client: clientDetails,
          termsList: terms,
          signatureUrl,
          signatoryName,
          hasDiscounts: discountPercent > 0,
          discountPercent,
          branding: {
            logo: branding.logo ? true : false,
            watermark: branding.watermark ? true : false,
            headerBanner: branding.headerBanner ? true : false,
            footerBanner: branding.footerBanner ? true : false,
            watermarkOpacity: branding.watermarkOpacity
          }
        })
      };

      if (editingQuotationId) {
        await api.put(`/quotations/${editingQuotationId}`, payload);
      } else {
        await api.post(`/leads/${lead.id}/quotations`, payload);
      }

      setAlertInfo({
        type: "success",
        text: status === "READY" 
          ? "Proposal Marked READY! Automatic outbound dispatch scheduled in 5 minutes via WhatsApp."
          : editingQuotationId 
          ? "Quotation updated successfully!"
          : "Quotation saved as Draft successfully!"
      });

      // Clear edit state
      setEditingQuotationId(null);

      // Refetch
      await fetchTemplatesAndHistory();
      
      if (onQuotationCreated) {
        onQuotationCreated();
      }

      setTimeout(() => {
        if (status === "READY") {
          onClose();
        } else {
          setActiveTab("history");
        }
      }, 2000);

    } catch (err: any) {
      setAlertInfo({ type: "error", text: err.message || "Failed to submit quotation to sales engine." });
    } finally {
      setIsSubmitInProgress(false);
    }
  };

  return (
    <div id="quotation-creator-modal" className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border-2 rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] transition-all ${
        theme === "light"
          ? "bg-slate-50 border-slate-200 text-slate-800"
          : "bg-[#0b101e] border-2 border-slate-900 text-slate-200"
      }`}>
        
        {/* Modal Header */}
        <div className={`p-4.5 flex items-center justify-between border-b ${
          theme === "light"
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#070b16] border-slate-900 text-slate-200"
        }`}>
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
              theme === "light"
                ? "bg-indigo-50 border-indigo-200"
                : "bg-indigo-600/10 border-indigo-500/20"
            }`}>
              <FileText className={`w-5.5 h-5.5 ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`} />
            </div>
            <div>
              <h2 className={`text-sm font-black font-display tracking-widest uppercase flex items-center ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}>
                COMMERCIAL QUOTATION ENGINE
              </h2>
              <p className={`text-[10px] mt-0.5 ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                Lead Account: <span className={`${theme === "light" ? "text-indigo-600" : "text-indigo-400"} font-bold`}>{lead.name}</span> ({lead.companyName || "No Company"}) • Pipeline: <span className="text-emerald-500 uppercase font-extrabold">{lead.status}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Modal Tabs */}
            <div className={`flex p-1 rounded-xl border text-[10px] ${
              theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-900"
            }`}>
              <button 
                onClick={() => setActiveTab("create")}
                className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "create" 
                    ? "bg-indigo-600 text-white" 
                    : theme === "light" 
                      ? "text-slate-600 hover:text-slate-900" 
                      : "text-slate-400 hover:text-white"
                }`}
              >
                Create Quotation
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === "history" 
                    ? "bg-indigo-600 text-white" 
                    : theme === "light" 
                      ? "text-slate-600 hover:text-slate-900" 
                      : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Proposal History</span>
                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${
                  theme === "light" ? "bg-slate-200 text-indigo-700" : "bg-slate-900 text-indigo-400"
                }`}>{previousQuotes.length}</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className={`p-2 rounded-xl cursor-pointer ${
                theme === "light"
                  ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Arena */}
        <div className="flex-1 overflow-y-auto p-5 hover:no-scrollbar">

          {alertInfo && (
            <div className={`p-4 mb-4 rounded-xl border text-xs flex items-center space-x-3 ${
              alertInfo.type === "success" 
                ? "bg-[#0c1e11] border-emerald-950 text-emerald-400" 
                : "bg-red-950/40 border-red-950 text-red-400"
            }`}>
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              <span>{alertInfo.text}</span>
            </div>
          )}

          {activeTab === "create" ? (
            <>
              {editingQuotationId && (
                <div className={`p-4 mb-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                  theme === "light"
                    ? "border-indigo-200 bg-indigo-50/50 text-indigo-800"
                    : "border-indigo-900/40 bg-[#070e1b] text-indigo-300"
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <Info className={`w-4 h-4 shrink-0 ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`} />
                    <span>
                      Active Edit Mode: You are revising draft proposal <strong className={`font-mono ${theme === "light" ? "text-black" : "text-white"}`}>{quotationNumber}</strong>. Re-saving or Marking Ready will update this existing document.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuotationId(null);
                      setQuotationNumber(`QT-${Date.now().toString().slice(-6)}`);
                      setProductsList([
                        {
                          id: "row-1",
                          name: "Saffron Organic Fiber Pack",
                          code: "SAF-ORG-FIB",
                          description: "High grade organic extraction dye filaments.",
                          quantity: 10,
                          unitPrice: 100,
                          discount: 0,
                          gst: 18,
                          taxName: "VAT",
                          taxRate: 0
                        }
                      ]);
                      setDeliveryCharges(0);
                      setDiscountPercent(0);
                    }}
                    className={`px-3 py-1 border rounded-lg text-[10px] font-bold tracking-wider cursor-pointer shrink-0 ml-4 transition-all ${
                      theme === "light"
                        ? "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                        : "bg-slate-900 border-slate-800 text-slate-350 hover:text-white hover:bg-slate-850"
                    }`}
                  >
                    Clear & New Quote
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: CREATOR WORKSPACE DASHBOARD */}
              <div className="lg:col-span-6 space-y-6">
                {/* 1. SELECT DESIGN TEMPLATE */}
                <div className={`p-4 rounded-2xl space-y-4 border transition-all ${
                  theme === "light"
                    ? "bg-white border-slate-200"
                    : "bg-slate-950 border-slate-900"
                }`}>
                  <div className={`flex justify-between items-center pb-2 border-b ${
                    theme === "light" ? "border-slate-100" : "border-slate-900"
                  }`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center ${
                      theme === "light" ? "text-slate-800" : "text-slate-400"
                    }`}>
                      <Layers className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                      1. SELECT DESIGN TEMPLATE
                    </span>
                    <span className={`text-[9px] italic ${
                      theme === "light" ? "text-slate-400" : "text-slate-500"
                    }`}>Select template style</span>
                  </div>

                  <p className={`text-[10px] leading-relaxed ${
                    theme === "light" ? "text-slate-600" : "text-slate-400"
                  }`}>
                    Choose a branding template designed under the <strong className={`${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>Quotation Templates</strong> configuration. This automatically builds the company headers, watermarks, logo mark, and document ribbons.
                  </p>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {templates.length === 0 ? (
                      <div className={`p-4 text-center rounded-xl border ${
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 text-slate-500"
                          : "bg-slate-900/40 border border-slate-900"
                      }`}>
                        <p className={`text-[10.5px] font-medium ${theme === "light" ? "text-slate-650" : "text-slate-500"}`}>No design templates found.</p>
                        <p className={`text-[9px] mt-1 ${theme === "light" ? "text-slate-400" : "text-slate-650"}`}>Please create and design templates in the Quotation Templates configuration tab.</p>
                      </div>
                    ) : (
                      templates.map((t) => {
                        const isSelected = selectedTemplateId === t.id;
                        return (
                          <div
                            key={t.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleTemplateDropdownChange(t.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                handleTemplateDropdownChange(t.id);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer focus:outline-none ${
                              isSelected 
                                ? theme === "light"
                                  ? "bg-indigo-50 border-indigo-500 shadow-sm"
                                  : "bg-indigo-950/25 border-indigo-500/50 shadow-md shadow-indigo-950/20" 
                                : theme === "light"
                                  ? "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                  : "bg-[#080d1a] border-slate-900/80 hover:bg-slate-900/40 hover:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              {t.logo ? (
                                <img src={t.logo} alt="Logo" className={`w-8 h-8 rounded-full border object-contain bg-white ${
                                  theme === "light" ? "border-slate-200" : "border-slate-800"
                                }`} />
                              ) : (
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                  theme === "light"
                                    ? "bg-slate-100 border-slate-200 text-slate-500"
                                    : "bg-slate-900 border-slate-800 text-slate-500"
                                }`}>
                                  N/A
                                </div>
                              )}
                              <div>
                                <h4 className={`text-xs font-bold ${
                                  theme === "light" ? "text-slate-800" : "text-slate-200"
                                }`}>{t.name}</h4>
                                <p className={`text-[10px] flex items-center mt-0.5 ${
                                  theme === "light" ? "text-slate-500" : "text-slate-400"
                                }`}>
                                  <Briefcase className={`w-3 h-3 mr-1 shrink-0 ${
                                    theme === "light" ? "text-indigo-500" : "text-slate-505"
                                  }`} />
                                  <span className="truncate max-w-[140px] block">{t.companyName || "No Company Specified"}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {isSelected ? (
                                <span className={`p-1 rounded-full text-[9px] flex items-center justify-center ${
                                  theme === "light" ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white"
                                }`}>
                                  <Check className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className={`text-[8.5px] font-semibold px-2 py-0.5 rounded border transition-all ${
                                  theme === "light"
                                    ? "text-slate-650 border-slate-200 bg-slate-50 hover:bg-slate-100"
                                    : "text-slate-500 border-slate-800"
                                }`}>
                                  Select
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Watermark/Preview Overlay Fine-Tuning Block */}
                  <div className={`p-3 rounded-xl space-y-3 border transition-all ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-200"
                      : "bg-[#080d1a] border-slate-900/60"
                  }`}>
                    <div className={`flex justify-between items-center pb-1.5 border-b ${
                      theme === "light" ? "border-slate-200/60" : "border-slate-900/40"
                    }`}>
                      <span className={`text-[10px] uppercase font-bold ${
                        theme === "light" ? "text-slate-705" : "text-slate-400"
                      }`}>Preview Overlay Controls</span>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={branding.watermarkVisible} 
                          onChange={(e) => setBranding(prev => ({ ...prev, watermarkVisible: e.target.checked }))} 
                          className={`w-3 h-3 rounded transition-all ${
                            theme === "light"
                              ? "text-indigo-600 bg-white border-slate-300"
                              : "text-indigo-600 bg-slate-900 border-slate-805"
                          }`}
                        />
                        <span className={`text-[9px] ${
                          theme === "light" ? "text-slate-600" : "text-slate-450"
                        }`}>Show Watermark</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] items-center">
                        <span className={theme === "light" ? "text-slate-600" : "text-slate-450"}>Watermark Opacity</span>
                        <strong className={`font-mono text-[10px] ${theme === "light" ? "text-indigo-600 font-extrabold" : "text-white"}`}>{branding.watermarkOpacity}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="50" 
                        step="5" 
                        value={branding.watermarkOpacity} 
                        onChange={(e) => setBranding(prev => ({ ...prev, watermarkOpacity: parseInt(e.target.value) }))}
                        className={`w-full h-1.5 rounded-lg cursor-pointer accent-indigo-600 transition-all ${
                          theme === "light" ? "bg-slate-200" : "bg-slate-800"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. VENDOR & CLIENT PRESETS CARDS */}
                <div className={`p-4 rounded-2xl space-y-4 border transition-all ${
                  theme === "light"
                    ? "bg-white border-slate-200"
                    : "bg-slate-950 border-slate-900"
                }`}>
                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2 gap-2 ${
                    theme === "light" ? "border-slate-100" : "border-slate-900"
                  }`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                      theme === "light" ? "text-slate-800" : "text-slate-400"
                    }`}>
                      2. GEOGRAPHIC PARTIES (FROM & FOR ADDRESS blocks)
                    </span>
                    <div className="flex items-center space-x-2 shrink-0">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${
                        theme === "light" ? "text-slate-500" : "text-slate-450"
                      }`}>Quotation No:</label>
                      <input
                        type="text"
                        value={quotationNumber}
                        onChange={(e) => setQuotationNumber(e.target.value)}
                        className={`text-xs px-2.5 py-1.5 rounded focus:outline-none border font-mono transition-all w-36 ${
                          theme === "light"
                            ? "bg-slate-100 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                            : "bg-slate-900 border-slate-800 text-white focus:border-indigo-505"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* FROM BLOCK Vendor details */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className={`text-[9px] font-bold uppercase block ${
                          theme === "light" ? "text-slate-600" : "text-slate-400"
                        }`}>Quotation From (Vendor)</label>
                        <select 
                          className={`text-[9.5px] rounded px-1.5 py-0.5 focus:outline-none border transition-all ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-700"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                          onChange={(e) => handleVendorPresetChange(e.target.value)}
                        >
                          <option value="ECOPEK">ECOPEK</option>
                          <option value="THYNK">Thynk Designs</option>
                          <option value="VELOCITY">Velocity Exports</option>
                          <option value="CRAFT">Craft Logistics</option>
                        </select>
                      </div>

                      <div className="space-y-2 text-xs">
                        <input 
                          type="text" 
                          placeholder="Vendor Business Name" 
                          value={vendorDetails.name} 
                          onChange={(e) => setVendorDetails(prev => ({ ...prev, name: e.target.value }))}
                          className={`w-full rounded p-1.5 text-xs transition-all border ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                              : "bg-slate-900 border-slate-850 text-white placeholder-slate-600"
                          }`} 
                        />
                        <input 
                          type="text" 
                          placeholder="Vendor Address Location" 
                          value={vendorDetails.address} 
                          onChange={(e) => setVendorDetails(prev => ({ ...prev, address: e.target.value }))}
                          className={`w-full rounded p-1.5 text-[11px] transition-all border ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                              : "bg-slate-900 border-slate-850 text-white placeholder-slate-600"
                          }`} 
                        />
                        <div className="grid grid-cols-2 gap-1 px-0.2">
                          <input 
                            type="text" 
                            placeholder="GSTIN" 
                            value={vendorDetails.gstin} 
                            onChange={(e) => setVendorDetails(prev => ({ ...prev, gstin: e.target.value }))}
                            className={`w-full rounded p-1.5 text-[10px] font-mono transition-all border ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                                : "bg-slate-900 border-slate-850 text-white font-mono placeholder-slate-600"
                            }`} 
                          />
                          <input 
                            type="text" 
                            placeholder="PAN" 
                            value={vendorDetails.pan} 
                            onChange={(e) => setVendorDetails(prev => ({ ...prev, pan: e.target.value }))}
                            className={`w-full rounded p-1.5 text-[10px] font-mono transition-all border ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                                : "bg-slate-900 border-slate-850 text-white font-mono placeholder-slate-600"
                            }`} 
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Contact Number" 
                          value={vendorDetails.phone} 
                          onChange={(e) => setVendorDetails(prev => ({ ...prev, phone: e.target.value }))}
                          className={`w-full rounded p-1.5 text-[10px] font-mono transition-all border ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                              : "bg-slate-900 border-slate-850 text-white font-mono placeholder-slate-600"
                          }`} 
                        />
                      </div>
                    </div>

                    {/* FOR BLOCK Lead/Client details */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className={`text-[9px] font-bold uppercase block ${
                          theme === "light" ? "text-slate-600" : "text-slate-400"
                        }`}>Quotation For (Client)</label>
                        <select 
                          className={`text-[9.5px] rounded px-1.5 py-0.5 focus:outline-none border transition-all ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-700"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                          onChange={(e) => handleClientPresetChange(e.target.value)}
                        >
                          <option value="LEAD_DEFAULT">Default Active Lead</option>
                          <option value="ALPHADIAG">Alpha Diagnostics</option>
                        </select>
                      </div>

                      <div className="space-y-2 text-xs">
                        <input 
                          type="text" 
                          value={clientDetails.name} 
                          onChange={(e) => setClientDetails(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Client Company Name" 
                          className={`w-full rounded p-1.5 text-xs transition-all border ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                              : "bg-slate-900 border-slate-850 text-white placeholder-slate-600"
                          }`} 
                        />
                        <input 
                          type="text" 
                          value={clientDetails.address} 
                          onChange={(e) => setClientDetails(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Physical Address details" 
                          className={`w-full rounded p-1.5 text-[11px] transition-all border ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                              : "bg-slate-900 border-slate-850 text-white placeholder-slate-600"
                          }`} 
                        />
                        <div className="grid grid-cols-2 gap-1 px-0.2">
                          <input 
                            type="text" 
                            value={clientDetails.gstin} 
                            onChange={(e) => setClientDetails(prev => ({ ...prev, gstin: e.target.value }))}
                            placeholder="GSTIN" 
                            className={`w-full rounded p-1.5 text-[10px] font-mono transition-all border ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                                : "bg-slate-900 border-slate-850 text-white font-mono placeholder-slate-600"
                            }`} 
                          />
                          <input 
                            type="text" 
                            value={clientDetails.pan} 
                            onChange={(e) => setClientDetails(prev => ({ ...prev, pan: e.target.value }))}
                            placeholder="PAN" 
                            className={`w-full rounded p-1.5 text-[10px] font-mono transition-all border ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                                : "bg-slate-900 border-slate-850 text-white font-mono placeholder-slate-600"
                            }`} 
                          />
                        </div>
                        <input 
                          type="text" 
                          value={clientDetails.phone} 
                          onChange={(e) => setClientDetails(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Contact phone number" 
                          className={`w-full rounded p-1.5 text-[10px] font-mono transition-all border ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40 focus:outline-none"
                              : "bg-slate-900 border-slate-850 text-white font-mono placeholder-slate-600"
                          }`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* 4. LINE ITEMS WORKSPACE TABLE rows */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                      theme === "light" ? "text-slate-805" : "text-slate-400"
                    }`}>
                      4. PRODUCTS & SCOPE OF SERVICE WORKSPACE
                    </span>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleAddProductRow}
                        className={`px-2.5 py-1 text-[9.5px]/[14px] rounded font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
                          theme === "light"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {productsList.map((row, index) => (
                      <div 
                        key={row.id} 
                        className={`p-4 rounded-xl border space-y-3 relative group transition-all ${
                          theme === "light"
                            ? "border-slate-200 bg-white shadow-sm"
                            : "border-slate-900 bg-[#070b16]"
                        }`}
                      >
                        {/* Serial header and edit tools */}
                        <div className={`flex justify-between items-center border-b pb-1.5 ${
                          theme === "light" ? "border-slate-100" : "border-slate-950"
                        }`}>
                          <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                            theme === "light"
                              ? "text-indigo-705 bg-indigo-50"
                              : "text-indigo-400 bg-indigo-900/10"
                          }`}>Item block #{index + 1}</span>
                          <div className="flex items-center space-x-1 select-none">
                            <button
                              type="button"
                              onClick={() => handleMoveProductRow(index, -1)}
                              className={`p-0.5 rounded transition-all ${
                                theme === "light"
                                  ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  : "text-slate-400 hover:text-white hover:bg-slate-900"
                              }`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProductRow(index, 1)}
                              className={`p-0.5 rounded transition-all ${
                                theme === "light"
                                  ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  : "text-slate-400 hover:text-white hover:bg-slate-900"
                              }`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProductRow(row)}
                              className={`p-0.5 rounded transition-all ${
                                theme === "light"
                                  ? "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                                  : "text-slate-400 hover:text-indigo-400 hover:bg-slate-900"
                              }`}
                              title="Duplicate row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {productsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProductRow(row.id)}
                                className={`p-0.5 rounded transition-all ${
                                  theme === "light"
                                    ? "text-red-600 hover:text-red-700 hover:bg-slate-100"
                                    : "text-red-400 hover:text-red-300 hover:bg-slate-900"
                                }`}
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Presets and Product Name inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase font-mono font-bold text-slate-500 block">Preset Auto-Fill select</label>
                            <select
                              value={row.dbRecordId ? `db-${row.dbRecordId}` : PRESET_PRODUCTS.some(p => p.name === row.name) ? `preset-${row.name}` : ""}
                              onChange={(e) => handleProductSelect(row.id, e.target.value)}
                              className={`w-full text-xs rounded px-2 py-1 focus:outline-none border transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-205 text-slate-800"
                                  : "bg-slate-950 border-slate-850 text-white"
                              }`}
                            >
                              <option value="">Select Product</option>
                              {dbRecords.length > 0 && 
                                dbRecords.map(r => {
                                  const priceVal = r.values?.find((v: any) => 
                                    v.productField?.fieldType === "Currency" || 
                                    v.productField?.fieldName?.toLowerCase().includes("price")
                                  )?.value || "";
                                  const categoryInfo = r.category ? ` [${r.category}]` : "";
                                  const formattedPrice = priceVal ? ` (${curr}${priceVal})` : "";
                                  return (
                                    <option key={r.id} value={`db-${r.id}`}>
                                      {r.name}{categoryInfo}{formattedPrice}
                                    </option>
                                  );
                                })
                              }
                            </select>
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] uppercase font-mono font-bold text-slate-500 block">Item/Service Title Name</label>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateProductRow(row.id, "name", e.target.value)}
                              placeholder="e.g. Saffron Organic Fiber Pack"
                              className={`w-full text-xs rounded px-2 py-1 focus:outline-none border transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/45"
                                  : "bg-slate-950 border-slate-850 text-white"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-1">
                          <div className="md:col-span-12 space-y-1">
                            <label className="text-[8px] uppercase font-mono font-bold text-slate-500 block">Detailed Specifications description / scope</label>
                            <textarea
                              value={row.description}
                              onChange={(e) => updateProductRow(row.id, "description", e.target.value)}
                              placeholder="e.g. FDA certified, surgical wholesale grade extraction..."
                              rows={3}
                              className={`w-full text-xs rounded px-2 py-1 focus:outline-none border transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-205 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                  : "bg-slate-950 border-slate-850 text-white"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Dynamic Custom Fields attributes panel */}
                        {row.customFields && Object.keys(row.customFields).length > 0 && (
                          <div className={`p-2.5 rounded-lg border my-2 transition-all ${
                            theme === "light"
                              ? "bg-slate-50/50 border-slate-205 text-slate-800"
                              : "bg-[#0b0f19]/40 border-slate-900/60 text-slate-300"
                          }`}>
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                              <span className="text-[9px] uppercase font-mono font-bold text-indigo-500 tracking-wider flex items-center">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span>
                                Product Schema Properties 
                              </span>
                              <span className="text-[8px] text-slate-450 dark:text-slate-500 font-mono">Auto-updates Description / Scope</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {(Object.values(row.customFields) as any[]).map((field, fIdx) => (
                                <div key={fIdx} className="space-y-0.5">
                                  <span className="text-[7.5px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block truncate" title={field.fieldName}>
                                    {field.fieldName}
                                  </span>
                                  {field.fieldType === "Image Upload" || field.fieldType === "File Upload" ? (
                                    field.value ? (
                                      <div className="relative group/fieldimg w-10 h-10 rounded border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden">
                                        <img 
                                          src={field.value} 
                                          alt={field.fieldName} 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-[8px] text-slate-400 italic block py-0.5">No image</span>
                                    )
                                  ) : (
                                    <input
                                      type="text"
                                      value={field.value}
                                      onChange={(e) => {
                                        const updatedSpecs = { ...row.customFields } as any;
                                        updatedSpecs[field.fieldName] = { ...field, value: e.target.value };
                                        
                                        // Auto update the row summary description by joining non-imagery/file properties
                                        const desc = (Object.values(updatedSpecs) as any[])
                                          .filter(f => f && f.fieldType !== "Image Upload" && f.fieldType !== "File Upload")
                                          .map(f => `${f.fieldName.toUpperCase()} : ${f.value}`)
                                          .join("\n");

                                        setProductsList(productsList.map(pr => {
                                          if (pr.id !== row.id) return pr;
                                          return {
                                            ...pr,
                                            customFields: updatedSpecs,
                                            description: desc || pr.description
                                          };
                                        }));
                                      }}
                                      className={`w-full text-[10px] rounded px-2 py-0.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500/25 transition-all ${
                                        theme === "light"
                                          ? "bg-white border-slate-200 text-slate-800"
                                          : "bg-slate-950/40 border-slate-900 text-slate-300"
                                      }`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Numerical computation rows */}
                        <div className={`grid grid-cols-3 md:grid-cols-5 gap-3.5 pt-1 border-t ${
                          theme === "light" ? "border-slate-100" : "border-slate-950"
                        }`}>
                          <div className="space-y-1">
                            <label className="text-[8.5px] uppercase font-mono font-bold text-slate-500 block">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateProductRow(row.id, "quantity", Number(e.target.value))}
                              className={`w-full text-xs rounded px-1.5 py-1 font-bold font-mono text-center border focus:outline-none transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                  : "bg-slate-950 border-slate-850 text-white"
                              }`}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] uppercase font-mono font-bold text-slate-500 block">Unit Price ({curr})</label>
                            <input
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) => updateProductRow(row.id, "unitPrice", Number(e.target.value))}
                              className={`w-full text-xs rounded px-1.5 py-1 font-bold font-mono text-right border focus:outline-none transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-202 text-emerald-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                  : "bg-slate-950 border-slate-850 text-emerald-400"
                              }`}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] uppercase font-mono font-bold text-slate-500 block">Discount (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.discount}
                              onChange={(e) => updateProductRow(row.id, "discount", Number(e.target.value))}
                              className={`w-full text-xs rounded px-1.5 py-1 font-mono text-center border focus:outline-none transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-202 text-red-600 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                  : "bg-slate-950 border-slate-850 text-red-400"
                              }`}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] uppercase font-mono font-bold text-slate-500 block">GST Taxes (%)</label>
                            <select
                              value={row.gst}
                              onChange={(e) => updateProductRow(row.id, "gst", Number(e.target.value))}
                              className={`w-full text-xs rounded px-2 py-1 font-semibold text-center border focus:outline-none transition-all ${
                                theme === "light"
                                  ? "bg-slate-50 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                  : "bg-slate-950 border-slate-850 text-white"
                              }`}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] uppercase font-mono font-bold text-slate-500 block">Other Tax ({row.taxName})</label>
                            <div className="flex space-x-1">
                              <input
                                type="text"
                                value={row.taxName}
                                onChange={(e) => updateProductRow(row.id, "taxName", e.target.value)}
                                className={`w-8 shrink-0 text-[10px] rounded text-center font-bold border focus:outline-none transition-all ${
                                  theme === "light"
                                    ? "bg-slate-50 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                    : "bg-slate-950 border-slate-850 text-white"
                                }`}
                                placeholder="VAT"
                              />
                              <input
                                type="number"
                                value={row.taxRate}
                                onChange={(e) => updateProductRow(row.id, "taxRate", Number(e.target.value))}
                                className={`w-full text-xs rounded px-1.5 py-1 font-mono border focus:outline-none transition-all ${
                                  theme === "light"
                                    ? "bg-slate-50 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                                    : "bg-slate-950 border-slate-850 text-white"
                                }`}
                                placeholder="%"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Live row results row */}
                        <div className={`flex justify-between items-center text-[10px] pt-1 ${
                          theme === "light" ? "text-slate-600" : "text-slate-505"
                        }`}>
                          <span>Base Amount: {curr}{(row.quantity * row.unitPrice).toFixed(2)}</span>
                          <span>CGST (half of {row.gst}%): {curr}{(row.rowTotal ? ((row.quantity * row.unitPrice) * (row.gst / 200)) : 0).toFixed(2)}</span>
                          <span className={`font-bold font-mono ${theme === "light" ? "text-indigo-900" : "text-white"}`}>Row Total: {curr}{(row.quantity * row.unitPrice * (1 - (row.discount/100)) * (1 + (row.gst/100) + (row.taxRate/100))).toFixed(2)}</span>
                        </div>

                      </div>
                    ))}
                  </div>
                            {/* 5. PDF SETTINGS & VIEW CODES */}
                <div className={`p-4 rounded-xl space-y-3 border transition-all ${
                  theme === "light"
                    ? "bg-white border-slate-200 shadow-sm text-slate-800"
                    : "bg-slate-950 border-slate-900 text-slate-100"
                }`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center font-mono block mb-1 ${
                    theme === "light" ? "text-indigo-7000" : "text-indigo-400"
                  }`}>
                    5. TOTALS OPTIONS & GLOBAL CALCULATORS
                  </span>
                  
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-xs ${
                    theme === "light" ? "text-slate-700" : "text-slate-300"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center font-medium">Show Grand Total on Preview</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={meta.showPDFTotals} 
                          onChange={(e) => setMeta(prev => ({ ...prev, showPDFTotals: e.target.checked }))} 
                          className="sr-only peer" 
                        />
                        <div className={`w-9 h-5 rounded-full peer peer-focus:ring-1 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                          theme === "light" ? "bg-slate-200 after:bg-white" : "bg-slate-850 after:bg-slate-300"
                        }`}></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center font-medium">Convert Grand Total to Words</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={meta.showWords} 
                          onChange={(e) => setMeta(prev => ({ ...prev, showWords: e.target.checked }))} 
                          className="sr-only peer" 
                        />
                        <div className={`w-9 h-5 rounded-full peer peer-focus:ring-1 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                          theme === "light" ? "bg-slate-200 after:bg-white" : "bg-slate-850 after:bg-slate-300"
                        }`}></div>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8.5px] uppercase font-mono font-bold text-slate-500">Surcharges / Delivery Charges ({curr})</label>
                      <input 
                        type="number" 
                        value={deliveryCharges} 
                        onChange={(e) => setDeliveryCharges(Math.abs(parseFloat(e.target.value) || 0))}
                        className={`w-full text-xs font-mono font-bold p-1.5 rounded focus:outline-none border transition-all ${
                          theme === "light"
                            ? "bg-slate-50 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                            : "bg-slate-900 border-slate-800 text-slate-200"
                        }`} 
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8.5px] uppercase font-mono font-bold text-slate-500">Global Corporate Discount (%)</label>
                      <input 
                        type="number" 
                        value={discountPercent} 
                        onChange={(e) => setDiscountPercent(Math.abs(parseFloat(e.target.value) || 0))} 
                        className={`w-full text-xs font-mono font-bold p-1.5 rounded focus:outline-none border transition-all ${
                          theme === "light"
                            ? "bg-slate-50 border-slate-205 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/40"
                            : "bg-slate-900 border-slate-800 text-slate-200"
                        }`} 
                        placeholder="0%"
                      />
                    </div>
                  </div>

                  {meta.showWords && (
                    <div className={`p-2.5 rounded-xl text-[10px] italic font-mono leading-relaxed ${
                      theme === "light"
                        ? "bg-indigo-50/75 text-indigo-700"
                        : "bg-[#0e1726]/40 text-indigo-450"
                    }`}>
                      Generated Total Text: <strong className={theme === "light" ? "text-indigo-955 font-bold" : "text-white"}>{wordsOfGrandTotal}</strong>
                    </div>
                  )}
                </div>



                {/* Extra Actions row under remarks */}
                <div className="flex items-center space-x-3 pt-3 px-1">
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-extrabold uppercase flex items-center justify-center space-x-1.5 cursor-pointer border transition-all ${
                      theme === "light"
                        ? "bg-slate-100 hover:bg-slate-150 border-slate-200 text-slate-700 hover:border-slate-300"
                        : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-350 hover:text-white"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Config Terms</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignatureOpen(true)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-extrabold uppercase flex items-center justify-center space-x-1.5 cursor-pointer border transition-all ${
                      theme === "light"
                        ? "bg-slate-100 hover:bg-slate-150 border-slate-200 text-slate-700 hover:border-slate-300"
                        : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-350 hover:text-white"
                    }`}
                  >
                    <Signature className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Add Signature</span>
                  </button>
                </div>

                      </div>

                {/* Creation execution blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                  <button
                    type="button"
                    onClick={() => handleSaveQuotation("READY")}
                    disabled={isSubmitInProgress}
                    className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-[11px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg hover:shadow-indigo-950/20 disabled:opacity-40"
                  >
                    <Send className="w-4 h-4 animate-bounce" />
                    <span>{isSubmitInProgress ? "AI Dispatching..." : "Mark Ready (AI WhatsApp Send)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveQuotation("DRAFT")}
                    disabled={isSubmitInProgress}
                    className="py-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white font-bold text-[11px] uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-45"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Draft (Review Only)</span>
                  </button>
                </div>

              </div>

              {/* RIGHT COLUMN: REAL-TIME PREMIUM PRINT FINAL PREVIEW (Matches Image 1 precisely) */}
              <div className="lg:col-span-6 lg:sticky lg:top-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-950">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] font-mono font-black text-slate-300">LIVE RENDER SHIELD (A4 HIGH RESOLUTION PREVIEW)</span>
                  </div>
                  <span className="text-[9px] text-slate-450 uppercase font-bold italic">Auto-calculates on edit</span>
                </div>

                {/* THE PORTRAIT SHEET DISPLAY */}
                <div 
                  id="print-area" 
                  className="bg-white text-slate-800 font-sans shadow-2xl rounded-2xl relative overflow-hidden flex flex-col justify-between select-none" 
                  style={{ minHeight: "842px", width: "100%", maxWidth: "595px", margin: "0 auto" }}
                >
                  
                  {/* Watermark Background Container overlay */}
                  {branding.watermarkVisible && (
                    <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 transition-opacity"
                      style={{ opacity: branding.watermarkOpacity / 100 }}
                    >
                      {branding.watermark ? (
                        <img src={branding.watermark} alt="Watermark" className="w-[60%] h-auto object-contain max-h-[50%]" referrerPolicy="no-referrer" />
                      ) : (
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[50%] h-auto opacity-40">
                          <path d="M50 15 C30 35, 30 65, 50 85 C55 75, 55 55, 50 45 C45 35, 45 25, 50 15" fill="#e2a326"/>
                          <path d="M50 15 C65 30, 68 55, 56 68 C45 50, 48 35, 50 15" fill="#0c353a"/>
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Header Part with Polygon or Image banner */}
                  <div className="relative w-full z-10">
                    {branding.headerBanner ? (
                      <div className="w-full overflow-hidden" style={{ height: "110px" }}>
                        <img src={branding.headerBanner} alt="Header Layout banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-full overflow-hidden bg-[#0c353a]" style={{ height: "110px" }}>
                        <svg viewBox="0 0 595 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                          <path d="M0 0 H595 V65 L430 95 L220 70 L0 80 Z" fill="#0c353a"/>
                          <path d="M0 80 L220 70 L430 95 L595 65 V80 L430 110 L220 85 L0 95 Z" fill="#e2a326"/>
                          <path d="M120 0 L180 30 L220 0 Z" fill="#ffffff" fillOpacity="0.15" />
                          <path d="M350 0 L390 20 L440 0 Z" fill="#ffffff" fillOpacity="0.1" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Main Printable Content area */}
                  <div className="px-6 flex-1 flex flex-col justify-between pt-1 pb-3 relative z-10">
                    
                    {/* Metadata indicators header */}
                    <div className="flex items-center justify-between text-[11px] border-b border-slate-150 pb-2">
                      <div>
                        <span className="font-bold text-slate-700 font-sans">QUOTATION NUMBER:</span>
                        <span className="font-bold text-rose-600 ml-1.5 font-mono">{quotationNumber}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Issue Date:</span>
                        <span className="font-bold text-slate-900 ml-1.5">{new Date().toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>

                    {/* From & For side-by-side lavender layouts */}
                    <div className="grid grid-cols-2 gap-3.5 my-3">
                      <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100/50">
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Quotation From</span>
                        <h4 className="text-[10px] font-bold text-slate-900 leading-tight">{vendorDetails.name}</h4>
                        <p className="text-[8.5px] text-slate-600 mt-1 leading-relaxed font-mono">
                          {vendorDetails.address}<br />
                          GSTIN: {vendorDetails.gstin || "N/A"}<br />
                          PAN: {vendorDetails.pan || "N/A"}<br />
                          Phone: {vendorDetails.phone || "N/A"}
                        </p>
                      </div>

                      <div className="bg-[#f0f4ff]/80 p-3.5 rounded-xl border border-indigo-100/50">
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Prepared For</span>
                        <h4 className="text-[10px] font-bold text-slate-900 leading-tight">{clientDetails.name}</h4>
                        <p className="text-[8.5px] text-slate-600 mt-1 leading-relaxed font-mono">
                          {clientDetails.address}<br />
                          GSTIN: {clientDetails.gstin || "N/A"}<br />
                          PAN: {clientDetails.pan || "N/A"}<br />
                          Phone: {clientDetails.phone || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Geography supply coordinates */}
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 px-0.5 mb-2.5">
                      <div>
                        <span>Country of Supply:</span>
                        <span className="text-slate-800 ml-1">{meta.countryOfSupply}</span>
                      </div>
                      <div>
                        <span>Place of Supply (GST):</span>
                        <span className="text-slate-800 ml-1">{meta.stateOfSupply}</span>
                      </div>
                    </div>

                    {/* Dynamic Items Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm mb-4">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0084f8] text-white font-semibold text-[9px]">
                            <th className="py-2 px-2.5">Item Column</th>
                            <th className="py-2 px-1 text-center">GST %</th>
                            <th className="py-2 px-1 text-center">Qty</th>
                            <th className="py-2 px-1.5 text-right">Rate</th>
                            <th className="py-2 px-1.5 text-right">Amount</th>
                            <th className="py-2 px-1 text-right">CGST</th>
                            <th className="py-2 px-1 text-right">SGST</th>
                            <th className="py-2 px-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-[8.5px] divide-y divide-slate-100">
                          {calculatedRows.map((item, index) => {
                            const discPercent = Number(item.discount) || 0;
                            const itemDiscountVal = item.amount * (discPercent / 100);
                            const baseAfterDiscount = item.amount - itemDiscountVal;
                            return (
                              <tr key={item.id} className={index % 2 === 1 ? "bg-slate-55/40 bg-slate-50/50" : ""}>
                                <td className="py-2 px-2.5 font-semibold text-slate-900 leading-snug">
                                  <div className="font-bold">{index + 1}. {item.name || "Untitled Item Product"}</div>
                                  {item.description && (
                                    <div className="text-[7.5px] text-slate-400 font-mono font-normal whitespace-pre-line mt-0.5">
                                      {item.description}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-1 text-center text-slate-700 font-mono font-bold">{item.gst}%</td>
                                <td className="py-2 px-1 text-center text-slate-700 font-bold font-mono">{item.quantity}</td>
                                <td className="py-2 px-1.5 text-right text-slate-700 font-mono">{curr}{priceFormat(item.unitPrice)}</td>
                                <td className="py-2 px-1.5 text-right text-slate-700 font-mono">{curr}{priceFormat(baseAfterDiscount)}</td>
                                <td className="py-2 px-1 text-right text-slate-500 font-mono">{curr}{priceFormat(item.cgstAmount)}</td>
                                <td className="py-2 px-1 text-right text-slate-500 font-mono">{curr}{priceFormat(item.sgstAmount)}</td>
                                <td className="py-2 px-2 text-right font-bold text-slate-900 font-mono">{curr}{priceFormat(item.rowTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom alignment of Terms vs Totals */}
                    <div className="flex justify-between items-start mt-2">
                      {/* Conditions list */}
                      <div className="w-[52%] space-y-2">
                        <span className="text-[9.5px] font-bold text-indigo-600 uppercase tracking-widest block">Terms and Conditions</span>
                        <ol className="text-[8px] text-slate-600 list-decimal list-inside leading-loose font-mono">
                          {terms.map((term, i) => (
                            <li key={i}>{term}</li>
                          ))}
                        </ol>
                      </div>

                      {/* Mathematical calculation block values */}
                      <div className="w-[45%] bg-slate-50/40 p-3 rounded-xl border border-slate-100 font-mono text-[9px] space-y-1.5 flex flex-col justify-end text-right">
                        <div className="flex justify-between text-slate-600">
                          <span>Amount:</span>
                          <span className="font-bold text-slate-800">{curr}{priceFormat(computedSubtotal)}</span>
                        </div>
                        {corporateDiscountAmount > 0 && (
                          <div className="flex justify-between text-red-500 font-semibold">
                            <span>Corporate Disc ({discountPercent}%):</span>
                            <span>-{curr}{priceFormat(corporateDiscountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>CGST (Central):</span>
                          <span>{curr}{priceFormat(computedCgstSum)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST (State):</span>
                          <span>{curr}{priceFormat(computedSgstSum)}</span>
                        </div>
                        {computedCustomTaxSum > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Custom Surcharge:</span>
                            <span>{curr}{priceFormat(computedCustomTaxSum)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600 pb-1 border-b border-slate-200">
                          <span>Delivery/Logistics:</span>
                          <span>{curr}{priceFormat(deliveryCharges)}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-bold text-[10.5px] pt-1 border-b-2 border-double border-slate-900">
                          <span>Grand Total:</span>
                          <span className="font-sans text-xs text-indigo-950">
                            {meta.showPDFTotals ? `${curr}${priceFormat(calculatedGrandTotal)}` : "----"}
                          </span>
                        </div>
                        
                        {meta.showWords && (
                          <div className="text-[7.5px] text-slate-500 leading-tight italic text-right mt-2 pr-0.5 pt-1 border-t border-slate-100 font-mono whitespace-normal">
                            Total (in words):<br />
                            <span className="font-black text-slate-700 font-sans block mt-0.5 uppercase tracking-tighter">{wordsOfGrandTotal}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks & Signature alignment block */}
                    <div className="flex justify-between items-end mt-4 px-1 pb-3">
                      {/* Left: Empty spacer */}
                      <div className="max-w-[55%]"></div>
                      {/* Right: Signature stamp */}
                      <div className="w-[38%] flex flex-col items-center justify-end text-center">
                        {signatureUrl ? (
                          <div className="h-10 flex items-center justify-center mb-1 bg-white p-0.5 rounded border border-slate-100 shadow-xs">
                            <img src={signatureUrl} alt="Authorized Signature" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center mb-1 text-[8px] text-slate-350 italic border border-dashed border-slate-200 rounded-lg px-3">
                            No signature added
                          </div>
                        )}
                        <div className="w-full border-t border-slate-300 border-dashed my-1"></div>
                        <span className="text-[8px] font-bold text-slate-800 uppercase tracking-wider">{signatoryName || "Authorized Signatory"}</span>
                        <span className="text-[6.5px] text-slate-400 block mt-0.5">Corporate Representative</span>
                      </div>
                    </div>

                  </div>

                  {/* Footer portion */}
                  <div className="relative w-full z-10 bottom-0 select-none mt-auto">
                    {/* Thick bottom ribbon SVG or Image */}
                    {branding.footerBanner ? (
                      <div className="w-full overflow-hidden" style={{ height: "48px" }}>
                        <img src={branding.footerBanner} alt="Footer layout ribbon banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-full" style={{ height: "48px" }}>
                        <svg viewBox="0 0 595 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                          <rect width="595" height="48" fill="white" />
                          <path d="M0 15 L180 8 L390 22 L595 5 V20 H0 Z" fill="#e2a326"/>
                          <path d="M0 20 L180 13 L390 27 L595 10 V48 H0 Z" fill="#0c353a"/>
                        </svg>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </>
          ) : (
            /* History of Quotations Tab View */
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                  Quote Dispatch Vault
                </h3>
                <span className="text-[10px] text-slate-400 italic">Historical list of proposals issued for this active account</span>
              </div>

              {previousQuotes.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No proposal records found for this lead. Let's create our first one!
                </div>
              ) : (
                <div className="space-y-4">
                  {previousQuotes.map((quote) => (
                    <div 
                      key={quote.id} 
                      className="p-4 rounded-xl border border-slate-900/60 bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-800"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xs font-bold text-indigo-400 font-mono tracking-wider">{quote.quotationNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            quote.status === "SENT" || quote.status === "DELIVERED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40"
                              : quote.status === "READY"
                              ? "bg-indigo-950 text-indigo-400 border border-indigo-900/40"
                              : "bg-stone-900 text-slate-400"
                          }`}>
                            {quote.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                          <span>Grand Total: <strong className="text-white">{curr}{priceFormat(quote.grandTotal)}</strong></span>
                          <span>Validity: <strong className="text-slate-300">{quote.validity || "30 Days"}</strong></span>
                          <span>Issued: <strong className="text-slate-300">{new Date(quote.createdAt).toLocaleDateString()}</strong></span>
                        </div>

                        {quote.scheduledAt && quote.status === "READY" && (
                          <div className="text-[9px] text-indigo-400 flex items-center space-x-1.5 pt-1 italic font-semibold">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Scheduled WhatsApp delivery in progress ({Math.max(0, Math.round((new Date(quote.scheduledAt).getTime() - Date.now()) / 1000 / 60))} minutes remaining)</span>
                          </div>
                        )}

                        {quote.deliveredAt && (
                          <div className="text-[9px] text-emerald-400 flex items-center space-x-1.5 pt-1 italic font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Successfully Delivered at {new Date(quote.deliveredAt).toLocaleTimeString()} via Automator API</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {confirmDeleteQuoteId === quote.id ? (
                          <div className="flex items-center space-x-1.5 bg-slate-900/40 p-1 border border-slate-800/60 rounded">
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wide mr-1 pl-1">Sure?</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.delete(`/quotations/${quote.id}`);
                                  setPreviousQuotes(prev => prev.filter(q => q.id !== quote.id));
                                  setAlertInfo({ type: "success", text: "Quotation removed from LeadSmart Proposal Vault." });
                                } catch(e: any) {
                                  setAlertInfo({ type: "error", text: e.message });
                                } finally {
                                  setConfirmDeleteQuoteId(null);
                                }
                              }}
                              className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded uppercase"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteQuoteId(null)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-0.5 rounded"
                            >
                              No
                            </button>
                          </div>
                        ) : confirmReadyQuoteId === quote.id ? (
                          <div className="flex items-center space-x-1.5 bg-indigo-950/20 p-1 border border-indigo-900/40 rounded">
                            <span className="text-[10px] text-indigo-400 font-bold mr-1 pl-1">Mark Ready?</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.put(`/quotations/${quote.id}`, { status: "READY" });
                                  await fetchTemplatesAndHistory();
                                  setAlertInfo({ type: "success", text: "Draft converted to READY successfully!" });
                                } catch(e: any) {
                                  setAlertInfo({ type: "error", text: e.message });
                                } finally {
                                  setConfirmReadyQuoteId(null);
                                }
                              }}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmReadyQuoteId(null)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-0.5 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            {quote.status === "DRAFT" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditQuotationClick(quote)}
                                  className="px-2.5 py-1.5 text-[11px] rounded bg-teal-950 border border-teal-900/50 hover:bg-teal-900 text-teal-400 font-bold transition-all cursor-pointer"
                                >
                                  Edit Draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmReadyQuoteId(quote.id)}
                                  className="px-2.5 py-1.5 text-[11px] rounded bg-indigo-600 hover:bg-indigo-505 hover:text-white transition-all font-bold cursor-pointer"
                                >
                                  Mark Ready
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteQuoteId(quote.id)}
                              className="p-2 rounded text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                              title="Delete quotation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* -------------------- CONFIG TERMS OVERLAY MODAL -------------------- */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-[#090d1e] border border-slate-800 rounded-2xl shadow-2xl p-6 text-left text-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100 font-display">Configure Quotation Terms & Conditions</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsTermsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 mb-4 leading-relaxed shrink-0">
              These clauses are appended dynamically to the bottom-left corner of the quotation document sheet. Keep them short and clear.
            </p>

            {/* Editable list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {terms.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No terms specified. Use the add button below to generate a new clause line item.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {terms.map((term, index) => (
                    <div key={index} className="flex items-start space-x-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500 pt-2 w-5 text-right">{index + 1}.</span>
                      <textarea
                        rows={1}
                        value={term}
                        onChange={(e) => {
                          const updated = [...terms];
                          updated[index] = e.target.value;
                          setTerms(updated);
                        }}
                        placeholder={`e.g. Terms clause #${index + 1}`}
                        className="flex-1 text-xs rounded-xl px-3 py-2 focus:outline-none border bg-slate-950 border-slate-850 text-white focus:border-indigo-505 resize-none h-9 align-middle animate-fade-in"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = terms.filter((_, idx) => idx !== index);
                          setTerms(updated);
                        }}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="pt-4 border-t border-slate-800 flex flex-col space-y-3 shrink-0">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setTerms([
                      "APPLICABLE TAXESS",
                      "WORK WILL START AFTER GETTING ADVANCE",
                      "THIS QUOTATION VALID ONLY 1 WEEK FROM SEDING DATE"
                    ]);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-amber-900/30 bg-amber-950/15 hover:bg-amber-950/30 text-amber-400 text-[10px] font-bold uppercase transition-all"
                >
                  Reset Standard Presets
                </button>
                <button
                  type="button"
                  onClick={() => setTerms([...terms, ""])}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-950 border border-indigo-805 hover:bg-indigo-900 text-indigo-400 text-[10px] font-bold uppercase flex items-center space-x-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all uppercase tracking-widest hover:shadow-indigo-500/10"
                >
                  Done & Save Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ADD SIGNATURE OVERLAY MODAL -------------------- */}
      {isSignatureOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090d1e] border border-slate-800 rounded-2xl shadow-2xl p-6 text-left text-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Signature className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100 font-display">Authorized Signature Asset</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsSignatureOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 mb-4 leading-relaxed">
              Upload a digital image of your authorized signature, stamp, or corporate seal. A high-contrast PNG with transparent background fits perfectly.
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-450 block">Signatory Representative Name / Title</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. Authorized Signatory / Prop. Name"
                  className="w-full text-xs rounded-xl px-3 py-2.5 focus:outline-none border bg-slate-950 border-slate-850 text-white focus:border-indigo-505"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-bold text-slate-450 block">Signature Image File</label>
                <div className="border border-dashed border-slate-800 rounded-xl p-4 bg-slate-950/50 flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-6 h-6 text-slate-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400 text-center">Click or drag image file here (Max 2MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert("Image size exceeds 2MB limit.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setSignatureUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-950 file:text-indigo-400 hover:file:bg-indigo-900 transition-all w-full"
                  />
                </div>
              </div>

              {/* Live Preview container */}
              {signatureUrl && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-2 animate-scale-up">
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Quotation Sheet Signature Preview</span>
                  <div className="h-14 flex items-center justify-center p-1 bg-white">
                    <img src={signatureUrl} alt="Active uploaded signature seal" className="max-h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSignatureUrl(null)}
                    className="px-2.5 py-1 text-[9px] font-bold text-red-500 border border-red-500/20 hover:bg-red-500/10 rounded-lg transition-all uppercase"
                  >
                    Clear Active Asset
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSignatureOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all uppercase tracking-widest"
              >
                Apply & Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Locale formatting price helper
function priceFormat(val: number): string {
  return (val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
