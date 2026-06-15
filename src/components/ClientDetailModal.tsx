import React from "react";
import { X, Globe, MapPin, Phone, Mail, Calendar, Key, Shield, Info, Briefcase, RefreshCw, AlertCircle, Brain, Sparkles, Save, Loader2, Check } from "lucide-react";
import { ClientProfile } from "../types";
import AIConfigurationPanel from "./AIConfigurationPanel";
import { api } from "../services/api";

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile | null;
}

export default function ClientDetailModal({ isOpen, onClose, client }: ClientDetailModalProps) {
  const [activeSegment, setActiveSegment] = React.useState<"general" | "ai-config" | "ai-provider">("general");

  const [aiProvider, setAiProvider] = React.useState("gemini");
  const [aiModel, setAiModel] = React.useState("gemini-3.5-flash");
  const [aiApiKey, setAiApiKey] = React.useState("");
  const [aiAssistantName, setAiAssistantName] = React.useState("LeadSmart AI");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<{ success: boolean; text: string } | null>(null);
  const [testStatus, setTestStatus] = React.useState<{ success: boolean; text: string } | null>(null);
  const [isTestRunning, setIsTestRunning] = React.useState(false);

  React.useEffect(() => {
    setActiveSegment("general");
    if (client) {
      setAiProvider(client.aiProvider || "gemini");
      setAiModel(client.aiModel || "gemini-3.5-flash");
      setAiApiKey(client.aiApiKey || "");
      setAiAssistantName(client.aiAssistantName || "LeadSmart AI");
      setSaveStatus(null);
      setTestStatus(null);
    }
  }, [isOpen, client?.id]);

  const handleSaveCustomAIConfig = async () => {
    if (!client) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await api.put(`/admin/clients/${client.id}`, {
        companyName: client.companyName,
        aiProvider,
        aiModel,
        aiApiKey,
        aiAssistantName
      });
      setSaveStatus({ success: true, text: "Custom AI Assistant configuration compiled and saved successfully!" });
      client.aiProvider = aiProvider;
      client.aiModel = aiModel;
      client.aiApiKey = aiApiKey;
      client.aiAssistantName = aiAssistantName;
    } catch (err: any) {
      console.error("Failed to save custom AI config:", err);
      setSaveStatus({ success: false, text: err.message || "Failed to save AI configuration settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestRunning(true);
    setTestStatus(null);
    try {
      const response = await api.post<any>("/ai/test-connection", {
        apiKey: aiApiKey,
        provider: aiProvider,
        model: aiModel
      });
      if (response && response.success) {
        setTestStatus({ success: true, text: response.message || "API Connection established successfully!" });
      } else {
        setTestStatus({ success: false, text: "Verification returned an unexpected status value." });
      }
    } catch (err: any) {
      console.log("Test connection feedback info:", err.message || err);
      setTestStatus({ success: false, text: err.message || "Failed to establish connection with specified engine key." });
    } finally {
      setIsTestRunning(false);
    }
  };

  if (!isOpen || !client) return null;

  // Compute days remaining
  const getDaysRemaining = () => {
    if (!client.subscription?.expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(client.subscription.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining();

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40";
      case "TRIAL":
        return "bg-indigo-950/50 text-indigo-400 border border-indigo-900/40";
      case "SUSPENDED":
        return "bg-rose-950/50 text-rose-400 border border-rose-900/40";
      case "EXPIRED":
        return "bg-yellow-950/50 text-yellow-450 border border-yellow-905/40";
      default:
        return "bg-slate-950/50 text-slate-400 border border-slate-900";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className={`w-full bg-[#070b19] border border-slate-900 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 transform scale-100 ${
          activeSegment === "ai-config" || activeSegment === "ai-provider" ? "max-w-5xl" : "max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Section */}
        <div className="p-6 border-b border-slate-900 flex justify-between items-start bg-[#0b1024]/40">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-indigo-955/20 border border-indigo-955/20">
                SME PROFILE
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getStatusStyle(client.subscription?.status || client.subscriptionStatus)}`}>
                {client.subscription?.planName || "Starter"} &bull; {client.subscription?.status || client.subscriptionStatus}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white font-display uppercase tracking-tight">{client.companyName}</h2>
            {client.website && (
              <a 
                href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                referrerPolicy="no-referrer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{client.website}</span>
              </a>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-900/65 rounded-lg text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex border-b border-slate-900 bg-[#0b1024]/10 px-6 font-semibold">
          <button
            onClick={() => setActiveSegment("general")}
            className={`px-4 py-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${
              activeSegment === "general"
                ? "border-indigo-500 text-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-350"
            }`}
          >
            General Profile Information
          </button>
          <button
            onClick={() => setActiveSegment("ai-config")}
            className={`px-4 py-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSegment === "ai-config"
                ? "border-indigo-500 text-white font-bold"
                : "border-transparent text-slate-500 hover:text-indigo-405"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>WhatsApp AI Agent</span>
          </button>
          <button
            onClick={() => setActiveSegment("ai-provider")}
            className={`px-4 py-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSegment === "ai-provider"
                ? "border-indigo-500 text-white font-bold"
                : "border-transparent text-slate-500 hover:text-indigo-405"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Custom AI Configuration</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 space-y-6 max-h-[74vh] overflow-y-auto">
          {activeSegment === "ai-config" ? (
            <div className="py-1">
              <AIConfigurationPanel clientId={client.id} readOnly={false} />
            </div>
          ) : activeSegment === "ai-provider" ? (
            <div className="py-1 space-y-6">
              <div className="pb-3 border-b border-slate-900/60 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>Custom AI Assistant Connection & Engine Keys</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-normal font-light">Configure custom LLM models, personalize assistant bot names, and test credentials live.</p>
                </div>
              </div>

              {saveStatus && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed transition-all duration-300 ${
                  saveStatus.success 
                    ? "bg-emerald-950/40 border-emerald-950/30 text-emerald-400" 
                    : "bg-rose-950/40 border-rose-950/30 text-rose-400"
                }`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 font-medium">{saveStatus.text}</div>
                  <button onClick={() => setSaveStatus(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer transition-colors">✕</button>
                </div>
              )}

              {testStatus && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed transition-all duration-300 ${
                  testStatus.success 
                    ? "bg-indigo-950/40 border-[#1e295d] text-indigo-300" 
                    : "bg-rose-950/40 border-rose-950/30 text-rose-400"
                }`}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 font-medium">{testStatus.text}</div>
                  <button onClick={() => setTestStatus(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer transition-colors">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Custom AI Persona Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI Assistant Name (Personalization)</label>
                  <input
                    type="text"
                    value={aiAssistantName}
                    onChange={(e) => setAiAssistantName(e.target.value)}
                    placeholder="e.g. murty, LeadSmart Agent"
                    className="w-full bg-[#020409]/60 text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 transition-colors font-light"
                  />
                  <p className="text-[10px] text-slate-500 leading-snug">Personalize the virtual assistant chatbot floating name as shown on the client dashboard (e.g. "murty").</p>
                </div>

                {/* 2. Choose AI Provider */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">LLM Backend Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAiProvider(val);
                      if (val === "gemini") setAiModel("gemini-3.5-flash");
                      else if (val === "openai") setAiModel("gpt-4o-mini");
                      else if (val === "anthropic") setAiModel("claude-3-5-sonnet");
                    }}
                    className="w-full bg-[#020409]/60 text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 h-[38px] cursor-pointer transition-colors font-light"
                  >
                    <option value="gemini">Google Gemini AI Engine</option>
                    <option value="openai">OpenAI ChatGPT standard</option>
                    <option value="anthropic">Anthropic Claude platform</option>
                  </select>
                </div>
 
                {/* 3. Model Identifier */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Model Identifier</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={aiProvider === "gemini" ? "e.g. gemini-3.5-flash" : aiProvider === "openai" ? "gpt-4o-mini" : "claude-3-5-sonnet"}
                    className="w-full bg-[#020409]/60 text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 transition-colors font-light"
                  />
                </div>

                {/* 4. Secret API Key Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Secret API Key Authentication</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={client.aiApiKey ? "••••••••••••••••••••••••" : "Paste secret token..."}
                    className="w-full bg-[#020409]/60 text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 font-mono transition-colors"
                  />
                  {aiApiKey && (aiApiKey.startsWith("sk-") || aiApiKey.toLowerCase().includes("op-")) && (
                    <p className="text-[10px] text-amber-500 font-mono mt-1 leading-normal italic">
                      ⚠️ Note: Your API key appears to be in OpenAI/OpenRouter format (starts with "sk-"). Since this CRM engine uses Google Gemini models for structured CRM analytics, please provide a Google Gemini API Key (starts with "AIzaSy") to connect successfully.
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons (Save Config & Test Connection) */}
              <div className="pt-4 border-t border-slate-900 flex justify-between items-center bg-[#070b19]">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestRunning || !aiApiKey}
                  className="px-4 py-2.5 bg-[#0a0f26] hover:bg-[#12193b] text-slate-305 hover:text-white font-bold rounded-lg text-xs border border-indigo-900/40 transition-all flex items-center space-x-2 disabled:opacity-40 cursor-pointer"
                >
                  {isTestRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Testing server connection...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-reverse" />
                      <span>Test connection</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomAIConfig}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving configurations...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Engine Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Section 1: Top Dashboard Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Account status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                client.accountStatus === "Active" 
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" 
                  : client.accountStatus === "Suspended"
                  ? "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                  : "bg-amber-950/40 text-amber-400 border border-amber-900/30"
              }`}>
                {client.accountStatus}
              </span>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Billing Expiry</span>
              <span className="block text-sm font-semibold text-white font-mono">
                {client.subscription?.expiryDate 
                  ? new Date(client.subscription.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : "No Date Line"
                }
              </span>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Days remaining</span>
              <span className={`block text-sm font-bold font-mono ${daysRemaining <= 3 ? "text-rose-405" : "text-indigo-400"}`}>
                {daysRemaining} Days
              </span>
            </div>
          </div>

          {/* Grid Information Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column A: Company Information & Credentials */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 pb-2 border-b border-slate-905">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Company Credentials</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Owner Name</span>
                  <span className="text-white font-medium">{client.user.name}</span>
                </div>
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Contact Email</span>
                  <span className="text-white font-mono">{client.user.email}</span>
                </div>
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Phone Contact</span>
                  <span className="text-white">{client.phone || "Not Configured"}</span>
                </div>
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Registered On</span>
                  <span className="text-slate-405 font-mono">
                    {new Date(client.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Column B: Business Category Profiles */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 pb-2 border-b border-slate-905">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>Sector Categorization</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Business Type</span>
                  <span className="text-indigo-305 font-semibold text-white">{client.businessType || "Not Specified"}</span>
                </div>
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Industry Area</span>
                  <span className="text-white font-medium">{client.industry || "Not Specified"}</span>
                </div>
                <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                  <span className="text-slate-500">Geographics</span>
                  <span className="text-white flex items-center space-x-1 font-light">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {[client.city, client.state, client.country].filter(Boolean).join(", ") || "No Location"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Section: Description */}
          <div className="p-4 rounded-xl bg-[#030611] border border-slate-900 space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Business Statement Description</span>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              {client.description || "The administrator has not provided a description summary context for this client profile. Update client specifications via the settings editor."}
            </p>
          </div>

          {/* Section: Subscription Tier Limits Checklist */}
          {client.subscription && (
            <div className="p-5 border border-indigo-900/10 rounded-xl bg-indigo-950/5 space-y-3">
              <span className="block text-[11px] font-bold tracking-widest text-[#5c68f2] uppercase">
                Active Subscription Details
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-light text-slate-300">
                <div className="p-2.5 bg-slate-950/40 rounded border border-slate-900">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold leading-none mb-1">Plan Price</span>
                  <span className="font-mono text-white font-semibold">${client.subscription.price.toFixed(2)}/mo</span>
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-slate-900">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold leading-none mb-1">Billing Cycle</span>
                  <span className="text-white font-medium">Automatic</span>
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-slate-900">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold leading-none mb-1">Renewal Status</span>
                  <span className="text-amber-400 font-semibold">{daysRemaining > 0 ? "Renewing" : "Expired"}</span>
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-slate-900">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold leading-none mb-1">Coverage Start</span>
                  <span className="font-mono text-white text-[11px]">
                    {new Date(client.subscription.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          )}
          </>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-900 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Acknowledge Profile
          </button>
        </div>
      </div>
    </div>
  );
}
