import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  Settings, 
  Database, 
  Sliders, 
  Target, 
  RefreshCw, 
  MessageSquare, 
  ArrowRight, 
  ShieldAlert, 
  Brain, 
  Check, 
  Play, 
  History, 
  BadgeAlert,
  Save,
  Loader2,
  FileText,
  Languages,
  Clock
} from "lucide-react";
import { api } from "../services/api";

interface AIConfigurationPanelProps {
  clientId: string;
  readOnly?: boolean;
}

export default function AIConfigurationPanel({ clientId, readOnly = false }: AIConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "product" | "behavior" | "objections" | "followup" | "testing">("profile");
  
  // Fields management
  const [businessProfile, setBusinessProfile] = useState({
    businessType: "Manufacturing",
    industry: "General Industry",
    companyDescription: "",
    targetCustomers: "",
    geographicMarket: "",
    salesModel: "B2B",
    averageOrderValue: ""
  });

  const [productIntelligence, setProductIntelligence] = useState({
    productCategories: "",
    productList: "",
    serviceList: "",
    pricingRange: "",
    MOQ: "",
    deliveryTimeline: "",
    keyBenefits: "",
    competitiveAdvantages: "",
    FAQs: ""
  });

  const [salesBehavior, setSalesBehavior] = useState({
    salesTone: "Professional",
    salesStrategy: "Balanced",
    negotiationPolicy: "Allowed",
    discountLimit: "15%",
    followUpAggression: "Medium"
  });

  const [customerRules, setCustomerRules] = useState({
    responseStyleRules: "",
    objectionHandlingStyle: "",
    urgencyDetectionRules: "",
    budgetDetectionSensitivity: "Medium",
    languagePreference: "English"
  });

  const [followUpRules, setFollowUpRules] = useState({
    firstFollowUpDelay: "1 day",
    secondFollowUpDelay: "3 days",
    finalFollowUpDelay: "7 days",
    autoCloseRules: "",
    leadReengagementRules: ""
  });

  const [responseControl, setResponseControl] = useState({
    responseLengthPreference: "Medium",
    useEmojis: "Yes",
    messageFormalityLevel: "Professional",
    autoReplyMode: "AI Smart"
  });

  const [businessGoals, setBusinessGoals] = useState({
    primaryGoal: "More Sales",
    secondaryGoals: ["More Appointments", "More Quotations"]
  });

  // State controls
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Testing sandbox parameters
  const [testMessage, setTestMessage] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    aiResponse: string;
    intent: string;
    leadScore: number;
    recommendedAction: string;
    followUpSuggestion: string;
    prompts: {
      systemPrompt: string;
      contextPrompt: string;
      businessContextInjection: string;
    };
    usedGemini: boolean;
  } | null>(null);

  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load configuration details
  const fetchConfig = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await api.get<any>(`/ai-config/${clientId}`);
      if (data) {
        if (data.businessProfile) setBusinessProfile(prev => ({ ...prev, ...data.businessProfile }));
        if (data.productIntelligence) setProductIntelligence(prev => ({ ...prev, ...data.productIntelligence }));
        if (data.salesBehavior) setSalesBehavior(prev => ({ ...prev, ...data.salesBehavior }));
        if (data.customerRules) setCustomerRules(prev => ({ ...prev, ...data.customerRules }));
        if (data.followUpRules) setFollowUpRules(prev => ({ ...prev, ...data.followUpRules }));
        if (data.responseControl) setResponseControl(prev => ({ ...prev, ...data.responseControl }));
        if (data.businessGoals) {
          setBusinessGoals(prev => {
            const bg = data.businessGoals || {};
            return {
              primaryGoal: bg.primaryGoal !== undefined ? bg.primaryGoal : prev.primaryGoal,
              secondaryGoals: Array.isArray(bg.secondaryGoals) ? bg.secondaryGoals : prev.secondaryGoals
            };
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to load AI configuration:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to synchronise intelligence configuration." });
    } finally {
      setIsLoading(false);
    }
  };

  // Load audit logs of simulation runs
  const fetchTestLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await api.get<any[]>(`/ai-config/logs/${clientId}`);
      setTestLogs(data || []);
    } catch (err) {
      console.error("Failed to load diagnostic logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchTestLogs();
  }, [clientId]);

  // Handle Save
  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setIsSaving(true);
    setStatusMessage(null);

    const payload = {
      businessProfile,
      productIntelligence,
      salesBehavior,
      customerRules,
      followUpRules,
      responseControl,
      businessGoals
    };

    try {
      await api.post(`/ai-config/${clientId}`, payload);
      setStatusMessage({ type: "success", text: "AI Mind Profile saved and compiled successfully." });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error("Save config error:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to save AI memory parameters." });
    } finally {
      setIsSaving(false);
    }
  };

  // Run real-time test run
  const handleRunSimulator = async () => {
    if (!testMessage.trim()) return;
    setTestRunning(true);
    setStatusMessage(null);
    try {
      const data = await api.post<any>("/ai-config/test", {
        clientId,
        message: testMessage
      });
      setTestResult(data);
      // Refresh historical logs
      fetchTestLogs();
    } catch (err: any) {
      console.error("Test execution error:", err);
      setStatusMessage({ type: "error", text: err.message || "Diagnostic test simulation aborted." });
    } finally {
      setTestRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-950/40 border-emerald-900/35";
    if (score >= 45) return "text-amber-400 bg-amber-955/20 border-amber-900/35";
    return "text-rose-400 bg-rose-955/20 border-rose-900/35";
  };

  const getIntentStyle = (intent: string) => {
    switch (intent?.toUpperCase()) {
      case "HOT":
        return "bg-rose-950/45 text-rose-405 border-rose-900/40";
      case "WARM":
        return "bg-amber-950/40 text-amber-400 border-amber-900/40";
      case "COLD":
        return "bg-blue-950/40 text-blue-400 border-blue-900/40";
      default:
        return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3 font-light text-xs min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span>Loading structured intelligence matrix details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert states overlay */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed transition-all duration-300 ${
          statusMessage.type === "success" 
            ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400" 
            : "bg-rose-950/40 border-rose-900/40 text-rose-400"
        }`}>
          <BadgeAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 font-medium">{statusMessage.text}</div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Main layout sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-1.5 lg:col-span-1">
          <div className="p-3 bg-[#0c1228]/50 border border-slate-900 rounded-xl mb-3">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Configuration Profile</span>
            <span className="block text-xs font-semibold text-white flex items-center space-x-1 mt-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-505" />
              <span>SME Brain Control</span>
            </span>
            {readOnly && (
              <span className="inline-flex mt-2 text-[9px] bg-slate-900 font-bold text-slate-400 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-widest leading-none">
                READ ONLY
              </span>
            )}
          </div>

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2.5 border cursor-pointer ${
              activeTab === "profile" 
                ? "bg-indigo-650/15 text-indigo-300 border-indigo-900/50" 
                : "bg-transparent border-transparent text-slate-400 hover:bg-[#070b1a] hover:text-slate-300"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Profile & Marketing</span>
          </button>

          <button
            onClick={() => setActiveTab("product")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2.5 border cursor-pointer ${
              activeTab === "product" 
                ? "bg-indigo-650/15 text-indigo-300 border-indigo-900/50" 
                : "bg-transparent border-transparent text-slate-400 hover:bg-[#070b1a] hover:text-slate-300"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Product Knowledge</span>
          </button>

          <button
            onClick={() => setActiveTab("behavior")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2.5 border cursor-pointer ${
              activeTab === "behavior" 
                ? "bg-indigo-650/15 text-indigo-300 border-indigo-900/50" 
                : "bg-transparent border-transparent text-slate-400 hover:bg-[#070b1a] hover:text-slate-300"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Sales & Tone Rules</span>
          </button>

          <button
            onClick={() => setActiveTab("objections")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2.5 border cursor-pointer ${
              activeTab === "objections" 
                ? "bg-indigo-650/15 text-indigo-300 border-indigo-900/50" 
                : "bg-transparent border-transparent text-slate-400 hover:bg-[#070b1a] hover:text-slate-300"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Customer Rules</span>
          </button>

          <button
            onClick={() => setActiveTab("followup")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2.5 border cursor-pointer ${
              activeTab === "followup" 
                ? "bg-indigo-650/15 text-indigo-300 border-indigo-900/50" 
                : "bg-transparent border-transparent text-slate-400 hover:bg-[#070b1a] hover:text-slate-300"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Followup & Control</span>
          </button>

          <button
            onClick={() => setActiveTab("testing")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2.5 border cursor-pointer ${
              activeTab === "testing" 
                ? "bg-indigo-650/20 text-indigo-400 border-indigo-805" 
                : "bg-transparent border-transparent text-slate-400 hover:bg-[#070b1a] hover:text-indigo-405"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Agent Simulation & Logs</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="lg:col-span-3 bg-[#04060f]/60 rounded-xl border border-slate-900/90 overflow-hidden">
          <form onSubmit={handleSaveConfiguration} className="p-6 space-y-6">
            
            {/* 1. BUSINESS PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-900/60">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    <span>Business Context & Operational Goals</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">Configure how the AI relates to your company industry, scope of action, and commercial goals.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Type</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={businessProfile.businessType}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, businessType: e.target.value })}
                      placeholder="e.g. Manufacturing, SaaS, Agency, Wholesale"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 focus:bg-[#040710]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry Classification</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={businessProfile.industry}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, industry: e.target.value })}
                      placeholder="e.g. Retail, Healthcare, Industrial Alloys"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Customers Profile</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={businessProfile.targetCustomers}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, targetCustomers: e.target.value })}
                      placeholder="e.g. SME purchasing executives, wholesale buyers"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geographical Markets</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={businessProfile.geographicMarket}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, geographicMarket: e.target.value })}
                      placeholder="e.g. Global, North America, regional EU"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales Model Strategy</label>
                    <select
                      disabled={readOnly}
                      value={businessProfile.salesModel}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, salesModel: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="B2B">Business to Business (B2B)</option>
                      <option value="B2C">Business to Consumer (B2C)</option>
                      <option value="Hybrid">Hybrid Combo Model</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Transaction Value ($)</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={businessProfile.averageOrderValue}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, averageOrderValue: e.target.value })}
                      placeholder="e.g. 1500, 50000"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Description / Business Pitch</label>
                  <textarea
                    disabled={readOnly}
                    rows={3}
                    value={businessProfile.companyDescription}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, companyDescription: e.target.value })}
                    placeholder="We produce heavy aluminum tubes under custom material molds with certifications..."
                    className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none"
                  ></textarea>
                </div>

                {/* Goals Sub-block */}
                <div className="p-4 rounded-lg bg-[#0e1428]/35 border border-slate-900/60 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Primary AI Output Goal</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={businessGoals.primaryGoal}
                      onChange={(e) => setBusinessGoals({ ...businessGoals, primaryGoal: e.target.value })}
                      placeholder="e.g. Get Lead Contact, Book Appointment"
                      className="w-full bg-[#020409]/60 text-xs px-3 py-2 rounded-md border border-slate-900 text-white font-medium placeholder-slate-700 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Secondary Targets</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={(businessGoals.secondaryGoals || []).join(", ")}
                      onChange={(e) => setBusinessGoals({ ...businessGoals, secondaryGoals: e.target.value.split(",").map(g => g.trim()) })}
                      placeholder="e.g. Request Quotes, Check MOQ, Ask for FAQs"
                      className="w-full bg-[#020409]/60 text-xs px-3 py-2 rounded-md border border-slate-900 text-white font-light placeholder-slate-700 outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRODUCT KNOWLEDGE TAB */}
            {activeTab === "product" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-900/60">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Product Catalog & Knowledge Base Matrix</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">Equip the AI with complete data regarding your products, prices, MOQ, and standard delivery timelines.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Categories</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={productIntelligence.productCategories}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, productCategories: e.target.value })}
                      placeholder="e.g. Alloys, Copper Tubes, Connectors"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard Pricing Bounds</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={productIntelligence.pricingRange}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, pricingRange: e.target.value })}
                      placeholder="e.g. $10 - $250 / unit, or by volume contract"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minimum Order Quantity (MOQ)</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={productIntelligence.MOQ}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, MOQ: e.target.value })}
                      placeholder="e.g. 50 units, $1,000 baseline"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fulfillment & Delivery Timelines</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={productIntelligence.deliveryTimeline}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, deliveryTimeline: e.target.value })}
                      placeholder="e.g. 3-5 days local shipping, 3 weeks custom"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Product Items List</label>
                    <textarea
                      disabled={readOnly}
                      rows={3}
                      value={productIntelligence.productList}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, productList: e.target.value })}
                      placeholder="Item A: Nickel joints - highly heat robust&#10;Item B: Brass flanges - baseline specifications..."
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px] leading-relaxed"
                    ></textarea>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Services Offered</label>
                    <textarea
                      disabled={readOnly}
                      rows={3}
                      value={productIntelligence.serviceList}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, serviceList: e.target.value })}
                      placeholder="Service A: Specialized forging calibration&#10;Service B: Custom metallurgical design molds..."
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px] leading-relaxed"
                    ></textarea>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Motivations & Benefits</label>
                    <textarea
                      disabled={readOnly}
                      rows={2}
                      value={productIntelligence.keyBenefits}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, keyBenefits: e.target.value })}
                      placeholder="Corrosion persistence, ISO certifications weight alignment..."
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px]"
                    ></textarea>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Competitive Advantages</label>
                    <textarea
                      disabled={readOnly}
                      rows={2}
                      value={productIntelligence.competitiveAdvantages}
                      onChange={(e) => setProductIntelligence({ ...productIntelligence, competitiveAdvantages: e.target.value })}
                      placeholder="Only distributor in North America with 24/7 technical hotline access..."
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px]"
                    ></textarea>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Standard FAQ Knowledge Base (Questions & Answers)</label>
                  <textarea
                    disabled={readOnly}
                    rows={3}
                    value={productIntelligence.FAQs}
                    onChange={(e) => setProductIntelligence({ ...productIntelligence, FAQs: e.target.value })}
                    placeholder="Q: Do you offer corporate alloy discounts?&#10;A: Yes, contracts exceeding 5,000 units trigger a 15% discount limit reduction."
                    className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none leading-relaxed text-[11px]"
                  ></textarea>
                </div>
              </div>
            )}

            {/* 3. SALES BEHAVIOR TAB */}
            {activeTab === "behavior" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-900/60">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Sales Behavior & Interaction Dynamics</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">Control your AI's conversational style, negotiation parameters, and tone boundaries.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vocal Brand Tone</label>
                    <select
                      disabled={readOnly}
                      value={salesBehavior.salesTone}
                      onChange={(e) => setSalesBehavior({ ...salesBehavior, salesTone: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Professional">Professional (Factual, precise, business-ready)</option>
                      <option value="Friendly">Friendly (Approachable, conversational, warm)</option>
                      <option value="Direct">Direct (Brief, speed-oriented, zero fluff)</option>
                      <option value="Empirical">Empirical (Technical, heavily data/math backed)</option>
                      <option value="Aggressive">Assertive (Highly active closing orientation)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commercial Selling Strategy</label>
                    <select
                      disabled={readOnly}
                      value={salesBehavior.salesStrategy}
                      onChange={(e) => setSalesBehavior({ ...salesBehavior, salesStrategy: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Consultative">Consultative (Suggest tailored advice & ask questions)</option>
                      <option value="Balanced">Balanced (General sales pitch with soft guidance)</option>
                      <option value="Soft Touch">Soft Touch (Nurturing support, extremely friendly)</option>
                      <option value="Hard Sell">Hard Sell (Pressure-driven discount deadlines focus)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Negotiation Permission Policy</label>
                    <select
                      disabled={readOnly}
                      value={salesBehavior.negotiationPolicy}
                      onChange={(e) => setSalesBehavior({ ...salesBehavior, negotiationPolicy: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Allowed">Allowed (Can mention sales discounts inside limits)</option>
                      <option value="Strict">Strict (Fixed prices only, reject discounts respectfully)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maximum Discount Authorized (%)</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={salesBehavior.discountLimit}
                      onChange={(e) => setSalesBehavior({ ...salesBehavior, discountLimit: e.target.value })}
                      placeholder="e.g. 10%, 15% Max"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Follow-Up Aggression Index</label>
                    <select
                      disabled={readOnly}
                      value={salesBehavior.followUpAggression}
                      onChange={(e) => setSalesBehavior({ ...salesBehavior, followUpAggression: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Low">Low (Gentle reminders every few days)</option>
                      <option value="Medium">Medium (Pragmatic sequences on 1, 3, 7 days)</option>
                      <option value="High">High (Relentless active re-engagement sequences)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CUSTOMER OBJECTIONS & RULES TAB */}
            {activeTab === "objections" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-900/60">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-400" />
                    <span>Customer Psychology & Objection Handling Rules</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">Instruct the AI on addressing competitor objections, pricing hesitation, or urgent support concerns.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Language Preference</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={customerRules.languagePreference}
                      onChange={(e) => setCustomerRules({ ...customerRules, languagePreference: e.target.value })}
                      placeholder="e.g. English, Bilingual Spanish, German"
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Detection Sensitivity</label>
                    <select
                      disabled={readOnly}
                      value={customerRules.budgetDetectionSensitivity}
                      onChange={(e) => setCustomerRules({ ...customerRules, budgetDetectionSensitivity: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Low">Low (Ignore soft pricing objections, push standard value)</option>
                      <option value="Medium">Medium (Acknowledge budget limits, pivot gently)</option>
                      <option value="High">High (Propose discounts/credit terms immediately at any hint)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgency Detection Rules</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={customerRules.urgencyDetectionRules}
                    onChange={(e) => setCustomerRules({ ...customerRules, urgencyDetectionRules: e.target.value })}
                    placeholder="Identify key buzzwords like 'asap', 'at once', 'rush delivery' and escalate ticket..."
                    className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Objection Defusal Protocol</label>
                  <textarea
                    disabled={readOnly}
                    rows={3}
                    value={customerRules.objectionHandlingStyle}
                    onChange={(e) => setCustomerRules({ ...customerRules, objectionHandlingStyle: e.target.value })}
                    placeholder="If they suggest we are too expensive, deflect by showing ISO certified longevity and custom mold savings..."
                    className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px]"
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Special Response Formatting Rules</label>
                  <textarea
                    disabled={readOnly}
                    rows={2}
                    value={customerRules.responseStyleRules}
                    onChange={(e) => setCustomerRules({ ...customerRules, responseStyleRules: e.target.value })}
                    placeholder="Avoid talking in technical templates; give lists, emphasize compliant aluminum joints specs..."
                    className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px]"
                  ></textarea>
                </div>
              </div>
            )}

            {/* 5. FOLLOWUP & RESPONSE CONTROL TAB */}
            {activeTab === "followup" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-900/60">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Response Configuration & Followup Rules</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">Configure timing delay rules for automated messages, auto-reply states, and text limits.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1st Followup Trigger Delay</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={followUpRules.firstFollowUpDelay}
                      onChange={(e) => setFollowUpRules({ ...followUpRules, firstFollowUpDelay: e.target.value })}
                      placeholder="e.g. 1 day, 24 hours"
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2nd Followup Trigger Delay</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={followUpRules.secondFollowUpDelay}
                      onChange={(e) => setFollowUpRules({ ...followUpRules, secondFollowUpDelay: e.target.value })}
                      placeholder="e.g. 3 days"
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Final Warning Delay</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={followUpRules.finalFollowUpDelay}
                      onChange={(e) => setFollowUpRules({ ...followUpRules, finalFollowUpDelay: e.target.value })}
                      placeholder="e.g. 7 days"
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto Reply Mode</label>
                    <select
                      disabled={readOnly}
                      value={responseControl.autoReplyMode}
                      onChange={(e) => setResponseControl({ ...responseControl, autoReplyMode: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="AI Smart">AI Smart (Complete hands-free auto replying)</option>
                      <option value="Hybrid Assist">Hybrid Assist (Draft response, prompt sales rep to hit edit/send)</option>
                      <option value="Manual Draft">Manual Draft (Only suggest actions to rep, keep off chat flow)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Formality Level</label>
                    <select
                      disabled={readOnly}
                      value={responseControl.messageFormalityLevel}
                      onChange={(e) => setResponseControl({ ...responseControl, messageFormalityLevel: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Professional">Professional Formality</option>
                      <option value="Casual">Casual Conversational</option>
                      <option value="Empathetic">Highly Empathetic Support Style</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Response Length Target</label>
                    <select
                      disabled={readOnly}
                      value={responseControl.responseLengthPreference}
                      onChange={(e) => setResponseControl({ ...responseControl, responseLengthPreference: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Short">Short (1-2 sentences max, extremely concise)</option>
                      <option value="Medium">Medium (3-5 sentences, comprehensive but clean)</option>
                      <option value="Long">Long (Detailed instructions with lists and PDF offerings)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incorporate Emojis</label>
                    <select
                      disabled={readOnly}
                      value={responseControl.useEmojis}
                      onChange={(e) => setResponseControl({ ...responseControl, useEmojis: e.target.value })}
                      className="w-full bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white outline-none focus:border-indigo-600 disabled:opacity-60 h-[38px] cursor-pointer"
                    >
                      <option value="Yes">Yes (Friendly emojis to build user rapport)</option>
                      <option value="No">No (Fact-only, zero emojis policy)</option>
                      <option value="Minimal">Minimal (Max 1 per message where relevant)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto Close Rules</label>
                    <textarea
                      disabled={readOnly}
                      rows={2}
                      value={followUpRules.autoCloseRules}
                      onChange={(e) => setFollowUpRules({ ...followUpRules, autoCloseRules: e.target.value })}
                      placeholder="Close ticket and flag dead lead after 10 continuous silent days..."
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px]"
                    ></textarea>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Reengagement Strategy</label>
                    <textarea
                      disabled={readOnly}
                      rows={2}
                      value={followUpRules.leadReengagementRules}
                      onChange={(e) => setFollowUpRules({ ...followUpRules, leadReengagementRules: e.target.value })}
                      placeholder="Reach out on 14th day empty with a special 5% MOQ discount limit offer..."
                      className="w-full bg-[#020409] text-xs px-3 py-2 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-600 disabled:opacity-60 font-light resize-none text-[11px]"
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* 6. REALTIME AI SIMULATOR PLAYGROUND */}
            {activeTab === "testing" && (
              <div className="space-y-6">
                
                {/* Visual Testing form */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900/80 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-505 shrink-0" />
                    <span>AI Testing & Diagnostics Playground</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal font-light">Simulate how your AI brain rules compile! Type a message below mimicking what a real customer might ping. Click "Analyze" to see full diagnostics and scoring.</p>
                  
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="e.g. Hi, what is the price for 500 units of copper joints? Can we rush delivery?"
                      className="flex-1 bg-[#020409] text-xs px-3.5 py-2.5 rounded-lg border border-slate-900 text-white placeholder-slate-700 outline-none focus:border-indigo-605"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleRunSimulator())}
                    />
                    <button
                      type="button"
                      disabled={testRunning || !testMessage.trim()}
                      onClick={handleRunSimulator}
                      className="px-4.5 bg-indigo-605 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors py-2.5 flex items-center space-x-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {testRunning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run Audit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Simulation Output results panel */}
                {testResult && (
                  <div className="space-y-4 p-5 rounded-xl border border-indigo-950/40 bg-indigo-955/5 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2 space-y-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">AI Generated Response:</span>
                        <div className="p-4 bg-[#02050e] rounded-lg border border-indigo-950/40 text-xs text-white leading-relaxed font-light">
                          {testResult.aiResponse}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-950/40 rounded-lg border border-slate-900">
                          <span className="block text-[9px] uppercase font-semibold text-slate-500 mb-0.5">Recommended action line</span>
                          <span className="text-xs text-slate-200 leading-normal font-light">{testResult.recommendedAction}</span>
                        </div>
                        <div className="p-3.5 bg-slate-950/40 rounded-lg border border-slate-900">
                          <span className="block text-[9px] uppercase font-semibold text-slate-500 mb-0.5">Follow-up schedule</span>
                          <span className="text-xs text-slate-200 leading-normal font-light">{testResult.followUpSuggestion}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4.5 bg-[#02040b]/60 p-4 rounded-lg border border-indigo-950/10 self-start md:col-span-1">
                      <div className="space-y-1">
                        <span className="block text-[9px] uppercase font-semibold text-slate-500">Predicted interest score</span>
                        <div className="flex items-center space-x-2.5">
                          <span className="text-lg font-bold font-mono text-white">{testResult.leadScore}%</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getScoreColor(testResult.leadScore)}`}>
                            {testResult.leadScore >= 80 ? "Hot Prospect" : testResult.leadScore >= 45 ? "Warm lead" : "Cold status"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[9px] uppercase font-semibold text-slate-500">Intent analysis classification</span>
                        <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-3.5 py-0.5 rounded-full border ${getIntentStyle(testResult.intent)}`}>
                          {testResult.intent}
                        </span>
                      </div>

                      <div className="pt-2 text-[9px] font-mono text-slate-500 border-t border-slate-900 leading-tight">
                        Diagnostics engine used: {testResult.usedGemini ? "Gemini-3.5-Flash (Active)" : "Simulated Local Heuristics Mock"}
                      </div>
                    </div>

                    {/* LIVE VIEWING OF AUTO COMPILED SYSTEM PROMPTS */}
                    <div className="md:col-span-3 pt-4 border-t border-slate-900 space-y-3">
                      <span className="block text-[10px] font-bold uppercase text-indigo-400 tracking-wider flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Live Brain Auto-Compiled System Prompts Matrix</span>
                      </span>
                      <p className="text-[10px] text-slate-500 leading-snug">This is the background representation of how LeadSmart AI compiles structured variables into specific system/context injection instructions for the LLM brain.</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-[10px] font-mono text-slate-400">
                        <div className="p-3 bg-slate-950/80 rounded border border-slate-900 col-span-1 space-y-1">
                          <span className="block font-bold text-indigo-400 text-[11px] mb-1">System Prompt Context</span>
                          <p className="whitespace-pre-wrap leading-normal h-32 overflow-y-auto pr-1">
                            {testResult.prompts.systemPrompt}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-950/80 rounded border border-slate-900 col-span-1 space-y-1">
                          <span className="block font-bold text-indigo-400 text-[11px] mb-1">Knowledge Bound Context</span>
                          <p className="whitespace-pre-wrap leading-normal h-32 overflow-y-auto pr-1">
                            {testResult.prompts.contextPrompt}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-950/80 rounded border border-slate-900 col-span-1 space-y-1">
                          <span className="block font-bold text-indigo-400 text-[11px] mb-1">Business Boundaries Context</span>
                          <p className="whitespace-pre-wrap leading-normal h-32 overflow-y-auto pr-1">
                            {testResult.prompts.businessContextInjection}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historic Diagnostics list */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 pb-2 border-b border-slate-900/60">
                    <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Audit Simulation Test History Logs</span>
                  </h4>
                  
                  {logsLoading ? (
                    <div className="text-center py-6 text-xs text-slate-600">Loading audit test-lists history...</div>
                  ) : testLogs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-600 bg-slate-950/15 rounded-lg border border-dashed border-slate-900/60 font-light">
                      No records logged. Execute a run above.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {testLogs.map((log) => (
                        <div key={log.id} className="p-3.5 bg-slate-950/20 border border-slate-900 rounded-lg text-xs leading-relaxed space-y-2 font-light">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span>Test Case Run &bull; {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: "numeric", minute: "numeric" })}</span>
                            <span className={`px-2 py-0.5 rounded border uppercase text-[9px] font-bold ${getIntentStyle(log.intent)}`}>
                              Score: {log.leadScore}% &bull; {log.intent}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-450 mr-1.5">Input:</span>
                            <span className="text-slate-300 font-mono text-[11px]">"{log.inputMessage}"</span>
                          </div>
                          <div className="pt-2 border-t border-slate-905 flex items-start space-x-2">
                            <span className="font-bold text-indigo-400 text-[10px] shrink-0 mt-0.5 uppercase tracking-wide">Reply Spec:</span>
                            <p className="text-slate-400 text-xs leading-relaxed">{log.aiResponse}</p>
                          </div>
                          <div className="text-[10px] text-slate-500 bg-slate-950/60 px-2 py-1 rounded border border-slate-900 shrink-0">
                            <span className="font-semibold text-slate-450 mr-1">Recommended Action Path:</span> {log.recommendedAction}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form actions save trigger (Enabled only for admin and other edit tabs) */}
            {activeTab !== "testing" && !readOnly && (
              <div className="p-4 bg-slate-950/60 border-t border-slate-900 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving intelligence details...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Compile & Save Config</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
