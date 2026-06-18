import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { FollowUp, Lead } from "../types";
import { useTheme } from "../context/ThemeContext";
import { 
  Calendar, 
  Clock, 
  Filter, 
  Check, 
  X, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  User, 
  Phone, 
  ArrowRight,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Plus
} from "lucide-react";

export default function FollowUpConsole() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dueStats, setDueStats] = useState<any>({
    dueToday: [],
    overdue: [],
    sentFollowups: [],
    repliedLeadsCount: 0,
    missedOpportunities: [],
    missedOpportunitiesCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  // View toggler: "list" | "calendar"
  const [currentView, setCurrentView] = useState<"list" | "calendar">("list");
  // Select specific offset date for calendar view filtering (default: today)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Manual Trigger FollowUp Form Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [followUpType, setFollowUpType] = useState("Soft");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    loadFollowUpDataset();
  }, [selectedDateFilter]);

  const loadFollowUpDataset = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const followUpList = await api.get<FollowUp[]>("/followups");
      setFollowups(followUpList || []);

      const statsBundle = await api.get<any>("/followups/due");
      setDueStats(statsBundle || {
        dueToday: [],
        overdue: [],
        sentFollowups: [],
        repliedLeadsCount: 0,
        missedOpportunities: [],
        missedOpportunitiesCount: 0
      });

      const leadsList = await api.get<Lead[]>("/leads");
      setLeads(leadsList || []);
    } catch (err: any) {
      console.error("Failed to load follow-up console streams:", err);
      setErrorMessage("Could not load dynamic follow-up registers. Please verify API availability.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI FollowUp message via API logic
  const handleAiMessageGenerate = async () => {
    if (!selectedLeadId) {
      setErrorMessage("Please select a target Lead first to fine-tune context.");
      return;
    }
    setIsGeneratingAi(true);
    setErrorMessage("");
    try {
      const targetLead = leads.find(l => l.id === selectedLeadId);
      if (!targetLead) return;

      // Request a mock/light AI-assisted response based on simulated AI config
      // We will generate client-side or check template dynamically, fallback to beautiful templates
      const response = await api.get<any>(`/ai-config/${targetLead.clientId}`);
      
      let bizName = targetLead.source;
      let tone = "warm and inviting";
      if (response && response.businessProfile) {
        try {
          const bp = JSON.parse(response.businessProfile);
          bizName = bp.companyName || bizName;
          const sb = JSON.parse(response.salesBehavior || "{}");
          tone = sb.tone || tone;
        } catch (e) {}
      }

      let generated = "";
      if (followUpType === "Soft") {
        generated = `Hello ${targetLead.name}, I want to make sure you received our details. Let us know if you need anything from ${bizName || "our team"}!`;
      } else if (followUpType === "Medium" || followUpType === "Hard") {
        generated = `Hello ${targetLead.name}, this is a gentle reminder that we have limited spots remaining for our special offers in ${bizName || "our division"}. Can we lock this in for you?`;
      } else {
        generated = `Dear ${targetLead.name}, this is our final contact attempt regarding your inquiry. Please reach back to us if we can assist you with ${bizName || "our services"} in the future!`;
      }

      setCustomMessage(generated);
      setSuccessMessage("AI Suggestion updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e) {
      setErrorMessage("Could not parse AI config context.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Dispatch manual follow up
  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !customMessage.trim()) {
      setErrorMessage("Both Lead target and Message content are required parameters.");
      return;
    }

    setIsActionRunning(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await api.post<any>("/followup/send", {
        leadId: selectedLeadId,
        message: customMessage,
        followUpType
      });

      if (result && result.success) {
        setSuccessMessage("WhatsApp Follow-Up message dispatched successfully!");
        setCustomMessage("");
        setSelectedLeadId("");
        setIsModalOpen(false);
        loadFollowUpDataset();
      } else {
        setErrorMessage("Delivery finished with warning check. Real WhatsApp number may be suspended or missing.");
      }
    } catch (err: any) {
      console.error("Manual followup dispatch fault:", err);
      setErrorMessage("API gateway error occurred while dispatching message outbound.");
    } finally {
      setIsActionRunning(false);
    }
  };

  // Update status (e.g. Cancelled / Completed / Sent)
  const handleUpdateStatus = async (followupId: string, status: string) => {
    setIsActionRunning(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.put<any>("/followup/update-status", {
        id: followupId,
        status
      });
      setSuccessMessage(`Follow-up state successfully marked as "${status}".`);
      loadFollowUpDataset();
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err: any) {
      console.error("Update status error:", err);
      setErrorMessage("Failed to update schedule status.");
    } finally {
      setIsActionRunning(false);
    }
  };

  // Generate date list for Calendar Grid/Header (e.g. next 7 days starting from today)
  const getNextSevenDays = () => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    for (let i = -2; i < 5; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dateString = d.toISOString().split("T")[0];
      days.push({
        dateString,
        dayOfMonth: d.getDate(),
        dayOfWeek: weekdays[d.getDay()],
        isToday: d.toDateString() === now.toDateString(),
        isPast: d.getTime() < now.getTime() - 24 * 60 * 60 * 1000 && d.toDateString() !== now.toDateString()
      });
    }
    return days;
  };

  const datesToNavigate = getNextSevenDays();

  // Filter application helper logic
  const filteredFollowUps = followups.filter(f => {
    const lead = f.lead || { name: "", phoneNumber: "", priority: "" };
    
    // Search Term match
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.phoneNumber.includes(searchTerm) ||
      f.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status Filter match
    const matchesStatus = statusFilter === "ALL" || f.status.toUpperCase() === statusFilter.toUpperCase();

    // Type Filter match
    const matchesType = typeFilter === "ALL" || f.followUpType.toUpperCase() === typeFilter.toUpperCase();

    // Priority Match
    const matchesPriority = priorityFilter === "ALL" || lead.priority?.toUpperCase() === priorityFilter.toUpperCase();

    // Date Filter match
    let matchesDate = true;
    if (selectedDateFilter) {
      const scheduledDateStr = new Date(f.scheduledAt).toISOString().split("T")[0];
      matchesDate = scheduledDateStr === selectedDateFilter;
    }

    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesDate;
  });

  const getPriorityLabelColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "HOT":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "WARM":
        return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case "SOFT":
        return "bg-indigo-950/45 text-indigo-400 border border-indigo-900/40";
      case "MEDIUM":
      case "STRONG":
      case "HARD":
        return "bg-purple-950/45 text-purple-400 border border-purple-900/40";
      case "FINAL":
        return "bg-amber-950/40 text-amber-400 border border-amber-900/35";
      default:
        return "bg-slate-900 text-slate-400 border border-slate-800";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SENT":
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40";
      case "PENDING":
        return "bg-blue-950/40 text-blue-400 border border-blue-900/40";
      case "MISSED":
        return "bg-rose-950/40 text-rose-450 border border-rose-900/40";
      case "FAILED":
        return "bg-yellow-950/40 text-yellow-501 border border-yellow-905/40";
      default:
        return "bg-slate-900 text-slate-400 border border-slate-800";
    }
  };

  return (
    <div id="follow-up-console-root" className="space-y-6">
      
      {/* ⚠️ Potential Revenue Loss Alert Header */}
      {dueStats.missedOpportunitiesCount > 0 && (
        <div id="revenue-loss-alarm" className="p-4 bg-rose-955/20 border border-rose-900/40 rounded-xl text-rose-300 flex items-start justify-between gap-4 animate-pulse">
          <div className="flex gap-3">
            <div className="p-2 bg-rose-900/40 rounded-lg text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-400 text-sm tracking-tight">⚠️ Potential Revenue Loss Detected</h3>
              <p className="text-xs text-rose-350/90 mt-1">
                There are <strong>{dueStats.missedOpportunitiesCount} hot/warm leads</strong> that haven't responded to inquiries or have overdue follow-up alerts that are exceeding 24 hours. Connect immediately to restore client conversions!
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setPriorityFilter("HOT");
              setStatusFilter("PENDING");
              setSuccessMessage("Filtered console to show hot pending risks.");
              setTimeout(() => setSuccessMessage(""), 3500);
            }}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-xs font-semibold rounded-lg text-white transition-all shrink-0 cursor-pointer border border-rose-800/45"
          >
            Review Unresolved Risks
          </button>
        </div>
      )}

      {/* Overview stats layout */}
      <div id="followup-metrics-grid" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className={`p-4 rounded-xl flex flex-col justify-between space-y-2 relative overflow-hidden ${
          isLight 
            ? "bg-[#F7F7FF] border border-slate-300 text-slate-800" 
            : "bg-[#0b0f19] border border-slate-900 text-white"
        }`}>
          <div className="flex justify-between items-center text-slate-500">
            <span className={`text-[10px] font-semibold tracking-wider font-display uppercase ${isLight ? "text-slate-650" : ""}`}>Due Today</span>
            <div className={`p-1 rounded-md ${isLight ? "bg-blue-100 text-blue-700" : "bg-blue-950/40 text-blue-400"}`}>
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-bold font-display ${isLight ? "text-blue-700" : "text-white"}`}>{dueStats.dueToday?.length || 0}</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Urgent touchpoints</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5">
            <Clock className="w-24 h-24 text-indigo-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl flex flex-col justify-between space-y-2 relative overflow-hidden ${
          isLight 
            ? "bg-[#F7F7FF] border border-slate-300 text-slate-800" 
            : "bg-[#0b0f19] border border-slate-900 text-white"
        }`}>
          <div className="flex justify-between items-center text-slate-500">
            <span className={`text-[10px] font-semibold tracking-wider font-display uppercase ${isLight ? "text-slate-650" : ""}`}>Overdue reminders</span>
            <div className={`p-1 rounded-md ${isLight ? "bg-rose-100 text-rose-700" : "bg-rose-955/30 text-rose-400"}`}>
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-bold font-display ${isLight ? "text-rose-700" : "text-rose-400"}`}>{dueStats.overdue?.length || 0}</span>
            <span className="block text-[10px] text-slate-505 italic mt-0.5">Require immediate attention</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5">
            <AlertCircle className="w-24 h-24 text-rose-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl flex flex-col justify-between space-y-2 relative overflow-hidden ${
          isLight 
            ? "bg-[#F7F7FF] border border-slate-300 text-slate-800" 
            : "bg-[#0b0f19] border border-slate-900 text-white"
        }`}>
          <div className="flex justify-between items-center text-slate-500">
            <span className={`text-[10px] font-semibold tracking-wider font-display uppercase ${isLight ? "text-slate-650" : ""}`}>Replied leads</span>
            <div className={`p-1 rounded-md ${isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-950/40 text-emerald-400"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-bold font-display ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>{dueStats.repliedLeadsCount || 0}</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Engaged & recovered</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-10">
            <CheckCircle2 className="w-24 h-24 text-emerald-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl flex flex-col justify-between space-y-2 relative overflow-hidden ${
          isLight 
            ? "bg-[#F7F7FF] border border-slate-300 text-slate-800" 
            : "bg-[#0b0f19] border border-slate-900 text-white"
        }`}>
          <div className="flex justify-between items-center text-slate-500">
            <span className={`text-[10px] font-semibold tracking-wider font-display uppercase ${isLight ? "text-slate-650" : ""}`}>Sent Messages</span>
            <div className={`p-1 rounded-md ${isLight ? "bg-purple-100 text-purple-700" : "bg-[#1a0f30] text-purple-400"}`}>
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-bold font-display ${isLight ? "text-purple-700" : "text-white"}`}>{dueStats.sentFollowups?.length || 0}</span>
            <span className="block text-[10px] text-slate-500 italic mt-0.5">Dispatched automatically</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5">
            <Send className="w-24 h-24 text-purple-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl flex flex-col justify-between space-y-2 relative overflow-hidden col-span-2 md:col-span-1 ${
          isLight 
            ? "bg-[#F7F7FF] border border-rose-300 text-rose-900" 
            : "bg-rose-955/10 border border-rose-955/20 text-white"
        }`}>
          <div className="flex justify-between items-center text-slate-500">
            <span className={`text-[10px] font-semibold tracking-wider font-display uppercase ${isLight ? "text-rose-700" : "text-rose-400"}`}>Escaped Value</span>
            <div className={`p-1 rounded-md ${isLight ? "bg-rose-100 text-rose-700" : "bg-rose-900/30 text-rose-400"}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-bold font-display ${isLight ? "text-rose-700" : "text-rose-350"}`}>
              {dueStats.missedOpportunities?.length || 0} Leads
            </span>
            <span className={`block text-[9px] italic mt-0.5 ${isLight ? "text-rose-600" : "text-rose-400"}`}>At Risk of Slippage</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5">
            <TrendingUp className="w-24 h-24 text-rose-500" />
          </div>
        </div>

      </div>

      {/* Global Alerts Banner feedback */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-955/20 border border-rose-900/35 text-rose-400 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FILTER CONTROL BAR & LAYOUT SWITCHER */}
      <div className="bg-[#0b0f19] border border-slate-900 p-4 rounded-xl space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-900 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by Lead Name, Phone, or Message draft..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 w-full"
            />
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* View selectors */}
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-900 flex space-x-1 shrink-0">
              <button 
                onClick={() => setCurrentView("list")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${currentView === "list" ? "bg-slate-900 text-indigo-400 font-bold border border-indigo-950/40" : "text-slate-450 hover:text-white"}`}
              >
                List View
              </button>
              <button 
                onClick={() => setCurrentView("calendar")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${currentView === "calendar" ? "bg-slate-900 text-indigo-400 font-bold border border-indigo-950/40" : "text-slate-450 hover:text-white"}`}
              >
                Calendar View
              </button>
            </div>

            {/* Launch manual FollowUp trigger wizard */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/30 rounded-lg text-xs font-bold text-white transition-all flex items-center space-x-1.5 cursor-pointer shadow-indigo-950/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Follow-up</span>
            </button>
          </div>

        </div>

        {/* Detailed filters panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-900">
          
          <div>
            <label className="block text-[10px] font-semibold text-slate-550 font-display uppercase mb-1">Inactivity Message Type</label>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none hover:border-slate-801"
            >
              <option value="ALL">All Rule Categories</option>
              <option value="SOFT">Soft Follow-up</option>
              <option value="MEDIUM">Medium / Strong Follow-up</option>
              <option value="FINAL">Final Touchpoint</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-550 font-display uppercase mb-1">Lead Priority</label>
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none hover:border-slate-801"
            >
              <option value="ALL">All Priorities</option>
              <option value="HOT">Hot Leads</option>
              <option value="WARM">Warm Leads</option>
              <option value="COLD">Cold Leads</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-550 font-display uppercase mb-1">Execution Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none hover:border-slate-801"
            >
              <option value="ALL">All Execution States</option>
              <option value="PENDING">Pending (Scheduled)</option>
              <option value="SENT">Sent Successfully</option>
              <option value="MISSED">Missed Opportunities</option>
              <option value="FAILED">Failed Connections</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-550 font-display uppercase mb-1">Target Date</label>
            <div className="flex items-center space-x-2">
              <input 
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 px-3 py-1 py-1.5 rounded-lg text-xs text-slate-300 outline-none hover:border-slate-801"
              />
              {selectedDateFilter && (
                <button 
                  onClick={() => setSelectedDateFilter("")}
                  className="px-2 py-1.5 bg-slate-900 border border-slate-900 hover:border-slate-801 text-[10px] font-bold text-slate-400 rounded-lg cursor-pointer hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>

        {/* CALENDAR DATE HEADER SLIDER (Enabled if Calendar view) */}
        {currentView === "calendar" && (
          <div className="pt-4 border-t border-slate-900 space-y-2">
            <span className="block text-[10px] font-semibold text-slate-500 font-display uppercase">Interactive Scheduled timeline (Choose Day)</span>
            <div className="grid grid-cols-7 gap-2">
              {datesToNavigate.map((day) => {
                const isActive = selectedDateFilter === day.dateString;
                // Calculate count of follow-ups on this day
                const dayCount = followups.filter(
                  f => new Date(f.scheduledAt).toISOString().split("T")[0] === day.dateString
                ).length;

                return (
                  <button
                    key={day.dateString}
                    onClick={() => {
                      setSelectedDateFilter(isActive ? "" : day.dateString);
                    }}
                    onMouseEnter={() => setHoveredDate(day.dateString)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={`p-2.5 rounded-xl border transition-all text-center relative cursor-pointer ${
                      isActive 
                        ? "bg-indigo-650/15 border-indigo-505 text-white shadow-md"
                        : day.isToday 
                        ? "bg-[#0b1024] border-indigo-950/80 text-indigo-400"
                        : "bg-slate-950/40 border-slate-900 text-slate-450 hover:bg-[#060a14] hover:border-slate-801"
                    }`}
                  >
                    <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-medium">{day.dayOfWeek}</span>
                    <span className="block text-sm font-bold font-display mt-0.5">{day.dayOfMonth}</span>
                    {day.isToday && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    )}
                    {dayCount > 0 && (
                      <span className="block text-[9px] mt-1 font-bold text-slate-350 bg-slate-900 px-1.5 py-0.5 rounded-md inline-block">
                        {dayCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ACTION LOADING STATE */}
      {isLoading ? (
        <div className="col-span-12 py-16 text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-600/70 mx-auto" />
          <p className="text-xs text-slate-500 italic">Syncing CRM databases and active follow-up schedules...</p>
        </div>
      ) : (
        /* CORE LIST DISPLAY PANEL */
        <div className="space-y-4">
          
          {filteredFollowUps.length === 0 ? (
            <div className="bg-[#0b0f19] border border-slate-900 text-center py-16 rounded-xl space-y-3">
              <div className="w-12 h-12 bg-slate-950 border border-slate-900 rounded-full flex items-center justify-center text-slate-650 mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-300 text-sm">No follow-ups matches configuration</h3>
              <p className="text-xs text-slate-505 max-w-sm mx-auto">
                No active follow-ups were found matching selected status, priorities, or dates in this workspace. Try adjusting filters or select another timeline.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredFollowUps.map((f) => {
                const leadObj = f.lead || { name: "Prospect Name", phoneNumber: "WhatsApp ID", priority: "Warm", status: "Inquiry" };
                const scheduledDate = new Date(f.scheduledAt);
                const isOverdueItem = f.status === "Pending" && scheduledDate < new Date();

                return (
                  <div 
                    key={f.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isOverdueItem 
                        ? "bg-[#180a0a]/30 border-rose-955/20 hover:border-rose-900/60" 
                        : "bg-[#0b0f19] border-slate-900 hover:border-indigo-950/80"
                    }`}
                  >
                    
                    {/* Column 1: Lead Context details */}
                    <div className="space-y-2 max-w-md">
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm font-display">{leadObj.name}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${getPriorityLabelColor(leadObj.priority)}`}>
                          {leadObj.priority}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-900">
                          {leadObj.status}
                        </span>
                        {isOverdueItem && (
                          <span className="text-[9px] bg-rose-500/10 text-rose-452 px-2 py-0.5 rounded border border-rose-500/30 animate-pulse font-bold">
                            OVERDUE ACTION
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-450 font-mono">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-550" />
                          <span>{leadObj.phoneNumber}</span>
                        </span>
                        <span className="h-2 w-px bg-slate-900" />
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-550" />
                          <span>Sched: {scheduledDate.toLocaleString()}</span>
                        </span>
                      </div>

                      {/* Msg Content block */}
                      <div className="bg-[#02050a] p-3 rounded-lg border border-slate-950 text-xs text-slate-350 italic pr-6 relative max-w-lg mt-2">
                        <MessageSquare className="w-3 h-3 text-slate-650 absolute right-3 top-3" />
                        "{f.message}"
                      </div>

                    </div>

                    {/* Column 2: FollowUp Metadata Badge */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      
                      <div className="flex flex-col items-end space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold font-display uppercase tracking-wider ${getTypeBadgeColor(f.followUpType)}`}>
                            {f.followUpType}
                          </span>
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-wider ${getStatusBadgeStyle(f.status)}`}>
                            {f.status}
                          </span>
                        </div>
                        {f.sentAt && (
                          <span className="text-[9px] text-slate-500 italic block">Sent: {new Date(f.sentAt).toLocaleTimeString()}</span>
                        )}
                      </div>

                      {/* Column 3: Quick CTA actions */}
                      <div className="h-8 w-px bg-slate-900 mx-1 hidden md:block" />

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {f.status === "Pending" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedLeadId(f.leadId);
                                setCustomMessage(f.message);
                                setFollowUpType(f.followUpType);
                                setIsModalOpen(true);
                              }}
                              title="Send Follow-up Message immediately"
                              className="p-2 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-400 hover:text-white rounded-lg border border-indigo-900/30 cursor-pointer transition-all shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(f.id, "Sent")}
                              title="Mark as Manually Completed"
                              className="p-2 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-450 hover:text-white rounded-lg border border-emerald-920/30 cursor-pointer transition-all shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(f.id, "Missed")}
                              title="Cancel / Silence Follow-up"
                              className="p-2 bg-rose-955/20 hover:bg-[#250d0d] text-rose-451 hover:text-rose-300 rounded-lg border border-rose-950/30 cursor-pointer transition-all shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {f.status !== "Pending" && (
                          <span className="text-[10px] italic text-slate-550 block select-none mr-2">No active actions</span>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          FOLLOW-UP WIZARD MODAL 
         ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-900 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setSelectedLeadId("");
                setCustomMessage("");
              }}
              className="absolute right-4 top-4 text-slate-500 hover:text-white p-1 hover:bg-slate-950 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-900 mb-4">
              <div className="p-2 bg-indigo-950/60 text-indigo-400 rounded-xl">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base tracking-tight font-display">Sales Follow-Up Wizard</h3>
                <p className="text-xs text-slate-500">Draft or fine-tune an outbound automated reminder sequence</p>
              </div>
            </div>

            <form onSubmit={handleSendFollowUp} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Target Lead Profile</label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    const targetL = leads.find(l => l.id === e.target.value);
                    // Prepopulate template
                    if (targetL) {
                      setCustomMessage(`Hi ${targetL.name || "there"}, just checking if you had a chance to look over our catalog? Let me know if you are free for a consultation!`);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-501"
                >
                  <option value="">-- Choose a CRM Lead --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.phoneNumber}) - Priority: {l.priority} | Stage: {l.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-display">Target Followup Type</label>
                  <select
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="Soft">Soft Check-in (Reminder 1)</option>
                    <option value="Medium">Medium Strong Offer (Reminder 2)</option>
                    <option value="Final">Final Gentle touch-point (Reminder 3)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={!selectedLeadId || isGeneratingAi}
                    onClick={handleAiMessageGenerate}
                    className="w-full py-2 bg-[#02050a] border border-slate-900 text-indigo-400 hover:text-indigo-300 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {isGeneratingAi ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Autofill AI Draft</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Outbound WhatsApp Message Text</label>
                <div className="relative">
                  <textarea
                    required
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Draft custom follow-up reminder here..."
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs text-slate-250 outline-none focus:border-indigo-500/80 resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-550 font-mono">
                    {customMessage.length} chars
                  </span>
                </div>
                <span className="text-[10px] italic text-slate-505 block mt-1">
                  💡 Keep followups short, engaging, and friendly to maximize WhatsApp response ratios.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-900 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedLeadId("");
                    setCustomMessage("");
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-xs font-bold text-slate-400 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionRunning}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 font-bold border border-indigo-500/30 text-xs text-white rounded-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-45"
                >
                  {isActionRunning ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Deliver Outbound</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
