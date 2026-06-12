import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", { email });
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong while sending the reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4 relative font-sans">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-white hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl font-display">
              L
            </div>
            <span className="font-display font-bold text-xl tracking-tight">LeadSmart AI</span>
          </Link>
          <p className="text-xs text-slate-400 mt-2 font-light">
            SME WhatsApp Sales Operating System &mdash; Phase 1
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-1 font-display">Reset Password</h2>
          <p className="text-xs text-slate-400 mb-6 font-light">
            Enter your email and we will send you instructions to recover your credentials.
          </p>

          {successMessage ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-950/40 border border-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Reset Link Sent</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-light">
                {successMessage}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-start space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Company Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-450 hover:text-slate-350 select-none cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 font-light hover:text-slate-200">Return to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
