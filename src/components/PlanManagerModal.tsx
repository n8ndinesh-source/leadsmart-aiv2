import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { Plan } from "../types";

interface PlanManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null; // Null if creating anew
  onSave: (payload: any) => Promise<void>;
  isWorking: boolean;
}

export default function PlanManagerModal({ isOpen, onClose, plan, onSave, isWorking }: PlanManagerModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [maxLeads, setMaxLeads] = useState("");
  const [maxAiRequests, setMaxAiRequests] = useState("");
  const [maxWhatsappNumbers, setMaxWhatsappNumbers] = useState("");
  const [features, setFeatures] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (plan) {
      setName(plan.name || "");
      setPrice(plan.price.toString() || "0");
      setMaxUsers(plan.maxUsers.toString() || "1");
      setMaxLeads(plan.maxLeads.toString() || "100");
      setMaxAiRequests(plan.maxAiRequests.toString() || "50");
      setMaxWhatsappNumbers(plan.maxWhatsappNumbers.toString() || "1");
      setFeatures(plan.features || "");
      setErrorText("");
    } else if (isOpen) {
      setName("");
      setPrice("29.00");
      setMaxUsers("5");
      setMaxLeads("500");
      setMaxAiRequests("250");
      setMaxWhatsappNumbers("1");
      setFeatures("CRM Integration,Email alerts,2 AI workflows");
      setErrorText("");
    }
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!name.trim()) {
      setErrorText("Tier Plan Name is required.");
      return;
    }

    try {
      await onSave({
        name,
        price: parseFloat(price) || 0,
        maxUsers: parseInt(maxUsers) || 0,
        maxLeads: parseInt(maxLeads) || 0,
        maxAiRequests: parseInt(maxAiRequests) || 0,
        maxWhatsappNumbers: parseInt(maxWhatsappNumbers) || 0,
        features,
      });
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "Failed to save the subscription plan.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto font-sans text-xs">
      <div 
        className="w-full max-w-lg bg-[#070b19] border border-slate-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-[#0b1024]/40">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 font-light" />
              <span>{plan ? "Amend Membership Tier" : "Formulate Membership Tier"}</span>
            </h2>
            <p className="text-[10px] text-slate-400">Configure core quotas, WhatsApp triggers, pricing points, and permissions for lead generation.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-900/65 rounded-lg text-slate-400 hover:text-white border border-slate-805 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {errorText && (
            <div className="p-3 bg-rose-955/20 border border-rose-900/35 text-rose-450 rounded-lg flex items-start space-x-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Growth Pro"
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
                disabled={!!plan} // Keep standard Plan names locked (Starter Pro etc) so they correspond elegantly
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Maximum Users</label>
              <input
                type="number"
                min="1"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Maximum Leads allowance</label>
              <input
                type="number"
                min="1"
                value={maxLeads}
                onChange={(e) => setMaxLeads(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-505 rounded-lg p-2.5 outline-none text-slate-100 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Max AI Assistant credits</label>
              <input
                type="number"
                min="1"
                value={maxAiRequests}
                onChange={(e) => setMaxAiRequests(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-505 rounded-lg p-2.5 outline-none text-slate-100 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Max WhatsApp Nodes</label>
              <input
                type="number"
                min="0"
                value={maxWhatsappNumbers}
                onChange={(e) => setMaxWhatsappNumbers(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-505 rounded-lg p-2.5 outline-none text-slate-100 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Features Included (Comma Separated)</label>
            <textarea
              rows={3}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="e.g. Email Alerts, Advanced Analytics, White Label UI"
              className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-554 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-705 font-light"
            />
            <span className="text-[10px] text-slate-500 leading-tight block">
              💡 Separate each included core feature with a comma, which compiles into scannable checkmarks on client portals.
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-900 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="px-4 py-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-350 hover:text-white rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isWorking}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            {isWorking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Tier...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Pricing Tier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
