import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Info, AlertTriangle, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { ClientProfile, Plan } from "../types";

interface ClientEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile | null;
  plans: Plan[];
  onSave: (payload: any) => Promise<void>;
  isWorking: boolean;
}

const BUSINESS_TYPES = [
  "Manufacturing",
  "Real Estate"
];

export default function ClientEditModal({ isOpen, onClose, client, plans, onSave, isWorking }: ClientEditModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "whatsapp" | "ai-assistant">("profile");

  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("");
  const [accountStatus, setAccountStatus] = useState("Active");

  // WhatsApp states
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappWebhookVerifyToken, setWhatsappWebhookVerifyToken] = useState("leadsmart_token");
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState("Inactive");

  // Custom AI states
  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiModel, setAiModel] = useState("gemini-3.5-flash");
  const [aiApiKey, setAiApiKey] = useState("");

  // Test states
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from LeadSmart AI!");
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // AI Permissions states
  const [aiPermissions, setAiPermissions] = useState<Record<string, boolean>>({
    view_leads: false, add_leads: false, edit_leads: false, delete_leads: false,
    view_followups: false, create_followups: false, edit_followups: false, delete_followups: false,
    add_notes: false, edit_notes: false, delete_notes: false,
    change_lead_status: false, change_lead_priority: false, add_tags: false, remove_tags: false,
    send_messages: false, auto_reply: false, auto_followup: false,
    generate_reports: false, analyze_leads: false, give_business_advice: false, generate_recommendations: false
  });

  const handleTogglePermission = (key: string) => {
    setAiPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [errorText, setErrorText] = useState("");

  // Sync state when client changes
  useEffect(() => {
    if (client) {
      setCompanyName(client.companyName || "");
      setOwnerName(client.user?.name || "");
      setPhone(client.phone || "");
      setWebsite(client.website || "");
      setBusinessType(client.businessType || BUSINESS_TYPES[0]);
      setIndustry(client.industry || "");
      setDescription(client.description || "");
      setCountry(client.country || "");
      setState(client.state || "");
      setCity(client.city || "");
      setSubscriptionPlan(client.subscription?.planName || "Starter");
      setAccountStatus(client.accountStatus || "Active");

      setWhatsappToken(client.whatsappToken || "");
      setWhatsappPhoneId(client.whatsappPhoneId || "");
      setWhatsappWebhookVerifyToken(client.whatsappWebhookVerifyToken || "leadsmart_token");
      setWhatsappWebhookUrl(client.whatsappWebhookUrl || (window.location.origin + "/api/webhook/whatsapp"));
      setWhatsappStatus(client.whatsappStatus || "Inactive");

      setAiProvider(client.aiProvider || "gemini");
      setAiModel(client.aiModel || "gemini-3.5-flash");
      setAiApiKey(client.aiApiKey || "");

      if (client.aiPermissions && Array.isArray(client.aiPermissions)) {
        const mappedPerms: Record<string, boolean> = {};
        client.aiPermissions.forEach((p: any) => {
          mappedPerms[p.permissionName] = p.enabled;
        });
        setAiPermissions(prev => ({ ...prev, ...mappedPerms }));
      }

      setErrorText("");
      setTestResult(null);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!companyName.trim()) {
      setErrorText("Company Name cannot be blank.");
      return;
    }
    if (!ownerName.trim()) {
      setErrorText("Owner Name cannot be blank.");
      return;
    }

    try {
      await onSave({
        companyName,
        ownerName,
        phone,
        website,
        businessType,
        industry,
        description,
        country,
        state,
        city,
        subscriptionPlan,
        accountStatus,
        whatsappToken,
        whatsappPhoneId,
        whatsappWebhookVerifyToken,
        whatsappWebhookUrl,
        whatsappStatus,
        aiProvider,
        aiModel,
        aiApiKey,
        aiPermissions,
      });
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "Failed to edit client profile details.");
    }
  };

  const handleTestConnection = async () => {
    if (!client) return;
    setIsTestRunning(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("leadsmart_token");
      const res = await fetch(`/api/whatsapp/test-connection/${client.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Handshake API call failed.");
      setWhatsappStatus(data.status);
      setTestResult({
        success: data.success,
        text: data.message
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        text: err.message || "Handshake diagnosis failed."
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!client || !testPhone) return;
    setIsTestRunning(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("leadsmart_token");
      const res = await fetch(`/api/whatsapp/test-message/${client.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          toPhone: testPhone,
          message: testMessage
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transmitter failed.");
      setWhatsappStatus("Active");
      setTestResult({
        success: true,
        text: "Outgoing campaign trigger transmitted successfully!"
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        text: err.message || "Active diagnostic pinger returned error."
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-[#070b19] border border-slate-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-[#0b1024]/40">
          <div className="space-y-1">
            <h2 className="text-md font-bold text-white uppercase tracking-wider font-display">Configure Client Node</h2>
            <p className="text-[10px] text-slate-400">Modifying profile stats, active subscription, and Integration parameters for {client.companyName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-900/65 rounded-lg text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#080d21] border-b border-slate-900 px-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer uppercase ${activeTab === "profile" ? "border-indigo-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-100"}`}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer uppercase flex items-center space-x-1.5 ${activeTab === "whatsapp" ? "border-indigo-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-100"}`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>WhatsApp CRM Setting</span>
            {whatsappStatus === "Active" ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai-assistant")}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer uppercase flex items-center space-x-1.5 ${activeTab === "ai-assistant" ? "border-indigo-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-100"}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Assistant Config</span>
            {aiApiKey ? (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            )}
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 max-h-[60vh] overflow-y-auto text-xs font-light text-slate-300">
          {errorText && (
            <div className="p-3 mb-4 bg-rose-950/20 border border-rose-900/40 text-rose-400 rounded-lg flex items-start space-x-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {activeTab === "profile" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Core Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none tracking-normal font-light text-slate-100"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner Full Name *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none tracking-normal font-light text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Contact Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Code Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Website URL</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
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
                    {BUSINESS_TYPES.map((b) => (
                      <option key={b} value={b} className="bg-[#0b0f24] text-slate-100">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Industry Segment</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare, Retail Logistics"
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Overview Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline business operations, targets or AI assistance rules config..."
                  className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100 placeholder-slate-700"
                />
              </div>

              {/* Locations */}
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
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">State / Region</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-100"
                  />
                </div>
              </div>

              {/* Billing & Administration configurations */}
              <div className="p-4 border border-indigo-950 rounded-xl bg-indigo-950/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">Assign Subscription Tier</label>
                  <select
                    value={subscriptionPlan}
                    onChange={(e) => setSubscriptionPlan(e.target.value)}
                    className="w-full bg-slate-950/65 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-200"
                  >
                    {plans.length === 0 ? [
                      <option key="Starter" value="Starter">Starter ($29.00)</option>,
                      <option key="Growth" value="Growth">Growth ($79.00)</option>,
                      <option key="Pro" value="Pro">Pro ($149.00)</option>,
                      <option key="Enterprise" value="Enterprise">Enterprise ($399.00)</option>
                    ] : (
                      plans.map((p) => (
                        <option key={p.id} value={p.name} className="bg-[#0b0f24] text-slate-100">
                          {p.name} (${p.price.toFixed(2)}/mo)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">Account status</label>
                  <select
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value)}
                    className="w-full bg-slate-950/65 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-200"
                  >
                    <option value="Active" className="bg-[#0b0f24] text-emerald-400 font-bold">Active</option>
                    <option value="Suspended" className="bg-[#0b0f24] text-rose-400">Suspended</option>
                    <option value="Pending" className="bg-[#0b0f24] text-amber-500">Pending</option>
                  </select>
                </div>
              </div>
            </form>
          )}

          {activeTab === "whatsapp" && (
            <div className="space-y-5">
              {/* Portal credentials */}
              <div className="border border-slate-900 p-4 bg-slate-950/20 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Meta Business Portal Credentials</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Connect client's WhatsApp Cloud API node credentials.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-slate-400">STATUS:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${whatsappStatus === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" : whatsappStatus === "Failed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-850"}`}>
                      {whatsappStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number ID</label>
                      <input
                        type="text"
                        value={whatsappPhoneId}
                        onChange={(e) => setWhatsappPhoneId(e.target.value)}
                        placeholder="e.g. 10484920402241"
                        className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none font-mono text-slate-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405">Webhook Verify Token</label>
                      <input
                        type="text"
                        value={whatsappWebhookVerifyToken}
                        onChange={(e) => setWhatsappWebhookVerifyToken(e.target.value)}
                        placeholder="e.g. leadsmart_token"
                        className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none font-mono text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Business API Access Token</label>
                    <input
                      type="text"
                      value={whatsappToken}
                      onChange={(e) => setWhatsappToken(e.target.value)}
                      placeholder="EAAGb..."
                      className="w-full bg-slate-950/45 border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none tracking-normal font-mono text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 bg-indigo-950/5 border border-indigo-950/25 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Inbound Webhook Url</span>
                      </label>
                      <span className="text-[9px] text-slate-500 font-mono">Input this url inside Meta panel</span>
                    </div>
                    <input
                      type="text"
                      value={whatsappWebhookUrl}
                      readOnly
                      className="w-full bg-slate-950/50 border border-slate-900 rounded-md p-2 outline-none text-indigo-400 font-mono text-[10px] select-all cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Handshake Diagnostics */}
              <div className="border border-slate-900 p-4 bg-[#0a0f24]/30 rounded-xl space-y-4">
                <div className="space-y-0.5 pb-2 border-b border-slate-900">
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Dial Handshake Diagnostics</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Verify endpoint status or dispatch verification test templates.</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestRunning}
                    className="flex-1 py-2 px-3 border border-indigo-900 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    {isTestRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-450 uppercase">Manual Outbound Diagnostics</span>
                    <span className="text-[9px] text-slate-505">Requires saved Meta credentials</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono">Recipient Phone Number</label>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="e.g. +19999999999"
                        className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-[11px] outline-none font-mono text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono">Inbound Mock Message</label>
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-[11px] outline-none font-mono text-slate-200"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={isTestRunning || !testPhone}
                    className="w-full py-2 px-3 bg-[#1ebea5] hover:bg-[#128c7e] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    {isTestRunning ? "Sending..." : "Send Test Campaign Message"}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg border text-[11px] ${testResult.success ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 font-mono" : "bg-rose-950/20 border-rose-900/30 text-rose-450 font-mono"}`}>
                    <span className="font-bold">{testResult.success ? "CONNECTIVITY SECURED: " : "ERROR REPORTED: "}</span>
                    <span>{testResult.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "ai-assistant" && (
            <div className="space-y-5">
              <div className="border border-slate-900 p-4 bg-slate-950/20 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">AI Operations & Intelligent Agent Model</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Connect any LLM model with a custom API key for full CRM execution.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-slate-400">STATE:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${aiApiKey ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"}`}>
                      {aiApiKey ? "Custom Key Connected" : "Defaults (LeadSmart Shared Key)"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">LLM Provider Engine</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value)}
                      className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-200 font-mono text-[11px]"
                    >
                      <option value="gemini" className="bg-[#0b0f24]">Google Gemini AI (System Default)</option>
                      <option value="openai" className="bg-[#0b0f24]">OpenAI GPT Architecture</option>
                      <option value="anthropic" className="bg-[#0b0f24]">Anthropic Claude Core</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Model Name Identifier</label>
                    {aiProvider === "gemini" ? (
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-200 font-mono text-[11px]"
                      >
                        <option value="gemini-3.5-flash" className="bg-[#0b0f24]">gemini-3.5-flash (Production Default)</option>
                        <option value="gemini-3.1-flash-lite" className="bg-[#0b0f24]">gemini-3.1-flash-lite (Fast & Economic)</option>
                        <option value="gemini-3.1-pro-preview" className="bg-[#0b0f24]">gemini-3.1-pro-preview (Advanced Reasoning)</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder={aiProvider === "openai" ? "e.g. gpt-4o-mini" : "e.g. claude-3-5-sonnet"}
                        className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-mono text-[11px]"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Secret Custom API Key Override</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Enter custom API key to override shared billing limits (e.g., AIzaSy...)"
                    className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-mono text-[11px]"
                  />
                  <p className="text-[9px] text-slate-500 italic">Leave empty to use LeadSmart's high-speed default Google API pipeline.</p>
                </div>
              </div>

              {/* Advanced Permissions Grid */}
              <div className="border border-slate-900 p-4 bg-slate-950/20 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Automated Agent Permissions</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Select exactly what operations your AI assistant is authorized to perform autonomously.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider border-b border-indigo-900/30 pb-1.5">Lead Management</h4>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.view_leads} onChange={() => handleTogglePermission('view_leads')} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">View Leads</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.add_leads} onChange={() => handleTogglePermission('add_leads')} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Add Leads</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.edit_leads} onChange={() => handleTogglePermission('edit_leads')} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Edit Leads</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.delete_leads} onChange={() => handleTogglePermission('delete_leads')} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Delete Leads</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider border-b border-purple-900/30 pb-1.5">Follow-up Engine</h4>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.view_followups} onChange={() => handleTogglePermission('view_followups')} className="accent-purple-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">View Follow-ups</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.create_followups} onChange={() => handleTogglePermission('create_followups')} className="accent-purple-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Create Follow-ups</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.edit_followups} onChange={() => handleTogglePermission('edit_followups')} className="accent-purple-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Edit Follow-ups</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.delete_followups} onChange={() => handleTogglePermission('delete_followups')} className="accent-purple-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Delete Follow-ups</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-900/30 pb-1.5">Internal Notes</h4>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.add_notes} onChange={() => handleTogglePermission('add_notes')} className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Add Notes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.edit_notes} onChange={() => handleTogglePermission('edit_notes')} className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Edit Notes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.delete_notes} onChange={() => handleTogglePermission('delete_notes')} className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Delete Notes</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider border-b border-blue-900/30 pb-1.5">CRM Analytics</h4>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.change_lead_status} onChange={() => handleTogglePermission('change_lead_status')} className="accent-blue-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Change Status</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.change_lead_priority} onChange={() => handleTogglePermission('change_lead_priority')} className="accent-blue-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Change Priority</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.add_tags} onChange={() => handleTogglePermission('add_tags')} className="accent-blue-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Add Tags</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.remove_tags} onChange={() => handleTogglePermission('remove_tags')} className="accent-blue-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Remove Tags</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[#1ebea5] uppercase tracking-wider border-b border-[#1ebea5]/30 pb-1.5">WhatsApp Matrix</h4>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.send_messages} onChange={() => handleTogglePermission('send_messages')} className="accent-[#1ebea5] w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Send Messages</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.auto_reply} onChange={() => handleTogglePermission('auto_reply')} className="accent-[#1ebea5] w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Auto Reply</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.auto_followup} onChange={() => handleTogglePermission('auto_followup')} className="accent-[#1ebea5] w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Auto Follow-up</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-amber-900/30 pb-1.5">Business Intel</h4>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.generate_reports} onChange={() => handleTogglePermission('generate_reports')} className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Generate Reports</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.analyze_leads} onChange={() => handleTogglePermission('analyze_leads')} className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Analyze Leads</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.give_business_advice} onChange={() => handleTogglePermission('give_business_advice')} className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Business Advice</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={aiPermissions.generate_recommendations} onChange={() => handleTogglePermission('generate_recommendations')} className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                      <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Recommend Actions</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-900 flex justify-between items-center bg-[#070b19]/90">
          <span className="text-[10px] text-slate-500 italic font-mono flex items-center space-x-1">
            <Info className="w-3.5 h-3.5" />
            <span>Database locks synchronized automatically.</span>
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="px-4 py-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-350 hover:text-white rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isWorking}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-1.5 font-bold cursor-pointer transition-colors"
            >
              {isWorking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Commit Configurations</span>
                </>
              )
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
