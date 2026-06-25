import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Quotation } from "../types";
import { useTheme } from "../context/ThemeContext";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw, 
  FileDown, 
  Layers, 
  Eye, 
  DollarSign, 
  User 
} from "lucide-react";

export default function QuotationHistoryPanel() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadQuotationsHistory();
  }, []);

  const loadQuotationsHistory = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await api.get<Quotation[]>("/quotations");
      setQuotations(data || []);
    } catch (err: any) {
      console.error("Failed to load quotations history:", err);
      setErrorMessage("Could not load quotations history. Please verify connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage("PDF Link copied to clipboard!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "DRAFT";
    switch (s) {
      case "APPROVED":
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
            <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" /> Approved
          </span>
        );
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/40 text-amber-400 border border-amber-900/40">
            <Clock className="w-3.5 h-3.5 mr-0.5" /> Pending Approval
          </span>
        );
      case "READY":
      case "SENT":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-950/40 text-indigo-400 border border-indigo-900/40">
            <ExternalLink className="w-3.5 h-3.5 mr-0.5" /> Ready / Sent
          </span>
        );
      case "DECLINED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-900/40">
            <XCircle className="w-3.5 h-3.5 mr-0.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/60 text-slate-400 border border-slate-800">
            <FileText className="w-3.5 h-3.5 mr-0.5" /> Draft
          </span>
        );
    }
  };

  // Filtered quotations
  const filteredQuotations = quotations.filter(q => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      q.quotationNumber?.toLowerCase().includes(term) ||
      q.lead?.name?.toLowerCase().includes(term) ||
      q.lead?.phoneNumber?.toLowerCase().includes(term);

    const matchesStatus = 
      statusFilter === "ALL" || 
      q.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate high-level stats from live list
  const totalCount = quotations.length;
  const approvedCount = quotations.filter(q => q.status?.toUpperCase() === "APPROVED" || q.status?.toUpperCase() === "ACCEPTED").length;
  const pendingCount = quotations.filter(q => q.status?.toUpperCase() === "PENDING_APPROVAL").length;
  const totalValue = quotations
    .filter(q => q.status?.toUpperCase() === "APPROVED" || q.status?.toUpperCase() === "ACCEPTED" || q.status?.toUpperCase() === "READY" || q.status?.toUpperCase() === "SENT")
    .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-2 bg-indigo-950/90 border border-indigo-500 text-indigo-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md font-sans text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/40 text-rose-400 flex items-start space-x-3 text-sm">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Operation Error</p>
            <p className="text-xs opacity-90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Top statistics banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Total Quotations</span>
            <p className="text-2xl font-bold text-slate-100 font-mono">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Approved Quotes</span>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Pending Approval</span>
            <p className="text-2xl font-bold text-amber-400 font-mono">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Active Pipeline Value</span>
            <p className="text-2xl font-bold text-indigo-400 font-mono">₹{totalValue.toLocaleString("en-IN")}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center border border-indigo-500/30">
            <DollarSign className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Main control filter headers */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Quotation Number, customer name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Status Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 focus:border-indigo-500 text-slate-300 px-3 py-2 rounded-xl text-sm outline-none cursor-pointer transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="READY">Ready / Sent</option>
              <option value="APPROVED">Approved</option>
              <option value="DECLINED">Rejected</option>
            </select>

            <button
              onClick={loadQuotationsHistory}
              disabled={isLoading}
              className="p-2 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh register"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quotation history grid table */}
      {isLoading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center space-y-4 bg-slate-900/10 border border-slate-800/40 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400 font-light">Loading quotations archive...</span>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800">
            <FileDown className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h3 className="text-slate-200 font-medium text-sm">No quotations found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or check back later.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-800/60 rounded-2xl bg-slate-900/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  <th className="px-5 py-4">Quotation ID</th>
                  <th className="px-5 py-4">Customer (Lead)</th>
                  <th className="px-5 py-4">Line Items</th>
                  <th className="px-5 py-4">Total Value</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans text-sm">
                {filteredQuotations.map((q) => {
                  let productsList: any[] = [];
                  try {
                    productsList = JSON.parse(q.products || "[]");
                  } catch (_) {}

                  const downloadUrl = `${window.location.origin}/api/public/quotations/${q.id}/pdf`;

                  return (
                    <tr key={q.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="px-5 py-4.5 font-mono font-semibold text-slate-200">
                        {q.quotationNumber}
                      </td>
                      <td className="px-5 py-4.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium text-xs">
                              {q.lead?.name || "Unknown Customer"}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {q.lead?.phoneNumber || q.lead?.whatsappNumber || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4.5 text-xs text-slate-400">
                        {productsList.length > 0 ? (
                          <div className="space-y-0.5">
                            {productsList.slice(0, 2).map((p: any, idx: number) => (
                              <p key={idx} className="truncate max-w-[180px]">
                                {p.quantity || p.qty} × {p.productName || p.name || "Product"}
                              </p>
                            ))}
                            {productsList.length > 2 && (
                              <p className="text-[10px] text-indigo-400">
                                + {productsList.length - 2} more items
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No items defined</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5 font-mono text-slate-200 font-semibold">
                        ₹{q.grandTotal?.toLocaleString("en-IN") || "0"}
                      </td>
                      <td className="px-5 py-4.5">
                        {getStatusBadge(q.status)}
                      </td>
                      <td className="px-5 py-4.5 text-xs text-slate-500">
                        {new Date(q.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
                            title="Open / Download formal PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </a>

                          <button
                            onClick={() => copyToClipboard(downloadUrl)}
                            className="p-1.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Copy PDF download URL link"
                          >
                            <Copy className="w-3.5 h-3.5" />
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
      )}
    </div>
  );
}
