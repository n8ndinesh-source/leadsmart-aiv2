import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Users, Search, Plus, Phone, Mail, Calendar, Tag, MessageSquare, 
  Clock, ArrowRight, Trash2, X, Brain, CheckCircle2, XCircle, 
  LayoutGrid, ListFilter, Play, Sparkles, RefreshCw, Upload, FileText, ChevronRight, Check, AlertTriangle
} from "lucide-react";
import { api } from "../services/api";
import { Lead, LeadNote, LeadTag, LeadActivity } from "../types";

const PIPELINE_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost"
];

const PRIORITY_LEVELS = ["Hot", "Warm", "Cold"];
const SOURCE_LEVELS = ["WhatsApp", "Manual", "Import"];

export function LeadManagementConsole() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<string>("All"); // All, Today, ThisWeek, ThisMonth
  const [viewMode, setViewMode] = useState<"Table" | "Kanban">("Table");
  
  // Modals & Panels state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // WhatsApp states inside Lead Detail UI
  const [sidebarTab, setSidebarTab] = useState<"profile" | "whatsapp">("profile");
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [manualMessage, setManualMessage] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Form States
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("Manual");
  const [newLeadStatus, setNewLeadStatus] = useState("New");
  const [newLeadPriority, setNewLeadPriority] = useState("Warm");

  // Notes Form State
  const [noteContent, setNoteContent] = useState("");
  // Tags Form State
  const [newTagLabel, setNewTagLabel] = useState("");

  // Bulk Import Form State
  const [importText, setImportText] = useState("");
  const [importDelimiter, setImportDelimiter] = useState<"comma" | "pipe" | "tab">("comma");

  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  
  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const scrollSpeed = useRef<number>(0);

  const stopDragScroll = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    scrollSpeed.current = 0;
  };

  const smoothScroll = () => {
    if (scrollContainerRef.current && scrollSpeed.current !== 0) {
      scrollContainerRef.current.scrollLeft += scrollSpeed.current;
      animationFrameId.current = requestAnimationFrame(smoothScroll);
    } else {
      animationFrameId.current = null;
    }
  };

  const startDragScroll = (speed: number) => {
    scrollSpeed.current = speed;
    if (!animationFrameId.current) {
      animationFrameId.current = requestAnimationFrame(smoothScroll);
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!scrollContainerRef.current) return;
    
    // Check if dragging an actual lead, prevent scrolling for other draggable items if needed.
    // We already check draggedLeadId, but the dragEvent fires everywhere.
    
    const container = scrollContainerRef.current;
    const { left, right } = container.getBoundingClientRect();
    const x = e.clientX;

    const edgeThreshold = 100;
    const maxSpeed = 15;
    
    if (x > right - edgeThreshold) {
      const speed = Math.max(2, (edgeThreshold - (right - x)) / edgeThreshold * maxSpeed);
      startDragScroll(speed);
    } else if (x < left + edgeThreshold) {
      const speed = Math.max(2, (edgeThreshold - (x - left)) / edgeThreshold * maxSpeed);
      startDragScroll(-speed);
    } else {
      stopDragScroll();
    }
  };

  // Fetch all leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch feeds
      const data = await api.get<Lead[]>("/leads");
      setLeads(data || []);
    } catch (err: any) {
      console.error("Error fetching leads client-side:", err);
      setError(err.message || "Failed to load CRM leads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  // Fetch active messages when lead selection changes
  const fetchLeadMessages = async (leadId: string) => {
    try {
      setChatLoading(true);
      const data = await api.get<any[]>(`/messages/${leadId}`);
      setWhatsappMessages(data || []);
    } catch (err) {
      console.error("Failed to load Lead WhatsApp communication events:", err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLeadId) {
      setSidebarTab("profile");
      fetchLeadMessages(selectedLeadId);

      // Auto poll every 8 seconds when active in sidebar
      const interval = setInterval(() => {
        fetchLeadMessages(selectedLeadId);
      }, 8000);
      return () => clearInterval(interval);
    } else {
      setWhatsappMessages([]);
    }
  }, [selectedLeadId]);

  const handleSendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !manualMessage.trim()) return;
    try {
      setSendingMessage(true);
      const content = manualMessage.trim();
      setManualMessage("");

      const response = await api.post<any>("/send-message", {
        leadId: selectedLeadId,
        message: content
      });

      // Update local thread smoothly
      setWhatsappMessages(prev => [...prev, response]);
      
      // Update leads list in the background for new status or timing checks if needed
      const rawLeads = await api.get<Lead[]>("/leads");
      setLeads(rawLeads || []);
    } catch (err: any) {
      alert(err.message || "Failed to deliver manual WhatsApp notification.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Create Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      alert("Name and phone number are required details");
      return;
    }

    try {
      setActionLoading(true);
      const newLead = await api.post<Lead>("/lead", {
        name: newLeadName.trim(),
        phoneNumber: newLeadPhone.trim(),
        email: newLeadEmail.trim() || null,
        source: newLeadSource,
        status: newLeadStatus,
        priority: newLeadPriority
      });

      setLeads(prev => [newLead, ...prev]);
      setIsCreateModalOpen(false);
      
      // Reset form definitions
      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadEmail("");
      setNewLeadSource("Manual");
      setNewLeadStatus("New");
      setNewLeadPriority("Warm");
      
      // Select the newly created lead for details
      setSelectedLeadId(newLead.id);
    } catch (err: any) {
      alert(err.message || "Failed to create new lead.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Lead Basic
  const handleUpdateLeadField = async (leadId: string, field: string, value: any) => {
    try {
      const updated = await api.put<Lead>(`/lead/${leadId}`, {
        [field]: value
      });
      // Sync local state
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l));
    } catch (err: any) {
      alert(err.message || "Failed to update lead settings");
    }
  };

  // Handle Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      setActionLoading(true);
      await api.delete(`/lead/${leadId}`);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (selectedLeadId === leadId) {
        setSelectedLeadId(null);
      }
      setLeadToDelete(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete lead opportunity.");
    } finally {
      setActionLoading(false);
    }
  };

  // Add Note to Selected Lead
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !noteContent.trim()) return;

    try {
      setActionLoading(true);
      const newNote = await api.post<LeadNote>(`/lead/${selectedLeadId}/note`, {
        note: noteContent.trim()
      });

      // Update local state nested structure
      setLeads(prev => prev.map(lead => {
        if (lead.id === selectedLeadId) {
          const notes = lead.notes ? [newNote, ...lead.notes] : [newNote];
          
          // Mimic backend auto-activity timeline trigger client-side
          const dummyActivity: LeadActivity = {
            id: `act-${Date.now()}`,
            leadId: selectedLeadId,
            activityType: "NOTE_ADDED",
            description: `Comment stored: "${noteContent.length > 35 ? noteContent.substring(0, 35) + "..." : noteContent}"`,
            createdAt: new Date().toISOString()
          };
          const activities = lead.activities ? [dummyActivity, ...lead.activities] : [dummyActivity];

          return { ...lead, notes, activities };
        }
        return lead;
      }));

      setNoteContent("");
    } catch (err: any) {
      alert(err.message || "Failed to add note.");
    } finally {
      setActionLoading(false);
    }
  };

  // Add Tag to Selected Lead
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !newTagLabel.trim()) return;

    const labelStr = newTagLabel.trim();
    try {
      setActionLoading(true);
      const newTagObj = await api.post<LeadTag>(`/lead/${selectedLeadId}/tag`, {
        tag: labelStr
      });

      setLeads(prev => prev.map(lead => {
        if (lead.id === selectedLeadId) {
          const exists = lead.tags?.some(t => t.tag.toLowerCase() === labelStr.toLowerCase());
          if (exists) return lead; // avoid duplicate renders

          const tags = lead.tags ? [newTagObj, ...lead.tags] : [newTagObj];
          const dummyActivity: LeadActivity = {
            id: `act-${Date.now()}`,
            leadId: selectedLeadId,
            activityType: "TAG_ADDED",
            description: `Tag pinned to lead: "${labelStr}"`,
            createdAt: new Date().toISOString()
          };
          const activities = lead.activities ? [dummyActivity, ...lead.activities] : [dummyActivity];

          return { ...lead, tags, activities };
        }
        return lead;
      }));

      setNewTagLabel("");
    } catch (err: any) {
      alert(err.message || "Failed to add tag");
    } finally {
      setActionLoading(false);
    }
  };

  // Remove Tag from selected lead
  const handleRemoveTag = async (tagId: string, label: string) => {
    if (!selectedLeadId) return;
    try {
      await api.delete(`/lead/${selectedLeadId}/tag/${tagId}`);
      setLeads(prev => prev.map(lead => {
        if (lead.id === selectedLeadId) {
          const tags = lead.tags ? lead.tags.filter(t => t.id !== tagId) : [];
          const dummyActivity: LeadActivity = {
            id: `act-${Date.now()}`,
            leadId: selectedLeadId,
            activityType: "TAG_REMOVED",
            description: `Tag removed: "${label}"`,
            createdAt: new Date().toISOString()
          };
          const activities = lead.activities ? [dummyActivity, ...lead.activities] : [dummyActivity];

          return { ...lead, tags, activities };
        }
        return lead;
      }));
    } catch (err: any) {
      alert(err.message || "Failed to remove tag.");
    }
  };

  // Parser import logic
  const handleBulkImportLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      alert("Please paste data to import");
      return;
    }

    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let successCount = 0;
    let failedCount = 0;

    setActionLoading(true);
    try {
      // Loop lines and create them sequentially or alert progress
      for (const line of lines) {
        let name = "";
        let phone = "";
        let email = "";

        if (importDelimiter === "comma") {
          const parts = line.split(",").map(p => p.trim());
          name = parts[0] || "";
          phone = parts[1] || "";
          email = parts[2] || "";
        } else if (importDelimiter === "pipe") {
          const parts = line.split("|").map(p => p.trim());
          name = parts[0] || "";
          phone = parts[1] || "";
          email = parts[2] || "";
        } else {
          const parts = line.split("\t").map(p => p.trim());
          name = parts[0] || "";
          phone = parts[1] || "";
          email = parts[2] || "";
        }

        // Auto cleanse name and phone if possible 
        if (!name || !phone) {
          failedCount++;
          continue;
        }

        try {
          const newLead = await api.post<Lead>("/lead", {
            name,
            phoneNumber: phone,
            email: email || null,
            source: "Import",
            status: "New",
            priority: "Warm"
          });
          setLeads(prev => [newLead, ...prev]);
          successCount++;
        } catch (err) {
          console.error(`Failed to import individual lead: ${line}`, err);
          failedCount++;
        }
      }

      alert(`Lead Import Completed Successfully!\n\nImported: ${successCount} leads\nSkipped/Failed: ${failedCount} leads`);
      setIsImportModalOpen(false);
      setImportText("");
    } catch (err: any) {
      alert(err.message || "Import execution failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering computational arrays
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search matches (name, phone, email)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const mName = lead.name.toLowerCase().includes(query);
        const mPhone = lead.phoneNumber.includes(query);
        const mEmail = lead.email ? lead.email.toLowerCase().includes(query) : false;
        if (!mName && !mPhone && !mEmail) return false;
      }

      // Dropdown Filters
      if (statusFilter && lead.status !== statusFilter) return false;
      if (priorityFilter && lead.priority !== priorityFilter) return false;
      if (sourceFilter && lead.source !== sourceFilter) return false;
      if (tagFilter) {
        const hasTag = lead.tags?.some(t => t.tag.toLowerCase().includes(tagFilter.toLowerCase()));
        if (!hasTag) return false;
      }

      // Time Range Filter
      if (timeFilter !== "All") {
        const leadDate = new Date(lead.createdAt);
        const now = new Date();
        if (timeFilter === "Today") {
          if (leadDate.toDateString() !== now.toDateString()) return false;
        } else if (timeFilter === "ThisWeek") {
          const diffTime = Math.abs(now.getTime() - leadDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        } else if (timeFilter === "ThisMonth") {
          if (leadDate.getMonth() !== now.getMonth() || leadDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, priorityFilter, sourceFilter, tagFilter, timeFilter]);

  // Lead Dashboard summary calculations
  const statsSummary = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === "New").length;
    const hotLeads = leads.filter(l => l.priority === "Hot").length;
    const wonCount = leads.filter(l => l.status === "Won").length;
    const lostCount = leads.filter(l => l.status === "Lost").length;
    
    // Status in interactive phase
    const followUps = leads.filter(l => ["Contacted", "Interested", "Quotation Sent", "Negotiation"].includes(l.status)).length;

    return {
      total,
      newLeads,
      hotLeads,
      followUps,
      wonCount,
      lostCount,
      conversionRate: total > 0 ? ((wonCount / total) * 100).toFixed(1) : "0.0"
    };
  }, [leads]);

  // Grouping leads for Kanban layout
  const kanbanColumns = useMemo(() => {
    const columns: Record<string, Lead[]> = {};
    PIPELINE_STATUSES.forEach(status => {
      columns[status] = filteredLeads.filter(l => l.status === status);
    });
    return columns;
  }, [filteredLeads]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setTagFilter("");
    setTimeFilter("All");
  };

  const hasActiveFilters = useMemo(() => {
    return !!searchQuery || !!statusFilter || !!priorityFilter || !!sourceFilter || !!tagFilter || timeFilter !== "All";
  }, [searchQuery, statusFilter, priorityFilter, sourceFilter, tagFilter, timeFilter]);

  return (
    <div className="space-y-6">
      {/* SECTION 1: STATS SUMMARY DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Leads */}
        <div className="relative p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-indigo-500/20 group-hover:text-indigo-500/30 transition-all">
            <Users className="w-12 h-12" />
          </div>
          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Total Leads</span>
          <span className="block text-xl font-bold font-display text-white mt-1">{statsSummary.total}</span>
          <span className="text-[9px] text-slate-400 mt-0.5 block flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Aggregate pipeline size</span>
          </span>
        </div>

        {/* New Leads */}
        <div className="relative p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-purple-500/20 group-hover:text-purple-500/30 transition-all">
            <Sparkles className="w-12 h-12" />
          </div>
          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">New Inboxes</span>
          <span className="block text-xl font-bold font-display text-white mt-1">{statsSummary.newLeads}</span>
          <span className="text-[9px] text-purple-450 mt-0.5 block flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            <span>Uncontacted prospects</span>
          </span>
        </div>

        {/* Hot Leads */}
        <div className="relative p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-amber-500/20 group-hover:text-amber-500/30 transition-all">
            <Play className="w-12 h-12" />
          </div>
          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Hot Priorities</span>
          <span className="block text-xl font-bold font-display text-amber-400 mt-1">{statsSummary.hotLeads}</span>
          <span className="text-[9px] text-slate-400 mt-0.5 block flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>High priority deal-value</span>
          </span>
        </div>

        {/* Follow-up Required (Phase 6 placeholder) */}
        <div className="relative p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-blue-500/20 group-hover:text-blue-500/30 transition-all">
            <Clock className="w-12 h-12" />
          </div>
          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Ongoing Actions</span>
          <span className="block text-xl font-bold font-display text-sky-400 mt-1">{statsSummary.followUps}</span>
          <span className="text-[9px] text-slate-540 mt-0.5 block flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>In active discussions</span>
          </span>
        </div>

        {/* Won deals */}
        <div className="relative p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-emerald-500/20 group-hover:text-emerald-500/30 transition-all">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Won Contracts</span>
          <span className="block text-xl font-bold font-display text-emerald-400 mt-1">{statsSummary.wonCount}</span>
          <span className="text-[9px] text-emerald-500 mt-0.5 block flex items-center space-x-1">
            <span>Rate: <b>{statsSummary.conversionRate}%</b></span>
          </span>
        </div>

        {/* Lost deals */}
        <div className="relative p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-rose-500/20 group-hover:text-rose-500/30 transition-all">
            <XCircle className="w-12 h-12" />
          </div>
          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Closed Lost</span>
          <span className="block text-xl font-bold font-display text-rose-455 mt-1">{statsSummary.lostCount}</span>
          <span className="text-[9px] text-slate-500 mt-0.5 block">Nurturing pool</span>
        </div>
      </div>

      {/* SECTION 2: FILTERS & CRM WORKSPACE NAV BAR */}
      <div className="flex flex-col space-y-3.5 bg-slate-950/30 border border-slate-900/60 rounded-xl p-4">
        {/* Toggle + buttons row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900/70 pb-3 gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("Table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                viewMode === "Table" 
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" 
                  : "bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Grid / Table List</span>
            </button>
            <button
              onClick={() => setViewMode("Kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                viewMode === "Kanban" 
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" 
                  : "bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Interactive Kanban Pipeline</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900/40 text-slate-300 font-medium text-xs hover:bg-slate-900 hover:text-white border border-slate-800 flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import Leads</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/15 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Opportunity</span>
            </button>
            <button 
              onClick={fetchLeads}
              className="p-1.5 rounded-lg bg-slate-905 border border-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Advanced Filter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Key search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by contact name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-900 text-xs text-white rounded-lg pl-9 pr-4 py-2.5 focus:border-indigo-600 focus:outline-none placeholder-slate-600 transition-all font-light"
            />
          </div>

          {/* Status selector */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-900 text-xs text-white rounded-lg px-2.5 py-2.5 focus:border-indigo-600 focus:outline-none font-light cursor-pointer"
            >
              {[
                <option key="all-status" value="">-- All Stages --</option>,
                ...PIPELINE_STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))
              ]}
            </select>
          </div>

          {/* Priority selector */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-900 text-xs text-white rounded-lg px-2.5 py-2.5 focus:border-indigo-600 focus:outline-none font-light cursor-pointer"
            >
              {[
                <option key="all-priority" value="">-- All Priorities --</option>,
                ...PRIORITY_LEVELS.map(pr => (
                  <option key={pr} value={pr}>{pr}</option>
                ))
              ]}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-900 text-xs text-white rounded-lg px-2.5 py-2.5 focus:border-indigo-600 focus:outline-none font-light cursor-pointer"
            >
              {[
                <option key="all-source" value="">-- All Sources --</option>,
                ...SOURCE_LEVELS.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))
              ]}
            </select>
          </div>

          {/* Timeframe picker */}
          <div>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-900 text-xs text-white rounded-lg px-2.5 py-2.5 focus:border-indigo-600 focus:outline-none font-light cursor-pointer"
            >
              <option value="All">All Timeframes</option>
              <option value="Today">Registered Today</option>
              <option value="ThisWeek">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
          </div>
        </div>

        {/* Clear active filter elements info */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-indigo-900/10 border border-indigo-900/30 rounded-lg px-3 py-1.5 text-[11px] text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Active filters narrowed database query from <b>{leads.length}</b> down to <b>{filteredLeads.length}</b> results</span>
            </div>
            <button
              onClick={clearAllFilters}
              className="text-indigo-400 hover:text-white font-semibold underline flex items-center space-x-1 cursor-pointer transition-all"
            >
              <X className="w-3 h-3 block" />
              <span>Restore default view</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: DATAGRID AND KANBAN PANELS RENDER */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 bg-slate-950/20 border border-slate-900/40 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-indigo-455 animate-spin" />
          <span className="mt-3 block text-xs tracking-wider">Synchronizing leadsmart CRM pipeline data...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-[#060a15]/30 border border-slate-900/60 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center text-slate-500 mb-2 border border-slate-900">
            <Users className="w-6 h-6 text-indigo-505" />
          </div>
          <h3 className="font-display font-medium text-white text-sm">No Leads Discovered</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">
            {hasActiveFilters 
              ? "There are no leads in database matching your custom filter combination. Try clearing some controls." 
              : "Register your first manually handled potential buyer or paste a list to initialize CRM pipeline stats!"}
          </p>
          {!hasActiveFilters && (
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-all"
              >
                Create Manually
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Bulk Import List
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "Table" ? (
        /* TABLE GRID LAYOUT */
        <div className="border border-slate-900 rounded-2xl bg-slate-950/20 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-900 uppercase tracking-widest text-[9px] font-bold select-none">
                  <th className="py-3.5 px-4 font-mono">Lead Identity</th>
                  <th className="py-3.5 px-4 font-mono">Channel Info</th>
                  <th className="py-3.5 px-4 font-mono">Source</th>
                  <th className="py-3.5 px-4 font-mono">Pipeline Stage</th>
                  <th className="py-3.5 px-4 font-mono">Commercial Priority</th>
                  <th className="py-3.5 px-4 font-mono">Created</th>
                  <th className="py-3.5 px-4 font-mono text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300 font-light">
                {filteredLeads.map((lead) => {
                  const statusColors = getStatusColors(lead.status);
                  const priorityColors = getPriorityColors(lead.priority);
                  const sourceIcon = getSourceIcon(lead.source);

                  return (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-900/40 transition-all cursor-pointer group ${
                        selectedLeadId === lead.id ? "bg-indigo-600/10 border-l-2 border-indigo-500" : ""
                      }`}
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      {/* Name, Phone, Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg ${priorityColors.bg} flex items-center justify-center font-bold text-[13px] ${priorityColors.text} shrink-0 border border-slate-900`}>
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-semibold text-white font-display group-hover:text-indigo-400 transition-colors">
                              {lead.name}
                            </span>
                            {lead.email && (
                              <span className="block text-[10px] text-slate-500 mt-0.5 font-light">
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-mono">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{lead.phoneNumber}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center space-x-1 text-slate-400 text-[11px]">
                          {sourceIcon}
                          <span className="capitalize">{lead.source}</span>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLeadField(lead.id, "status", e.target.value)}
                          className={`text-[10px] font-bold rounded-md px-1.5 py-1.0 uppercase border focus:outline-none transition-all cursor-pointer ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                        >
                          {PIPELINE_STATUSES.map(st => (
                            <option key={st} value={st} className="bg-slate-950 text-slate-300 font-light uppercase text-left">{st}</option>
                          ))}
                        </select>
                      </td>

                      {/* Priority Badge */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.priority}
                          onChange={(e) => handleUpdateLeadField(lead.id, "priority", e.target.value)}
                          className={`text-[10px] font-semibold rounded-md px-1.5 py-1.0 uppercase focus:outline-none transition-all cursor-pointer ${priorityColors.badgeBg} ${priorityColors.text}`}
                        >
                          {PRIORITY_LEVELS.map(level => (
                            <option key={level} value={level} className="bg-slate-950 text-slate-300 font-light uppercase text-left">{level}</option>
                          ))}
                        </select>
                      </td>

                      {/* Created date */}
                      <td className="py-3.5 px-4 text-slate-505 font-mono text-[10px]">
                        {new Date(lead.createdAt).toLocaleDateString(undefined, { 
                          month: "short", 
                          day: "numeric", 
                          hour: "2-digit", 
                          minute: "2-digit"
                        })}
                      </td>

                      {/* Action columns */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="p-1 px-2 text-indigo-400 hover:bg-slate-800 rounded text-[10px] uppercase font-bold flex items-center cursor-pointer transition-colors"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </button>
                          <button
                            onClick={() => setLeadToDelete(lead.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded cursor-pointer transition-colors"
                            title="Remove lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEWS */
        <div 
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDrop={stopDragScroll}
          className="flex space-x-4 overflow-x-auto pb-4 select-none mask-webkit scrollbar-thin"
        >
          {PIPELINE_STATUSES.map(status => {
            const cols = kanbanColumns[status] || [];
            const headerColors = getStatusHeaderColors(status);

            return (
              <div 
                key={status} 
                className={`w-72 shrink-0 bg-slate-950/20 border ${draggedLeadId ? "border-slate-800/80 border-dashed" : "border-slate-900/60"} rounded-xl p-3 flex flex-col h-[520px] transition-colors`}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-slate-900/40');
                  const leadId = e.dataTransfer.getData("text/plain");
                  if (leadId) {
                    const checkLead = leads.find(l => l.id === leadId);
                    if (checkLead && checkLead.status !== status) {
                      handleUpdateLeadField(leadId, "status", status);
                    }
                  }
                  setDraggedLeadId(null);
                }}
                onDragEnter={(e) => {
                  e.currentTarget.classList.add('bg-slate-900/40');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-slate-900/40');
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-slate-900/80 pb-2 mb-3">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${headerColors.dot}`} />
                    <h4 className="text-white font-semibold text-xs truncate uppercase tracking-wider font-display shrink-0">
                      {status}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-900/80 text-slate-400 rounded-md font-bold">
                    {cols.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                  {cols.length === 0 ? (
                    <div className="h-24 border border-dashed border-slate-900/40 text-slate-650 flex flex-col items-center justify-center text-[10px] rounded-lg tracking-wider">
                      <span>No leads at this stage</span>
                    </div>
                  ) : (
                    cols.map(card => {
                      const priorityStyle = getPriorityColors(card.priority);
                      const hasNotes = card.notes && card.notes.length > 0;
                      const hasTags = card.tags && card.tags.length > 0;

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", card.id);
                            setDraggedLeadId(card.id);
                          }}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            stopDragScroll();
                          }}
                          onClick={() => setSelectedLeadId(card.id)}
                          className={`p-3 rounded-lg bg-slate-950/70 border border-slate-900 hover:border-indigo-500/40 transition-all cursor-pointer group hover:shadow-lg hover:shadow-indigo-950/5 relative select-none ${
                            selectedLeadId === card.id ? "ring-1 ring-indigo-500 border-indigo-500" : ""
                          } ${draggedLeadId === card.id ? "opacity-50 ring-1 ring-indigo-500/50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="block text-white font-semibold font-display text-xs group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {card.name}
                            </span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 ${priorityStyle.badgeBg} ${priorityStyle.text}`}>
                              {card.priority}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 mt-1.5 font-mono flex items-center space-x-1">
                            <Phone className="w-2.5 h-2.5 text-slate-600 block shrink-0" />
                            <span>{card.phoneNumber}</span>
                          </div>

                          {/* Render tag list snippet */}
                          {hasTags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {card.tags?.slice(0, 3).map(t => (
                                <span key={t.id} className="text-[8px] px-1 py-0.2 bg-[#0d162a] text-indigo-400 rounded font-bold uppercase truncate max-w-[70px]">
                                  {t.tag}
                                </span>
                              ))}
                              {card.tags && card.tags.length > 3 && (
                                <span className="text-[8px] px-1 bg-slate-900 text-slate-400 rounded">+{card.tags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* Footer with note count indicators */}
                          <div className="flex items-center justify-between border-t border-slate-900/60 mt-3.5 pt-2 text-[9px] text-slate-500">
                            <span className="capitalize">{card.source}</span>
                            <div className="flex items-center space-x-2">
                              {hasNotes && (
                                <span className="flex items-center space-x-0.5 text-slate-400">
                                  <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{card.notes?.length}</span>
                                </span>
                              )}
                              <span>{new Date(card.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 4: LEAD ACTIONS DETAILS DRAWER SIDEBAR */}
      {selectedLeadId && selectedLead && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-950 border-l border-slate-900 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-905 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 font-display text-[15px]">
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-display font-semibold text-white text-sm tracking-tight">{selectedLead.name}</h3>
                <span className="block text-[9px] text-slate-500 font-mono">
                  ID: #{leads.findIndex(l => l.id === selectedLead.id) + 1}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLeadId(null)}
              className="p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-tabs Selection bar */}
          <div className="flex border-b border-indigo-950 bg-[#040815] p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarTab("profile")}
              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] uppercase font-display tracking-wider cursor-pointer text-center transition-all ${sidebarTab === "profile" ? "bg-indigo-650 text-white shadow-md shadow-indigo-650/20 shadow-indigo-500/10" : "text-slate-400 hover:text-slate-200"}`}
            >
              📊 Core Profile & Stats
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("whatsapp")}
              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] uppercase font-display tracking-wider cursor-pointer text-center transition-all flex items-center justify-center space-x-1.5 ${sidebarTab === "whatsapp" ? "bg-[#128c7e] text-white shadow-md shadow-emerald-650/25" : "text-slate-400 hover:text-slate-200"}`}
            >
              <span>💬 Live WhatsApp Chat</span>
              {selectedLead.conversationStatus === "Unread" && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              )}
            </button>
          </div>

          {/* Details Scrollable Stream */}
          {sidebarTab === "profile" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">

            {/* Grid 1: Basic editing values */}
            <div className="bg-slate-950/40 p-3.5 border border-slate-900/60 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                <span>Core CRM Fields</span>
                <span className="text-indigo-400 underline lowercase font-sans font-light">Autosaves on focus loss</span>
              </div>

              {/* Status and priority controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-medium font-sans mb-1 uppercase tracking-wide">Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleUpdateLeadField(selectedLead.id, "status", e.target.value)}
                    className="w-full bg-slate-950 text-xs text-white border border-slate-900 rounded-lg p-2 focus:border-indigo-600 focus:outline-none"
                  >
                    {PIPELINE_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-medium font-sans mb-1 uppercase tracking-wide">Priority</label>
                  <select
                    value={selectedLead.priority}
                    onChange={(e) => handleUpdateLeadField(selectedLead.id, "priority", e.target.value)}
                    className="w-full bg-slate-950 text-xs text-white border border-slate-900 rounded-lg p-2 focus:border-indigo-600 focus:outline-none"
                  >
                    {PRIORITY_LEVELS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text elements */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] text-slate-450 font-medium uppercase font-mono tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={selectedLead.phoneNumber}
                    onChange={(e) => handleUpdateLeadField(selectedLead.id, "phoneNumber", e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-lg p-2 text-xs font-mono text-slate-300 mt-1 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-450 font-medium uppercase font-mono tracking-wider">Email Address</label>
                  <input
                    type="text"
                    value={selectedLead.email || ""}
                    placeholder="E.g. customer@domain.com"
                    onChange={(e) => handleUpdateLeadField(selectedLead.id, "email", e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-lg p-2 text-xs font-light text-slate-300 mt-1 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Extra stats meta */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900/50">
                <span>Source: <b className="text-slate-300 capitalize">{selectedLead.source}</b></span>
                <span>Registered: <b className="text-slate-300 font-mono">{new Date(selectedLead.createdAt).toLocaleDateString()}</b></span>
              </div>
            </div>

            {/* AI READINESS BLOCK (IMPORTANT) */}
            <div className="p-4 rounded-xl bg-indigo-950/15 border border-indigo-900/20 space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 text-indigo-505/10 group-hover:text-indigo-505/20 transition-all pointer-events-none">
                <Brain className="w-16 h-16" />
              </div>
              <div className="flex items-center space-x-1.5">
                <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
                <h4 className="font-display font-bold text-xs uppercase text-indigo-450 tracking-wider">AI Integration Intelligence</h4>
                <span className="text-[8px] font-extrabold text-indigo-400 bg-indigo-900/30 px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest leading-none">AI Readiness</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                These scores and suggestions align with <b>Phase 7 (AI Decision Engine)</b>. Values will generate automatically when live WhatsApp chat traffic starts.
              </p>

              {/* Rating metrics input simulator */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Intent Strength</div>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className="text-sm font-bold text-white font-mono">{selectedLead.intentScore !== null ? `${selectedLead.intentScore}%` : "Not evaluated"}</span>
                  </div>
                  {/* Simulate scoring capability */}
                  <div className="mt-1 bg-slate-900 rounded-full h-1 relative overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: selectedLead.intentScore !== null ? `${selectedLead.intentScore}%` : "0%" }} />
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedLead.intentScore || 0} 
                      onChange={(e) => handleUpdateLeadField(selectedLead.id, "intentScore", Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Lead Qualifier</div>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className="text-sm font-bold text-purple-400 font-mono">{selectedLead.leadScore !== null ? `${selectedLead.leadScore}/100` : "Not calibrated"}</span>
                  </div>
                  <div className="mt-1 bg-slate-900 rounded-full h-1 relative overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: selectedLead.leadScore !== null ? `${selectedLead.leadScore}%` : "0%" }} />
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedLead.leadScore || 0} 
                      onChange={(e) => handleUpdateLeadField(selectedLead.id, "leadScore", Number(e.target.value))}
                      className="w-full accent-purple-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Recommendation panel */}
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/60 mt-1">
                <span className="block text-[9px] text-slate-500 uppercase font-mono tracking-wider">AI Recommended Next Best Action</span>
                <textarea
                  className="w-full bg-transparent border-0 text-[11px] text-slate-300 mt-1 h-12 focus:ring-0 focus:outline-none resize-none font-light italic leading-relaxed placeholder-slate-650"
                  placeholder="Enter custom recommendation or wait for AI engine generation on active channels..."
                  value={selectedLead.aiRecommendation || ""}
                  onChange={(e) => handleUpdateLeadField(selectedLead.id, "aiRecommendation", e.target.value)}
                />
              </div>
            </div>

            {/* TAGGING SYSTEM CONTAINER */}
            <div className="space-y-2.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider font-display flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Segmentation Tags</span>
              </h4>

              {/* Tags panel display */}
              <div className="flex flex-wrap gap-1.5 bg-[#03060c] p-2.5 border border-slate-900 rounded-xl">
                {!selectedLead.tags || selectedLead.tags.length === 0 ? (
                  <span className="text-[10px] text-slate-600 font-light pl-1 py-0.5 mt-0.5">No tags pinned. Tag suggestions: &quot;High Value&quot;, &quot;Urgent&quot;, &quot;Repeated Customer&quot;</span>
                ) : (
                  selectedLead.tags.map(t => (
                    <span 
                      key={t.id} 
                      className="inline-flex items-center space-x-1 text-[10px] bg-slate-900 text-indigo-400 font-bold uppercase rounded-md pl-2 pr-1 py-0.5 border border-slate-800"
                    >
                      <span>{t.tag}</span>
                      <button
                        onClick={() => handleRemoveTag(t.id, t.tag)}
                        className="p-0.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove tag"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Adding tag inputs */}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Pinned tags (e.g. Budget Buyer)..."
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-600 focus:outline-none placeholder-slate-600"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !newTagLabel.trim()}
                  className="px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer transition-all shrink-0 active:scale-95"
                >
                  Pin Label
                </button>
              </form>
            </div>

            {/* MANUAL CRM NOTES SYSTEM */}
            <div className="space-y-2.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider font-display flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Behavior Notes & Comments</span>
              </h4>

              {/* Compose manual comment box */}
              <form onSubmit={handleAddNote} className="space-y-2 bg-[#02050b] p-3 border border-slate-900 rounded-xl">
                <textarea
                  placeholder="Type in manual discussion logs, notes, customer behavior remarks, behavior callbacks or reminders..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-350 rounded-lg p-2.5 h-16 resize-none focus:outline-none focus:border-indigo-600 placeholder-slate-650"
                />
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-[9px] text-slate-500 font-sans">Press save to append opportunity note</span>
                  <button
                    type="submit"
                    disabled={actionLoading || !noteContent.trim()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg disabled:opacity-50 cursor-pointer transition-all"
                  >
                    Save Note
                  </button>
                </div>
              </form>

              {/* Feed of Notes */}
              <div className="space-y-2 mt-3">
                {!selectedLead.notes || selectedLead.notes.length === 0 ? (
                  <div className="text-[10px] text-slate-600 text-center py-6 border border-dashed border-slate-900 rounded-xl">
                    <span>No internal comments or customer behavior notes registered in this timeline yet.</span>
                  </div>
                ) : (
                  selectedLead.notes.map(noteItem => (
                    <div 
                      key={noteItem.id} 
                      className="bg-slate-950/60 p-3 border border-slate-900/60 rounded-xl space-y-2 text-xs relative group2"
                    >
                      <p className="text-slate-300 font-light leading-relaxed whitespace-pre-wrap">
                        {noteItem.note}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1">
                        <span className="flex items-center space-x-1 text-slate-505">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(noteItem.createdAt).toLocaleDateString(undefined, { 
                            month: "short", 
                            day: "numeric", 
                            hour: "2-digit", 
                            minute: "2-digit"
                          })}</span>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CHRONOLOGICAL TIMELINE stepper */}
            <div className="space-y-3.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider font-display flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Audit Activity History</span>
              </h4>

              <div className="relative border-l border-slate-900 pl-4 ml-2.5 py-1 space-y-4">
                {!selectedLead.activities || selectedLead.activities.length === 0 ? (
                  <span className="text-[10px] text-slate-600 font-light">Timeline tracker empty.</span>
                ) : (
                  selectedLead.activities.map(act => {
                    const actStyle = getActivityStyle(act.activityType);
                    return (
                      <div key={act.id} className="relative">
                        {/* Bullet bubble */}
                        <div className={`absolute -left-[22px] top-0.5 w-3 h-3 rounded-full ${actStyle.bg} border-2 border-slate-950 flex items-center justify-center`} />
                        
                        <div className="text-[11px]">
                          <span className={`${actStyle.text} font-bold mr-1 uppercase text-[8px] tracking-wider bg-slate-900 px-1 py-0.2 rounded`}>
                            {act.activityType}
                          </span>
                          <span className="text-slate-300 font-light">{act.description}</span>
                          <span className="block text-[8px] text-slate-550 font-mono mt-0.5">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
          )}

          {sidebarTab === "whatsapp" && (
            <div className="flex-1 flex flex-col bg-[#040815] overflow-hidden">
              
              {/* WhatsApp specific header / stats row */}
              <div className="p-3 bg-slate-950 border-b border-indigo-950 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1ebea5]" />
                  <span className="text-slate-400 font-mono font-medium">{selectedLead.phoneNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-505 font-mono">Status:</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-400 text-[10px] font-mono leading-none">
                    {selectedLead.conversationStatus || "Idle"}
                  </span>
                </div>
              </div>

              {/* Chat messages scrollable stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin bg-[#030611]/80 flex flex-col min-h-0">
                {chatLoading && whatsappMessages.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-light my-auto">
                    <span>Synchronizing communications stream...</span>
                  </div>
                ) : whatsappMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-2 max-w-xs mx-auto my-auto">
                    <span className="block text-[#1ebea5] font-bold text-lg">💬</span>
                    <h5 className="font-bold text-white text-xs uppercase leading-none">No conversation traffic yet</h5>
                    <p className="text-[10px] text-slate-500 font-light leading-relaxed">No messages have been processed for this contact. Use the dispatcher panel below to execute an outbound template push notification or greeting.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-auto">
                    {/* Instant back-history render */}
                    {whatsappMessages.map((msg: any) => {
                      const isIncoming = msg.direction === "IN" || msg.direction === "incoming";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isIncoming ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed relative ${isIncoming ? "bg-[#182229] text-white border border-[#233138] rounded-tl-none" : "bg-[#005c4b] text-white rounded-tr-none"}`}
                          >
                            <p className="whitespace-pre-wrap font-sans">{msg.content || msg.message}</p>
                            <span className="block text-[8px] text-slate-350 font-mono text-right mt-1 leading-none select-none opacity-80">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message composer input section */}
              <form onSubmit={handleSendManualMessage} className="p-3 bg-slate-950 border-t border-indigo-950 space-y-2 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    placeholder="Type a manual WhatsApp message reply..."
                    className="flex-grow bg-[#0c1226] border border-[#233138] focus:border-indigo-500 outline-none rounded-xl p-2.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !manualMessage.trim()}
                    className="px-4 bg-[#128c7e] hover:bg-[#1ebb5a] text-white font-bold text-xs uppercase rounded-xl disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                  >
                    {sendingMessage ? "Sending..." : "Send"}
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-550 font-mono pt-1">
                  <span>🤖 Basic AI Auto-Reply Active</span>
                  <button
                    type="button"
                    onClick={() => fetchLeadMessages(selectedLead.id)}
                    className="text-indigo-400 hover:underline hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <span>↻ Real-time Sync</span>
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* Footer controls */}
          <div className="p-4 border-t border-slate-905 bg-slate-950 flex justify-between gap-4">
            <button
              onClick={() => setSelectedLeadId(null)}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold py-2.5 cursor-pointer text-center"
            >
              Close Inspector
            </button>
            <button
              onClick={() => setLeadToDelete(selectedLead.id)}
              className="px-4 bg-red-955/10 hover:bg-red-650 text-red-400 hover:text-white rounded-lg text-xs font-semibold py-2.5 border border-red-950/40 transition-all cursor-pointer flex items-center space-x-1 justify-center shrink-0 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* QUICK CREATE OPPORTUNITY MODAL OVERLAY */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl p-5 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">New Customer Opportunity</h3>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-mono tracking-wider mb-1 block">Prospect / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. David Sterling"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg px-3 py-2.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-mono tracking-wider mb-1 block">Phone Contact Number * (WhatsApp format recommended)</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. +44 7911 123456"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg px-3 py-2.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-mono tracking-wider mb-1 block">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="E.g. buyer@commercial.com"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg px-3 py-2.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-mono tracking-wide mb-1 block">Source</label>
                  <select
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2 focus:border-indigo-600 focus:outline-none"
                  >
                    {SOURCE_LEVELS.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-mono tracking-wide mb-1 block">Stage</label>
                  <select
                    value={newLeadStatus}
                    onChange={(e) => setNewLeadStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2 focus:border-indigo-600 focus:outline-none font-sans"
                  >
                    {PIPELINE_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-mono tracking-wide mb-1 block">Priority</label>
                  <select
                    value={newLeadPriority}
                    onChange={(e) => setNewLeadPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2 focus:border-indigo-600 focus:outline-none"
                  >
                    {PRIORITY_LEVELS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-905 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK BULK IMPORT LIST PASTER MODAL OVERLAY */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl p-5 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 mb-3">
              <Upload className="w-4 h-4 text-indigo-400 font-semibold" />
              <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">Fast-List Manual Bulk Importer</h3>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-light">
              Paste multi-line records directly copy-pasted from spreadsheets, notebooks, or text documents. We will parse and capture each row as a brand new manual lead instantly.
            </p>

            <form onSubmit={handleBulkImportLeads} className="space-y-4 text-xs">
              <div className="p-3 bg-[#02050a] border border-slate-900 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Specify Split Row Format</span>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setImportDelimiter("comma")}
                      className={`px-2 py-0.5 text-[10px] rounded transition-all cursor-pointer ${
                        importDelimiter === "comma" ? "bg-indigo-600 text-white font-bold" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      Name, Phone, Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportDelimiter("pipe")}
                      className={`px-2 py-0.5 text-[10px] rounded transition-all cursor-pointer ${
                        importDelimiter === "pipe" ? "bg-indigo-600 text-white font-bold" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      Name | Phone
                    </button>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-450 leading-tight space-y-1 bg-slate-950/60 p-2 border border-slate-900/60 rounded-md font-mono">
                  <span>Example structure ({importDelimiter === "comma" ? "Comma Separated" : "Pipe Separated"}):</span>
                  <p className="block text-indigo-400 text-[10px] pt-1">
                    {importDelimiter === "comma" 
                      ? "Acme Chemicals, +14155554321, acme@business.com\nBeverly Hills Joint, 555-123-0102"
                      : "David Sterling | +44 191 234 1009 | david@sterling.co.uk\nSamantha Ross | +12125556789"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Row data text block</label>
                <textarea
                  required
                  placeholder={importDelimiter === "comma" 
                    ? "Acme Chemicals, +14155554321, info@acme.com\nRobert Geller, +44 1234567, rob@geller.net"
                    : "Acme Corp | +14155551212 | contact@acme.com"
                  }
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-white font-mono text-xs rounded-lg p-3 h-44 focus:outline-none focus:border-indigo-600 placeholder-slate-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-905 flex justify-between items-center text-[11px] text-slate-500">
                <span>Blank lines are ignored automatically</span>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !importText.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading ? "Parsing..." : "Execute Bulk Import"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      {leadToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 border border-red-900/50 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-950/40 flex items-center justify-center border border-red-900/40">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Delete Lead?</h3>
                <p className="text-xs text-slate-300 font-light leading-relaxed">
                  Are you absolutely sure you want to permanently remove this lead opportunity? This action is irreversible and will delete all timeline tracking history securely.
                </p>
              </div>
              <div className="flex flex-col w-full space-y-2 pt-2 text-xs">
                <button
                  onClick={() => handleDeleteLead(leadToDelete)}
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors cursor-pointer border border-red-500/50 flex justify-center items-center h-[46px]"
                >
                  {actionLoading ? "Deleting..." : "Permanently Delete Lead"}
                </button>
                <button
                  onClick={() => setLeadToDelete(null)}
                  disabled={actionLoading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Design Badges and Color mappings Helper routines
function getStatusColors(status: string) {
  switch (status) {
    case "New":
      return { bg: "bg-purple-950/20", text: "text-purple-450", border: "border-purple-900/40" };
    case "Contacted":
      return { bg: "bg-blue-950/20", text: "text-blue-400", border: "border-blue-900/40" };
    case "Interested":
      return { bg: "bg-cyan-950/20", text: "text-cyan-400", border: "border-cyan-900/40" };
    case "Qualified":
      return { bg: "bg-amber-950/20", text: "text-amber-400", border: "border-amber-900/40" };
    case "Quotation Sent":
      return { bg: "bg-indigo-950/20", text: "text-indigo-400", border: "border-indigo-900/30" };
    case "Negotiation":
      return { bg: "bg-orange-950/20", text: "text-orange-400", border: "border-orange-900/40" };
    case "Won":
      return { bg: "bg-emerald-950/35", text: "text-emerald-400", border: "border-emerald-900/40" };
    case "Lost":
      return { bg: "bg-rose-955/20", text: "text-rose-455", border: "border-rose-950/40" };
    default:
      return { bg: "bg-slate-950/30", text: "text-slate-400", border: "border-slate-900" };
  }
}

function getPriorityColors(priority: string) {
  switch (priority) {
    case "Hot":
      return { bg: "bg-amber-500/10", text: "text-amber-400", badgeBg: "bg-amber-950/40" };
    case "Warm":
      return { bg: "bg-indigo-500/15", text: "text-indigo-400", badgeBg: "bg-indigo-950/40" };
    case "Cold":
      return { bg: "bg-sky-500/10", text: "text-sky-400", badgeBg: "bg-sky-950/40" };
    default:
      return { bg: "bg-slate-500/10", text: "text-slate-400", badgeBg: "bg-slate-900" };
  }
}

function getStatusHeaderColors(status: string) {
  switch (status) {
    case "New":
      return { dot: "bg-purple-500" };
    case "Contacted":
      return { dot: "bg-blue-500" };
    case "Interested":
      return { dot: "bg-cyan-500" };
    case "Qualified":
      return { dot: "bg-amber-500" };
    case "Quotation Sent":
      return { dot: "bg-indigo-500" };
    case "Negotiation":
      return { dot: "bg-orange-500" };
    case "Won":
      return { dot: "bg-emerald-400" };
    case "Lost":
      return { dot: "bg-rose-500" };
    default:
      return { dot: "bg-slate-500" };
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case "WhatsApp":
      return <Phone className="w-3.5 h-3.5 text-emerald-450 shrink-0" />;
    case "Import":
      return <Upload className="w-3.5 h-3.5 text-cyan-455 shrink-0" />;
    case "Manual":
    default:
      return <FileText className="w-3.5 h-3.5 text-slate-505 shrink-0" />;
  }
}

function getActivityStyle(type: string) {
  switch (type) {
    case "CREATED":
      return { bg: "bg-indigo-500", text: "text-indigo-400" };
    case "STATUS_CHANGE":
      return { bg: "bg-amber-500", text: "text-amber-400" };
    case "PRIORITY_CHANGE":
      return { bg: "bg-cyan-500", text: "text-cyan-450" };
    case "NOTE_ADDED":
      return { bg: "bg-emerald-500", text: "text-emerald-400" };
    case "TAG_ADDED":
      return { bg: "bg-purple-500", text: "text-purple-400" };
    case "TAG_REMOVED":
      return { bg: "bg-rose-500", text: "text-rose-455" };
    default:
      return { bg: "bg-slate-500", text: "text-slate-400" };
  }
}
