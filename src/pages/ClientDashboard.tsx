import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import { ClientStats } from "../types";
import AIConfigurationPanel from "../components/AIConfigurationPanel";
import { LeadManagementConsole } from "../components/LeadManagementConsole";
import FollowUpConsole from "../components/FollowUpConsole";
import AiInsightsDashboard from "../components/AiInsightsDashboard";
import AIAssistantCoPilot from "../components/AIAssistantCoPilot";
import OwnerSimulatorPanel from "../components/OwnerSimulatorPanel";
import QuotationTemplatesPanel from "../components/QuotationTemplatesPanel";
import ProductsPanel from "../components/ProductsPanel";
import QuotationHistoryPanel from "../components/QuotationHistoryPanel";
import { 
  BarChart3, 
  MessageSquare, 
  Bot, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Smartphone, 
  RefreshCw, 
  User as UserIcon, 
  Calendar,
  Layers,
  Lightbulb,
  Bell,
  Loader2,
  Globe,
  MapPin,
  Phone,
  Briefcase,
  Shield,
  Key,
  Info,
  Save,
  Lock,
  Sun,
  Moon,
  Terminal,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  Package,
  Upload,
  Trash2,
  Paperclip
} from "lucide-react";

const BUSINESS_TYPES = [
  "Manufacturing",
  "Real Estate"
];

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Tabs
  const [activeTab, setActiveTab ] = useState<"dashboard" | "leads" | "followups" | "ai-insights" | "quotation-templates" | "products" | "profile" | "settings" | "quotations">("dashboard");
  
  // States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [clientProfile, setClientProfile] = useState<any | null>(null);
  const [planDetails, setPlanDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Form states for profile editor
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerWhatsApp, setOwnerWhatsApp] = useState("");
  const [approvalNotificationNumber, setApprovalNotificationNumber] = useState("");
  const [catalogPdfUrl, setCatalogPdfUrl] = useState("");
  const [isUploadingCatalog, setIsUploadingCatalog] = useState(false);
  const [catalogMethod, setCatalogMethod] = useState<"upload" | "url">("upload");
  const [tempCatalogUrl, setTempCatalogUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

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

  const handleCatalogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Only PDF files are supported for the product catalog.", "error");
      return;
    }

    // Limit size to 1.5MB to prevent proxy/serverless "413 Payload Too Large" issues with large base64 strings
    if (file.size > 1.5 * 1024 * 1024) {
      showToast("PDF size exceeds 1.5MB. Please use 'Direct URL / Link' for larger files or compress your PDF.", "error");
      return;
    }

    setIsUploadingCatalog(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        
        const response = await api.post<{ success: boolean; catalogPdfUrl: string; error?: string }>("/client/upload-catalog", {
          base64Data,
          filename: file.name
        });

        if (response.success && response.catalogPdfUrl) {
          setCatalogPdfUrl(response.catalogPdfUrl);
          showToast("Catalog PDF uploaded and linked successfully!", "success");
        } else {
          showToast(response.error || "Upload failed. Please try again.", "error");
        }
      } catch (err: any) {
        console.error("Upload handler error:", err);
        showToast(err.message || "An error occurred during catalog upload.", "error");
      } finally {
        setIsUploadingCatalog(false);
      }
    };

    reader.onerror = () => {
      setIsUploadingCatalog(false);
      showToast("Failed to read PDF file.", "error");
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveCatalog = () => {
    setCatalogPdfUrl("");
    setTempCatalogUrl("");
    showToast("Catalog removed. Save profile settings to persist.", "info");
  };

  // WhatsApp states on client side
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappWebhookVerifyToken, setWhatsappWebhookVerifyToken] = useState("leadsmart_token");
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState("Inactive");

  // Client side WhatsApp diagnostic test states
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from LeadSmart AI!");
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);

  // Password reset states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // SME gateway connectivity states
  const [waConnectorStatus, setWaConnectorStatus] = useState<"DISCONNECTED" | "CONNECTED" | "CONNECTING">("DISCONNECTED");

  // Live Toast dispatcher
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getSubBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40";
      case "TRIAL":
        return "bg-indigo-950/40 text-indigo-400 border border-indigo-900/40";
      case "SUSPENDED":
        return "bg-rose-950/40 text-rose-440 border border-rose-900/40";
      case "EXPIRED":
        return "bg-yellow-950/40 text-yellow-501 border border-yellow-905/40";
      default:
        return "bg-slate-950/40 text-slate-400 border border-slate-900";
    }
  };

  // Fetch metrics & raw profile records
  const fetchClientData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // 1. Fetch live metrics stats
      const metrics = await api.get<ClientStats>("/client/stats");
      setStats(metrics);

      // 2. Fetch full profiles details
      const profileResponse = await api.get<any>("/client/profile");
      const clientObj = profileResponse.client;
      setClientProfile(clientObj);
      setPlanDetails(profileResponse.plan);

      // Prepopulate form states
      setCompanyName(clientObj.companyName || "");
      setOwnerName(clientObj.user?.name || "");
      setPhone(clientObj.phone || "");
      setOwnerWhatsApp(clientObj.ownerWhatsApp || "");
      setApprovalNotificationNumber(clientObj.approvalNotificationNumber || "");
      const loadedUrl = clientObj.catalogPdfUrl || "";
      setCatalogPdfUrl(loadedUrl);
      setTempCatalogUrl(loadedUrl);
      if (loadedUrl && (loadedUrl.startsWith("http://") || loadedUrl.startsWith("https://"))) {
        setCatalogMethod("url");
      } else {
        setCatalogMethod("upload");
      }
      setWebsite(clientObj.website || "");
      setBusinessType(clientObj.businessType || BUSINESS_TYPES[0]);
      setIndustry(clientObj.industry || "");
      setDescription(clientObj.description || "");
      setCountry(clientObj.country || "");
      setState(clientObj.state || "");
      setCity(clientObj.city || "");

      if (clientObj.aiPermissions && Array.isArray(clientObj.aiPermissions)) {
        const mappedPerms: Record<string, boolean> = {};
        clientObj.aiPermissions.forEach((p: any) => {
          mappedPerms[p.permissionName] = p.enabled;
        });
        setAiPermissions(prev => ({ ...prev, ...mappedPerms }));
      }

      setWhatsappToken(clientObj.whatsappToken || "");
      setWhatsappPhoneId(clientObj.whatsappPhoneId || "");
      setWhatsappWebhookVerifyToken(clientObj.whatsappWebhookVerifyToken || "leadsmart_token");
      setWhatsappWebhookUrl(clientObj.whatsappWebhookUrl || (window.location.origin + "/api/webhook/whatsapp"));
      setWhatsappStatus(clientObj.whatsappStatus || "Inactive");

    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load client operations metrics and profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

// Custom AI config connections are removed

  // Update company profiles
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        companyName,
        ownerName,
        phone,
        ownerWhatsApp,
        approvalNotificationNumber,
        catalogPdfUrl,
        website,
        businessType,
        industry,
        description,
        country,
        state,
        city,
        whatsappToken,
        whatsappPhoneId,
        whatsappWebhookVerifyToken,
        whatsappWebhookUrl,
        whatsappStatus,
        aiPermissions,
      };
      const updatedClient = await api.put<any>("/client/profile", payload);
      setClientProfile(updatedClient);
      showToast("Company specifications saved successfully.", "success");
      
      // Update quick metrics values
      if (stats) {
        setStats({
          ...stats,
          companyName: updatedClient.companyName,
          businessType: updatedClient.businessType || "",
          industry: updatedClient.industry || "",
        });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update profile configurations.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setIsTestRunning(true);
    
    // Validate if data is available
    if (!whatsappToken || !whatsappPhoneId) {
      setTestResult({
        success: false,
        text: "Cannot connect: WhatsApp Token and Phone Number ID are required. Generate them in the Meta Developer Portal."
      });
      setIsTestRunning(false);
      return;
    }

    try {
      // First save the settings securely to the server so the DB has the latest keys
      const payload = {
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
        whatsappToken,
        whatsappPhoneId,
        whatsappWebhookVerifyToken,
        whatsappWebhookUrl,
        whatsappStatus,
        aiPermissions,
      };
      const updatedClient = await api.put<any>("/client/profile", payload);
      setClientProfile(updatedClient);

      // Trigger secure server-side handshake test
      const data = await api.post<any>(`/whatsapp/test-connection/${updatedClient.id}`);
      
      if (data.success) {
        setTestResult({
          success: true,
          text: data.message || "Connection to WhatsApp Gateway OK. Bearer Token is Valid."
        });
        setWaConnectorStatus("CONNECTED");
        setWhatsappStatus("Active");
      } else {
        throw new Error(data.message || "Handshake failed. Ensure both Token and Phone Number ID are filled.");
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        text: e.message || "Connection refused. Verify token and Phone ID."
      });
      setWaConnectorStatus("DISCONNECTED");
      setWhatsappStatus("Inactive");
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone || !testMessage) return;
    setIsTestRunning(true);
    setTestResult(null);
    try {
      // First save the settings securely to the server
      const payload = {
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
        whatsappToken,
        whatsappPhoneId,
        whatsappWebhookVerifyToken,
        whatsappWebhookUrl,
        whatsappStatus,
        aiPermissions,
      };
      const updatedClient = await api.put<any>("/client/profile", payload);
      setClientProfile(updatedClient);

      // Trigger secure server-side test message send
      const response = await api.post<any>(`/whatsapp/test-message/${updatedClient.id}`, {
        toPhone: testPhone,
        message: testMessage
      });
      
      if (response.success) {
        setTestResult({ success: true, text: "Diagnostic message dispatched." });
      } else {
        throw new Error(response.error || "Failed to dispatch test.");
      }
    } catch (e: any) {
      setTestResult({ success: false, text: e.message || "Failed to dispatch test." });
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleScanSMEqr = async () => {
    setWaConnectorStatus("CONNECTING");
    setTimeout(() => {
      setWaConnectorStatus("DISCONNECTED");
      showToast("Cloud gateway bridging error, connect manually via token ID.", "error");
    }, 2000);
  };

  const handleSaveWhatsappSettings = async () => {
    setIsSavingWhatsapp(true);
    try {
      const payload = {
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
        whatsappToken,
        whatsappPhoneId,
        whatsappWebhookVerifyToken,
        whatsappWebhookUrl,
        whatsappStatus,
        aiPermissions,
      };
      const updatedClient = await api.put<any>("/client/profile", payload);
      setClientProfile(updatedClient);
      showToast("WhatsApp Subsystem configurations saved successfully.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save WhatsApp configuration.", "error");
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  // Update password credentials
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast("Fill out all authentication fields.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.put<any>("/client/password", { currentPassword, newPassword });
      showToast("Login credentials modified successfully.", "success");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      showToast(err.message || "Credential change declined.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getSubBannerStatus = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return (
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-center space-x-2.5 text-emerald-400 text-[11px] text-left">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="font-light">
              <span className="font-semibold block text-white font-display">Active Subscription Tier</span>
              Your business operations are fully authorized. WhatsApp robot, API pipelines, and fine-tuning hooks are live.
            </div>
          </div>
        );
      case "TRIAL":
        return (
          <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl flex items-center space-x-2.5 text-indigo-400 text-[11px] text-left">
            <Sparkles className="w-5 h-5 shrink-0 text-indigo-400 animate-pulse" />
            <div className="font-light">
              <span className="font-semibold block text-white font-display">Trial Account Active</span>
              You have active trial authorization. Test all automated capabilities and lead router webhooks without restriction.
            </div>
          </div>
        );
      case "SUSPENDED":
      case "EXPIRED":
      default:
        return (
          <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 rounded-xl flex items-center space-x-2.5 text-rose-450 text-[11px] text-left">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 animate-bounce" />
            <div className="font-light">
              <span className="font-semibold block text-white font-display">SME Account Suspended / Expired</span>
              Your billing period has concluded or the account is suspended. Relational query processing will be frozen. Please contact your SaaS Admin.
            </div>
          </div>
        );
    }
  };

  const currentLeadsList = [
    { name: "Suresh Kumar", channel: "WhatsApp Live", status: "ROUTED_AI", phone: "+91 98765 43210", deal: "$1,200", date: "Just now" },
    { name: "Maria Santos", channel: "Web Widget", status: "CONVERTED", phone: "+63 912 345 6789", deal: "$3,400", date: "4 hrs ago" },
    { name: "John Carter", channel: "WhatsApp Direct", status: "UNASSIGNED", phone: "+1 (555) 349-2041", deal: "$750", date: "1 day ago" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row relative font-sans text-xs">
      
      {/* Toast alert floating */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2.5 p-4 rounded-xl shadow-xl border md:max-w-md animate-bounce ${
          toast.type === "success" 
            ? "bg-[#091a13] text-emerald-400 border-emerald-500" 
            : toast.type === "error"
            ? "bg-[#240c0c] text-rose-400 border-rose-500"
            : "bg-[#0f1224] text-indigo-400 border-indigo-500"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-white text-[11px] font-display">{toast.message}</span>
        </div>
      )}

      {/* Persistent mini-tab trigger on left edge when collapsed on desktop */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="hidden md:flex fixed top-24 left-0 z-40 bg-indigo-600 hover:bg-slate-900 border-y border-r border-indigo-500/20 text-white rounded-r-xl py-4.5 px-2 items-center justify-center transition-all cursor-pointer shadow-xl group"
          title="Expand sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:scale-125" />
        </button>
      )}

      {/* Mobile Top Navbar */}
      <div className="md:hidden border-b border-slate-900 bg-[#070b19] h-12 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
            L
          </div>
          <span className="font-display font-bold text-xs tracking-tight text-white uppercase">{stats?.companyName || "LeadSmart SME"}</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-450 hover:text-white transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar Layout */}
      <aside 
        className={`fixed md:sticky top-0 left-0 bottom-0 z-30 bg-[#070a13] border-r border-slate-900 flex flex-col justify-between transition-all duration-300 ${
          isSidebarCollapsed 
            ? "md:w-0 md:p-0 md:overflow-hidden md:border-r-0 md:opacity-0 md:pointer-events-none w-64 p-4" 
            : "w-64 p-4 opacity-100"
        } ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white font-display">
                L
              </div>
              <div className="min-w-0">
                <span className="font-display font-bold text-sm tracking-tight text-white uppercase block">LeadSmart AI</span>
                <span className="block text-[9px] text-[#5c68f2] font-semibold uppercase tracking-wider truncate max-w-[130px] leading-tight font-mono">{stats?.companyName || "SME Client"}</span>
              </div>
            </div>
            
            {/* Collapse button for desktop */}
            <button 
              onClick={() => setIsSidebarCollapsed(true)} 
              className="hidden md:flex p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer items-center justify-center"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button className="md:hidden text-slate-400 hover:text-white cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile widget */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-900/60 flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-indigo-900/40 text-indigo-400 shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden min-w-0 text-left">
              <span className="block text-xs font-semibold text-white truncate font-display">{ownerName || user?.name}</span>
              <span className="block text-[10px] text-slate-500 font-light truncate">{user?.email}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <BarChart3 className={`w-4 h-4 transition-colors ${activeTab === "dashboard" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Workspace Overview</span>
            </button>

            <button
              onClick={() => { setActiveTab("leads"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "leads"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Users className={`w-4 h-4 transition-colors ${activeTab === "leads" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Leads Console</span>
            </button>

            <button
              onClick={() => { setActiveTab("followups"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "followups"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Calendar className={`w-4 h-4 transition-colors ${activeTab === "followups" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Auto Follow-ups</span>
            </button>

            <button
              onClick={() => { setActiveTab("ai-insights"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "ai-insights"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Sparkles className={`w-4 h-4 transition-colors ${activeTab === "ai-insights" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>AI Insights Manager</span>
            </button>

            <button
              onClick={() => { setActiveTab("quotation-templates"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "quotation-templates"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <FileText className={`w-4 h-4 transition-colors ${activeTab === "quotation-templates" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Quotation Templates</span>
            </button>

            <button
              onClick={() => { setActiveTab("quotations"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "quotations"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <FileText className={`w-4 h-4 transition-colors ${activeTab === "quotations" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Quotation History</span>
            </button>

            <button
              onClick={() => { setActiveTab("products"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Package className={`w-4 h-4 transition-colors ${activeTab === "products" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Products</span>
            </button>

            <button
              onClick={() => { setActiveTab("profile"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Briefcase className={`w-4 h-4 transition-colors ${activeTab === "profile" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Company Profile</span>
            </button>

            <button
              onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <SettingsIcon className={`w-4 h-4 transition-colors ${activeTab === "settings" ? "text-indigo-400" : "text-slate-400"}`} />
              <span>Account Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Panel */}
        <div className="space-y-4 pt-4 border-t border-slate-950">
          <div className="text-[9px] text-slate-550 space-y-1 bg-[#02050b] p-2.5 rounded-lg border border-slate-950">
            <span className="font-semibold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 mb-1">
              <Smartphone className="w-3.5 h-3.5 text-indigo-450" />
              <span>SME Robot Terminal</span>
            </span>
            <span className="block">Status: <b className={waConnectorStatus === "CONNECTED" ? "text-emerald-400" : "text-amber-500"}>{waConnectorStatus}</b></span>
            <span className="block">Plan: <b>{stats?.planName || "Starter"}</b></span>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/40 transition-all cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Theme</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-rose-455 hover:text-rose-350 hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-405" />
            <span>Sign Out Workspace</span>
          </button>
        </div>
      </aside>

      {/* Main workspace arena */}
      <main className="flex-1 flex flex-col overflow-x-hidden min-h-0 bg-[#030712] relative z-10 p-4 md:p-8 space-y-6">
        
        {/* Header bar and sync */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-900 gap-4">
          <div className="flex items-center space-x-3.5">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden md:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 hover:text-white transition-all cursor-pointer items-center space-x-1.5"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider pr-1">Show Sidebar</span>
              </button>
            )}
            <div>
               <h1 className="text-lg sm:text-xl font-bold font-display text-white uppercase tracking-tight">
                {activeTab === "dashboard" && "SME SALES OVERVIEW"}
                {activeTab === "leads" && "LEAD ACQUISITIONS PIPELINES"}
                {activeTab === "followups" && "AUTOMATED SALES FOLLOW-UP CONSOLE"}
                {activeTab === "ai-insights" && "AI DECISION ENGINE & INSIGHTS"}
                {activeTab === "quotation-templates" && "QUOTATION TEMPLATE MODULE"}
                {activeTab === "quotations" && "QUOTATION HISTORY & ARCHIVE"}
                {activeTab === "products" && "DYNAMIC PRODUCT CATALOG ENGINE"}
                {activeTab === "profile" && "CONNECTED COMPANY SPECIFICATIONS"}
                {activeTab === "settings" && "WORKSPACE LOGINS & CONTACT DETAILS"}
              </h1>
              <p className="text-[10px] text-slate-450 italic mt-0.5">
                {activeTab === "dashboard" && "Incoming messages activity, automated dialogues resolved, & subscription status."}
                {activeTab === "leads" && "Your target client contacts, chat state logs & acquisition parameters."}
                {activeTab === "followups" && "Track inactivity trigger rules, dynamic AI reminders histories, and restore missed revenues."}
                {activeTab === "ai-insights" && "Evaluate high-intent scoring, response strategies, conversion analytics, and revenue optimizations on WhatsApp."}
                {activeTab === "quotation-templates" && "Design quotation branding, banners, logo, and watermarks for business contracts."}
                {activeTab === "quotations" && "View compiled quotation summaries, audit history log entries, and download formal PDF agreements."}
                {activeTab === "products" && "Configure customizable product schemas, manage inventories, and sync master values with AI."}
                {activeTab === "profile" && "Verify subscription billing lines, price points, and active business quotas."}
                {activeTab === "settings" && "Configure contact emails, physical coordinates, and change account passwords."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={fetchClientData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-lg border border-slate-805 bg-slate-900/40 hover:bg-[#0b1024] text-slate-350 hover:text-white transition-all font-semibold flex items-center space-x-2 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 bg-rose-955/20 border border-rose-900/35 rounded-xl text-rose-400 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading && !stats ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-450 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="font-light">Fetching client workspace credentials...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Direct Warning subscription status */}
            {stats && getSubBannerStatus(stats.subscriptionStatus)}

            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* Metrics boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-450">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Leads</span>
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="block text-xl font-bold text-white font-display">
                      {stats?.totalLeads || 0}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Allowed segment quota: <b>{stats?.maxLeads || 100}</b>
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-450">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Follow-ups Waiting</span>
                      <MessageSquare className="w-4 h-4 text-indigo-400 animate-pulse" />
                    </div>
                    <span className="block text-xl font-bold text-white font-display">
                      {stats?.unassignedLeads || 0}
                    </span>
                    <span className="block text-[10px] text-amber-500 font-semibold mt-1">
                      Awaiting automated replies
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-[#02050b] justify-between mb-3 text-slate-450">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Automation Rate</span>
                      <Bot className="w-4 h-4 text-emerald-440" />
                    </div>
                    <span className="block text-xl font-bold text-emerald-400 font-display">
                      {stats?.automationRate || "0%"}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Resolved without core staff
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-900 bg-[#070b19]/30">
                    <div className="flex items-center justify-between mb-3 text-slate-450">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Monthly AI Credits</span>
                      <Sparkles className="w-4 h-4 text-indigo-300" />
                    </div>
                    <span className="block text-xl font-bold text-white font-display text-indigo-400 font-mono">
                      {stats?.aiCreditsUsed || "0"}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Computed tokens used this month
                    </span>
                  </div>
                </div>

                {/* Sub Features details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-900/20 border border-slate-905 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-400 mb-2 bg-indigo-950/40 p-1 rounded border border-indigo-955/20 tracking-wider">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>WhatsApp Gateway setup</span>
                      </span>
                      <h4 className="font-display font-semibold text-white text-sm mb-1.5 uppercase">Device Connection Gateway</h4>
                      <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                        Pipe real customer whatsapp chats dynamically into our core dialogue rules. Fast routing scanning takes seconds.
                      </p>
                    </div>
                    <div className="pt-4 flex items-center justify-between border-t border-slate-900/60 mt-4">
                      <span className="text-[10px] text-slate-550 font-light font-mono">Link State: {waConnectorStatus}</span>
                      <button 
                        onClick={() => {
                          setWaConnectorStatus("CONNECTING");
                          setTimeout(() => { setWaConnectorStatus("CONNECTED"); showToast("Gateway connected successfully.", "success"); }, 1500);
                        }}
                        disabled={waConnectorStatus === "CONNECTED"}
                        className="py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                      >
                        {waConnectorStatus === "DISCONNECTED" && "Scan Device Link QR"}
                        {waConnectorStatus === "CONNECTING" && "Spinning up node gateway..."}
                        {waConnectorStatus === "CONNECTED" && "SME Gateway Active"}
                      </button>
                    </div>
                  </div>

                  {/* Operational tips */}
                  <div className="p-6 bg-slate-900/20 border border-slate-905 rounded-2xl space-y-4">
                    <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/20 p-1 rounded border border-emerald-900/40 tracking-wider">
                      <Lightbulb className="w-3 h-3 text-emerald-450" />
                      <span>Phase 2 Operational Tips</span>
                    </span>
                    <div className="space-y-2 text-[11px] text-slate-400 font-light leading-relaxed">
                      <p>
                        💡 <b>Update Physical Details:</b> Complete contact info under "Account Settings" to customize dynamic templates.
                      </p>
                      <p>
                        🦾 <b>Check Plan Limits:</b> Go to "Company Profile" to inspect Maximum Users allowed, Maximum Leads captured & renew dates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LEADS ROUTING PILE */}
            {activeTab === "leads" && (
              <LeadManagementConsole />
            )}

            {/* TAB 3.5: AUTO FOLLOW-UPS ENGINE SECTION */}
            {activeTab === "followups" && (
              <FollowUpConsole />
            )}

            {/* TAB 3.6: AI INSIGHTS & SALES DECISIONS DASHBOARD */}
            {activeTab === "ai-insights" && (
              <AiInsightsDashboard />
            )}

            {/* TAB 3.7: QUOTATION BRANDS AND TEMPLATES DESIGNER */}
            {activeTab === "quotation-templates" && (
              <QuotationTemplatesPanel />
            )}

            {/* TAB 3.8: MASTER PRODUCTS CATALOG MANAGEMENT */}
            {activeTab === "products" && (
              <ProductsPanel businessType={businessType} />
            )}

            {/* TAB 3.85: QUOTATION HISTORY PANEL */}
            {activeTab === "quotations" && (
              <QuotationHistoryPanel />
            )}

            {/* TAB 4: COMPANY PROFILE VIEWER (NEW PHASE 2 REQUIREMENT!) */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Billing Summary Board */}
                <div className="p-6 border border-slate-900 bg-[#070b19]/35 rounded-2xl space-y-5">
                  <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono">Subscription Information</span>
                      <h3 className="text-md font-bold text-white font-display uppercase mt-0.5">{stats?.planName || "Starter"} Plan Tier</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded font-bold text-[9px] uppercase ${getSubBadgeStyle(stats?.subscriptionStatus || "Trial")}`}>
                      {stats?.subscriptionStatus || "Trial"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-semibold">Renewal Date</span>
                      <span className="text-white block font-semibold font-mono">
                        {stats?.renewalDate 
                          ? new Date(stats.renewalDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : "No Expiry"
                        }
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-semibold">Days Remaining</span>
                      <span className="text-indigo-400 block font-bold font-mono">
                        {stats?.daysRemaining || 0} Days Left
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-semibold">User Quotas Limit</span>
                      <span className="text-white block font-semibold">
                        Max {stats?.maxUsers || 2} Active users
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-semibold">WhatsApp Limits</span>
                      <span className="text-emerald-440 block font-semibold">
                        Max {stats?.maxWhatsappNumbers || 1} Device node
                      </span>
                    </div>
                  </div>

                  {planDetails && (
                    <div className="p-4 rounded-xl bg-indigo-950/5 border border-indigo-950 text-indigo-300 font-light flex items-start space-x-2.5">
                      <Info className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-[11px] block uppercase text-white">Full Plan Features:</span>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {planDetails.features?.split(",").map((feat: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-950/30 text-[9.5px] font-medium">
                              ✓ {feat.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Company static credentials profiles card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 border border-slate-900 bg-[#070b19]/20 rounded-2xl space-y-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 pb-2 border-b border-slate-900 flex items-center space-x-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-400" />
                      <span>Company Specifications</span>
                    </h3>

                    <div className="space-y-2.5 text-xs font-light text-slate-300">
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Corporate Name</span>
                        <span className="text-white font-semibold">{companyName}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Owner Name</span>
                        <span className="text-white font-medium">{ownerName}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Owner WhatsApp</span>
                        <span className="text-white font-mono text-emerald-400">{ownerWhatsApp || "Not Configured"}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Business Model</span>
                        <span className="text-indigo-300 font-semibold">{businessType || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Industry Segment</span>
                        <span className="text-white font-medium">{industry || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border border-slate-900 bg-[#070b19]/20 rounded-2xl space-y-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 pb-2 border-b border-slate-900 flex items-center space-x-1.5">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>Contact & Address Geo</span>
                    </h3>

                    <div className="space-y-2.5 text-xs font-light text-slate-300">
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Website Link</span>
                        <span className="text-indigo-400 underline truncate max-w-[150px]">{website || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Mobile Phone</span>
                        <span className="text-white">{phone || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">Primary Country</span>
                        <span className="text-white">{country || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 bg-[#02050b]/20 px-2 rounded">
                        <span className="text-slate-500">State / Region</span>
                        <span className="text-white">{state || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description and Statement summary */}
                <div className="p-5 border border-slate-900 bg-[#02050b]/10 rounded-2xl space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block leading-none">Business Overview Pitch</span>
                  <p className="text-slate-400 text-xs font-light leading-relaxed">
                    {description || "The business overview pitches can be written under workspace coordinates settings to help tune contextual assistant auto replies."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 5: CLIENT CONFIGURE SETTINGS (NEW EDIT FEATURES!) */}
            {activeTab === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Form profile specs updates column */}
                <div className="lg:col-span-2 bg-slate-900/10 border border-slate-900 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white font-display uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                      <SettingsIcon className="w-4 h-4 text-indigo-400" />
                      <span>Amend Workspace Profile</span>
                    </h3>
                    <p className="text-[10px] text-slate-450 italic mt-0.5">Customize corporate parameters, telephone routes and sectors.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4 font-light">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Name *</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-semibold"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner Name *</label>
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-light"
                          required
                        />
                        <p className="text-[9px] text-slate-500 italic">Personalizes notifications and customized client outreach templates.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner WhatsApp Number</label>
                        <input
                          type="text"
                          value={ownerWhatsApp}
                          onChange={(e) => setOwnerWhatsApp(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-mono"
                        />
                        <p className="text-[9px] text-emerald-500 italic">Crucial: Used by the AI communications engine to interact with you regarding client custom inquiries.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval Notification Number</label>
                        <input
                          type="text"
                          value={approvalNotificationNumber}
                          onChange={(e) => setApprovalNotificationNumber(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-mono"
                        />
                        <p className="text-[9px] text-slate-550 italic">Receives quotation approvals and custom order alerts.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Product Catalog PDF</label>
                        
                        {catalogPdfUrl ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#0a0e1a] border border-slate-900 rounded-xl gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-semibold text-slate-200">Catalog PDF Active</p>
                                <p className="text-[9px] font-mono text-indigo-400 truncate max-w-[250px] sm:max-w-md">
                                  {catalogPdfUrl}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <a
                                href={catalogPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 sm:flex-initial text-center px-3.5 py-1.5 bg-[#030611] hover:bg-slate-950 border border-slate-900 rounded-lg text-[10px] font-semibold text-indigo-400 tracking-wide transition"
                              >
                                View PDF
                              </a>
                              <button
                                type="button"
                                onClick={handleRemoveCatalog}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                title="Remove PDF Catalog"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex bg-[#030611] border border-slate-900 p-1 rounded-lg max-w-[280px]">
                              <button
                                type="button"
                                onClick={() => setCatalogMethod("upload")}
                                className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                                  catalogMethod === "upload"
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Upload File
                              </button>
                              <button
                                type="button"
                                onClick={() => setCatalogMethod("url")}
                                className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                                  catalogMethod === "url"
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Direct URL / Link
                              </button>
                            </div>

                            {catalogMethod === "upload" ? (
                              <div className="relative group border border-dashed border-slate-900 hover:border-indigo-500/50 bg-[#030611] rounded-xl p-6 transition flex flex-col items-center justify-center text-center">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  onChange={handleCatalogUpload}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                  disabled={isUploadingCatalog}
                                />
                                
                                {isUploadingCatalog ? (
                                  <div className="flex flex-col items-center space-y-2 py-2">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <p className="text-[11px] font-medium text-slate-300">Uploading and processing catalog PDF...</p>
                                    <p className="text-[9px] text-slate-500">Please wait while the file is saved</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center space-y-2.5">
                                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl group-hover:scale-110 transition duration-300">
                                      <Upload className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[11px] font-semibold text-slate-300">
                                        Click to upload or drag & drop PDF catalog
                                      </p>
                                      <p className="text-[9px] text-slate-400">
                                        Only PDF format supported (Max 1.5MB. Use "Direct URL / Link" for larger files)
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="https://example.com/my-catalog.pdf"
                                  value={tempCatalogUrl}
                                  onChange={(e) => setTempCatalogUrl(e.target.value)}
                                  className="flex-1 bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-mono text-[11px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!tempCatalogUrl.trim()) {
                                      showToast("Please enter a valid PDF URL first.", "error");
                                      return;
                                    }
                                    if (!tempCatalogUrl.startsWith("http://") && !tempCatalogUrl.startsWith("https://")) {
                                      showToast("URL must start with http:// or https://", "error");
                                      return;
                                    }
                                    setCatalogPdfUrl(tempCatalogUrl.trim());
                                    showToast("Catalog PDF link set! Remember to save profile settings below.", "success");
                                  }}
                                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition"
                                >
                                  Link URL
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-[9px] text-indigo-400 italic">
                          This PDF catalog is automatically shared with prospective customers on their first WhatsApp inquiry, prompting them to select products.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Code Number</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Website Link</label>
                        <input
                          type="text"
                          value={website}
                          placeholder="e.g. https://domain.com"
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Sector</label>
                        <select
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-slate-200"
                        >
                          {BUSINESS_TYPES.map((b) => (
                            <option key={b} value={b} className="bg-[#0b0f24] text-slate-100">{b}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Industry Area</label>
                        <input
                          type="text"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Business overview pitcher description</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detail SME coordinates and values used in LLM response generations..."
                        className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 outline-none text-white placeholder-slate-700"
                      />
                    </div>

                    {/* Geo specs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Country</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-500 rounded-lg p-2.5 text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-[#030611] border border-slate-900 focus:border-indigo-505 rounded-lg p-2.5 text-white outline-none"
                        />
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

                    <div className="text-right pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center space-x-2 ml-auto transition-colors cursor-pointer"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 text-white" />
                            <span>Save Business Specs</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right side WhatsApp column */}
                <div className="space-y-6">
                  {/* Form Secure Login Credential update */}
                  <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-white font-display uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <Lock className="w-4 h-4 text-[#ff4c4c]" />
                        <span>Security credentials</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 italic mt-0.5 font-light">Modify account database password keys.</p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4 font-light">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Password *</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#030611] border border-slate-900 focus:border-rose-900 rounded-lg p-2.5 outline-none text-white font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">New Secure Password *</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full bg-[#030611] border border-slate-900 focus:border-rose-900 rounded-lg p-2.5 outline-none text-white font-mono"
                          required
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isChangingPassword}
                          className="w-full px-4 py-2.5 bg-rose-950/20 text-rose-400 hover:bg-rose-900 border border-rose-950/40 hover:text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-xs"
                        >
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating key hash...</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-3.5 h-3.5 text-rose-455" />
                              <span>Update Password Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* WhatsApp Bridge Configurator widget */}
                  <div className="border border-slate-900 bg-[#030611] rounded-2xl p-6 space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#1ebea5]/10 rounded-full flex items-center justify-center text-[#1ebea5] border border-[#1ebea5]/30">
                        <MessageSquare className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Meta WhatsApp Subsystem</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Integrate automated intelligent webhook engines.</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bearer Temporary / Permanent Token ID</label>
                        <input
                          type="password"
                          value={whatsappToken}
                          onChange={(e) => setWhatsappToken(e.target.value)}
                          placeholder="Ex: EAALv... XYZ"
                          className="w-full bg-slate-950 border border-slate-900 focus:border-[#1ebea5] rounded-xl p-3 outline-none text-white font-mono text-[11px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Transmitter Phone Number ID</label>
                        <input
                          type="password"
                          value={whatsappPhoneId}
                          onChange={(e) => setWhatsappPhoneId(e.target.value)}
                          placeholder="Ex: 28410294902"
                          className="w-full bg-slate-950 border border-slate-900 focus:border-[#1ebea5] rounded-xl p-3 outline-none text-white font-mono text-[11px]"
                        />
                      </div>
                      <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-4 shadow-inner">
                        <div className="flex items-center space-x-2 pb-2 border-b border-slate-900/50">
                          <Terminal className="w-3.5 h-3.5 text-slate-500" />
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Configuration URLs</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Verify String / Handshake key</span>
                            <div className="bg-[#02050b] p-2 flex items-center justify-between border border-slate-900 rounded select-all text-emerald-500 font-mono text-[11px]">
                              {whatsappWebhookVerifyToken}
                              <button onClick={() => { navigator.clipboard.writeText(whatsappWebhookVerifyToken); showToast("Token copied."); }} className="text-slate-500 hover:text-white cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Webhook Target Pipeline</span>
                            <div className="bg-[#02050b] p-2 flex items-center justify-between border border-slate-900 rounded select-all text-emerald-500 font-mono text-[10px] sm:text-[11px] overflow-hidden whitespace-nowrap">
                              <span className="truncate pr-2">{whatsappWebhookUrl}</span>
                              <button onClick={() => { navigator.clipboard.writeText(whatsappWebhookUrl); showToast("URL copied."); }} className="text-slate-500 hover:text-white cursor-pointer flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-3">
                        <button
                          onClick={handleTestConnection}
                          disabled={isTestRunning}
                          className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-800 hover:border-emerald-900/50 flex justify-center items-center h-[42px]"
                        >
                          {isTestRunning ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : "Verify Handshake"}
                        </button>
                        <div className="flex flex-col items-center justify-center py-1 px-2 rounded-lg bg-[#02050b] border border-slate-900 h-[42px]">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Node Status</span>
                          <span className={`inline-flex items-center justify-center text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap leading-none select-none ${
                            theme === "light"
                              ? (waConnectorStatus === "CONNECTED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : waConnectorStatus === "DISCONNECTED"
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : "bg-yellow-100 text-yellow-800 border border-yellow-200")
                              : `text-white ${
                                  waConnectorStatus === "CONNECTED"
                                    ? "bg-emerald-600 text-white"
                                    : waConnectorStatus === "DISCONNECTED"
                                      ? "bg-red-900 text-white"
                                      : "bg-yellow-900 text-white"
                                }`
                          }`}>
                            {waConnectorStatus}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveWhatsappSettings}
                        disabled={isSavingWhatsapp}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer flex justify-center items-center h-[42px]"
                      >
                        {isSavingWhatsapp ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white mr-2" />
                            <span>Saving Setup...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 text-white mr-2" />
                            <span>Save Meta WhatsApp Setup</span>
                          </>
                        )}
                      </button>

                      {testResult && (
                        <div className={`p-3 rounded-xl border text-[10px] font-mono whitespace-pre-wrap leading-relaxed ${testResult.success ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-200" : "bg-rose-950/20 border-rose-900/40 text-rose-200"}`}>
                          <b className="uppercase tracking-wider">{testResult.success ? "[PING SUCCESS]" : "[ERR: GATEWAY REJECTED]"}</b><br/>{testResult.text}
                        </div>
                      )}

                    </div>
                  </div>
                </div>

              </div>
            )}


          </div>
        )}
      </main>

      {clientProfile?.id && (
        <>
          <AIAssistantCoPilot clientId={clientProfile.id} />
          <OwnerSimulatorPanel />
        </>
      )}
    </div>
  );
}
