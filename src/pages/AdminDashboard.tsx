import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import { AdminStats, ClientProfile, Plan } from "../types";

// Import modular sub components
import ClientDetailModal from "../components/ClientDetailModal";
import ClientEditModal from "../components/ClientEditModal";
import ClientCreateModal from "../components/ClientCreateModal";
import PlanManagerModal from "../components/PlanManagerModal";

// Icons
import { 
  BarChart3, 
  Users, 
  Settings as SettingsIcon, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  Radio, 
  Loader2, 
  Check, 
  AlertCircle, 
  User as UserIcon,
  HelpCircle,
  Database,
  RefreshCw,
  Sliders,
  Sparkles,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Globe,
  MapPin,
  Phone,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
  Calendar,
  DollarSign,
  Briefcase,
  Ban,
  CheckCircle2,
  Play,
  Sun,
  Moon
} from "lucide-react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "subscriptions" | "settings">("dashboard");
  const [activeSubTab, setActiveSubTab] = useState<"subscriptions" | "plans">("subscriptions");

  // Server state parameters
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Responsive layout state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search, sorting, filters, pagination keys
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // Active, Suspended, Pending
  const [planFilter, setPlanFilter] = useState(""); // Starter, Growth, Pro, Enterprise
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal display controllers
  const [selectedClientDetail, setSelectedClientDetail] = useState<ClientProfile | null>(null);
  const [selectedClientEdit, setSelectedClientEdit] = useState<ClientProfile | null>(null);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientProfile | null>(null);

  // Directly assign billing subscription states
  const [isAssignSubOpen, setIsAssignSubOpen] = useState<string | null>(null); // holds client ID
  const [assignPlanName, setAssignPlanName] = useState("Starter");
  const [assignStatus, setAssignStatus] = useState("Active");
  const [assignExpiryDate, setAssignExpiryDate] = useState("");
  const [assignPrice, setAssignPrice] = useState("");

  // Custom live Toast alert notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Fetch Admin General Metrics Summary Cards
  const fetchAdminStats = async () => {
    try {
      const statsData = await api.get<AdminStats>("/admin/stats");
      setStats(statsData);
    } catch (err: any) {
      console.error("Stats fetching error:", err);
    }
  };

  // 2. Fetch SME Clients roster table (Schedules on search, filters, sorting changes)
  const fetchClients = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const queryParams = new URLSearchParams({
        search,
        status: statusFilter,
        plan: planFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: limit.toString(),
      });
      const data = await api.get<any>(`/admin/clients?${queryParams.toString()}`);
      setClients(data.clients || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.totalCount || 0);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load SME registers database records.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Pricing Membership Plans list
  const fetchPlans = async () => {
    try {
      const plansData = await api.get<Plan[]>("/admin/plans");
      setPlans(plansData || []);
    } catch (err: any) {
      console.error("Plans fetching error:", err);
    }
  };

  // Initialize and synchronise data loops
  useEffect(() => {
    fetchAdminStats();
    fetchPlans();
  }, [activeTab]);

  // Sync clients collection when pagination/sort/filter changes
  useEffect(() => {
    fetchClients();
  }, [search, statusFilter, planFilter, sortBy, sortOrder, page, limit, activeTab]);

  const handleRefreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchAdminStats(), fetchClients(), fetchPlans()]);
    showToast("Workspace records refreshed successfully.", "success");
  };

  // Create Client
  const handleCreateClient = async (payload: any) => {
    setActionLoadingId("create");
    try {
      await api.post("/admin/clients", payload);
      showToast(`SME profile ${payload.companyName} created, credentials linked successfully.`, "success");
      await handleRefreshAll();
    } catch (err: any) {
      showToast(err.message || "Failed to manually register user.", "error");
      throw err;
    } finally {
      setActionLoadingId(null);
    }
  };

  // Edit Client
  const handleEditClient = async (payload: any) => {
    if (!selectedClientEdit) return;
    setActionLoadingId(selectedClientEdit.id);
    try {
      await api.put(`/admin/clients/${selectedClientEdit.id}`, payload);
      showToast(`Configurations for ${payload.companyName} saved locally.`, "success");
      await handleRefreshAll();
    } catch (err: any) {
      showToast(err.message || "Failed to modify client specifications.", "error");
      throw err;
    } finally {
      setActionLoadingId(null);
    }
  };

  // Change account status directly (Suspend / Activate)
  const handleToggleAccountStatus = async (client: ClientProfile) => {
    setActionLoadingId(client.id);
    const newStatus = client.accountStatus === "Active" ? "Suspended" : "Active";
    try {
      await api.put(`/admin/clients/${client.id}/status`, { accountStatus: newStatus });
      showToast(`User account for ${client.companyName} has been ${newStatus.toLowerCase()}.`, "info");
      await handleRefreshAll();
    } catch (err: any) {
      showToast(err.message || "Status change was declined.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Change subscription status directly (Suspend billing / Reactivate billing)
  const handleToggleSubscriptionStatus = async (client: ClientProfile) => {
    if (!client.subscription) return;
    setActionLoadingId(client.id);
    const newStatus = client.subscription.status === "Active" ? "Suspended" : "Active";
    try {
      await api.put(`/admin/clients/${client.id}/subscription`, { status: newStatus });
      showToast(`Subscription billing is now ${newStatus.toLowerCase()} for ${client.companyName}.`, "info");
      await handleRefreshAll();
    } catch (err: any) {
      showToast(err.message || "Billing status modification declined.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Client
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setActionLoadingId(clientToDelete.id);
    try {
      await api.delete(`/admin/clients/${clientToDelete.id}`);
      showToast(`Client ${clientToDelete.companyName} dismantled successfully.`, "success");
      setClientToDelete(null);
      await handleRefreshAll();
    } catch (err: any) {
      showToast(err.message || "Client termination abortive.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save/Create Plan
  const handleSavePlan = async (payload: any) => {
    setActionLoadingId("plan-save");
    try {
      if (selectedPlan) {
        // Edit existing
        await api.put(`/admin/plans/${selectedPlan.id}`, payload);
        showToast(`Membership Plan tier ${payload.name} modified successfully.`, "success");
      } else {
        // Create new
        await api.post("/admin/plans", payload);
        showToast(`New pricing tier ${payload.name} launched successfully.`, "success");
      }
      await fetchPlans();
    } catch (err: any) {
      showToast(err.message || "Failed to commit membership tier.", "error");
      throw err;
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Pricing Plan
  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to completely delete the pricing plan "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      await api.delete(`/admin/plans/${id}`);
      showToast(`Pricing tier plan liquidated successfully.`, "success");
      await fetchPlans();
    } catch (err: any) {
      showToast(err.message || "Liquidate plan operation failed.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Assign Custom Subscription
  const handleAssignSubSubmit = async (clientId: string) => {
    if (!assignPlanName || !assignStatus || !assignExpiryDate) {
      showToast("Fill in expiry date and plan parameters first.", "error");
      return;
    }
    setActionLoadingId(clientId);
    try {
      await api.post(`/admin/clients/${clientId}/assign-subscription`, {
        planName: assignPlanName,
        status: assignStatus,
        expiryDate: assignExpiryDate,
        price: assignPrice ? parseFloat(assignPrice) : undefined
      });
      showToast("Custom subscription assigned and synchronized correctly.", "success");
      setIsAssignSubOpen(null);
      await handleRefreshAll();
    } catch (err: any) {
      showToast(err.message || "Assigning custom billing failed.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper formatting values
  const getSubBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40";
      case "TRIAL":
        return "bg-indigo-950/40 text-indigo-400 border border-indigo-900/40";
      case "SUSPENDED":
        return "bg-rose-950/40 text-rose-400 border border-rose-900/40";
      case "EXPIRED":
        return "bg-yellow-950/40 text-yellow-455 border border-yellow-905/40";
      default:
        return "bg-slate-950/40 text-slate-400 border border-slate-900";
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row relative font-sans text-xs">
      
      {/* Toast Alert floating */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2.5 p-4 rounded-xl shadow-xl border md:max-w-md animate-bounce ${
          toast.type === "success" 
            ? "bg-[#091a13] text-emerald-400 border-emerald-500" 
            : toast.type === "error"
            ? "bg-[#240c0c] text-rose-400 border-rose-500"
            : "bg-[#0f1224] text-indigo-400 border-indigo-500"
        }`}>
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "info" && <Sparkles className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-white text-[11px] font-display">{toast.message}</span>
        </div>
      )}

      {/* Mobile Header Nav bar */}
      <div className="md:hidden border-b border-slate-900 bg-[#070b19] h-12 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-xs">
            L
          </div>
          <span className="font-display font-bold text-xs tracking-tight text-white uppercase">LeadSmart Admin</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-450 hover:text-white transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside 
        className={`fixed md:sticky top-0 left-0 bottom-0 z-30 w-64 bg-[#070a13] border-r border-slate-900 flex flex-col justify-between p-4 transition-transform md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Logo brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white font-display">
                L
              </div>
              <div>
                <span className="font-display font-bold text-sm tracking-tight text-white uppercase">LeadSmart AI</span>
                <span className="block text-[8px] text-indigo-400 tracking-widest font-bold uppercase leading-none mt-0.5">SaaS Administrator</span>
              </div>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User profile capsule */}
          <div className="p-3 rounded-xl bg-[#030611] border border-slate-900/60 flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-90D flex items-center justify-center border border-indigo-900/40 text-indigo-400 shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden min-w-0">
              <span className="block text-xs font-semibold text-white truncate font-display">{user?.name || "SaaS Admin"}</span>
              <span className="block text-[10px] text-slate-500 font-light truncate">{user?.email}</span>
            </div>
          </div>

          {/* Sidebar Menu options */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Metrics & Stats</span>
            </button>

            <button
              onClick={() => { setActiveTab("clients"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "clients"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-slate-505" />
                <span>Client Accounts</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 font-mono text-indigo-400 border border-indigo-950">
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("subscriptions"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "subscriptions"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <CreditCard className="w-4 h-4 text-slate-505" />
              <span>SaaS Subscriptions</span>
            </button>

            <button
              onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <span>Global Environment</span>
            </button>
          </nav>
        </div>

        {/* Database configurations and Signout */}
        <div className="space-y-4 pt-4 border-t border-slate-950">
          <div className="text-[9px] text-slate-500 space-y-1 bg-[#02050b] p-2.5 rounded-lg border border-slate-950">
            <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-indigo-450 shrink-0" />
              <span>System Engines status</span>
            </span>
            <span className="block">Prisma ORM SQLite Sandbox</span>
            <span className="block">Active Plans: {plans.length}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-rose-455 hover:text-rose-350 hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out System</span>
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col overflow-x-hidden min-h-0 bg-[#030712] relative z-10 p-4 md:p-8 space-y-6">
        
        {/* Top Header navbar with dynamic titles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-900 gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-white uppercase tracking-tight">
              {activeTab === "dashboard" && "OS METRICS & SYSTEM PARAMETERS"}
              {activeTab === "clients" && "SME CLIENT ROSTER MANAGEMENT"}
              {activeTab === "subscriptions" && "MEMBERSHIP SYSTEMS SELECTION"}
              {activeTab === "settings" && "ADMIN COMPLIANCE VARIABLES"}
            </h1>
            <p className="text-[10px] text-slate-450 italic mt-0.5">
              {activeTab === "dashboard" && "Real-time summary, registered tenants status, & computed MRR."}
              {activeTab === "clients" && "Search, filter, edit billing tiers, suspend logs & profile inspection."}
              {activeTab === "subscriptions" && "Alter plans prices, maximum users, credits, and issue subscriptions."}
              {activeTab === "settings" && "Configurations keys, encryption schemas & system tokens settings."}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-350 hover:text-white transition-all font-semibold flex items-center space-x-2 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Sync Records</span>
            </button>
          </div>
        </div>

        {/* Action failed feedback */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl text-rose-400 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab contents */}
        {isLoading && clients.length === 0 && plans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-450 space-y-2.5">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-554" />
            <span className="font-light">Synchronizing databases registries...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* TAB 1: METRICS DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* Visual stats grid cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Clients</span>
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="block text-xl font-bold text-white font-display">
                      {stats?.totalClients || 0}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Registered customer accounts
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-450">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Revenue</span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="block text-xl font-bold text-emerald-400 font-display">
                      ${stats?.monthlyRevenue !== undefined ? stats.monthlyRevenue.toFixed(2) : "0.00"}
                    </span>
                    <span className="block text-[10px] text-emerald-500/80 font-medium mt-1">
                      Sum of Active prices
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Active billing</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="block text-xl font-bold text-white font-display">
                      {stats?.activeClients || 0}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Active SaaS workspace keys
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Trial Accounts</span>
                      <Sparkles className="w-4 h-4 text-indigo-455 animate-pulse" />
                    </div>
                    <span className="block text-xl font-bold text-white font-display">
                      {stats?.trialClients || 0}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Exploring core OS capabilities
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Expired / Suspended</span>
                      <Ban className="w-4 h-4 text-rose-455" />
                    </div>
                    <span className="block text-xl font-bold text-rose-450 font-display">
                      {stats?.expiredClients || 0}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Awaiting plan update
                    </span>
                  </div>
                </div>

                {/* Lead Pipeline Section */}
                <div className="p-6 rounded-2xl border border-slate-900 bg-[#070b19]/35 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/60 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>Lead Pipeline Audit</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 font-light mt-0.5">
                        Real-time pipeline statistics mapped to audited lead intent signals and operational milestones.
                      </p>
                    </div>
                    <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded font-mono text-indigo-400 border border-indigo-950 shrink-0">
                      Live Stages Count
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {[
                      { key: "NEW", label: "NEW", desc: "Captured", border: "border-slate-800/40", bg: "bg-slate-950/40", text: "text-slate-400", pulse: false },
                      { key: "INQUIRY", label: "INQUIRY", desc: "First Contact", border: "border-sky-900/30", bg: "bg-sky-950/20", text: "text-sky-450", pulse: false },
                      { key: "QUALIFICATION", label: "QUALIFICATION", desc: "Evaluating", border: "border-indigo-900/30", bg: "bg-indigo-950/20", text: "text-indigo-400", pulse: false },
                      { key: "QUOTATION", label: "QUOTATION", desc: "Estimating", border: "border-pink-900/30", bg: "bg-pink-950/20", text: "text-pink-400", pulse: false },
                      { key: "NEGOTIATION", label: "NEGOTIATION", desc: "Finalizing", border: "border-amber-900/30", bg: "bg-amber-950/20", text: "text-amber-450", pulse: false },
                      { key: "FOLLOWUP", label: "FOLLOWUP", desc: "Check post-quote", border: "border-orange-900/30", bg: "bg-orange-950/20", text: "text-orange-450", pulse: false },
                      { key: "WON", label: "WON", desc: "Signed Order", border: "border-emerald-900/40", bg: "bg-emerald-950/20", text: "text-emerald-440", pulse: true },
                      { key: "LOST", label: "LOST", desc: "Disengaged", border: "border-rose-900/30", bg: "bg-rose-950/20", text: "text-rose-450", pulse: false },
                    ].map((stage) => {
                      const count = stats?.stageCounts?.[stage.key] ?? 0;
                      return (
                        <div 
                          key={stage.key} 
                          className={`p-3.5 rounded-xl border ${stage.border} ${stage.bg} hover:border-indigo-500/30 transition-all flex flex-col justify-between group cursor-default relative overflow-hidden`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-bold font-mono tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors uppercase truncate">
                                {stage.label}
                              </span>
                              {stage.pulse && count > 0 && (
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                              )}
                            </div>
                            <span className="block text-[8px] text-slate-500 truncate leading-none">
                              {stage.desc}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline justify-between mt-4">
                            <span className={`text-lg font-bold font-display leading-none ${stage.text}`}>
                              {count}
                            </span>
                            <span className="text-[8px] text-slate-600 font-light italic">
                              leads
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Integration tips row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl border border-[#141b36] bg-[#0c1229]/20 relative overflow-hidden flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-display font-bold text-white text-md flex items-center space-x-1.5 mb-1 uppercase tracking-tight">
                        <Sparkles className="w-4 h-4 text-indigo-300" />
                        <span>Phase 2 Database Complete</span>
                      </h4>
                      <p className="text-[11px] font-light text-slate-400 leading-relaxed">
                        Prisma schemas are successfully connected in real-time. SQLite tables store customer limits (leads quotas, max web agents, WhatsApp numbers) synced through plans.
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                      <span>✓ Web API routes online</span>
                      <span>✓ Password hash active</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-slate-900 bg-[#02050b]/20 space-y-3">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">Administration System Logs</span>
                    <div className="space-y-2 text-[11px] text-slate-400 leading-normal font-light">
                      <p>
                        💡 <b>Manual Provisioning:</b> Administrators can manually create new client workspaces with unique billing plans from the "Client Accounts" tab.
                      </p>
                      <p>
                        ⚡ <b>Plan Limits Override:</b> Assign custom pricing points or custom trial periods instantly inside the Subscriptions manager.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CLIENT ROSTER */}
            {activeTab === "clients" && (
              <div className="space-y-4">
                
                {/* Search, filters, sorting controls */}
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center space-x-2 max-w-sm w-full bg-[#030611] rounded-lg border border-slate-900 px-3 py-2 focus-within:border-indigo-500 transition-colors">
                    <Search className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="Query company name, contact, owner name..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="w-full bg-transparent text-xs text-white placeholder-slate-705 outline-none font-light"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter */}
                    <div className="flex items-center space-x-1.5 bg-[#030611] rounded-lg border border-slate-900 px-2 py-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="bg-transparent text-[11px] text-slate-300 outline-none pr-1.5"
                      >
                        <option value="" className="bg-[#0b0f24] text-slate-305">Account Rank: All</option>
                        <option value="Active" className="bg-[#0b0f24] text-slate-305">Active Only</option>
                        <option value="Suspended" className="bg-[#0b0f24] text-slate-305">Suspended Only</option>
                        <option value="Pending" className="bg-[#0b0f24] text-slate-305">Pending Only</option>
                      </select>
                    </div>

                    {/* Plan Filter */}
                    <div className="flex items-center space-x-1.5 bg-[#030611] rounded-lg border border-slate-900 px-2 py-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-505 shrink-0" />
                      <select
                        value={planFilter}
                        onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                        className="bg-transparent text-[11px] text-slate-300 outline-none pr-1.5"
                      >
                        <option value="" className="bg-[#0b0f24]">Plan: All</option>
                        <option value="Starter" className="bg-[#0b0f24]">Starter</option>
                        <option value="Growth" className="bg-[#0b0f24]">Growth</option>
                        <option value="Pro" className="bg-[#0b0f24]">Pro</option>
                        <option value="Enterprise" className="bg-[#0b0f24]">Enterprise</option>
                      </select>
                    </div>

                    {/* Sort By Toggle */}
                    <div className="flex items-center space-x-1.5 bg-[#030611] rounded-lg border border-slate-900 px-2 py-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent text-[11px] text-slate-300 outline-none pr-1.5"
                      >
                        <option value="createdAt" className="bg-[#0b0f24]">Enrollment Date</option>
                        <option value="companyName" className="bg-[#0b0f24]">Company Name</option>
                        <option value="ownerName" className="bg-[#0b0f24]">Owner Name</option>
                        <option value="subscriptionStatus" className="bg-[#0b0f24]">Subscription</option>
                        <option value="accountStatus" className="bg-[#0b0f24]">Account Status</option>
                      </select>
                    </div>

                    {/* Sort Order Action */}
                    <button
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="px-3 py-1.5 rounded-lg border border-slate-900 bg-[#030611] text-[11px] hover:text-white hover:bg-slate-900 cursor-pointer text-slate-400 font-semibold"
                    >
                      {sortOrder === "asc" ? "ASC ↑" : "DESC ↓"}
                    </button>
                  </div>

                  {/* Provision tenant trigger */}
                  <button
                    onClick={() => setIsCreateClientOpen(true)}
                    className="px-3.5 py-2 hover:bg-indigo-500 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 cursor-pointer shrink-0 transition-all shadow-md ml-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Client</span>
                  </button>
                </div>

                {/* Main Client Table */}
                <div className="border border-slate-900 rounded-2xl overflow-hidden bg-[#070b19]/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#0a0f26]/80 text-slate-400 border-b border-slate-900 uppercase tracking-widest text-[9px] font-bold">
                          <th className="py-3 px-4">SME Enterprise</th>
                          <th className="py-3 px-4">Owner Name</th>
                          <th className="py-3 px-4">Contact Email</th>
                          <th className="py-3 px-4">Plan / Billing</th>
                          <th className="py-3 px-4">Account Status</th>
                          <th className="py-3 px-4 text-center">Actions / Modifications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 font-light text-slate-300">
                        {clients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500 font-light italic">
                              No client registers found. Modify search inputs or provision a new client profile.
                            </td>
                          </tr>
                        ) : (
                          clients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-900/35 transition-colors">
                              <td className="py-4 px-4 font-semibold text-white font-display">
                                <div>{client.companyName}</div>
                                {client.website && (
                                  <div className="text-[9px] font-mono font-light text-slate-505 truncate max-w-[130px]">{client.website}</div>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {client.user?.name || "Unassigned"}
                              </td>
                              <td className="py-4 px-4 font-mono text-[10px] text-slate-450">
                                {client.user?.email || "N/A"}
                              </td>
                              <td className="py-4 px-4">
                                <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getSubBadgeStyle(client.subscription?.status || client.subscriptionStatus)}`}>
                                    {client.subscription?.planName || "Starter"} &bull; {client.subscription?.status || client.subscriptionStatus}
                                  </span>
                                  {client.subscription && (
                                    <div className="text-[9px] text-slate-505 font-mono">
                                      Expiry: {new Date(client.subscription.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                  client.accountStatus === "Active"
                                    ? "bg-emerald-950/30 text-emerald-440 border border-emerald-900/40"
                                    : client.accountStatus === "Suspended"
                                    ? "bg-rose-950/30 text-rose-440 border border-rose-900/40"
                                    : "bg-amber-950/30 text-amber-500 border border-amber-900/35"
                                }`}>
                                  {client.accountStatus}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {/* View Detail button */}
                                  <button
                                    onClick={() => setSelectedClientDetail(client)}
                                    title="View detailed company profile"
                                    className="p-1.5 bg-slate-950 rounded hover:bg-slate-900 text-slate-350 hover:text-white transition-colors cursor-pointer border border-slate-900"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Edit profile button */}
                                  <button
                                    onClick={() => setSelectedClientEdit(client)}
                                    title="Configure profile and billing definitions"
                                    className="p-1.5 bg-indigo-955/20 text-indigo-400 rounded hover:bg-[#141d40] transition-colors cursor-pointer border border-indigo-910/30"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Toggle suspend account button */}
                                  <button
                                    onClick={() => handleToggleAccountStatus(client)}
                                    title={client.accountStatus === "Active" ? "Suspend user authentication" : "Reactivate client workspace"}
                                    disabled={actionLoadingId === client.id}
                                    className={`p-1.5 rounded transition-all cursor-pointer border ${
                                      client.accountStatus === "Active"
                                        ? "bg-rose-955/20 text-rose-400 border-rose-910/20 hover:bg-rose-950/30"
                                        : "bg-emerald-955/20 text-emerald-400 border-emerald-910/20 hover:bg-emerald-950/30"
                                    }`}
                                  >
                                    {actionLoadingId === client.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Ban className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* Termination button */}
                                  <button
                                    onClick={() => setClientToDelete(client)}
                                    title="Liquidate databases registers cascade"
                                    className="p-1.5 bg-rose-955/35 text-rose-455 hover:bg-rose-950 border border-rose-950/40 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination controller */}
                  {clients.length > 0 && (
                    <div className="p-4 bg-slate-950/40 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-450 text-[11px] font-light">
                      <div className="flex items-center space-x-1">
                        <span>Revealing {clients.length} of {totalCount} records.</span>
                        <select
                          value={limit}
                          onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                          className="bg-[#030611] rounded border border-slate-900 px-1 py-0.5 ml-2 font-semibold text-slate-350"
                        >
                          <option value="5">5 per page</option>
                          <option value="10">10 per page</option>
                          <option value="25">25 per page</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="p-1.5 rounded hover:bg-slate-900 bg-slate-950 border border-slate-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-white"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Segment {page} of {totalPages}</span>
                        <button
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page === totalPages}
                          className="p-1.5 rounded hover:bg-slate-900 bg-slate-950 border border-slate-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-white"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SUBSCRIPTION AND PLAN CONTROL */}
            {activeTab === "subscriptions" && (
              <div className="space-y-6">
                
                {/* Inner sub header and toggle navigation */}
                <div className="flex border-b border-slate-900 text-xs">
                  <button
                    onClick={() => setActiveSubTab("subscriptions")}
                    className={`pb-3 px-4 font-semibold tracking-wider font-display uppercase tracking-wider relative cursor-pointer ${
                      activeSubTab === "subscriptions" ? "text-indigo-400 font-bold border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Client Subscriptions ({clients.length})
                  </button>
                  <button
                    onClick={() => setActiveSubTab("plans")}
                    className={`pb-3 px-4 font-semibold tracking-wider font-display uppercase tracking-wider relative cursor-pointer ${
                      activeSubTab === "plans" ? "text-indigo-400 font-bold border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Pricing Membership Plans ({plans.length})
                  </button>
                </div>

                {/* Sub-tab 1: Client Active Subscriptions tracker */}
                {activeSubTab === "subscriptions" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {clients.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 col-span-2 select-none italic font-light">
                        No clients registered to assign billing packages on.
                      </div>
                    ) : (
                      clients.map((client) => {
                        const targetPlan = plans.find((p) => p.name === (client.subscription?.planName || "Starter"));
                        const hasSub = !!client.subscription;
                        
                        // Expiry days logic
                        const expiry = client.subscription?.expiryDate ? new Date(client.subscription.expiryDate) : null;
                        const today = new Date();
                        const diffTime = expiry ? expiry.getTime() - today.getTime() : 0;
                        const daysLeft = expiry ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;

                        return (
                          <div 
                            key={client.id}
                            className="p-5 border border-slate-910/80 bg-[#070b19]/25 rounded-2xl flex flex-col justify-between relative overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div>
                                <h3 className="text-sm font-semibold text-white uppercase font-display leading-none mb-1">
                                  {client.companyName}
                                </h3>
                                <p className="text-[10px] text-slate-500">
                                  Owner: <b>{client.user?.name}</b> &bull; {client.user?.email}
                                </p>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded font-bold text-[9px] uppercase ${getSubBadgeStyle(client.subscription?.status || client.subscriptionStatus)}`}>
                                {client.subscription?.planName || "Starter"} &bull; {client.subscription?.status || client.subscriptionStatus}
                              </span>
                            </div>

                            {/* Limits visualization */}
                            <div className="py-4 border-y border-slate-900/60 my-4 grid grid-cols-3 gap-2.5 text-[10px] text-slate-400 font-light">
                              <div className="p-2 bg-slate-950/40 rounded border border-slate-900">
                                <span className="block text-slate-505 font-bold uppercase tracking-wider text-[8px] leading-snug">Max leads</span>
                                <span className="text-white font-mono">{targetPlan ? targetPlan.maxLeads : 100}</span>
                              </div>
                              <div className="p-2 bg-slate-950/40 rounded border border-slate-900">
                                <span className="block text-slate-505 font-bold uppercase tracking-wider text-[8px] leading-snug">Max AI limits</span>
                                <span className="text-white font-mono">{targetPlan ? targetPlan.maxAiRequests : 50}</span>
                              </div>
                              <div className="p-2 bg-slate-950/40 rounded border border-slate-900">
                                <span className="block text-slate-505 font-bold uppercase tracking-wider text-[8px] leading-snug">Billing Price</span>
                                <span className="text-white font-semibold">${client.subscription ? client.subscription.price.toFixed(2) : "29.00"}/mo</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-4">
                              <span>Coverage Status:</span>
                              <span className="font-mono font-medium text-white">
                                {hasSub ? `Expiring in ${daysLeft} days (${new Date(client.subscription!.expiryDate).toLocaleDateString()})` : "Trial period limits active"}
                              </span>
                            </div>

                            {/* Direct assignment panel trigger */}
                            {isAssignSubOpen === client.id ? (
                              <div className="p-3 border border-indigo-900/35 bg-[#0a0f26]/80 rounded-xl space-y-3 mt-2">
                                <span className="block text-[10.5px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Assign Custom Billing Spec</span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-505">Plan Name</label>
                                    <select
                                      value={assignPlanName}
                                      onChange={(e) => setAssignPlanName(e.target.value)}
                                      className="w-full bg-slate-950 p-2 border border-slate-900 text-slate-100 rounded outline-none"
                                    >
                                      {plans.map((p) => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-505">Status</label>
                                    <select
                                      value={assignStatus}
                                      onChange={(e) => setAssignStatus(e.target.value)}
                                      className="w-full bg-slate-955 p-2 border border-slate-900 text-slate-100 rounded outline-none"
                                    >
                                      <option value="Active">Active</option>
                                      <option value="Trial">Trial</option>
                                      <option value="Suspended">Suspended</option>
                                      <option value="Expired">Expired</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-505">Custom Price ($)</label>
                                    <input
                                      type="number"
                                      placeholder="Leave blank for plan standard default"
                                      value={assignPrice}
                                      onChange={(e) => setAssignPrice(e.target.value)}
                                      className="w-full bg-slate-955 p-2 border border-slate-900 text-slate-100 rounded outline-none font-mono"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-505">Expiry Date *</label>
                                    <input
                                      type="date"
                                      value={assignExpiryDate}
                                      onChange={(e) => setAssignExpiryDate(e.target.value)}
                                      className="w-full bg-slate-955 p-2 border border-slate-900 text-slate-100 rounded outline-none font-mono text-xs"
                                      required
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end space-x-1.5 pt-2 border-t border-slate-900/60 text-[10.5px]">
                                  <button
                                    onClick={() => setIsAssignSubOpen(null)}
                                    className="px-2.5 py-1.5 bg-slate-900 rounded border border-slate-800 hover:text-white cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleAssignSubSubmit(client.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold cursor-pointer"
                                  >
                                    Save Assignment
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 border-t border-slate-900/40 pt-3">
                                <button
                                  onClick={() => {
                                    setIsAssignSubOpen(client.id);
                                    setAssignPlanName(client.subscription?.planName || "Starter");
                                    setAssignStatus(client.subscription?.status || "Active");
                                    // Default 30 days ahead formatting
                                    const future = new Date();
                                    future.setDate(future.getDate() + 30);
                                    setAssignExpiryDate(future.toISOString().split('T')[0]);
                                    setAssignPrice(client.subscription?.price.toString() || "");
                                  }}
                                  className="px-2 py-1.5 text-[10px] rounded border border-slate-800 hover:border-indigo-500 text-slate-350 hover:text-white bg-[#030611] font-semibold text-center cursor-pointer cursor-shadow"
                                >
                                  Assign / Override
                                </button>
                                
                                <button
                                  onClick={() => handleToggleSubscriptionStatus(client)}
                                  disabled={!client.subscription}
                                  className={`px-2 py-1.5 text-[10px] rounded border font-semibold text-center cursor-pointer ${
                                    client.subscription?.status === "Active"
                                      ? "border-rose-900 bg-rose-955/20 text-rose-400 hover:bg-rose-950"
                                      : "border-slate-800 text-slate-500 bg-transparent disabled:opacity-30 cursor-not-allowed"
                                  }`}
                                >
                                  Suspend Sub
                                </button>

                                <button
                                  onClick={() => {
                                    if (client.subscription?.status === "Suspended") {
                                      handleToggleSubscriptionStatus(client);
                                    } else {
                                      showToast("Subscription is not suspended. Use Assign/Override to modify plan parameters.", "info");
                                    }
                                  }}
                                  disabled={!client.subscription || client.subscription.status !== "Suspended"}
                                  className={`px-2 py-1.5 text-[10px] rounded border font-semibold text-center cursor-pointer ${
                                    client.subscription?.status === "Suspended"
                                      ? "border-emerald-610 bg-emerald-955/25 text-emerald-400 hover:bg-emerald-950"
                                      : "border-slate-800 text-slate-500 bg-transparent disabled:opacity-30 cursor-not-allowed"
                                  }`}
                                >
                                  Reactivate Sub
                                </button>
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Pricing Tiers editor (Plan CRUD) */}
                {activeSubTab === "plans" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-[#070b19]/30 p-4 border border-slate-900 rounded-2xl">
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold text-white uppercase tracking-wider">System Tiers Configs</span>
                        <p className="text-[10px] text-slate-450 italic mt-0.5">Modify limits and price factors applied inside client registration modals.</p>
                      </div>
                      <button
                        onClick={() => { setSelectedPlan(null); setIsPlanModalOpen(true); }}
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-554 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Pricing Plan</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {plans.map((p) => (
                        <div 
                          key={p.id}
                          className="p-5 rounded-2xl border border-slate-910 bg-[#070b19]/25 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white uppercase font-display">{p.name}</span>
                              <span className="text-xs font-bold font-mono text-indigo-400">${p.price.toFixed(2)}/mo</span>
                            </div>

                            <p className="text-[10px] text-slate-450 font-light italic">
                              Encompasses limits for users, leads capture and WhatsApp link nodes.
                            </p>

                            {/* Features block */}
                            <div className="pt-3 border-t border-slate-900/60 space-y-1.5 text-[11.5px] font-mono text-slate-455">
                              <div>👤 Max Users: <b className="text-white">{p.maxUsers}</b></div>
                              <div>🎯 Max Leads: <b className="text-white">{p.maxLeads}</b></div>
                              <div>🦾 Max AI Credits: <b className="text-[#6573e3]">{p.maxAiRequests}</b></div>
                              <div>💬 WhatsApp limit: <b className="text-emerald-440">{p.maxWhatsappNumbers}</b></div>
                            </div>

                            {/* Bullet Features */}
                            <div className="pt-3 font-light text-[10.5px] text-slate-400 space-y-1">
                              {p.features ? p.features.split(',').map((f, i) => (
                                <div key={i} className="flex items-start space-x-1.5">
                                  <span className="text-indigo-400 shrink-0 select-none font-bold">✓</span>
                                  <span className="truncate">{f.trim()}</span>
                                </div>
                              )) : (
                                <span className="text-[10px] text-slate-600 block">No special features compiled lists.</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-4 border-t border-slate-900/60 mt-4 text-[10px] uppercase font-bold text-center">
                            <button
                              onClick={() => { setSelectedPlan(p); setIsPlanModalOpen(true); }}
                              className="px-2.5 py-1.5 bg-[#0a0f26]/60 text-slate-200 rounded border border-slate-900 hover:border-indigo-500 hover:text-white cursor-pointer w-full"
                            >
                              Edit Tier
                            </button>
                            <button
                              onClick={() => handleDeletePlan(p.id, p.name)}
                              className="px-2.5 py-1.5 bg-rose-955/20 text-rose-455 rounded border border-rose-950/45 hover:bg-rose-900 hover:text-white cursor-pointer w-full"
                            >
                              Liquidate
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: COMPLIANCE GLOBAL SETTINGS */}
            {activeTab === "settings" && (
              <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white font-display mb-1 flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>LeadSmart System Compliance Interface</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-light max-w-xl">
                    SaaS administrator credentials and server tokens. Change global workspace locks safely.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-900">
                  <div className="p-4 bg-slate-950/30 border border-slate-905 rounded-xl space-y-2">
                    <span className="block text-xs font-semibold text-white uppercase tracking-wider">Authentication standards</span>
                    <p className="text-[11px] text-slate-450 font-light leading-relaxed">
                      All SME user password structures are hashed locally with bcryptjs set to 10 rounds. Server JWT token issues has an expiry parameter valid for 24 hours.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/30 border border-slate-905 rounded-xl space-y-2">
                    <span className="block text-xs font-semibold text-white uppercase tracking-wider">Relational Database Engine</span>
                    <p className="text-[11px] text-slate-450 font-light leading-relaxed">
                      Sandbox runs on unified SQLite dev structure powered by Prisma Client JS. Models Client, Plan and Subscription cascade deletes instantly on termination.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* RENDER MODULARS POPUPS */}

      {/* 1. Client Detail view popups */}
      <ClientDetailModal
        isOpen={!!selectedClientDetail}
        onClose={() => setSelectedClientDetail(null)}
        client={selectedClientDetail}
      />

      {/* 2. Client specifications editing popups */}
      <ClientEditModal
        isOpen={!!selectedClientEdit}
        onClose={() => setSelectedClientEdit(null)}
        client={selectedClientEdit}
        plans={plans}
        onSave={handleEditClient}
        isWorking={actionLoadingId === (selectedClientEdit?.id || "")}
      />

      {/* 3. Manual client provisionings popups */}
      <ClientCreateModal
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        plans={plans}
        onCreate={handleCreateClient}
        isWorking={actionLoadingId === "create"}
      />

      {/* 4. Plan tier editor popups */}
      <PlanManagerModal
        isOpen={isPlanModalOpen}
        onClose={() => { setIsPlanModalOpen(false); setSelectedPlan(null); }}
        plan={selectedPlan}
        onSave={handleSavePlan}
        isWorking={actionLoadingId === "plan-save"}
      />

      {/* 5. RED Alert Clients deletion checker dialogs */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0a0f26] border border-rose-900 rounded-2xl shadow-xl p-6 text-xs text-slate-100 font-light space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
              <div className="space-y-1">
                <span className="block text-red-410 font-bold uppercase tracking-wider text-sm">Dismantle Client Records</span>
                <p className="text-slate-400">
                  Are you absolutely certain you want to terminate the client workspace <b>{clientToDelete.companyName}</b>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-955/20 border border-rose-950/50 rounded-lg text-rose-350 leading-relaxed text-[11px]">
              ⚠️ <b>CRITICAL WARNING:</b> This operation is non-reversible. It will dismantle user login credentials, delete current client metadata, and wipe any active subscriptions linked to this customer instantly inside the database.
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-900/60">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-3.5 py-2 border border-slate-800 bg-slate-900/60 text-slate-350 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                Abort Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={actionLoadingId === clientToDelete.id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-505 text-white font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                {actionLoadingId === clientToDelete.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Liquidate Database Records</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
