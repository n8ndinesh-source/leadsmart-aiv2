import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Lead } from "../types";
import { 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  DollarSign, 
  ChevronRight, 
  ShieldAlert, 
  Flame, 
  Clock, 
  Activity, 
  Copy, 
  Check, 
  HelpCircle,
  Eye
} from "lucide-react";

interface AILead extends Lead {
  leadScore: number;
  intent: string;
  conversionProbability: string;
  nextBestAction: string;
  suggestedReply: string;
  revenueImpact: string;
  riskIndicator?: boolean;
}

interface InsightsData {
  topHotLeads: AILead[];
  leadsNeedingAction: AILead[];
  leadsAtRisk: AILead[];
  revenueOpportunities: AILead[];
  summaryStats: {
    totalAnalyzed: number;
    hotCount: number;
    warmCount: number;
    coldCount: number;
  };
}

export default function AiInsightsDashboard() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"hot" | "action" | "risk" | "revenue">("hot");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await api.get<InsightsData>("/ai-insights");
      setData(response || null);
    } catch (err: any) {
      console.error("Failed to load AI Insights:", err);
      setErrorMsg("Failed to connect to the AI Decision Engine gateway. Please verify that the server is online.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async (leadId: string) => {
    setIsProcessing(leadId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await api.post<any>(`/leads/${leadId}/analyze`, {});
      if (response && response.success) {
        setSuccessMsg("AI Decision engine recalculated score & recommended next action successfully.");
        // Reload dashboard
        await fetchInsights();
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err: any) {
      console.error("AI recalculation trigger failed:", err);
      setErrorMsg("Failed to complete real-time analysis request.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCopySuggested = (leadId: string, reply: string) => {
    navigator.clipboard.writeText(reply);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
        <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">Evaluating lead metrics & loading AI Sales Manager...</p>
      </div>
    );
  }

  const stats = data?.summaryStats || { totalAnalyzed: 0, hotCount: 0, warmCount: 0, coldCount: 0 };
  const currentLeadsList = 
    activeSubTab === "hot" ? data?.topHotLeads :
    activeSubTab === "action" ? data?.leadsNeedingAction :
    activeSubTab === "risk" ? data?.leadsAtRisk :
    data?.revenueOpportunities;

  const getScoreBadgeColor = (score: number) => {
    if (score >= 71) return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    if (score >= 31) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    return "bg-slate-800 text-slate-400 border border-slate-700";
  };

  const getIntentBadgeStyle = (intent: string) => {
    switch (intent) {
      case "Buying Intent":
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40";
      case "Price Comparison":
        return "bg-blue-950/40 text-blue-400 border border-blue-900/40";
      case "Inquiry Only":
        return "bg-indigo-950/40 text-indigo-400 border border-indigo-900/40";
      case "Support Request":
        return "bg-purple-950/40 text-purple-400 border border-purple-900/40";
      default:
        return "bg-rose-955/35 text-rose-400 border border-rose-900/30";
    }
  };

  const getConversionProbColor = (prob: string) => {
    if (prob === "High") return "text-emerald-400";
    if (prob === "Medium") return "text-amber-400";
    return "text-rose-450";
  };

  return (
    <div id="ai-insights-dashboard-root" className="space-y-6">
      
      {/* 🧠 Core Header Message */}
      <div className="bg-gradient-to-r from-indigo-950/20 to-slate-950 border border-indigo-950/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display shrink-0">Autonomous Sales Manager Brain</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            LeadSmart AI Decision Engine dynamically scores every business lead. It reads conversational sentiment, evaluates follow-up aggression rules, outputs response strategies, and tells you exactly how to close sales on WhatsApp.
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="px-4 py-2 bg-slate-950 border border-slate-801 text-xs font-semibold text-slate-300 hover:text-white rounded-xl flex items-center space-x-2 hover:bg-[#090e1c] z-10 cursor-pointer shrink-0 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh analysis</span>
        </button>

        {/* Decorative background grid vector shadow */}
        <div className="absolute right-0 top-0 translate-x-5 -translate-y-5 opacity-5">
          <Bot className="w-48 h-48 text-indigo-505" />
        </div>
      </div>

      {/* Global alert prompts */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-955/20 border border-rose-900/35 text-rose-400 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#0b0f19] border border-slate-900 p-4 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold tracking-wider font-display uppercase text-slate-400">Total Analyzed API</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-2xl font-bold font-display text-white">{stats.totalAnalyzed}</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Leads audited by CRM</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-900 p-4 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold tracking-wider font-display uppercase text-rose-400">Hot Forecast</span>
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div>
            <span className="text-2xl font-bold font-display text-rose-400">{stats.hotCount} Leads</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Score 71–100 (High Conversion)</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-900 p-4 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold tracking-wider font-display uppercase text-amber-400">Warm Forecast</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-bold font-display text-amber-400">{stats.warmCount} Leads</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Score 31–70 (Nurture Opportunity)</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-900 p-4 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold tracking-wider font-display uppercase text-slate-400">Cold Baseline</span>
            <HelpCircle className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <span className="text-2xl font-bold font-display text-slate-400">{stats.coldCount} Leads</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Score 0–30 (Low priority)</span>
          </div>
        </div>

      </div>

      {/* DASHBOARD SECTIONS SUBMENU TABS */}
      <div className="border-b border-slate-900 flex space-x-4 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab("hot")}
          className={`pb-3 text-xs font-bold font-display tracking-wider uppercase transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "hot" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Top Hot Leads ({data?.topHotLeads.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab("action")}
          className={`pb-3 text-xs font-bold font-display tracking-wider uppercase transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "action" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Needing Immediate Action ({data?.leadsNeedingAction.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab("risk")}
          className={`pb-3 text-xs font-bold font-display tracking-wider uppercase transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "risk" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Leads At Risk ({data?.leadsAtRisk.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab("revenue")}
          className={`pb-3 text-xs font-bold font-display tracking-wider uppercase transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "revenue" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Revenue Opportunities ({data?.revenueOpportunities.length || 0})
        </button>
      </div>

      {/* CURRENT TAB CARD STREAM */}
      <div className="space-y-4">
        {!currentLeadsList || currentLeadsList.length === 0 ? (
          <div className="bg-[#0b0f19] border border-slate-900 p-12 text-center rounded-xl space-y-3">
            <div className="w-10 h-10 bg-slate-950 border border-slate-900 text-slate-500 rounded-full flex items-center justify-center mx-auto">
              {activeSubTab === "risk" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Bot className="w-5 h-5" />}
            </div>
            <h3 className="font-semibold text-slate-300 text-sm">
              {activeSubTab === "risk" ? "Workspace Risk is Zero" : "Insights Queue Is Empty"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {activeSubTab === "risk" 
                ? "Excellent! No priority leads in your CRM fit spam-risk or inactive hot classifications right now."
                : "No business leads match this AI Decision category yet. Make sure your WhatsApp integrations or CRM profiles has incoming client chat logs!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentLeadsList.map((lead) => {
              const scoreType = lead.leadScore >= 71 ? "Hot" : (lead.leadScore >= 31 ? "Warm" : "Cold");

              return (
                <div 
                  key={lead.id} 
                  className={`bg-[#0b0f19] border rounded-xl p-5 hover:border-slate-801 transition-all space-y-4 relative ${
                    lead.riskIndicator 
                      ? "border-rose-955/20 bg-rose-955/5" 
                      : "border-slate-900"
                  }`}
                >
                  
                  {/* Lead Info Line */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-950 pb-4">
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm font-display">{lead.name}</span>
                        <span className="text-[10px] text-slate-500">({lead.phoneNumber})</span>
                        <span className="text-[9px] text-slate-450 bg-slate-950 border border-slate-910 px-2 py-0.5 rounded uppercase">
                          {lead.source}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-[10px] text-slate-450 font-mono">
                        <span>Stage: <strong>{lead.status}</strong></span>
                        <span className="h-2 w-px bg-slate-900" />
                        <span>Aggression Priority: <strong className="text-slate-300">{lead.priority}</strong></span>
                        {lead.lastMessageAt && (
                          <>
                            <span className="h-2 w-px bg-slate-900" />
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 text-slate-500 mr-1" />
                              Last touchpoint: {new Date(lead.lastMessageAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      
                      {/* AI Decision Score badge */}
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">AI Leads Core</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className={`text-sm font-bold px-2.5 py-0.5 rounded font-display ${getScoreBadgeColor(lead.leadScore)}`}>
                            {lead.leadScore} / 100
                          </span>
                          <span className="text-xs text-slate-400 font-medium font-display">({scoreType})</span>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* AI Prediction & Decison Matrix blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    <div className="bg-[#02050a] p-3 rounded-lg border border-slate-950 space-y-1">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase">Customer Intent</span>
                      <span className={`inline-block text-[11px] px-2 py-0.5 rounded font-semibold ${getIntentBadgeStyle(lead.intent)}`}>
                        {lead.intent}
                      </span>
                    </div>

                    <div className="bg-[#02050a] p-3 rounded-lg border border-slate-950 space-y-1">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase">Conversion Probability</span>
                      <span className={`text-xs font-bold font-display ${getConversionProbColor(lead.conversionProbability)}`}>
                        {lead.conversionProbability} Probability
                      </span>
                    </div>

                    <div className="bg-[#02050a] p-3 rounded-lg border border-slate-950 space-y-1 col-span-2">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase flex items-center">
                        <span>Next Best Action (Sales advice)</span>
                      </span>
                      <p className="text-xs text-white font-semibold flex items-center space-x-1.5">
                        <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>"{lead.nextBestAction}"</span>
                      </p>
                    </div>

                  </div>

                  {/* 🚨 Dynamic Live Risk Warnings Banner if applicable */}
                  {lead.riskIndicator && (
                    <div className="bg-rose-955/10 border border-rose-955/25 p-3 rounded-xl flex items-center space-x-2 text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="text-[11px]">
                        <strong>Risk Signal:</strong> Inactivity detected for Hot/Warm lead beyond 24h or excessive un-answered automated follow-ups ({lead.followUpCount} messages sent). Personal contact is highly suggested to restore engagement.
                      </span>
                    </div>
                  )}

                  {/* Suggested response box */}
                  <div className="bg-[#02050a] border border-slate-950 p-4 rounded-xl space-y-2 relative">
                    <span className="text-[9px] tracking-wider text-slate-500 font-bold uppercase block flex items-center space-x-1">
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Suggested WhatsApp Reply Text</span>
                    </span>
                    <p className="text-xs text-slate-300 italic leading-relaxed pr-8">
                      "{lead.suggestedReply}"
                    </p>
                    
                    <div className="absolute right-3.5 bottom-3 flex items-center space-x-1">
                      <button
                        onClick={() => handleCopySuggested(lead.id, lead.suggestedReply)}
                        title="Copy Suggested Reply to Clipboard"
                        className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                      >
                        {copiedId === lead.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Execution footer actions block */}
                  <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                    <span className="text-[10px] font-mono whitespace-nowrap italic">
                      Revenue impact level: <strong className="text-slate-400 font-semibold">{lead.revenueImpact} Opportunity</strong>
                    </span>

                    <div className="flex items-center space-x-2.5">
                      <button
                        disabled={isProcessing === lead.id}
                        onClick={() => handleRecalculate(lead.id)}
                        className="px-3.5 py-1.5 bg-[#02050a] border border-slate-900 text-slate-400 hover:text-white rounded-lg flex items-center space-x-1.5 transition-all text-xs font-semibold cursor-pointer disabled:opacity-40"
                      >
                        {isProcessing === lead.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                        )}
                        <span>Recalculate AI analysis</span>
                      </button>

                      <a
                        href={`/client?leadId=${lead.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopySuggested(lead.id, lead.suggestedReply);
                          alert(`Suggested reply copied to clipboard! Navigate to "Leads Console" to send to ${lead.name} on WhatsApp.`);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-1 transition-all text-xs font-bold font-display cursor-pointer"
                        title="Open lead details in CRM Leads Console and copy text"
                      >
                        <span>Send Suggested Reply</span>
                        <Send className="w-3 h-3 inline-block shrink-0" />
                      </a>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
