import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Layers, 
  Save, 
  Eye, 
  Briefcase, 
  Image as ImageIcon,
  Check,
  Plus
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  companyName: string;
  logo: string | null;
  headerBanner: string | null;
  footerBanner: string | null;
  watermark: string | null;
  watermarkOpacity: number;
}

export default function QuotationTemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Template Modal or state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.get<Template[]>("/quotation-templates");
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load quotation design templates.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      const created = await api.post<Template>("/quotation-templates", {
        name: newTemplateName,
        companyName: selectedTemplate?.companyName || "My Business Ltd",
        watermarkOpacity: 15
      });
      setNewTemplateName("");
      setIsCreating(false);
      setSuccessMsg("Quotation template created successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchTemplates();
      setSelectedTemplate(created);
    } catch (err: any) {
      setError(err.message || "Failed to create template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const updated = await api.post<Template>("/quotation-templates", selectedTemplate);
      setSuccessMsg("Branding templates saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      // Update local state
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTemplate(updated);
    } catch (err: any) {
      setError(err.message || "Failed to save template designs.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/quotation-templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
      setSuccessMsg("Template deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete template.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "headerBanner" | "footerBanner" | "watermark") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Maximum support size is 5 MB.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (selectedTemplate) {
        setSelectedTemplate({
          ...selectedTemplate,
          [field]: reader.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveField = (field: "logo" | "headerBanner" | "footerBanner" | "watermark") => {
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        [field]: null
      });
    }
  };

  return (
    <div id="quotation-templates-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Template selection & General Settings */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Templates Selector Card */}
        <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
              <Layers className="w-4 h-4 text-indigo-400 mr-2" />
              Templates List
            </h2>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-2.5 py-1 text-xs rounded-md bg-indigo-600/25 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Layout</span>
            </button>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-900/20 text-red-300 border border-red-900/30 rounded-lg">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-[#0b1b11] text-emerald-400 border border-emerald-900/30 rounded-lg">
              {successMsg}
            </div>
          )}

          {isCreating && (
            <form onSubmit={handleCreateTemplate} className="p-3.5 rounded-lg bg-slate-950 border border-slate-900 space-y-3">
              <label className="block text-xs font-semibold text-slate-350">New Template Name</label>
              <input
                type="text"
                placeholder="e.g. Export Quotation"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {isSaving ? "Saving..." : "Add"}
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-6 text-xs text-slate-500">Loading templates...</div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  className={`w-full p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    selectedTemplate?.id === template.id 
                    ? "bg-indigo-900/10 border-indigo-505 text-white" 
                    : "bg-slate-905 border-slate-900 hover:border-slate-800 text-slate-300"
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold truncate">{template.name}</h4>
                      <p className="text-[10px] text-slate-450 italic truncate">{template.companyName}</p>
                    </div>
                  </div>
                  {confirmDeleteId === template.id ? (
                    <div className="flex items-center space-x-1 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                          setConfirmDeleteId(null);
                        }}
                        className="text-[9px] px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(template.id);
                      }}
                      className="p-1 rounded text-red-450 hover:bg-red-500/10 hover:text-red-400 ml-2 shrink-0 cursor-pointer"
                      title="Delete style"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branding Assets Designer */}
        {selectedTemplate && (
          <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19] space-y-5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Branding Assets: {selectedTemplate.name}
            </h3>

            {error && (
              <div className="p-3 text-xs bg-red-900/20 text-red-300 border border-red-900/30 rounded-lg">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs bg-[#0b1b11] text-emerald-400 border border-emerald-900/30 rounded-lg">
                {successMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Company Info */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-350 uppercase">Company Legal Name</label>
                <input
                  type="text"
                  value={selectedTemplate.companyName}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-850 text-white focus:outline-none focus:border-indigo-505"
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              {/* Company Logo Widget */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase">Brand logo</span>
                  {selectedTemplate.logo && (
                    <button onClick={() => handleRemoveField("logo")} className="text-[10px] text-red-400 hover:underline">Remove</button>
                  )}
                </div>
                {selectedTemplate.logo ? (
                  <img src={selectedTemplate.logo} alt="Logo" className="h-10 object-contain rounded" />
                ) : (
                  <label className="flex items-center justify-center border-dashed border border-slate-800 p-2.5 rounded-lg text-[10px] text-slate-450 cursor-pointer hover:bg-slate-900/25">
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Company Logo
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, "logo")} />
                  </label>
                )}
              </div>

              {/* Header Banner Designer */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase">Header Banner</span>
                  {selectedTemplate.headerBanner && (
                    <button onClick={() => handleRemoveField("headerBanner")} className="text-[10px] text-red-400 hover:underline">Remove</button>
                  )}
                </div>
                <p className="text-[9px] text-slate-450">Recommended Size: 2480 × 400 px, PNG/JPG max 5MB</p>
                {selectedTemplate.headerBanner ? (
                  <div className="relative">
                    <img src={selectedTemplate.headerBanner} alt="Header" className="w-full h-12 object-cover rounded border border-slate-800" />
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-dashed border border-slate-800 p-4 rounded-lg text-xs text-slate-450 cursor-pointer hover:bg-slate-900/25">
                    <Upload className="w-4 h-4 mr-1.5" /> Upload Header Banner
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, "headerBanner")} />
                  </label>
                )}
              </div>

              {/* Footer Banner Designer */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase">Footer Banner</span>
                  {selectedTemplate.footerBanner && (
                    <button onClick={() => handleRemoveField("footerBanner")} className="text-[10px] text-red-400 hover:underline">Remove</button>
                  )}
                </div>
                <p className="text-[9px] text-slate-450">Recommended Size: 2480 × 250 px, PNG/JPG max 5MB</p>
                {selectedTemplate.footerBanner ? (
                  <div className="relative">
                    <img src={selectedTemplate.footerBanner} alt="Footer" className="w-full h-10 object-cover rounded border border-slate-800" />
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-dashed border border-slate-800 p-4 rounded-lg text-xs text-slate-450 cursor-pointer hover:bg-slate-900/25">
                    <Upload className="w-4 h-4 mr-1.5" /> Upload Footer Banner
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, "footerBanner")} />
                  </label>
                )}
              </div>

              {/* Watermark Designer */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase">Watermark Image</span>
                  {selectedTemplate.watermark && (
                    <button onClick={() => handleRemoveField("watermark")} className="text-[10px] text-red-400 hover:underline">Remove</button>
                  )}
                </div>
                <p className="text-[9px] text-slate-450">Recommend Size: 1500 × 1500 px. Transparent PNG preferred</p>
                
                {selectedTemplate.watermark ? (
                  <div className="flex items-center space-x-3 bg-slate-900/40 p-2 rounded">
                    <img src={selectedTemplate.watermark} alt="Watermark" className="w-10 h-10 object-contain rounded border border-slate-850 bg-white/5" />
                    <span className="text-[10px] text-slate-400">Centered Watermark asset uploaded</span>
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-dashed border border-slate-800 p-4 rounded-lg text-xs text-slate-450 cursor-pointer hover:bg-slate-900/25">
                    <Upload className="w-4 h-4 mr-1.5" /> Upload Watermark Image
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, "watermark")} />
                  </label>
                )}

                {/* Opacity selector */}
                <div className="space-y-1.5 pt-2 border-t border-slate-900">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Watermark Opacity: {selectedTemplate.watermarkOpacity}%</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20, 25, 30, 40, 50].map(op => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setSelectedTemplate({ ...selectedTemplate, watermarkOpacity: op })}
                        className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                          selectedTemplate.watermarkOpacity === op
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white"
                        }`}
                      >
                        {op}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                onClick={handleUpdateTemplate}
                disabled={isSaving}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer disabled:opacity-45"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Template Branding Settings"}</span>
              </button>

            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Realistic scaled printable Preview mockup */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
            <Eye className="w-4 h-4 text-indigo-400 mr-2 animate-pulse" />
            Live Layout Mockup (A4 Portrait aspect)
          </span>
          <span className="text-[10px] text-slate-450 italic">Updates instantly as you adjust branding assets</span>
        </div>

        {selectedTemplate ? (
          <div className="w-full flex justify-center bg-slate-950 p-4 border border-slate-900 rounded-3xl">
            {/* Elegant preview canvas recreating printable sheet */}
            <div 
              style={{ aspectRatio: "1/1.414" }}
              className="w-full max-w-[500px] bg-white text-slate-900 shadow-2xl rounded-lg p-5 flex flex-col justify-between relative overflow-hidden"
            >
              {/* WATERMARK BACKGROUND CONTAINER */}
              {selectedTemplate.watermark && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                  style={{ opacity: selectedTemplate.watermarkOpacity / 100 }}
                >
                  <img src={selectedTemplate.watermark} alt="Background Watermark" className="w-[60%] h-auto object-contain max-h-[50%]" />
                </div>
              )}

              {/* HEADER AREA */}
              <div className="relative z-10 space-y-4">
                {selectedTemplate.headerBanner ? (
                  <img src={selectedTemplate.headerBanner} alt="Header Layout" className="w-full h-auto max-h-[80px] object-cover rounded-t-sm" />
                ) : (
                  <div className="w-full py-2.5 border-b border-indigo-150 text-center bg-indigo-50/50 rounded-t-sm">
                    <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase">Acme Header Banner Area</span>
                  </div>
                )}

                {/* Logo and company title summary */}
                <div className="flex justify-between items-start pt-2">
                  {!selectedTemplate.headerBanner ? (
                    <div className="space-y-1">
                      {selectedTemplate.logo ? (
                        <img src={selectedTemplate.logo} alt="Company logo" className="h-8 max-w-[120px] object-contain" />
                      ) : (
                        <div className="h-6 w-16 bg-slate-100 flex items-center justify-center text-[8px] italic text-slate-400 rounded">No Logo</div>
                      )}
                      <h3 className="text-xs font-extrabold text-indigo-900 tracking-tight">{selectedTemplate.companyName}</h3>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="text-right">
                    <h2 className="text-sm font-extrabold text-indigo-950 tracking-tight uppercase">Quotation</h2>
                    <p className="text-[8px] text-slate-500 font-medium">Quotation #: <span className="font-bold text-slate-800">QT-2026-X11</span></p>
                    <p className="text-[8px] text-slate-500 font-medium">Date: <span className="font-bold text-slate-800">June 17, 2026</span></p>
                  </div>
                </div>

                {/* Customer Info row */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-950">Prepared For:</h5>
                    <p className="text-[9px] font-extrabold text-slate-800">Johnathan Client</p>
                    <p className="text-[8px] text-slate-500">Alpha Diagnostics Ltd</p>
                    <p className="text-[8px] text-slate-500">+1 (555) 432-1098</p>
                  </div>
                  <div className="text-right">
                    <h5 className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-950">Validity:</h5>
                    <p className="text-[8px] text-slate-700">30 Days (Expires July 17, 2026)</p>
                  </div>
                </div>

                {/* Mock product table */}
                <div className="pt-2">
                  <table className="w-full text-left text-[8px] border-collapse">
                    <thead>
                      <tr className="bg-indigo-50 border-b border-indigo-100 text-indigo-900 font-extrabold">
                        <th className="p-1 px-1.5 rounded-l-sm">Product Name</th>
                        <th className="p-1 text-center">Qty</th>
                        <th className="p-1 text-right">Unit Price</th>
                        <th className="p-1 text-right">Discount</th>
                        <th className="p-1 text-right rounded-r-sm">Total ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 font-medium text-slate-700">
                        <td className="p-1 px-1.5 font-bold text-slate-900">
                          Premium Medical Diagnostics Kit
                          <span className="block text-[6px] text-slate-450 font-normal">Standard wholesale grade FDA certified</span>
                        </td>
                        <td className="p-1 text-center font-bold">10</td>
                        <td className="p-1 text-right">$250.00</td>
                        <td className="p-1 text-right">10%</td>
                        <td className="p-1 text-right font-extrabold text-indigo-900">$2,250.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals box */}
                <div className="pt-2 flex justify-end">
                  <div className="w-[180px] bg-slate-50/75 p-2 rounded border border-slate-100 space-y-1 text-slate-700 text-[8px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>$2,500.00</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Discount (10%):</span>
                      <span>-$250.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span>+$405.00</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-extrabold text-slate-900 text-[9px] text-indigo-950 bg-indigo-50/25 p-0.5 rounded">
                      <span>Grand Total:</span>
                      <span>$2,655.00</span>
                    </div>
                  </div>
                </div>

                {/* Payment & Delivery Terms */}
                <div className="pt-2 grid grid-cols-2 gap-4 text-[7px] border-t border-slate-100 text-slate-500">
                  <div className="space-y-0.5">
                    <h6 className="font-extrabold text-slate-700 uppercase tracking-wider text-[8px]">Delivery Terms</h6>
                    <p>Immediate shipment via priority courier service. Lead time is 3 business days.</p>
                  </div>
                  <div className="space-y-0.5">
                    <h6 className="font-extrabold text-slate-700 uppercase tracking-wider text-[8px]">Payment & Notes</h6>
                    <p>Net 15 days bank transfer payment. Standard corporate terms of business apply.</p>
                  </div>
                </div>
              </div>

              {/* FOOTER AREA */}
              <div className="relative z-10 pt-4 border-t border-slate-100">
                {selectedTemplate.footerBanner ? (
                  <img src={selectedTemplate.footerBanner} alt="Footer Layout" className="w-full h-auto max-h-[50px] object-cover rounded-b-sm" />
                ) : (
                  <div className="w-full py-1 text-center border-t border-slate-100 text-[7px] text-slate-400">
                    <span>Page 1 of 1 • Generated by LeadSmart Sales Ops Automation</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-slate-900 bg-slate-950 p-6 text-center text-slate-500">
            <ImageIcon className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs">Select a checklist template on the left to review its visual mockup</p>
          </div>
        )}
      </div>

    </div>
  );
}
