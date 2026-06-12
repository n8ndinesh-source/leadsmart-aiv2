import React, { useState, useEffect } from "react";
import { X, Loader2, Sparkles, AlertTriangle, Key, KeyRound, Info } from "lucide-react";
import { Plan } from "../types";

interface ClientCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Plan[];
  onCreate: (payload: any) => Promise<void>;
  isWorking: boolean;
}

const BUSINESS_TYPES = [
  "Manufacturing",
  "Export",
  "Real Estate",
  "Retail",
  "Distributor",
  "Service Business",
  "Education",
  "Healthcare",
  "Finance",
  "Other"
];

export default function ClientCreateModal({ isOpen, onClose, plans, onCreate, isWorking }: ClientCreateModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Starter");
  const [errorText, setErrorText] = useState("");

  // Auto-fill values when modal opens
  useEffect(() => {
    if (isOpen) {
      setCompanyName("");
      setOwnerName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setWebsite("");
      setBusinessType(BUSINESS_TYPES[0]);
      setIndustry("");
      setDescription("");
      setCountry("United States");
      setState("");
      setCity("");
      setSubscriptionPlan("Starter");
      setErrorText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate a random high-quality temporary password
  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let temp = "";
    for (let i = 0; i < 10; i++) {
      temp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(temp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!companyName.trim() || !ownerName.trim() || !email.trim() || !password.trim()) {
      setErrorText("Please fill out all required fields: Company Name, Owner Name, Email, Password.");
      return;
    }

    try {
      await onCreate({
        companyName,
        ownerName,
        email,
        password,
        phone,
        website,
        businessType,
        industry,
        description,
        country,
        state,
        city,
        subscriptionPlan,
      });
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "Failed to create manual client account.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto text-xs font-light">
      <div 
        className="w-full max-w-2xl bg-[#070b19] border border-slate-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-[#0b1024]/40">
          <div className="space-y-1">
            <h2 className="text-md font-bold text-white uppercase tracking-wider font-display flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Provision SME Client</span>
            </h2>
            <p className="text-[10px] text-slate-400">Initialize a new SaaS account profile, database credential set, and default plan subscription.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-900/65 rounded-lg text-slate-400 hover:text-white border border-slate-805 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorText && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-450 rounded-lg flex items-start space-x-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Section: Company Core Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Apex Traders Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-705"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Sarah Connor"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-705"
                required
              />
            </div>
          </div>

          {/* Section: Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Login Email Address *</label>
              <input
                type="email"
                placeholder="sarah@apextraders.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-705"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center">
                <span>Account Password *</span>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-indigo-400 hover:text-indigo-300 font-bold uppercase text-[9px] flex items-center space-x-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3 text-indigo-400" />
                  <span>Auto-generate</span>
                </button>
              </label>
              <input
                type="text"
                placeholder="Min 6 alphanumeric symbols"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 font-mono"
                required
              />
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone Contact</label>
              <input
                type="text"
                placeholder="+1 (555) 0192-384"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Website URL</label>
              <input
                type="text"
                placeholder="https://apextraders.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 text-xs text-indigo-300"
              />
            </div>
          </div>

          {/* Sectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Model Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full bg-slate-950/65 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-200"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-[#0b0f24] text-slate-100">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Industry Sector Area</label>
              <input
                type="text"
                placeholder="e.g. Export Brokerage"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-705"
              />
            </div>
          </div>

          {/* Statement */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Description Statement</label>
            <textarea
              rows={3}
              placeholder="Outline target activities, scope and specialized rules for Gemini automation triggers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-700"
            />
          </div>

          {/* Geo Coordinates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">State / Province</label>
              <input
                type="text"
                placeholder="e.g. Texas"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">City</label>
              <input
                type="text"
                placeholder="e.g. Austin"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
              />
            </div>
          </div>

          {/* Plan subscription assignment */}
          <div className="p-4 rounded-xl border border-indigo-950 bg-indigo-955/5 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">Initialize Subscription Tier</label>
            <select
              value={subscriptionPlan}
              onChange={(e) => setSubscriptionPlan(e.target.value)}
              className="w-full bg-slate-950/65 border border-slate-900 focus:border-indigo-505 rounded-lg p-2.5 outline-none text-slate-200"
            >
              {plans.length === 0 ? [
                <option key="Starter" value="Starter">Starter ($29.00/mo)</option>,
                <option key="Growth" value="Growth">Growth ($79.00/mo)</option>,
                <option key="Pro" value="Pro">Pro ($149.00/mo)</option>,
                <option key="Enterprise" value="Enterprise">Enterprise ($399.00/mo)</option>
              ] : (
                plans.map((p) => (
                  <option key={p.id} value={p.name} className="bg-[#0b0f24] text-slate-100">
                    {p.name} (${p.price.toFixed(2)}/mo)
                  </option>
                ))
              )}
            </select>
            <span className="block text-[9px] text-indigo-400/80 leading-none mt-1">
              * Assigning plan locks down standard limits: maximum users, leads pipelines, & daily AI request authorizations.
            </span>
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-955/60 border-t border-slate-900 flex justify-between items-center">
          <span className="text-[10px] text-slate-550 italic font-mono flex items-center space-x-1">
            <Info className="w-3.5 h-3.5" />
            <span>SME credentials generated instantly.</span>
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="px-4 py-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-350 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isWorking}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center space-x-2 transition-colors cursor-pointer"
            >
              {isWorking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Client...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Deploy Tenant Workspace</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
