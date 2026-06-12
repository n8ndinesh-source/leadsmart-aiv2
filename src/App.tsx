import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";

// Route Guard to verify user is logged in
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-light">Authenticating workspace access...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route Guard to verify specific user roles (ADMIN / CLIENT)
const RoleRoute: React.FC<{ children: React.ReactNode; allowedRole: "ADMIN" | "CLIENT" }> = ({
  children,
  allowedRole,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user && user.role !== allowedRole) {
    // If client tries to access admin, redirect to client homepage, and vice-versa
    const defaultDashboard = user.role === "ADMIN" ? "/admin" : "/client";
    return <Navigate to={defaultDashboard} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public views */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Guarded Admin Dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRole="ADMIN">
                    <AdminDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Guarded Client Dashboard */}
            <Route
              path="/client"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRole="CLIENT">
                    <ClientDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
