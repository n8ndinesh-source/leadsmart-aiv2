import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Check,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Users,
  Calendar,
  Layers,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Trash2,
  Tag
} from "lucide-react";

interface AIAssistantCoPilotProps {
  clientId: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  createdAt: Date;
  requiresConfirmation?: boolean;
  pendingActionId?: string;
  actionType?: string;
  requestedAction?: any;
  suggestions?: string[];
  warnings?: string[];
  dataSummary?: {
    totalLeads: number;
    hotLeads: number;
    missedFollowUps: number;
    pendingFollowUps: number;
    potentialRevenueScore: string;
  };
}

export default function AIAssistantCoPilot({ clientId }: AIAssistantCoPilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "stats" | "logs">("chat");
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [isRescheduling, setIsRescheduling] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState("LeadSmart AI");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and fetch conversation history and actions
  useEffect(() => {
    if (clientId) {
      loadHistory();
      loadActionLogs();
    }
  }, [clientId]);

  // Handle auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const loadHistory = async () => {
    try {
      let customName = "LeadSmart AI";
      try {
        const clientResponse = await api.get<any>("/client/profile");
        const clientObj = clientResponse?.client;
        if (clientObj && clientObj.aiAssistantName) {
          customName = clientObj.aiAssistantName;
          setAssistantName(clientObj.aiAssistantName);
        }
      } catch (err) {
        console.error("Failed to load customizable assistant name:", err);
      }

      const chatHistory = await api.get<any[]>(`/ai-assistant/history/${clientId}`);
      if (chatHistory && chatHistory.length > 0) {
        const formatted: Message[] = chatHistory.map((h, index) => ({
          id: h.id || `hist-${index}`,
          sender: "user",
          text: h.message,
          createdAt: new Date(h.createdAt),
        }));

        // Flatten history to show both message and reply alternately
        const list: Message[] = [];
        chatHistory.forEach((h, index) => {
          list.push({
            id: `usr-${h.id || index}`,
            sender: "user",
            text: h.message,
            createdAt: new Date(h.createdAt),
          });
          list.push({
            id: `ai-${h.id || index}`,
            sender: "ai",
            text: h.response,
            createdAt: new Date(h.createdAt),
          });
        });

        setMessages(list);
      } else {
        // Start with a welcoming co-pilot message
        setMessages([
          {
            id: "welcome",
            sender: "ai",
            text: `Greetings! I am your ${customName} Chief Sales Executive & Growth Director. I have bridged full diagnostics across your Leads CRM, WhatsApp conversations, automated follow-up schedules, and commercial intent parameters.\n\nAsk me anything! I can analyze key growth channels, prioritize your hottest leads, create prospects, add notes, restructure reminders, or prune redundant files. How shall we expand your business revenue operations today?`,
            createdAt: new Date(),
            suggestions: [
              "Which leads should I focus on today?",
              "Summarize my business performance",
              "Show hot leads",
              "Why are my sales dropping?"
            ]
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load co-pilot chat history:", err);
    }
  };

  const loadActionLogs = async () => {
    try {
      const logs = await api.get<any[]>(`/ai-assistant/actions/${clientId}`);
      setActionLogs(logs || []);
    } catch (err) {
      console.error("Failed to load co-pilot actions:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawContent = textToSend || inputMessage;
    if (!rawContent.trim() || isLoading) return;

    if (!textToSend) {
      setInputMessage("");
    }

    // Add user message to state
    const userMsg: Message = {
      id: `m-usr-${Date.now()}`,
      sender: "user",
      text: rawContent,
      createdAt: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.post<any>(`/ai-assistant/${clientId}`, {
        input: rawContent
      });

      const aiMsg: Message = {
        id: `m-ai-${Date.now()}`,
        sender: "ai",
        text: response.message,
        createdAt: new Date(),
        requiresConfirmation: response.requiresConfirmation || false,
        pendingActionId: response.pendingActionId,
        actionType: response.actionType,
        requestedAction: response.requestedAction,
        suggestions: response.suggestions,
        warnings: response.warnings,
        dataSummary: response.dataSummary
      };

      setMessages(prev => [...prev, aiMsg]);
      loadActionLogs(); // Refresh action logs if any changes triggered
    } catch (err: any) {
      const errMsg: Message = {
        id: `m-ai-err-${Date.now()}`,
        sender: "ai",
        text: err.message || "Failed to process co-pilot query. Please check your network connection.",
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, pendingActionId: string, originalInput: string) => {
    setIsRescheduling(msgId);
    try {
      const response = await api.post<any>(`/ai-assistant/${clientId}`, {
        input: originalInput,
        confirm: true,
        pendingActionId
      });

      // Update the specific message to indicate successful execution
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            text: response.message,
            requiresConfirmation: false,
            pendingActionId: undefined,
            dataSummary: response.dataSummary || m.dataSummary
          };
        }
        return m;
      }));

      // Add positive outcome message
      loadActionLogs();
    } catch (err: any) {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            text: `Failed to executing command: ${err.message || "Internal database sync error"}`,
            requiresConfirmation: false
          };
        }
        return m;
      }));
    } finally {
      setIsRescheduling(null);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          text: "Action aborted. I am keeping database modifications on hold.",
          requiresConfirmation: false,
          pendingActionId: undefined
        };
      }
      return m;
    }));
  };

  const getLogStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "EXECUTED":
        return "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
      case "PENDING":
        return "bg-amber-950/20 border-amber-900/30 text-amber-400";
      case "FAILED":
        return "bg-rose-950/20 border-rose-900/30 text-rose-400";
      default:
        return "bg-slate-950 border-slate-900 text-slate-400";
    }
  };

  return (
    <>
      {/* 🟣 FLOATING TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-full p-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all outline-none border border-indigo-400/20 cursor-pointer flex items-center space-x-2.5"
        id="copilot-floating-trigger"
        title={`Open ${assistantName} Co-Pilot`}
      >
        <div className="relative">
          <Bot className="w-5.5 h-5.5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
        </div>
        <span className="text-xs font-bold font-display uppercase tracking-wider hidden sm:inline pr-1">
          {assistantName}
        </span>
      </button>

      {/* FLOATING CO-PILOT PANEL */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[480px] h-[640px] max-h-[80vh] bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
          id="copilot-panel-window"
        >
          {/* Header */}
          <div className="bg-slate-900/80 border-b border-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-950/60 border border-indigo-900/40 text-indigo-405 rounded-xl relative">
                <Sparkles className="w-4 h-4 animate-pulse text-[#bf83fc]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-display uppercase tracking-wider flex items-center space-x-1.5">
                  <span>{assistantName} Co-Pilot</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[8px] text-emerald-400 uppercase rounded font-mono">
                    CSO Advisor
                  </span>
                </h4>
                <p className="text-[9px] text-slate-400 font-light">Interactive virtual business operations engine</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Rail */}
          <div className="flex bg-slate-950 border-b border-slate-900">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center cursor-pointer transition-all ${
                activeTab === "chat" ? "border-indigo-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              🤝 Strategy Board
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center cursor-pointer transition-all ${
                activeTab === "stats" ? "border-indigo-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              📊 Pipeline KPIs
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center cursor-pointer transition-all ${
                activeTab === "logs" ? "border-indigo-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              📜 Audit History
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#030611] via-slate-950 to-slate-950">
            
            {/* CHAT TAB */}
            {activeTab === "chat" && (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%] space-y-2">
                      <div
                        className={`p-3.5 rounded-2xl text-[11.5px] leading-relaxed border ${
                          msg.sender === "user"
                            ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-100 rounded-tr-none text-right font-light"
                            : "bg-slate-900/50 border-slate-900/80 text-slate-200 rounded-tl-none text-left"
                        }`}
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {msg.text}
                      </div>

                      {/* Display Warnings */}
                      {msg.sender === "ai" && msg.warnings && msg.warnings.length > 0 && (
                        <div className="space-y-1">
                          {msg.warnings.map((warn, i) => (
                            <div key={i} className="flex items-center space-x-1.5 p-1.5 bg-rose-950/10 border border-rose-900/30 rounded-lg text-[9.5px] text-rose-400">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{warn}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dynamic Confirmation Action Preview Cards */}
                      {msg.sender === "ai" && msg.requiresConfirmation && msg.pendingActionId && (
                        <div className={`p-3.5 rounded-xl space-y-3.5 shadow-md border ${msg.actionType === 'DELETE' ? 'bg-red-950/20 border-red-900/40' : 'bg-slate-900 border-indigo-900/40'}`}>
                          <div className="flex items-start space-x-2">
                            <AlertCircle className={`w-4 h-4 mt-0.5 ${msg.actionType === 'DELETE' ? 'text-red-400' : 'text-indigo-400'}`} />
                            <div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${msg.actionType === 'DELETE' ? 'text-red-400' : 'text-indigo-400'}`}>Pending Action Authorization</span>
                              <span className="text-[10.5px] text-slate-300 block font-light">
                                {msg.actionType === 'DELETE' ? (
                                  <>Delete {msg.requestedAction?.type?.replace(/_/g, " ").replace("DELETE ", "")}?</>
                                ) : (
                                  <>Executing a database modification: <b className="text-indigo-300">{msg.requestedAction?.type?.replace(/_/g, " ")}</b></>
                                )}
                              </span>
                              {msg.requestedAction?.params && (
                                <div className={`mt-2 p-2 rounded border font-mono text-[9px] ${msg.actionType === 'DELETE' ? 'bg-red-950/30 border-red-900 text-red-200' : 'bg-slate-950 border-slate-900 text-slate-400'}`}>
                                  {Object.entries(msg.requestedAction.params).map(([key, val]) => (
                                    <div key={key}>
                                      {key}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => handleConfirmAction(msg.id, msg.pendingActionId!, msg.text)}
                              disabled={isRescheduling === msg.id}
                              className={`flex-1 py-1.5 text-white rounded-lg text-[10px] font-bold cursor-pointer font-display transition-all flex items-center justify-center space-x-1 ${msg.actionType === 'DELETE' ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                            >
                              {isRescheduling === msg.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5 mr-1" />
                              )}
                              <span>{msg.actionType === 'DELETE' ? 'Confirm' : 'Authorize Operation'}</span>
                            </button>
                            <button
                              onClick={() => handleCancelAction(msg.id)}
                              disabled={isRescheduling === msg.id}
                              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Abort
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Custom suggestion pills */}
                      {msg.sender === "ai" && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestions.map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(sug)}
                              className="py-1 px-2.5 bg-slate-900 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-900/60 text-slate-400 hover:text-indigo-300 rounded-full text-[9px] cursor-pointer transition-colors"
                            >
                              💡 {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/50 border border-slate-900/40 rounded-2xl p-3.5 max-w-[80%] flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-300"></span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono italic">Executive reasoning active...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* STATISTICS TAB */}
            {activeTab === "stats" && (
              <div className="space-y-4">
                <div className="bg-[#030611] border border-slate-900/70 p-4 rounded-xl space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                    Real-time Pipeline KPI Health
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-900/60 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-indigo-400">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Leads</span>
                      </div>
                      <span className="text-xl font-bold font-mono text-white">
                        {messages[messages.length - 1]?.dataSummary?.totalLeads ?? "Analyzing..."}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-900/60 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Hot Leads</span>
                      </div>
                      <span className="text-xl font-bold font-mono text-white">
                        {messages[messages.length - 1]?.dataSummary?.hotLeads ?? "Analyzing..."}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-900/60 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Missed Reminders</span>
                      </div>
                      <span className="text-xl font-bold font-mono text-white text-rose-455">
                        {messages[messages.length - 1]?.dataSummary?.missedFollowUps ?? "Analyzing..."}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-900/60 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-emerald-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Active Queue</span>
                      </div>
                      <span className="text-xl font-bold font-mono text-white">
                        {messages[messages.length - 1]?.dataSummary?.pendingFollowUps ?? "Analyzing..."}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 block">Growth Forecast Rating</span>
                      <span className="text-[10px] text-slate-200 font-semibold italic">
                        {messages[messages.length - 1]?.dataSummary?.potentialRevenueScore || "System Evaluating..."}
                      </span>
                    </div>
                    <TrendingUp className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                </div>

                <div className="p-4 bg-[#030611] border border-slate-900/70 rounded-xl text-center space-y-2">
                  <Bot className="w-8 h-8 text-indigo-500 mx-auto" />
                  <span className="text-[10px] font-bold uppercase text-indigo-400 block">CSO Intelligent Insights</span>
                  <p className="text-[10px] text-slate-400 leading-normal font-light">
                    This executive data pool is dynamically optimized after every business query you trigger. Use questions like "Who should I call?" to let me re-strategize operations.
                  </p>
                </div>
              </div>
            )}

            {/* AUDIT HISTORY TAB */}
            {activeTab === "logs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Copilot Modification Logs
                  </span>
                  <button
                    onClick={loadActionLogs}
                    className="p-1 text-slate-400 hover:text-white rounded bg-slate-900 text-[9px] uppercase font-mono flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Sync</span>
                  </button>
                </div>

                {actionLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs font-light">
                    No modifications or automation events logged yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actionLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border flex flex-col space-y-1.5 ${getLogStyle(log.status)}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
                            {log.actionType}
                          </span>
                          <span className="text-[8px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-450">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed font-light font-sans break-all">
                          {log.actionDescription}
                        </p>
                        <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-slate-900/40">
                          <span>Entity: {log.targetEntity || "Lead"}</span>
                          <span>ID: {log.targetId?.slice(0, 10)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Form Command Input Bar */}
          {activeTab === "chat" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-slate-950 border-t border-slate-900/60 flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask co-pilot (e.g. 'Show warm leads'...)"
                disabled={isLoading}
                className="flex-1 bg-[#030611] border border-slate-900 text-slate-200 placeholder-slate-600 rounded-xl p-3 text-[11px] outline-none focus:border-indigo-500/80 transition-colors text-left"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 text-white disabled:text-slate-700 rounded-xl transition-all cursor-pointer shadow-md"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
