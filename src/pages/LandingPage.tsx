import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  ArrowRight, 
  Bot, 
  MessageSquare, 
  Clock, 
  Sparkles, 
  Check, 
  Zap, 
  Play, 
  ShieldCheck, 
  Smartphone 
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/client");
      }
    } else {
      navigate("/signup");
    }
  };

  const features = [
    {
      icon: <Check className="w-5 h-5 text-indigo-400" />,
      title: "Lead Management",
      desc: "Automatically capture, enrich, and prioritize incoming leads from your sales webhooks.",
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-indigo-400" />,
      title: "WhatsApp Automation",
      desc: "Reach out and reply to clients instantly on the world's most popular messaging channel.",
    },
    {
      icon: <Bot className="w-5 h-5 text-indigo-400" />,
      title: "AI Business Assistant",
      desc: "Always-on business intelligence answering queries and booking calls with 99% accuracy.",
    },
    {
      icon: <Clock className="w-5 h-5 text-indigo-400" />,
      title: "Auto Follow-ups",
      desc: "Nurture lost or busy users via smart schedules, turning cold chats into premium revenue.",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "month",
      desc: "Perfect for single operators launching automated chat outreach.",
      features: [
        "1 Connected WhatsApp Number",
        "Up to 500 Managed Leads / month",
        "Core AI Assistant capabilities",
        "Community & documentation support",
      ],
      highlight: false,
    },
    {
      name: "Growth",
      price: "$79",
      period: "month",
      desc: "Best fit for fast-scaling SMEs wanting a complete sales system.",
      features: [
        "3 Connected WhatsApp Numbers",
        "Up to 2,500 Managed Leads / month",
        "Advanced AI and customizable triggers",
        "Priority live-chat assistance",
        "Full dashboard & CRM hooks",
      ],
      highlight: true,
    },
    {
      name: "Pro",
      price: "$199",
      period: "month",
      desc: "Designed for high-volume outfits with custom workflow integrations.",
      features: [
        "Unlimited WhatsApp Connections",
        "Unlimited Managed Leads",
        "Custom Fine-tuned LLM Assistants",
        "Dedicated Account Executive",
        "SLA Guaranteed Webhook pipelines",
      ],
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Grid background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-slate-900 bg-[#030712]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg font-display">
              L
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              LeadSmart <span className="text-indigo-400 font-medium">AI</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm text-slate-400 font-medium">
            <a href="#features" className="hover:text-slate-100 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-100 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-slate-100 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center space-x-3">
            {user ? (
              <Link
                to={user.role === "ADMIN" ? "/admin" : "/client"}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold px-3 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pt-20 pb-20 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-900/50 bg-indigo-950/20 text-xs text-indigo-300 mb-6 font-medium">
          <Zap className="w-3.5 h-3.5" />
          <span>Phase 1 Foundation Live</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-none">
          LeadSmart <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-500">AI</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-8 font-light">
          AI-powered WhatsApp Sales Operating System for SMEs. Automate your sales pipeline, capture offline queries, and raise your lead response conversion in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleCTA}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-xl shadow-indigo-600/25 group cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:text-white text-slate-300 font-semibold text-sm transition-all"
          >
            Live Demo
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 border-t border-slate-900/60 bg-gradient-to-b from-[#030712] via-[#090d1a] to-[#030712] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to automate SME sales
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-light">
              We translate passive visitor actions into responsive, automated sales interactions across standard WhatsApp feeds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {features.map((feat, i) => (
              <div 
                key={i} 
                className="p-6 bg-slate-900/20 border border-slate-900 hover:border-indigo-900/50 hover:bg-slate-900/30 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-950/40 flex items-center justify-center border border-indigo-900/30 mb-4 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2 font-display">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24 bg-[#030712]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-slate-400 font-light">
              Secure your operations with pricing designed to match your enterprise size.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-8 rounded-2xl border flex flex-col justify-between transition-all ${
                  plan.highlight 
                  ? "bg-slate-950 border-indigo-500/80 shadow-2xl shadow-indigo-600/10" 
                  : "bg-slate-900/10 border-slate-900 hover:border-slate-800"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="font-display text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-3xl font-bold text-white font-display">{plan.price}</span>
                    <span className="text-xs text-slate-500 ml-1 font-light">/{plan.period}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed font-light">{plan.desc}</p>
                  
                  <ul className="space-y-3 border-t border-slate-900 pt-6 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-light">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleCTA}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    plan.highlight 
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20" 
                    : "bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Start {plan.name} Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 border-t border-slate-950 bg-[#020610] py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                L
              </div>
              <span className="font-display font-semibold text-sm text-white">LeadSmart AI</span>
            </div>
            <p className="max-w-xs text-slate-400 font-light leading-relaxed">
              Phase 1 Enterprise architecture. An automated customer engagement suite driving SME success.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-slate-300 transition-colors">Home</a></li>
              <li><a href="#features" className="hover:text-slate-300 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">Support</h4>
            <ul className="space-y-2">
              <li className="font-light">contact@leadsmart.ai</li>
              <li className="font-light">SME Business Center, Block 4</li>
              <li className="font-light">Phase 1 Integration Ready</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-950 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-light text-[11px]">
          <span>&copy; {new Date().getFullYear()} LeadSmart AI. All Rights Reserved.</span>
          <div className="flex space-x-4">
            <span className="text-indigo-400 font-medium">Enterprise Sandbox</span>
            <span>&bull;</span>
            <span>GDPR Secure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
