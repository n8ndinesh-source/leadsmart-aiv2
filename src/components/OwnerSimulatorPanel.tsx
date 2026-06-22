import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import {
  MessageSquare,
  Smartphone,
  CheckCircle,
  XCircle,
  Edit2,
  PlusCircle,
  Clock,
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  X
} from "lucide-react";

interface OwnerAlert {
  id: string;
  clientId: string;
  leadId: string;
  title: string;
  message: string;
  type: string; // "QUOTATION_APPROVAL" | "CUSTOM_ORDER_ALERT"
  status: string; // "PENDING" | "APPROVED" | "REJECTED" | "EDITED"
  amount: number | null;
  specs: string | null;
  quoteId: string | null;
  createdAt: string;
}

export default function OwnerSimulatorPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<OwnerAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Product creation modal states (within simulator)
  const [customProductAlert, setCustomProductAlert] = useState<OwnerAlert | null>(null);
  const [customProdName, setCustomProdName] = useState("");
  const [customProdSku, setCustomProdSku] = useState("");
  const [customProdPrice, setCustomProdPrice] = useState("8.50");

  const pollIntervalRef = useRef<any>(null);

  const fetchAlerts = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.get<OwnerAlert[]>("/owner-alerts");
      setAlerts(data || []);
    } catch (e) {
      console.error("Failed to load owner alerts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Auto poll notifications every 5 seconds so they appear in real-time as customer sends WhatsApp messages in the simulator!
    pollIntervalRef.current = setInterval(() => {
      fetchAlerts(true);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleApprove = async (alertId: string) => {
    try {
      setIsSubmitting(true);
      await api.post(`/owner-alerts/${alertId}/approve`, {});
      await fetchAlerts(true);
    } catch (err: any) {
      alert(err.message || "Failed to approve quotation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (alertId: string) => {
    try {
      setIsSubmitting(true);
      await api.post(`/owner-alerts/${alertId}/reject`, {});
      await fetchAlerts(true);
    } catch (err: any) {
      alert(err.message || "Failed to reject invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (alertId: string) => {
    if (!customPrice.trim() || isNaN(parseFloat(customPrice))) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post(`/owner-alerts/${alertId}/edit`, { customAmount: customPrice });
      setEditingAlertId(null);
      setCustomPrice("");
      await fetchAlerts(true);
    } catch (err: any) {
      alert(err.message || "Failed to apply custom pricing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomOrderInit = (alert: OwnerAlert) => {
    let specsObj: any = {};
    if (alert.specs) {
      try {
        specsObj = JSON.parse(alert.specs);
      } catch (_) {}
    }
    setCustomProductAlert(alert);
    setCustomProdName(specsObj.product || "Custom Paper Bag");
    setCustomProdPrice("12.00");
    
    // Auto generate neat sequence identifier
    const firstLetter = (specsObj.product?.[0] || "P").toUpperCase();
    const endingLetter = (specsObj.product?.[specsObj.product.length - 1] || "G").toUpperCase();
    setCustomProdSku(`${firstLetter}001${endingLetter}`);
  };

  const handleCustomResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProductAlert) return;

    try {
      setIsSubmitting(true);
      await api.post(`/owner-alerts/${customProductAlert.id}/resolve-custom`, {
        productName: customProdName,
        skuCode: customProdSku,
        unitPrice: customProdPrice
      });
      setCustomProductAlert(null);
      await fetchAlerts(true);
    } catch (err: any) {
      alert(err.message || "Failed to configure custom product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating launcher trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          fetchAlerts(true);
        }}
        className="fixed bottom-24 right-5 bg-gradient-to-r from-emerald-600 to-[#128c7e] hover:from-emerald-500 hover:to-[#1ebb5a] text-white p-3 rounded-full shadow-2xl z-40 flex items-center space-x-2 transition-all active:scale-95 border border-emerald-500/20"
        title="Open simulated remote Owner WhatsApp terminal"
      >
        <Smartphone className="w-5 h-5 animate-pulse" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline">Owner WhatsApp</span>
        {alerts.filter(a => a.status === "PENDING").length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {alerts.filter(a => a.status === "PENDING").length}
          </span>
        )}
      </button>

      {/* Main Simulator Panel Drawer */}
      {isOpen && (
        <div className="fixed bottom-36 right-5 w-96 h-[510px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden max-w-[calc(100vw-40px)] animate-in slide-in-from-bottom duration-200">
          
          {/* Mock Phone Status Indicator Bar */}
          <div className="bg-[#0b141a] px-5 py-2 flex justify-between items-center border-b border-slate-800 text-[10px] font-mono text-slate-500 shrink-0">
            <span>SME Network 5G</span>
            <div className="flex items-center space-x-2">
              <span>● Simulated Active</span>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-slate-850"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Chat Header Header */}
          <div className="bg-[#128c7e] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-lg">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-[#128c7e] font-bold text-sm shadow">
                Owner
              </div>
              <div>
                <h4 className="font-sans font-bold text-xs">Simulated Owner WhatsApp</h4>
                <p className="text-[10px] opacity-90 font-light">LeadSmart AI Notifications Client</p>
              </div>
            </div>
            
            <button
              onClick={() => fetchAlerts(false)}
              className="p-1 hover:bg-[#1ebb5a]/30 rounded transition-colors text-white text-xs font-bold leading-none cursor-pointer"
              title="Force Sync"
            >
              Refresh
            </button>
          </div>

          {/* Alert List Notification Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0b141a] min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#128c7e] mb-2" />
                <span>Synchronizing incoming push logs...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-24 text-slate-500 font-light text-xs max-w-[240px] mx-auto space-y-1">
                <p className="font-bold text-slate-400 text-sm">No notifications yet</p>
                <p className="text-[10px]">Interact as a customer by sending order inquiries inside the lead inspector. Approved assets will pop up here instantly.</p>
              </div>
            ) : (
              alerts.map((alertItem) => {
                const isPending = alertItem.status === "PENDING";
                const isApproved = alertItem.status === "APPROVED";
                const isRejected = alertItem.status === "REJECTED";
                const specsData = alertItem.specs ? JSON.parse(alertItem.specs) : null;

                return (
                  <div
                    key={alertItem.id}
                    className={`rounded-2xl p-3 border text-xs relative overflow-hidden transition-all shadow-md ${
                      isPending
                        ? "bg-slate-900 border-indigo-900/30 text-white"
                        : isApproved
                          ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300 opacity-90"
                          : "bg-rose-950/20 border-rose-900/40 text-rose-300 opacity-80"
                    }`}
                  >
                    {/* Event Tag Style Indicator */}
                    <div className="flex justify-between items-center mb-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        alertItem.type === "QUOTATION_APPROVAL"
                          ? "bg-indigo-950 text-indigo-400 border border-indigo-900/40"
                          : "bg-amber-950 text-amber-400 border border-amber-900/40"
                      }`}>
                        {alertItem.type === "QUOTATION_APPROVAL" ? "📄 Quotation Approval Required" : "🚨 Custom Order Required"}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        {new Date(alertItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Notification message */}
                    <p className="whitespace-pre-wrap font-sans leading-relaxed text-slate-200 text-[11px]">
                      {alertItem.message}
                    </p>

                    {/* Footer statuses for processed actions */}
                    {!isPending && (
                      <div className="mt-3.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase font-mono tracking-wider">
                        <span className="text-slate-402">STATUS:</span>
                        <span className={isApproved ? "text-emerald-400" : "text-rose-400"}>
                          {isApproved ? "✓ Approved & Dispatched" : "✗ Rejected"}
                        </span>
                      </div>
                    )}

                    {/* Interactive workflow buttons inside pending items */}
                    {isPending && (
                      <div className="mt-4 pt-2.5 border-t border-slate-800/60 space-y-2">
                        
                        {alertItem.type === "QUOTATION_APPROVAL" ? (
                          editingAlertId === alertItem.id ? (
                            <div className="space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                              <div className="flex gap-2">
                                <span className="text-[10px] text-slate-400 self-center">₹</span>
                                <input
                                  type="text"
                                  value={customPrice}
                                  onChange={(e) => setCustomPrice(e.target.value)}
                                  placeholder="New Price (e.g., 39500)"
                                  className="flex-grow bg-slate-950 border border-slate-800 text-white p-1.5 rounded text-[10px] outline-none font-mono focus:border-indigo-500"
                                  disabled={isSubmitting}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingAlertId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold rounded cursor-pointer"
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleEditSubmit(alertItem.id)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold rounded cursor-pointer flex items-center space-x-1"
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : "Update & Send"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => handleApprove(alertItem.id)}
                                className="px-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center space-x-1 h-7"
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : "✓ Approve"}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setEditingAlertId(alertItem.id);
                                  setCustomPrice(alertItem.amount ? String(alertItem.amount) : "39500");
                                }}
                                className="px-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center space-x-1 h-7"
                                disabled={isSubmitting}
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>✏ Edit</span>
                              </button>

                              <button
                                onClick={() => handleReject(alertItem.id)}
                                className="px-2 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-840/50 text-rose-300 text-[9px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center space-x-1 h-7"
                                disabled={isSubmitting}
                              >
                                <span>✗ Reject</span>
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCustomOrderInit(alertItem)}
                              className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center space-x-1 h-8 shadow-md"
                              disabled={isSubmitting}
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Create Custom Product & Quote</span>
                            </button>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

          {/* Sub block for resolving Custom items */}
          {customProductAlert && (
            <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col justify-center animate-in zoom-in-95 duration-100 z-50 text-xs">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-white font-mono uppercase text-xs text-amber-500 flex items-center space-x-1.5">
                  <PlusCircle className="w-4 h-4" />
                  <span>Configure Custom Product</span>
                </h5>
                <button
                  onClick={() => setCustomProductAlert(null)}
                  className="p-1 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCustomResolveSubmit} className="space-y-3.5 text-slate-300">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={customProdName}
                    onChange={(e) => setCustomProdName(e.target.value)}
                    className="w-full bg-[#030611] border border-slate-800 focus:border-indigo-500 rounded p-2 text-white font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">SKU Code</label>
                    <input
                      type="text"
                      required
                      value={customProdSku}
                      onChange={(e) => setCustomProdSku(e.target.value)}
                      className="w-full bg-[#030611] border border-slate-800 focus:border-indigo-500 rounded p-2 text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Price Per Unit (₹)</label>
                    <input
                      type="text"
                      required
                      value={customProdPrice}
                      onChange={(e) => setCustomProdPrice(e.target.value)}
                      className="w-full bg-[#030611] border border-slate-800 focus:border-indigo-500 rounded p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded uppercase tracking-wider flex items-center justify-center space-x-1 transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                      <>
                        <span>Add to Catalog & Send Quotation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </>
  );
}
