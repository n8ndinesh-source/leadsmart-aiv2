import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Mail, Lock, Loader2, ArrowRight, AlertCircle, KeyRound, Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const userObj = await login(email, password);
      // Success redirect
      if (userObj.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/client");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials, please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#030712] text-slate-100" : "bg-slate-50 text-slate-800"} flex items-center justify-center p-4 relative font-sans transition-colors duration-200`}>
      {/* Background blobs */}
      <div className={`absolute top-1/4 left-1/4 w-72 h-72 ${theme === "dark" ? "bg-indigo-600/10" : "bg-indigo-600/5"} rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute bottom-1/4 right-1/4 w-72 h-72 ${theme === "dark" ? "bg-blue-600/10" : "bg-blue-600/5"} rounded-full blur-3xl pointer-events-none`} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo brand back-link */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl font-display text-white">
              L
            </div>
            <span className={`font-display font-bold text-xl tracking-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>LeadSmart AI</span>
          </Link>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} mt-2 font-light`}>
            SaaS Sales Operations Dashboard &mdash; Phase 1
          </p>
        </div>

        {/* Card Frame */}
        <div className={`${theme === "dark" ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-200 shadow-xl"} border rounded-2xl p-6 sm:p-8 backdrop-blur-xl`}>
          <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"} mb-1 font-display`}>Welcome Back</h2>
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} mb-6 font-light`}>Login using your enterprise credentials.</p>

          {errorMessage && (
            <div className={`p-3.5 ${theme === "dark" ? "bg-red-950/30 border-red-900/40 text-red-400" : "bg-red-50 border-red-200 text-red-600"} border rounded-xl text-xs flex items-start space-x-2 mb-4`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-[11px] font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"} uppercase tracking-wider mb-2`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full ${theme === "dark" ? "bg-slate-950/60 border-slate-900/80 text-slate-100 placeholder-slate-600 focus:border-indigo-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500"} border rounded-lg py-2.5 pl-10 pr-4 text-xs outline-none transition-all focus:ring-1 focus:ring-indigo-600`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`block text-[11px] font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"} uppercase tracking-wider`}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className={`text-[11px] font-medium ${theme === "dark" ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-500"} transition-colors`}
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className={`w-full ${theme === "dark" ? "bg-slate-950/60 border-slate-900/80 text-slate-100 placeholder-slate-600 focus:border-indigo-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500"} border rounded-lg py-2.5 pl-10 pr-4 text-xs outline-none transition-all focus:ring-1 focus:ring-indigo-600`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking account...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>


        </div>

        <div className="text-center mt-6 text-xs text-slate-400 font-light">
          No account yet?{" "}
          <Link to="/signup" className={`font-semibold ${theme === "dark" ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-500"} transition-colors`}>
            Create Business Trial
          </Link>
        </div>
      </div>
    </div>
  );
}
