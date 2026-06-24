import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Layers, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Database, 
  Check, 
  X, 
  FileUp, 
  Image, 
  ArrowUpDown, 
  Sliders, 
  ChevronRight, 
  ToggleLeft,
  ToggleRight,
  Info,
  Loader2,
  Tag,
  Boxes,
  HelpCircle
} from "lucide-react";

interface ProductField {
  id: string;
  fieldName: string;
  fieldType: string; // Text, Textarea, Number, Currency, Dropdown, Multi Select, Date, Checkbox, Image Upload, File Upload
  required: boolean;
  active: boolean;
  displayOrder: number;
}

interface ProductValue {
  id: string;
  productFieldId: string;
  value: string;
  productField?: ProductField;
}

interface ProductRecord {
  id: string;
  name: string;
  code?: string;
  category: string | null;
  status: string; // ACTIVE, OUT_OF_STOCK, INACTIVE
  businessType: string; // Manufacturing, Real Estate
  createdAt: string;
  values: ProductValue[];
}

interface ProductsPanelProps {
  businessType?: string;
}

export default function ProductsPanel({ businessType = "" }: ProductsPanelProps) {
  const [activeTab, setActiveTab] = useState<"records" | "fields">("records");
  
  // Custom states
  const [fields, setFields] = useState<ProductField[]>([]);
  const [records, setRecords] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBusinessType, setFilterBusinessType] = useState("");
  const [filterCustomField, setFilterCustomField] = useState("");
  const [filterCustomValue, setFilterCustomValue] = useState("");

  // Field Editor Form Modal
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<ProductField | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("Text");
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);

  // Record Editor Form Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductRecord | null>(null);
  const [recordName, setRecordName] = useState("");
  const [recordCode, setRecordCode] = useState("");
  const [recordCategory, setRecordCategory] = useState("");
  const [recordStatus, setRecordStatus] = useState("ACTIVE");
  const [recordBusinessType, setRecordBusinessType] = useState("Manufacturing");
  const [recordValues, setRecordValues] = useState<Record<string, string>>({}); // fieldId -> string value
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    buttonText?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const getProductSKU = (rec: ProductRecord) => {
    return rec.code ? `Code: ${rec.code}` : "No Code";
  };

  useEffect(() => {
    fetchFieldsAndRecords();
  }, []);

  useEffect(() => {
    if (businessType) {
      setRecordBusinessType(businessType);
      setFilterBusinessType(businessType);
    }
  }, [businessType]);

  const fetchFieldsAndRecords = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const fetchedFields = await api.get<ProductField[]>("/products/fields");
      const fetchedRecords = await api.get<ProductRecord[]>("/products/records");
      setFields(fetchedFields || []);
      setRecords(fetchedRecords || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sync products directory.");
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Seeding high quality template presets
  const handleSeedTemplate = async (type: "MANUFACTURING" | "REAL_ESTATE") => {
    setConfirmDialog({
      title: "Seed Catalog Template",
      message: `Applying the preview ${type === "MANUFACTURING" ? "Manufacturing" : "Real Estate"} template will append or override your currently configured fields. Are you sure you want to proceed?`,
      buttonText: "Seed Template",
      onConfirm: async () => {
        setConfirmDialog(null);
        setSeedLoading(true);
        setErrorMsg("");
        try {
          await api.post("/products/templates/seed", { templateType: type });
          showSuccess(`${type === "MANUFACTURING" ? "Manufacturing" : "Real Estate"} template fields generated successfully!`);
          await fetchFieldsAndRecords();
          setActiveTab("fields");
        } catch (err: any) {
          setErrorMsg(err.message || "Template seeding failed.");
        } finally {
          setSeedLoading(false);
        }
      }
    });
  };

  // Field CRUD functions
  const openFieldModal = (field: ProductField | null) => {
    setEditingField(field);
    if (field) {
      setFieldName(field.fieldName);
      setFieldType(field.fieldType);
      setIsRequired(field.required);
      setIsActive(field.active);
      setDisplayOrder(field.displayOrder);
    } else {
      setFieldName("");
      setFieldType("Text");
      setIsRequired(false);
      setIsActive(true);
      setDisplayOrder(fields.length + 1);
    }
    setIsFieldModalOpen(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName) {
      setErrorMsg("Field Name is required");
      return;
    }
    setSaveLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        fieldName,
        fieldType,
        required: isRequired,
        active: isActive,
        displayOrder
      };
      if (editingField) {
        await api.put(`/products/fields/${editingField.id}`, payload);
        showSuccess("Custom Field updated successfully!");
      } else {
        await api.post("/products/fields", payload);
        showSuccess("Custom Field created successfully!");
      }
      setIsFieldModalOpen(false);
      await fetchFieldsAndRecords();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save field custom properties.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    const field = fields.find(f => f.id === id);
    const fieldLabel = field ? `"${field.fieldName}"` : "this custom field";
    setConfirmDialog({
      title: "Delete Custom Field Attribute",
      message: `Are you sure you want to delete ${fieldLabel}? This action is irreversible and will permanently delete any stored product and description values that rely on this field attribute.`,
      buttonText: "Delete Permanently",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/products/fields/${id}`);
          showSuccess("Field removed.");
          await fetchFieldsAndRecords();
        } catch (err: any) {
          setErrorMsg(err.message || "Failed to remove field.");
        }
      }
    });
  };

  // Record CRUD functions
  const openRecordModal = (record: ProductRecord | null) => {
    setEditingRecord(record);
    if (record) {
      setRecordName(record.name);
      setRecordCode(record.code || "");
      setRecordCategory(record.category || "");
      setRecordStatus(record.status);
      setRecordBusinessType(record.businessType);
      
      const mappedVals: Record<string, string> = {};
      record.values.forEach(v => {
        mappedVals[v.productFieldId] = v.value;
      });
      setRecordValues(mappedVals);
    } else {
      setRecordName("");
      setRecordCode("");
      setRecordCategory("");
      setRecordStatus("ACTIVE");
      setRecordBusinessType(businessType || "Manufacturing");
      setRecordValues({});
    }
    setIsRecordModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordName || !recordBusinessType) {
      setErrorMsg("Product Name and Business Type are required");
      return;
    }

    // Verify required dynamic custom fields are present
    const missingFields: string[] = [];
    fields.forEach(f => {
      if (f.active && f.required) {
        const val = recordValues[f.id];
        if (!val || val.trim() === "") {
          missingFields.push(f.fieldName);
        }
      }
    });

    if (missingFields.length > 0) {
      setErrorMsg(`Required fields missing values: ${missingFields.join(", ")}`);
      return;
    }

    setSaveLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        name: recordName,
        code: recordCode,
        category: recordCategory || null,
        status: recordStatus,
        businessType: recordBusinessType,
        values: recordValues
      };

      if (editingRecord) {
        await api.put(`/products/records/${editingRecord.id}`, payload);
        showSuccess("Product record updated successfully!");
      } else {
        await api.post("/products/records", payload);
        showSuccess("Product record created successfully!");
      }
      setIsRecordModalOpen(false);
      await fetchFieldsAndRecords();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to build product database entry.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const rec = records.find(r => r.id === id);
    const recLabel = rec ? `"${rec.name}"` : "this product record";
    setConfirmDialog({
      title: "Delete Product Record",
      message: `Are you sure you want to delete ${recLabel} from the repository?`,
      buttonText: "Delete Record",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/products/records/${id}`);
          showSuccess("Product record deleted.");
          await fetchFieldsAndRecords();
        } catch (err: any) {
          setErrorMsg(err.message || "Failed to delete database entry.");
        }
      }
    });
  };

  // Dynamic values form rendering helpers
  const handleValChange = (fieldId: string, val: string) => {
    setRecordValues(prev => ({ ...prev, [fieldId]: val }));
  };

  // Searching and advanced dynamic sorting/filtering logic
  const filteredRecords = records.filter(rec => {
    // Basic search on name or category
    const query = searchQuery.toLowerCase();
    const matchesQuery = !searchQuery || 
      rec.name.toLowerCase().includes(query) || 
      (rec.category && rec.category.toLowerCase().includes(query));

    const matchesCategory = !filterCategory || rec.category === filterCategory;
    const matchesStatus = !filterStatus || rec.status === filterStatus;
    const matchesBusinessType = businessType
      ? rec.businessType.toLowerCase() === businessType.toLowerCase()
      : (!filterBusinessType || rec.businessType === filterBusinessType);

    // Advanced search inside custom fields value
    let matchesCustomFilter = true;
    if (filterCustomField && filterCustomValue) {
      const matchedVal = rec.values.find(v => v.productFieldId === filterCustomField);
      matchesCustomFilter = !!matchedVal && matchedVal.value.toLowerCase().includes(filterCustomValue.toLowerCase());
    }

    return matchesQuery && matchesCategory && matchesStatus && matchesBusinessType && matchesCustomFilter;
  });

  // Get distinct list of product categories
  const categories = Array.from(new Set(records.map(r => r.category).filter(Boolean)));

  return (
    <div id="products-master-root" className="space-y-6">
      
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-900 bg-emerald-950/20 text-emerald-400 text-xs flex items-center shadow-lg animate-fade-in">
          <Check className="w-4 h-4 mr-2 shrink-0 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-900 bg-red-950/20 text-red-400 text-xs flex items-center shadow-lg animate-fade-in justify-between">
          <div className="flex items-center">
            <Info className="w-4 h-4 mr-2 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-slate-450 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* QUICK PRESETS BOARDS */}
      <div className={`grid grid-cols-1 ${!businessType ? "md:grid-cols-2" : ""} gap-4`}>
        {/* Manufacturing Quickstart */}
        {(!businessType || businessType.toLowerCase() === "manufacturing") && (
          <div className="p-4 rounded-xl border border-slate-900 bg-[#070b19]/35 hover:bg-[#070b19]/50 transition-all text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-2">
                <span className="p-2 rounded-lg bg-indigo-950 text-indigo-400">
                  <Boxes className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 font-display">Manufacturing Catalog</h4>
                  <p className="text-[10px] text-slate-450">Item Name, Description, Material, Size, GSM, Price, MOQ etc.</p>
                </div>
              </div>
            </div>
            <div className="pt-3 block">
              <button 
                onClick={() => handleSeedTemplate("MANUFACTURING")}
                disabled={seedLoading}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center cursor-pointer transition-all disabled:opacity-50"
              >
                {seedLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-300" />}
                Generate Starter Fields Template
              </button>
            </div>
          </div>
        )}

        {/* Real Estate Quickstart */}
        {(!businessType || businessType.toLowerCase() === "real estate") && (
          <div className="p-4 rounded-xl border border-slate-900 bg-[#070b19]/35 hover:bg-[#070b19]/50 transition-all text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-2">
                <span className="p-2 rounded-lg bg-emerald-950 text-emerald-400">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 font-display">Real Estate Inventory</h4>
                  <p className="text-[10px] text-slate-450">Project Name, BHK, Property Type, Area, Status, brochure etc.</p>
                </div>
              </div>
            </div>
            <div className="pt-3 block">
              <button 
                onClick={() => handleSeedTemplate("REAL_ESTATE")}
                disabled={seedLoading}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center cursor-pointer transition-all disabled:opacity-50"
              >
                {seedLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-300" />}
                Generate Property Fields Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEGMENT TABS AND ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-900 pb-3 gap-3">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center transition-all cursor-pointer ${
              activeTab === "records" 
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-900/40" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Product Records
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-slate-350 text-[10px] font-mono">
              {filteredRecords.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("fields")}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center transition-all cursor-pointer ${
              activeTab === "fields" 
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-900/40" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4 mr-1.5" />
            Product Fields
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-slate-350 text-[10px] font-mono">
              {fields.length}
            </span>
          </button>
        </div>

        <div className="flex shrink-0">
          {activeTab === "records" ? (
            <button 
              onClick={() => openRecordModal(null)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-xs flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New Record
            </button>
          ) : (
            <button 
              onClick={() => openFieldModal(null)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-xs flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Custom Field
            </button>
          )}
        </div>
      </div>

      {/* MAIN TAB CONTENT */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3.5">
          <Loader2 className="w-8 h-8 rounded-full text-indigo-505 animate-spin" />
          <span className="text-xs text-slate-450">Synchronizing products master repository...</span>
        </div>
      ) : activeTab === "records" ? (
        
        // TAB 1: PRODUCT RECORDS CATALOG
        <div className="space-y-4">
          
          {/* ADVANCED SELECTION SEARCH ENGINE PANEL */}
          <div className="p-4 rounded-xl border border-slate-900 bg-[#02050b]/75 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 text-left">
            
            {/* Search Input */}
            <div className="space-y-1 md:col-span-1 lg:col-span-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase flex items-center">
                <Search className="w-3 h-3 mr-1" /> Quick Search
              </label>
              <input 
                type="text" 
                placeholder="Product, code or category..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-slate-200 bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase flex items-center">
                <Filter className="w-3 h-3 mr-1" /> Category
              </label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full text-slate-200 bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c || ""}>{c}</option>
                ))}
              </select>
            </div>

            {/* Business Type Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase flex items-center">
                <Tag className="w-3 h-3 mr-1" /> Industry
              </label>
              <select 
                value={filterBusinessType}
                onChange={(e) => setFilterBusinessType(e.target.value)}
                className="w-full text-slate-200 bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Industries</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Real Estate">Real Estate</option>
              </select>
            </div>

            {/* Status Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase flex items-center">
                <Info className="w-3 h-3 mr-1" /> Status
              </label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-slate-200 bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Dynamic Custom Field Values Search */}
            <div className="space-y-1 md:col-span-4 lg:col-span-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase flex items-center">
                <Sliders className="w-3 h-3 mr-1" /> Custom Params
              </label>
              <div className="grid grid-cols-2 gap-1">
                <select 
                  value={filterCustomField}
                  onChange={(e) => {
                    setFilterCustomField(e.target.value);
                    if (!e.target.value) setFilterCustomValue("");
                  }}
                  className="w-full text-slate-200 bg-slate-950 border border-slate-900 rounded-lg py-1 px-1.5 text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Field</option>
                  {fields.map(f => (
                    <option key={f.id} value={f.id}>{f.fieldName}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="Value..." 
                  disabled={!filterCustomField}
                  value={filterCustomValue}
                  onChange={(e) => setFilterCustomValue(e.target.value)}
                  className="w-full text-slate-200 bg-slate-950 border border-slate-900 rounded-lg py-1 px-1.5 text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

          </div>

          {/* RECORDS DIRECTORY CARDS */}
          {filteredRecords.length === 0 ? (
            <div className="py-14 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <span className="p-3.5 rounded-full bg-slate-950 border border-slate-900 text-slate-500">
                <Database className="w-6 h-6" />
              </span>
              <div className="text-center space-y-1 max-w-sm">
                <h5 className="text-xs font-semibold text-slate-350">No Product Records Found</h5>
                <p className="text-[10px] text-slate-500">Make sure that you have configured custom fields in the &quot;Product Fields&quot; tab first, or click a Starter Template above to seed instant structures.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {filteredRecords.map(rec => (
                <div key={rec.id} className="p-4 rounded-xl border border-slate-900 bg-[#02050b]/40 hover:bg-[#02050b]/85 transition-all flex flex-col justify-between text-left group">
                  <div>
                    {/* Header Details */}
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        {rec.category && (
                          <span className="text-[8px] tracking-wider uppercase font-extrabold pr-2 text-indigo-400">
                            {rec.category}
                          </span>
                        )}
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                          rec.businessType === "Manufacturing" 
                            ? "bg-indigo-950/40 text-indigo-400 border border-indigo-900/35" 
                            : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/35"
                        }`}>
                          {rec.businessType}
                        </span>
                      </div>

                      <div className="flex space-x-1">
                        <button 
                          onClick={() => openRecordModal(rec)}
                          className="p-1 rounded bg-slate-950 border border-slate-900 text-slate-450 hover:text-white transition-all cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1 rounded bg-slate-950 border border-slate-905 text-red-400/80 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Product Main Title */}
                    <h4 className="text-sm font-extrabold text-slate-100 font-display mb-3">
                      {rec.name}
                    </h4>

                    {/* Configured Field Mapped Key Values */}
                    <div className="space-y-1.5 border-t border-slate-950/60 pt-3">
                      {fields.map(f => {
                        const valObj = rec.values.find(v => v.productFieldId === f.id);
                        if (!valObj || !valObj.value) return null;
                        
                        return (
                          <div key={f.id} className="grid grid-cols-5 text-[10px] items-center py-0.5">
                            <span className="text-slate-500 col-span-2 capitalize truncate">{f.fieldName}:</span>
                            <span className="text-slate-200 col-span-3 font-medium text-right flex justify-end">
                              {f.fieldType === "Image Upload" || f.fieldType === "File Upload" ? (
                                <img 
                                  src={valObj.value} 
                                  alt={f.fieldName} 
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 object-cover rounded border border-slate-900 bg-slate-950 hover:scale-110 transition-all cursor-pointer shadow-md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open raw image in a new tab
                                    const w = window.open();
                                    if (w) {
                                      w.document.write(`<img src="${valObj.value}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                      w.document.body.style.backgroundColor = '#0b0f19';
                                    }
                                  }}
                                  onError={(e) => {
                                    // Fallback if load error
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : f.fieldType === "Currency" ? (
                                `₹${valObj.value}`
                              ) : (
                                <span className="truncate max-w-[120px]" title={valObj.value}>{valObj.value}</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Status Indicator */}
                  <div className="mt-4 pt-2.5 border-t border-slate-950 flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 font-mono">{getProductSKU(rec)}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      rec.status === "ACTIVE" 
                        ? "bg-indigo-950/40 text-indigo-400" 
                        : rec.status === "OUT_OF_STOCK" 
                        ? "bg-yellow-950/40 text-yellow-501" 
                        : "bg-slate-900 text-slate-500"
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (

        // TAB 2: PRODUCT FIELDS SCHEMA DESIGNER
        <div className="space-y-4 text-left">
          
          {/* Info Banner */}
          <div className="p-3 rounded-xl border border-slate-900 bg-[#070b19]/25 text-slate-400 text-[11px] flex items-start space-x-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
            <div>
              <span className="font-semibold text-slate-200 block mb-0.5">Dynamic Product Builders</span>
              Configure client parameters layout for your target industry below. These custom keys populate product fields inside interactive quotations, lead scoring engines, and outbound AI chat response agents.
            </div>
          </div>

          {/* FIELDS DIRECTORY LIST */}
          {fields.length === 0 ? (
            <div className="py-14 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <span className="p-3.5 rounded-full bg-slate-950 border border-slate-900 text-slate-500">
                <Sliders className="w-6 h-6" />
              </span>
              <div className="text-center space-y-1">
                <h5 className="text-xs font-semibold text-slate-350">No Fields Configured</h5>
                <p className="text-[10px] text-slate-500">Click &quot;Create Custom Field&quot; or click one of the preset business templates above to populate.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-950/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#050915] text-slate-400 font-semibold border-b border-slate-900">
                    <th className="py-3 px-4">Display Order</th>
                    <th className="py-3 px-4">Field Name</th>
                    <th className="py-3 px-4">Field Type</th>
                    <th className="py-3 px-4 text-center">Required</th>
                    <th className="py-3 px-4 text-center">Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {fields.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-950/80 transition-all text-slate-300">
                      <td className="py-3 px-4 font-mono text-[10px]">{f.displayOrder}</td>
                      <td className="py-3 px-4 font-semibold text-indigo-400">{f.fieldName}</td>
                      <td className="py-3 px-4 text-slate-450 text-[11px]">{f.fieldType}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.required ? "bg-red-950/50 text-red-400" : "bg-slate-900 text-slate-500"}`}>
                          {f.required ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.active ? "bg-emerald-950/50 text-emerald-400" : "bg-zinc-900 text-zinc-500"}`}>
                          {f.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button 
                          onClick={() => openFieldModal(f)}
                          className="text-indigo-400 hover:text-indigo-300 transition-all font-semibold text-[11px] cursor-pointer"
                        >
                          Modify
                        </button>
                        <span className="text-slate-800">|</span>
                        <button 
                          onClick={() => handleDeleteField(f.id)}
                          className="text-red-400 hover:text-red-300 transition-all font-semibold text-[11px] cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* FIELD PROPERTY EDITOR MODAL */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#02050b] border border-slate-900 rounded-xl shadow-2xl p-5 text-left text-slate-205">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100 font-display flex items-center">
                <Sliders className="w-4.5 h-4.5 mr-2 text-indigo-450" />
                {editingField ? "Modify Target Field" : "Create Custom Field Attribute"}
              </h3>
              <button onClick={() => setIsFieldModalOpen(false)} className="text-slate-450 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450 block">Field Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Item GSM, Material Type, BHK Space" 
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Attribute Type</label>
                  <select 
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Text">Text</option>
                    <option value="Textarea">Textarea</option>
                    <option value="Number">Number</option>
                    <option value="Currency">Currency (INR)</option>
                    <option value="Dropdown">Dropdown Option</option>
                    <option value="Multi Select">Multi Select</option>
                    <option value="Date">Date Picker</option>
                    <option value="Checkbox">Checkbox toggler</option>
                    <option value="Image Upload">Image Upload</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Sequence Display Order</label>
                  <input 
                    type="number" 
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-6 pt-2 bg-[#02050b] p-3 rounded-xl border border-slate-950/60">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="accent-indigo-505"
                  />
                  <span className="text-slate-350">Strictly Required Field</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-indigo-505"
                  />
                  <span className="text-slate-350">Active Attribute</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-900 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 font-medium text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DRAWER / BUILDER MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#02050b] border border-slate-900 rounded-xl shadow-2xl p-5 text-left text-slate-205 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100 font-display flex items-center">
                <Database className="w-4.5 h-4.5 mr-2 text-indigo-455 animate-pulse" />
                {editingRecord ? "Edit Product Record" : "Add Product Record"}
              </h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-450 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              
              {/* Main Core Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Product/Item Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bagasse Plate 10 Inch" 
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Product Code *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. BP-10N" 
                    value={recordCode}
                    onChange={(e) => setRecordCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Target Industry *</label>
                  <select 
                    value={recordBusinessType}
                    disabled={!!businessType}
                    onChange={(e) => setRecordBusinessType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Real Estate">Real Estate</option>
                  </select>
                  {businessType && (
                    <span className="text-[9px] text-slate-500 block italic mt-1">Locked to your configured business sector</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Product Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Biodegradable, Villas, Luxury" 
                    value={recordCategory}
                    onChange={(e) => setRecordCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Catalog Status</label>
                  <select 
                    value={recordStatus}
                    onChange={(e) => setRecordStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Custom Dynamic Builder Form Fields */}
              <div className="border-t border-slate-900 pt-4 mt-2 space-y-3.5 text-left">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-1">
                  <Sliders className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Dynamic Properties Input Form
                </h4>

                {fields.length === 0 ? (
                  <div className="p-3 rounded-lg bg-[#070b19]/25 text-slate-450 text-[10px] text-center border border-slate-900">
                    No custom fields configured. Please apply one of the quick starter templates at the top first, or click Cancel and create fields in the Product Fields tab.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    {fields.map(f => (
                      <div key={f.id} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <label className="font-semibold text-slate-350 capitalize">
                            {f.fieldName} {f.required && <span className="text-red-500">*</span>}
                          </label>
                          <span className="text-slate-550 italic text-[9px]">{f.fieldType}</span>
                        </div>

                        {/* Textarea Form */}
                        {f.fieldType === "Textarea" ? (
                          <textarea 
                            rows={2}
                            placeholder={`Enter ${f.fieldName}...`}
                            value={recordValues[f.id] || ""}
                            onChange={(e) => handleValChange(f.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-2.5 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        ) : /* Dropdown / status mock option selector */
                        f.fieldType === "Dropdown" || f.fieldType === "Status" ? (
                          <select 
                            value={recordValues[f.id] || ""}
                            onChange={(e) => handleValChange(f.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-2.5 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">Select Option</option>
                            {f.fieldName === "BHK" ? (
                              <>
                                <option value="1 BHK">1 BHK</option>
                                <option value="2 BHK">2 BHK</option>
                                <option value="3 BHK">3 BHK</option>
                                <option value="4 BHK">4 BHK</option>
                                <option value="5 BHK">5 BHK</option>
                              </>
                            ) : f.fieldName === "Property Type" ? (
                              <>
                                <option value="Apartment">Apartment</option>
                                <option value="Villa">Villa</option>
                                <option value="Penthouse">Penthouse</option>
                                <option value="Plot">Plot</option>
                                <option value="Commercial">Commercial</option>
                              </>
                            ) : (
                              <>
                                <option value="Option A">Option A</option>
                                <option value="Option B">Option B</option>
                                <option value="Standard">Standard</option>
                              </>
                            )}
                          </select>
                        ) : /* Checkbox Form */
                        f.fieldType === "Checkbox" ? (
                          <label className="flex items-center space-x-2.5 p-2 bg-[#050915] border border-slate-900 rounded-lg cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={recordValues[f.id] === "true"}
                              onChange={(e) => handleValChange(f.id, String(e.target.checked))}
                              className="accent-indigo-505"
                            />
                            <span className="text-slate-400 capitalize">{f.fieldName} Status</span>
                          </label>
                        ) : /* Number & currency form inputs */
                        f.fieldType === "Number" || f.fieldType === "Currency" ? (
                          <div className="relative">
                            {f.fieldType === "Currency" && (
                              <span className="absolute left-3.5 top-1.5 text-slate-500">₹</span>
                            )}
                            <input 
                              type="number" 
                              step="any"
                              placeholder="0.00"
                              value={recordValues[f.id] || ""}
                              onChange={(e) => handleValChange(f.id, e.target.value)}
                              className={`w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                                f.fieldType === "Currency" ? "pl-7 pr-3" : "px-3"
                              }`}
                            />
                          </div>
                        ) : /* Date Form Input */
                        f.fieldType === "Date" ? (
                          <input 
                            type="date"
                            value={recordValues[f.id] || ""}
                            onChange={(e) => handleValChange(f.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        ) : /* Media Image field input link */
                        f.fieldType === "Image Upload" || f.fieldType === "File Upload" ? (
                          <div className="space-y-2">
                            {/* Hidden native device file input */}
                            <input 
                              type="file"
                              id={`image-file-${f.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === "string") {
                                      handleValChange(f.id, reader.result);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />

                            {recordValues[f.id] ? (
                              <div className="relative rounded-lg overflow-hidden border border-slate-900 bg-slate-950 p-2 flex items-center space-x-3">
                                <img 
                                  src={recordValues[f.id]} 
                                  alt="Selected Preview" 
                                  className="w-12 h-12 object-cover rounded-md border border-slate-800 bg-slate-900"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    // Soft fallback for simple text/invalid images
                                    (e.target as HTMLImageElement).style.opacity = '0.5';
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-slate-300 font-medium truncate">
                                    {recordValues[f.id].startsWith("data:") 
                                      ? "Base64 Image Uploaded" 
                                      : recordValues[f.id]}
                                  </p>
                                  <p className="text-[8px] text-emerald-400 font-bold">Image Active</p>
                                </div>
                                <div className="flex space-x-1 shrink-0">
                                  <label 
                                    htmlFor={`image-file-${f.id}`}
                                    className="p-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-[9px] font-bold cursor-pointer transition-all border border-slate-800"
                                  >
                                    Replace
                                  </label>
                                  <button 
                                    type="button" 
                                    onClick={() => handleValChange(f.id, "")}
                                    className="p-1 rounded bg-slate-900 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-all cursor-pointer border border-slate-800"
                                    title="Remove Image"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-1.5">
                                {/* Upload Box Trigger */}
                                <label 
                                  htmlFor={`image-file-${f.id}`}
                                  className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-800 bg-slate-950/40 hover:bg-slate-950 hover:border-indigo-500 rounded-lg cursor-pointer transition-all text-center group"
                                >
                                  <Image className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 mb-1 transition-colors" />
                                  <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white transition-colors">
                                    Upload Image from Device
                                  </span>
                                  <span className="text-[8px] text-slate-500 mt-0.5">
                                    PNG, JPG, WEBP formats supported
                                  </span>
                                </label>

                                {/* Fallback URL/input option */}
                                <div className="flex space-x-1">
                                  <input 
                                    type="text"
                                    placeholder="Or paste cloud attachment URL instead..."
                                    value={recordValues[f.id] || ""}
                                    onChange={(e) => handleValChange(f.id, e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1 px-2.5 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => handleValChange(f.id, "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=350")}
                                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded font-bold text-[9px] text-indigo-400 shrink-0 cursor-pointer border border-slate-800"
                                  >
                                    Demo
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard Text Attribute Form Input */
                          <input 
                            type="text" 
                            placeholder={`Enter ${f.fieldName} value...`}
                            value={recordValues[f.id] || ""}
                            onChange={(e) => handleValChange(f.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-slate-900 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 font-medium text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERIC CONFIRMATION OVERLAY MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#050814] border border-slate-900 rounded-xl shadow-2xl p-5 text-left text-slate-205">
            <div className="flex items-start space-x-3 mb-3">
              <span className="p-2 rounded-lg bg-amber-955 text-amber-500 shrink-0 border border-amber-900/40">
                <HelpCircle className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-display">
                  {confirmDialog.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-900/60 flex justify-end space-x-2">
              <button 
                type="button" 
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 font-medium text-xs text-slate-305 cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  confirmDialog.onConfirm();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs cursor-pointer transition-all shadow-md"
              >
                {confirmDialog.buttonText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
