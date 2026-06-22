import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Users, Search, Plus, Phone, Mail, Calendar, Tag, MessageSquare, 
  Clock, ArrowRight, Trash2, X, Brain, CheckCircle2, XCircle, 
  LayoutGrid, ListFilter, Play, Sparkles, RefreshCw, Upload, FileText, ChevronRight, Check, AlertTriangle,
  Layers
} from "lucide-react";
import { api } from "../services/api";
import { Lead, LeadNote, LeadTag, LeadActivity } from "../types";
import QuotationModal from "./QuotationModal";
import { useTheme } from "../context/ThemeContext";

const PIPELINE_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Custom Order",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost"
];

const PRIORITY_LEVELS = ["Hot", "Warm", "Cold"];
const SOURCE_LEVELS = ["WhatsApp", "Manual", "Import"];

export function LeadManagementConsole() {
  const { theme } = useTheme();
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
  const [quotationLead, setQuotationLead] = useState<any | null>(null);
  
  // Custom Order Modal State
  const [resolveCustomLead, setResolveCustomLead] = useState<any | null>(null);
  const [currCustomProdName, setCurrCustomProdName] = useState("");
  const [currCustomProdSku, setCurrCustomProdSku] = useState("");
  const [currCustomProdPrice, setCurrCustomProdPrice] = useState("12.00");
  const [isResolvingCustom, setIsResolvingCustom] = useState(false);
  
  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Missing Information Checklist States
  const [checklistLoading, setChecklistLoading] = useState<boolean>(false);
  const [checklistResult, setChecklistResult] = useState<any>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
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

  const fetchLeadChecklist = async (leadId: string) => {
    try {
      setChecklistLoading(true);
      setChecklistError(null);
      const data = await api.get<any>(`/leads/${leadId}/missing-info`);
      setChecklistResult(data);
    } catch (err: any) {
      console.error("Failed to load Lead Missing Information Checklist:", err);
      setChecklistResult(null);
      setChecklistError(err.message || "Failed to audit checklist.");
    } finally {
      setChecklistLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLeadId) {
      setSidebarTab("profile");
      fetchLeadMessages(selectedLeadId);
      fetchLeadChecklist(selectedLeadId);

      // Auto poll messages every 8 seconds when active in sidebar
      const interval = setInterval(() => {
        fetchLeadMessages(selectedLeadId);
      }, 8000);
      return () => clearInterval(interval);
    } else {
      setWhatsappMessages([]);
      setChecklistResult(null);
    }
  }, [selectedLeadId]);

  const handleOpenCustomOrder = (lead: any) => {
    let specsObj: any = {};
    if (lead.customOrderSpecs) {
      try {
        specsObj = JSON.parse(lead.customOrderSpecs);
      } catch (_) {}
    }
    setResolveCustomLead(lead);
    setCurrCustomProdName(specsObj.product || "Custom Bagasse Plates");
    setCurrCustomProdPrice("12.00");
    
    // Auto generate neat sequence identifier
    const firstLetter = (specsObj.product?.[0] || "P").toUpperCase();
    const endingLetter = (specsObj.product?.[specsObj.product.length - 1] || "G").toUpperCase();
    setCurrCustomProdSku(`${firstLetter}001${endingLetter}`);
  };

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

  const handleSimulateCustomerMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedLead || !manualMessage.trim()) return;
    try {
      setSendingMessage(true);
      const content = manualMessage.trim();
      setManualMessage("");

      await api.post<any>("/webhook/whatsapp", {
        phone: selectedLead.phoneNumber,
        message: content,
        name: selectedLead.name,
        phoneId: "simulated"
      });

      // Update local thread smoothly
      setTimeout(async () => {
        try {
          const data = await api.get<any[]>(`/messages/${selectedLeadId}`);
          setWhatsappMessages(data || []);
          
          const rawLeads = await api.get<Lead[]>("/leads");
          setLeads(rawLeads || []);
        } catch (_) {}
      }, 1200);

    } catch (err: any) {
      alert(err.message || "Failed to deliver simulated WhatsApp customer notification.");
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
        <div className={`border rounded-2xl overflow-hidden shadow-2xl transition-all ${
          theme === "light"
            ? "border-indigo-100 bg-white"
            : "border-slate-900 bg-slate-950/20"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`uppercase tracking-widest text-[9px] font-bold select-none border-b ${
                  theme === "light"
                    ? "bg-slate-50 text-slate-500 border-indigo-100"
                    : "bg-slate-950/80 text-slate-400 border-slate-900"
                }`}>
                  <th className="py-3.5 px-4 font-mono">Lead Identity</th>
                  <th className="py-3.5 px-4 font-mono">Channel Info</th>
                  <th className="py-3.5 px-4 font-mono">Source</th>
                  <th className="py-3.5 px-4 font-mono">Pipeline Stage</th>
                  <th className="py-3.5 px-4 font-mono">Commercial Priority</th>
                  <th className="py-3.5 px-4 font-mono">Created</th>
                  <th className="py-3.5 px-4 font-mono text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-light ${
                theme === "light"
                  ? "divide-indigo-100/40 text-slate-700"
                  : "divide-slate-900/40 text-slate-300"
              }`}>
                {filteredLeads.map((lead) => {
                  const statusColors = getStatusColors(lead.status);
                  const priorityColors = getPriorityColors(lead.priority);
                  const sourceIcon = getSourceIcon(lead.source);

                  return (
                    <tr 
                      key={lead.id} 
                      className={`transition-all cursor-pointer group ${
                        theme === "light" ? "hover:bg-indigo-50/45" : "hover:bg-slate-900/40"
                      } ${
                        selectedLeadId === lead.id 
                          ? theme === "light"
                            ? "bg-indigo-50/70 border-l-2 border-indigo-500"
                            : "bg-indigo-600/10 border-l-2 border-indigo-500" 
                          : ""
                      }`}
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      {/* Name, Phone, Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-[10px] shrink-0 transition-all ${
                            theme === "light"
                              ? "bg-indigo-50/80 text-indigo-600 shadow-sm"
                              : "bg-[#182235]/85 text-[#818cf8] shadow-inner"
                          }`}>
                            #{leads.findIndex(l => l.id === lead.id) + 1}
                          </div>
                          <div>
                            <span className={`block font-semibold font-display group-hover:text-indigo-600 transition-colors ${
                              theme === "light" ? "text-slate-800" : "text-white"
                            }`}>
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
                          {lead.status.toLowerCase() === "qualified" && (
                            <button
                              type="button"
                              onClick={() => setQuotationLead(lead)}
                              className="p-1 px-2 text-indigo-400 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white rounded text-[10px] uppercase font-bold flex items-center cursor-pointer transition-all"
                              title="Construct Quotation Proposal"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              <span>Quote</span>
                            </button>
                          )}
                          {lead.status.toLowerCase() === "custom order" && (
                            <button
                              type="button"
                              onClick={() => handleOpenCustomOrder(lead)}
                              className="p-1 px-2 text-fuchsia-400 bg-fuchsia-600/10 hover:bg-fuchsia-600 hover:text-white rounded text-[10px] uppercase font-bold flex items-center cursor-pointer transition-all animate-pulse"
                              title="Resolve Custom Order Details"
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              <span>Custom Order</span>
                            </button>
                          )}
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
                          className={`p-3 rounded-lg border transition-all cursor-pointer group hover:shadow-lg hover:shadow-indigo-950/5 relative select-none ${
                            theme === "light"
                              ? "bg-[#e7e7fc] border-indigo-200 hover:border-indigo-400"
                              : "bg-slate-950/70 border-slate-900 hover:border-indigo-500/40"
                          } ${
                            selectedLeadId === card.id ? "ring-1 ring-indigo-500 border-indigo-500" : ""
                          } ${draggedLeadId === card.id ? "opacity-50 ring-1 ring-indigo-500/50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1.5 font-sans">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span className="block text-white font-semibold font-display text-xs group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {card.name}
                              </span>
                              {card.status.toLowerCase() === "qualified" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuotationLead(card);
                                  }}
                                  className="p-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all shrink-0 cursor-pointer"
                                  title="Construct Quotation Proposal"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {card.status.toLowerCase() === "custom order" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCustomOrder(card);
                                  }}
                                  className="p-1 rounded bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white transition-all shrink-0 cursor-pointer animate-pulse"
                                  title="Resolve Custom Order Details"
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
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
        <div className={`fixed inset-y-0 right-0 w-full md:w-[480px] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ${
          theme === "light"
            ? "bg-white border-l border-indigo-100"
            : "bg-slate-950 border-l border-slate-900"
        }`}>
          
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between backdrop-blur-md ${
            theme === "light"
              ? "bg-[#e7e7fc] border-indigo-100/80" 
              : "bg-slate-950/80 border-slate-900/55"
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-[10px] shrink-0 transition-all ${
                theme === "light"
                  ? "bg-indigo-100/70 text-indigo-700 shadow-sm" 
                  : "bg-[#182235]/85 text-[#818cf8] shadow-inner"
              }`}>
                #{leads.findIndex(l => l.id === selectedLead.id) + 1}
              </div>
              <div>
                <h3 className={`font-display font-semibold text-sm tracking-tight ${theme === "light" ? "text-slate-800" : "text-white"}`}>{selectedLead.name}</h3>
                <span className="block text-[9px] text-slate-500 font-mono">
                  ID: #{leads.findIndex(l => l.id === selectedLead.id) + 1}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLeadId(null)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === "light"
                  ? "text-slate-500 hover:text-slate-800 hover:bg-indigo-100/50"
                  : "text-slate-450 hover:text-white hover:bg-slate-900"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-tabs Selection bar */}
          <div className={`flex p-1.5 gap-1 shrink-0 border-b ${
            theme === "light"
              ? "border-indigo-100/80 bg-slate-100"
              : "border-indigo-950/40 bg-[#040815]"
          }`}>
            <button
              type="button"
              onClick={() => setSidebarTab("profile")}
              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] uppercase font-display tracking-wider cursor-pointer text-center transition-all ${
                sidebarTab === "profile" 
                  ? theme === "light"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-indigo-600 text-white shadow-md"
                  : theme === "light"
                    ? "text-slate-550 hover:text-slate-850 hover:bg-slate-200/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
              }`}
            >
              📊 Core Profile & Stats
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("whatsapp")}
              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] uppercase font-display tracking-wider cursor-pointer text-center transition-all flex items-center justify-center space-x-1.5 ${
                sidebarTab === "whatsapp" 
                  ? "bg-[#128c7e] text-white shadow-md" 
                  : theme === "light"
                    ? "text-slate-550 hover:text-[#128c7e] hover:bg-slate-200/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
              }`}
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

              {/* CUSTOM ORDER RESOLVER WIDGET */}
              {selectedLead.status.toLowerCase() === "custom order" && (
                <div className="p-4 rounded-xl border flex flex-col space-y-3 transition-all bg-fuchsia-950/20 border-fuchsia-500/30 text-fuchsia-350 shadow-md shadow-fuchsia-950/10 mb-4 animate-in fade-in slide-in-from-top-3">
                  <div className="flex items-start space-x-2.5">
                    <Sparkles className="w-4.5 h-4.5 text-fuchsia-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase text-white font-display">Custom Order Hub</h4>
                      <p className="text-[10px] text-fuchsia-200 leading-normal mt-0.5 font-light">
                        This buyer has requested custom specifications not found in your catalog. Check details to configure.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCustomOrder(selectedLead)}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-fuchsia-650/10 active:scale-95 animate-pulse"
                  >
                    <span>Launch Custom Order Wizard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* QUOTATION PROPOSAL WIDGET */}
              <div className={`p-4 rounded-xl border flex flex-col space-y-3 transition-all ${
                selectedLead.status.toLowerCase() === "qualified"
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-350 shadow-md shadow-amber-950/10"
                  : "bg-[#070c1a]/60 border-slate-900 text-slate-300"
              }`}>
                <div className="flex items-start space-x-2.5">
                  <FileText className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase text-white font-display">Quotation Dispatch Hub</h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5 font-light">
                      {selectedLead.status.toLowerCase() === "qualified" 
                        ? "📄 Proposal Status: QUALIFIED. Compile, manage pricing, and execute scheduled robot sending."
                        : "Compile, manage pricing, and execute scheduled robot sending for this potential contract."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuotationLead(selectedLead)}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-650/10 active:scale-95"
                >
                  <span>Launch Quotation Engine</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

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
            <div className={`p-4 rounded-xl space-y-3 relative overflow-hidden group ${
              theme === "light"
                ? "bg-[#e7e7fc] border border-indigo-200"
                : "bg-indigo-950/15 border border-indigo-900/20"
            }`}>
              <div className={`absolute top-0 right-0 p-3 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity duration-300 ${
                theme === "light" ? "text-indigo-600" : "text-indigo-400"
              }`}>
                <Brain className="w-16 h-16" />
              </div>
              <div className="flex items-center space-x-1.5 relative z-10">
                <Brain className={`w-4 h-4 shrink-0 ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`} />
                <h4 className={`font-display font-bold text-xs uppercase tracking-wider ${theme === "light" ? "text-indigo-900" : "text-indigo-400"}`}>AI Integration Intelligence</h4>
                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-widest leading-none ${
                  theme === "light" ? "text-indigo-700 bg-indigo-100 border border-indigo-200" : "text-indigo-400 bg-indigo-900/30"
                }`}>AI Readiness</span>
              </div>
              <p className={`text-[10px] leading-relaxed font-light relative z-10 ${theme === "light" ? "text-slate-700" : "text-slate-400"}`}>
                These scores and suggestions align with <b>Phase 7 (AI Decision Engine)</b>. Values will generate automatically when live WhatsApp chat traffic starts.
              </p>

              {/* Rating metrics input simulator */}
              <div className="grid grid-cols-2 gap-3 pt-1 relative z-10">
                <div className={`p-2.5 rounded-lg border ${
                  theme === "light" ? "bg-white border-indigo-100" : "bg-slate-950/60 border-slate-900"
                }`}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Intent Strength</div>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className={`text-sm font-bold font-mono ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                      {selectedLead.intentScore !== null ? `${selectedLead.intentScore}%` : "Not evaluated"}
                    </span>
                  </div>
                  {/* Simulate scoring capability */}
                  <div className={`mt-1 rounded-full h-1 relative overflow-hidden ${theme === "light" ? "bg-slate-100" : "bg-slate-900"}`}>
                    <div className="h-full bg-indigo-500" style={{ width: selectedLead.intentScore !== null ? `${selectedLead.intentScore}%` : "0%" }} />
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedLead.intentScore || 0} 
                      onChange={(e) => handleUpdateLeadField(selectedLead.id, "intentScore", Number(e.target.value))}
                      className={`w-full accent-indigo-500 h-1.5 rounded-lg cursor-pointer ${
                        theme === "light" ? "bg-slate-200" : "bg-slate-800"
                      }`}
                    />
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  theme === "light" ? "bg-white border-indigo-100" : "bg-slate-950/60 border-slate-900"
                }`}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Lead Qualifier</div>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className={`text-sm font-bold font-mono ${theme === "light" ? "text-purple-700" : "text-purple-400"}`}>
                      {selectedLead.leadScore !== null ? `${selectedLead.leadScore}/100` : "Not calibrated"}
                    </span>
                  </div>
                  <div className={`mt-1 rounded-full h-1 relative overflow-hidden ${theme === "light" ? "bg-slate-100" : "bg-slate-900"}`}>
                    <div className="h-full bg-purple-500" style={{ width: selectedLead.leadScore !== null ? `${selectedLead.leadScore}%` : "0%" }} />
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedLead.leadScore || 0} 
                      onChange={(e) => handleUpdateLeadField(selectedLead.id, "leadScore", Number(e.target.value))}
                      className={`w-full accent-purple-500 h-1.5 rounded-lg cursor-pointer ${
                        theme === "light" ? "bg-slate-200" : "bg-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Recommendation panel */}
              <div className={`p-2.5 rounded-lg border mt-1 relative z-10 ${
                theme === "light" ? "bg-white border-indigo-100" : "bg-slate-950/40 border-slate-900/60"
              }`}>
                <span className="block text-[9px] text-slate-500 uppercase font-mono tracking-wider">AI Recommended Next Best Action</span>
                <textarea
                  className={`w-full bg-transparent border-0 text-[11px] mt-1 h-12 focus:ring-0 focus:outline-none resize-none font-light italic leading-relaxed ${
                    theme === "light" ? "text-slate-800 placeholder-slate-400" : "text-slate-300 placeholder-slate-650"
                  }`}
                  placeholder="Enter custom recommendation or wait for AI engine generation on active channels..."
                  value={selectedLead.aiRecommendation || ""}
                  onChange={(e) => handleUpdateLeadField(selectedLead.id, "aiRecommendation", e.target.value)}
                />
              </div>

              {/* Latest Intent Memory */}
              <div className={`p-2.5 rounded-lg border mt-2 flex items-center justify-between relative z-10 ${
                theme === "light" ? "bg-white border-indigo-100" : "bg-slate-950/40 border-slate-900/60"
              }`}>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-mono tracking-wider">Latest Detected Intent</span>
                  <span className={`text-[11px] font-semibold uppercase mt-0.5 block ${theme === "light" ? "text-indigo-900" : "text-indigo-400"}`}>{selectedLead.latestIntent || "UNKNOWN"}</span>
                </div>
                {selectedLead.latestIntent && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-tight ${
                    theme === "light" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "bg-indigo-950/40 text-indigo-400 border border-indigo-900/40"
                  }`}>
                    Active Intent
                  </span>
                )}
              </div>
            </div>

            {/* MISSING INFORMATION CHECKLIST & QUALIFIER AUDIT */}
            <div className="space-y-3 bg-[#040817] p-4 border border-slate-900 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h4 className="font-display font-bold text-xs uppercase text-slate-200 tracking-wider">Qualification Checklist</h4>
                </div>
                <button
                  type="button"
                  onClick={() => selectedLeadId && fetchLeadChecklist(selectedLeadId)}
                  disabled={checklistLoading}
                  className="p-1 rounded bg-[#02050b] text-slate-400 hover:text-white border border-slate-900/60 disabled:opacity-40 transition-all cursor-pointer"
                  title="Force AI Audit Re-Trigger"
                >
                  <RefreshCw className={`w-3 h-3 ${checklistLoading ? "animate-spin text-emerald-400" : ""}`} />
                </button>
              </div>

              {checklistLoading ? (
                <div className="space-y-2 py-3 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                  <span className="text-[10px] text-slate-500 font-mono">Running lead memory AI audit...</span>
                </div>
              ) : checklistError ? (
                <div className="p-2 border border-rose-950 bg-rose-950/15 rounded text-rose-500 text-[10px] flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Checklist Error: {checklistError}</span>
                </div>
              ) : checklistResult ? (
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Live Audit Completeness</span>
                      <span className="font-bold text-emerald-400">{checklistResult.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-[#030611] h-1.5 rounded-full overflow-hidden border border-slate-900/60">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${checklistResult.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Industry checklist check items */}
                  <div className="bg-[#02050b]/80 p-2.5 rounded-lg border border-slate-950 space-y-2">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-mono">
                      Business Focus: {checklistResult.resolvedBusinessType || "General Selection"}
                    </span>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      {(
                        checklistResult.resolvedBusinessType === "Packaging" ? ["product", "quantity", "size", "location"] :
                        checklistResult.resolvedBusinessType === "Real Estate" ? ["propertyType", "budget", "location", "purchaseTimeline"] :
                        ["product", "budget", "occasion", "purchaseDate"]
                      ).map((field: string) => {
                        const isMissing = checklistResult.missingFields?.some(
                          (m: string) => m.toLowerCase() === field.toLowerCase()
                        );
                        return (
                          <div 
                            key={field} 
                            className={`p-1.5 rounded border text-[10px] flex items-start space-x-1.5 truncate transition-all ${
                              isMissing 
                                ? "bg-slate-950/20 border-slate-900/50 text-slate-500" 
                                : "bg-emerald-950/10 border-emerald-950/40 text-emerald-400 font-medium"
                            }`}
                          >
                            {isMissing ? (
                              <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            <span className="capitalize truncate leading-snug">{field.replace(/([A-Z])/g, ' $1')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Next Question Advice Card */}
                  {checklistResult.nextQuestion && (
                    <div className="p-3 bg-[#02050b]/60 border border-slate-900/80 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-indigo-400 uppercase tracking-widest font-mono font-bold leading-none">
                          Next Suggested Question ({checklistResult.nextRequiredField || "General Inquiry"})
                        </span>
                        <span className="text-[8px] text-slate-500 leading-none">WhatsApp Draft</span>
                      </div>
                      <p className="text-[10.5px] font-light text-slate-300 leading-relaxed italic bg-slate-950/40 p-2 border border-slate-1000 rounded-md">
                        &quot;{checklistResult.nextQuestion}&quot;
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setManualMessage(checklistResult.nextQuestion);
                          setSidebarTab("whatsapp");
                        }}
                        className="w-full py-1 px-2.5 rounded bg-indigo-950/30 text-indigo-400 hover:bg-indigo-900/20 border border-indigo-900/30 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Load as WhatsApp Draft</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 text-center py-2 italic font-mono">
                  Wait for Lead context parsing details...
                </div>
              )}
            </div>

            {/* LEAD STAGE PIPELINE TRANSITION TIMELINE */}
            <div className="space-y-3 bg-[#030611] p-4 border border-slate-900 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h4 className="font-display font-bold text-xs uppercase text-slate-200 tracking-wider">Pipeline Stage Journey</h4>
                </div>
                <span className="text-[8px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                  Autodetected Stages
                </span>
              </div>

              {/* Display current & previous state cleanly */}
              <div className="grid grid-cols-2 gap-2 bg-[#02050b]/80 p-2.5 rounded-lg border border-slate-950">
                <div className="text-center p-1.5 rounded bg-[#030611]/60 border border-slate-900/60">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-mono">Current Stage</span>
                  <span className="text-[11px] font-extrabold text-indigo-400 uppercase mt-1 block">
                    {selectedLead.currentStage || "NEW"}
                  </span>
                </div>
                <div className="text-center p-1.5 rounded bg-[#030611]/60 border border-slate-900/60">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-mono">Previous Stage</span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase mt-1 block">
                    {selectedLead.previousStage || "None"}
                  </span>
                </div>
              </div>

              {/* Vertical timeline map */}
              <div className="space-y-3 pt-1">
                {!selectedLead.leadStageHistories || selectedLead.leadStageHistories.length === 0 ? (
                  <div className="text-[10px] text-slate-600 text-center py-4 border border-dashed border-slate-900 rounded-xl">
                    <span>No stage transitions recorded yet. Initial stage is assumed NEW.</span>
                  </div>
                ) : (
                  <div className="relative border-l border-slate-800/80 ml-3.5 pl-5 space-y-4 pt-1.5 pb-1 max-h-[250px] overflow-y-auto scrollbar-thin pr-1">
                    {selectedLead.leadStageHistories.map((hist, index) => {
                      return (
                        <div key={hist.id || index} className="relative group">
                          {/* Timeline node circle */}
                          <div className="absolute -left-[27.5px] top-1 w-3.5 h-3.5 rounded-full bg-[#050917] border-2 border-slate-700 group-hover:border-indigo-500 transition-colors flex items-center justify-center shrink-0 z-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          </div>

                          <div className="space-y-1">
                            {/* Header: stages transfer & date */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-1 font-mono text-[9.5px]">
                                <span className="font-bold text-slate-400">{hist.oldStage}</span>
                                <ArrowRight className="w-3 h-3 text-slate-500" />
                                <span className="font-extrabold text-indigo-400">{hist.newStage}</span>
                              </div>
                              <span className="text-[8.5px] text-slate-505 font-mono">
                                {new Date(hist.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>

                            {/* Body: Reason & confidence */}
                            {hist.reason && (
                              <p className="text-[10.5px] font-light text-slate-350 leading-relaxed italic bg-[#02050b]/60 p-2 border border-slate-950 rounded-lg">
                                &quot;{hist.reason}&quot;
                              </p>
                            )}
                            
                            <div className="text-[8.5px] text-slate-500 font-mono flex items-center justify-between">
                              <span className="flex items-center space-x-1">
                                <span>Confidence score:</span>
                                <span className="font-bold text-indigo-400/85">{hist.confidence || 100}%</span>
                              </span>
                              <span>Autodetected &bull; Verified</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

            {/* LEAD INTENT TIMELINE */}
            <div className="space-y-2.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider font-display flex items-center space-x-1">
                <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Lead Intent Timeline</span>
              </h4>

              <div className="space-y-2">
                {!selectedLead.leadIntents || selectedLead.leadIntents.length === 0 ? (
                  <div className="text-[10px] text-slate-600 text-center py-6 border border-dashed border-slate-900 rounded-xl">
                    <span>No automated intents detected for this lead yet.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin rounded-xl border border-slate-900/40 p-1 bg-slate-950/20">
                    {selectedLead.leadIntents.map(intentItem => {
                      // Custom colors based on intent type
                      let badgeColor = "bg-slate-900/40 text-slate-400 border-slate-800";
                      switch (intentItem.intent) {
                        case "PURCHASE_READY":
                          badgeColor = "bg-emerald-950/40 text-emerald-400 border-emerald-900/60";
                          break;
                        case "QUOTE_REQUEST":
                        case "PRICE_INQUIRY":
                        case "MOQ_INQUIRY":
                          badgeColor = "bg-sky-950/40 text-sky-400 border-sky-900/60";
                          break;
                        case "MEETING_REQUEST":
                          badgeColor = "bg-indigo-950/40 text-indigo-450 border-indigo-900/60";
                          break;
                        case "PRODUCT_INQUIRY":
                        case "PRODUCT_INFO":
                          badgeColor = "bg-blue-950/40 text-blue-400 border-blue-900/60";
                          break;
                        case "GREETING":
                          badgeColor = "bg-purple-950/40 text-purple-400 border-purple-900/60";
                          break;
                        case "OBJECTION":
                          badgeColor = "bg-amber-955/40 text-amber-405 border-amber-900/60";
                          break;
                        case "FOLLOWUP_STATUS":
                          badgeColor = "bg-teal-950/40 text-teal-400 border-teal-900/60";
                          break;
                        case "GENERAL_QUESTION":
                          badgeColor = "bg-pink-950/40 text-pink-400 border-pink-900/60";
                          break;
                      }

                      return (
                        <div 
                          key={intentItem.id} 
                          className="bg-slate-950/60 p-3 border border-slate-900/60 rounded-xl space-y-2 text-xs relative mb-2 last:mb-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${badgeColor}`}>
                              {intentItem.intent}
                            </span>
                            <span className="text-[10px] text-indigo-400 font-mono flex items-center space-x-0.5">
                              <span>Confidence:</span> 
                              <span className="font-bold">{intentItem.confidence}%</span>
                            </span>
                          </div>
                          
                          <p className="text-slate-300 font-light leading-relaxed italic bg-black/20 p-2 rounded-lg border border-slate-950/50">
                            "{intentItem.message}"
                          </p>

                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{new Date(intentItem.createdAt).toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
            <div className={`flex-1 flex flex-col overflow-hidden ${
              theme === "light" ? "bg-slate-50" : "bg-[#040815]"
            }`}>
              
              {/* WhatsApp specific header / stats row */}
              <div className={`p-3 flex items-center justify-between text-[11px] border-b ${
                theme === "light"
                  ? "bg-slate-100/90 border-indigo-100"
                  : "bg-slate-950 border-indigo-950"
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1ebea5]" />
                  <span className={`font-mono font-medium ${theme === "light" ? "text-slate-705" : "text-slate-400"}`}>{selectedLead.phoneNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-505 font-mono">Status:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                    theme === "light"
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200/50"
                      : "bg-indigo-950/40 text-indigo-400"
                  }`}>
                    {selectedLead.conversationStatus || "Idle"}
                  </span>
                </div>
              </div>

              {/* Chat messages viewport with fixed custom background */}
              <div className={`flex-grow flex flex-col min-h-0 relative overflow-hidden ${
                theme === "light" ? "bg-[#efeae2]" : "bg-[#0b141a]"
              }`}>
                {/* WhatsApp Doodle Pattern Overlay - served locally */}
                <div 
                  className={`absolute inset-0 pointer-events-none ${
                    theme === "light"
                      ? "opacity-[0.82] mix-blend-multiply contrast-[1.1]" 
                      : "opacity-[0.08] invert"
                  }`}
                  style={{
                    backgroundImage: `url('/whatsapp-bg.png')`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '360px',
                  }}
                />

                {/* Real scrollable messages stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin flex flex-col relative z-10">
                  {chatLoading && whatsappMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-light my-auto relative z-10">
                      <span>Synchronizing communications stream...</span>
                    </div>
                  ) : whatsappMessages.length === 0 ? (
                    <div className="text-center py-12 space-y-2 max-w-xs mx-auto my-auto relative z-10">
                      <span className="block text-[#1ebea5] font-bold text-lg">💬</span>
                      <h5 className={`font-bold text-xs uppercase leading-none ${theme === "light" ? "text-slate-800" : "text-white"}`}>No conversation traffic yet</h5>
                      <p className={`text-[10px] font-light leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-500"}`}>No messages have been processed for this contact. Use the dispatcher panel below to execute an outbound template push notification or greeting.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-auto relative z-10">
                      {/* Instant back-history render */}
                      {whatsappMessages.map((msg: any) => {
                        const isIncoming = msg.direction === "IN" || msg.direction === "incoming";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isIncoming ? "justify-start" : "justify-end"}`}
                          >
                            <div
                              className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed relative ${
                                isIncoming 
                                  ? theme === "light"
                                    ? "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm"
                                    : "bg-[#182229] text-white border border-[#233138] rounded-tl-none"
                                  : theme === "light"
                                    ? "bg-[#d9fdd3] text-slate-800 border border-[#c1fca4]/30 rounded-tr-none shadow-sm"
                                    : "bg-[#005c4b] text-white rounded-tr-none"
                              }`}
                            >
                              <p className="whitespace-pre-wrap font-sans">{msg.content || msg.message}</p>
                              <span className={`block text-[8px] font-mono text-right mt-1 leading-none select-none opacity-80 ${
                                theme === "light" ? "text-slate-500" : "text-slate-350"
                              }`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Message composer input section */}
              <form onSubmit={handleSendManualMessage} className={`p-3 space-y-2 shrink-0 border-t ${
                theme === "light"
                  ? "bg-slate-50 border-slate-200/60"
                  : "bg-slate-950 border-[#1f2c34]"
              }`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    placeholder="Type a manual WhatsApp message reply..."
                    className={`flex-grow outline-none border rounded-xl p-2.5 text-xs transition-all ${
                      theme === "light"
                        ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400"
                        : "bg-[#0c1226] border-[#233138] focus:border-indigo-500 text-white"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !manualMessage.trim()}
                    className="px-3 bg-[#128c7e] hover:bg-[#1ebb5a] text-white font-bold text-[10px] uppercase rounded-xl disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                    title="Send manual outreach message to customer"
                  >
                    {sendingMessage ? "..." : "Outbound"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateCustomerMessage}
                    disabled={sendingMessage || !manualMessage.trim()}
                    className="px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase rounded-xl disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                    title="Simulate this message as incoming from the customer"
                  >
                    {sendingMessage ? "..." : "Simulate Inbound"}
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono pt-1">
                  <span className={theme === "light" ? "text-slate-500" : "text-slate-400"}>🤖 Basic AI Auto-Reply Active</span>
                  <button
                    type="button"
                    onClick={() => fetchLeadMessages(selectedLead.id)}
                    className={`flex items-center space-x-1 hover:underline transition-all ${
                      theme === "light"
                        ? "text-indigo-600 hover:text-indigo-700"
                        : "text-indigo-400 hover:text-indigo-300"
                    }`}
                  >
                    <span>↻ Real-time Sync</span>
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* Footer controls */}
          <div className={`p-4 flex justify-between gap-4 border-t ${
            theme === "light"
              ? "bg-[#f8fafc] border-indigo-100/80"
              : "bg-slate-950 border-slate-905"
          }`}>
            <button
              onClick={() => setSelectedLeadId(null)}
              className={`flex-grow rounded-lg text-xs font-semibold py-2.5 cursor-pointer text-center transition-all ${
                theme === "light"
                  ? "bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-bold"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300"
              }`}
            >
              Close Inspector
            </button>
            <button
              onClick={() => setLeadToDelete(selectedLead.id)}
              className={`px-4 rounded-lg text-xs font-semibold py-2.5 border transition-all cursor-pointer flex items-center space-x-1 justify-center shrink-0 active:scale-95 ${
                theme === "light"
                  ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600"
                  : "bg-red-955/10 hover:bg-red-650 text-red-100 border-red-950/40"
              }`}
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

      {/* QUOTATION CREATION/MANAGEMENT MODAL */}
      {quotationLead && (
        <QuotationModal
          lead={quotationLead}
          onClose={() => setQuotationLead(null)}
          onQuotationCreated={() => {
            // Trigger refresh
            api.get<any[]>("/leads").then(data => setLeads(data || [])).catch(e => console.error(e));
          }}
        />
      )}

      {/* CUSTOM ORDER RESOLUTION MODAL */}
      {resolveCustomLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all ${
            theme === "light"
              ? "bg-white border-slate-200 text-slate-800"
              : "bg-[#0b1329] border border-fuchsia-900/45 text-slate-200"
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between transition-all ${
              theme === "light"
                ? "bg-fuchsia-50/50 border-slate-100"
                : "bg-gradient-to-r from-fuchsia-950/20 to-indigo-950/20 border-slate-900"
            }`}>
              <div className="flex items-center space-x-2">
                <Sparkles className={`w-5 h-5 ${theme === "light" ? "text-fuchsia-600" : "text-fuchsia-400"}`} />
                <h3 className={`font-display font-medium text-base uppercase tracking-wider ${theme === "light" ? "text-slate-800" : "text-white"}`}>Custom Order Wizard</h3>
              </div>
              <button 
                onClick={() => setResolveCustomLead(null)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === "light"
                    ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white hover:bg-slate-950"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Lead Summary */}
              <div className={`border rounded-xl p-3.5 space-y-2 transition-all ${
                theme === "light"
                  ? "bg-slate-50 border-slate-200"
                  : "bg-[#030611] border border-slate-900"
              }`}>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-wide">
                  <span>Lead Account</span>
                  <span className={`${theme === "light" ? "text-fuchsia-600" : "text-fuchsia-400"} font-bold`}>Custom Request Detected</span>
                </div>
                <div className={`font-bold text-sm ${theme === "light" ? "text-slate-800" : "text-white"}`}>{resolveCustomLead.name}</div>
                <div className={`text-xs font-light ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>{resolveCustomLead.companyName || "No Company Specified"}</div>
              </div>

              {/* Customer Order Details Section */}
              <div className="space-y-2">
                <h4 className={`text-[10px] font-bold uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>Customer Order Details</h4>
                <div className={`border rounded-xl p-4 space-y-3 font-sans transition-all ${
                  theme === "light"
                    ? "bg-fuchsia-50/30 border-fuchsia-200/50"
                    : "bg-fuchsia-950/10 border border-fuchsia-900/30"
                }`}>
                  {(() => {
                    let specs: any = {};
                    try {
                      if (resolveCustomLead.customOrderSpecs) {
                        specs = JSON.parse(resolveCustomLead.customOrderSpecs);
                      }
                    } catch (_) {}
                    return (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className={`${theme === "light" ? "text-slate-500" : "text-slate-400"} block mb-0.5`}>Requested Product</span>
                          <span className={`font-semibold ${theme === "light" ? "text-slate-800" : "text-white"}`}>{specs.product || "Custom Specs Product"}</span>
                        </div>
                        <div>
                          <span className={`${theme === "light" ? "text-slate-500" : "text-slate-400"} block mb-0.5`}>Size/Specs</span>
                          <span className={`font-semibold ${theme === "light" ? "text-slate-800" : "text-white"}`}>{specs.size || "Standard Size"}</span>
                        </div>
                        <div>
                          <span className={`${theme === "light" ? "text-slate-500" : "text-slate-400"} block mb-0.5`}>Requested Qty</span>
                          <span className={`${theme === "light" ? "text-emerald-700 font-extrabold" : "text-emerald-400 font-bold"} font-mono`}>{(specs.quantity || 5000).toLocaleString()} units</span>
                        </div>
                        <div>
                          <span className={`${theme === "light" ? "text-slate-500" : "text-slate-400"} block mb-0.5`}>System Status</span>
                          <span className={`${theme === "light" ? "text-fuchsia-600" : "text-fuchsia-400"} font-mono font-bold uppercase`}>Missing from Catalog</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Add Custom Product Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setIsResolvingCustom(true);
                  const res = await api.post<any>(`/leads/${resolveCustomLead.id}/resolve-custom-order`, {
                    productName: currCustomProdName,
                    skuCode: currCustomProdSku,
                    unitPrice: currCustomProdPrice
                  });
                  alert(res.message || "Custom Product configured successfully and sent to owner for approval!");
                  setResolveCustomLead(null);
                  
                  // Refresh leads
                  const freshLeads = await api.get<any[]>("/leads");
                  setLeads(freshLeads || []);
                  
                  // If selected, refresh detail sidebar too
                  if (selectedLeadId === resolveCustomLead.id) {
                    setSelectedLeadId(null);
                    setTimeout(() => setSelectedLeadId(resolveCustomLead.id), 100);
                  }
                } catch (err: any) {
                  alert(err.message || "Failed to resolve custom order.");
                } finally {
                  setIsResolvingCustom(false);
                }
              }} className="space-y-4">
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>Add to Product List (Product Name) *</label>
                    <input 
                      type="text"
                      value={currCustomProdName}
                      onChange={(e) => setCurrCustomProdName(e.target.value)}
                      className={`w-full focus:border-fuchsia-500 rounded-lg p-2.5 outline-none text-xs font-light transition-all border ${
                        theme === "light"
                          ? "bg-white border-slate-200 text-slate-800"
                          : "bg-[#030611] border border-slate-900 text-white"
                      }`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-bold uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>SKU Code *</label>
                      <input 
                        type="text"
                        value={currCustomProdSku}
                        onChange={(e) => setCurrCustomProdSku(e.target.value)}
                        className={`w-full focus:border-fuchsia-500 rounded-lg p-2.5 outline-none text-xs font-mono transition-all border ${
                          theme === "light"
                            ? "bg-white border-slate-200 text-slate-800"
                            : "bg-[#030611] border border-slate-900 text-white"
                        }`}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-bold uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>Unit Price (INR) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={currCustomProdPrice}
                        onChange={(e) => setCurrCustomProdPrice(e.target.value)}
                        className={`w-full focus:border-fuchsia-500 rounded-lg p-2.5 outline-none text-xs font-mono transition-all border ${
                          theme === "light"
                            ? "bg-white border-slate-200 text-slate-800"
                            : "bg-[#030611] border border-slate-900 text-white"
                        }`}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className={`pt-4 border-t flex items-center justify-between transition-all ${
                  theme === "light" ? "border-slate-100" : "border-slate-900/60"
                }`}>
                  <button
                    type="button"
                    onClick={() => setResolveCustomLead(null)}
                    className={`py-2 px-4 rounded-xl font-medium text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      theme === "light"
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResolvingCustom}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-fuchsia-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isResolvingCustom ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Product Added</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
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
    case "Custom Order":
      return { bg: "bg-fuchsia-950/25", text: "text-fuchsia-400", border: "border-fuchsia-900/40" };
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
    case "Custom Order":
      return { dot: "bg-fuchsia-500" };
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
