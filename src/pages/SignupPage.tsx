import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, User as UserIcon, Building2, Loader2, ArrowRight, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("CLIENT");
  
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }

    if (role === "CLIENT" && !companyName) {
      setErrorMessage("Company Name is required for clients");
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        companyName: role === "CLIENT" ? companyName : "",
        name,
        email,
        password,
        confirmPassword,
        role,
      });
      // Signup logs in automatically, take user to correct Dashboard
      navigate(role === "ADMIN" ? "/admin" : "/client");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4 relative font-sans">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-8">
        <div className="text-center mb-6">
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
          <h2 className="text-xl font-bold text-white mb-1 font-display">Get Started Free</h2>
          <p className="text-xs text-slate-400 mb-6 font-light">Get custom CRM workflows and 14 days of full TRIAL access.</p>

          {errorMessage && (
            <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-start space-x-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Account Type
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 rounded-lg py-2.5 px-4 text-xs text-slate-100 outline-none transition-all focus:ring-1 focus:ring-indigo-600 appearance-none"
              >
                <option value="CLIENT">Client Workspace Trial</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            {role === "CLIENT" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Agency Ltd"
                    className="w-full bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
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

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
                  <span>Creating company profile...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400 font-light">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
