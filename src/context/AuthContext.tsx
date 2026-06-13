import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredToken,
  clearStoredUser,
  api,
} from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (params: {
    companyName: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Attempt session restoration on mount
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);

      // Verify token integrity in the background
      api.get<{ user: any }>("/auth/me")
        .then((res) => {
          if (res.user) {
            const updatedUser = { ...storedUser, role: res.user.role };
            setUser(updatedUser);
            setStoredUser(updatedUser);
          }
        })
        .catch((err) => {
          // Only logout if the token was actively rejected (e.g. 401 or 403)
          // Do not logout if it's a transient server-side error (500) or database offline state
          const msg = err?.message || "";
          if (msg.includes("401") || msg.includes("403")) {
            handleLogout();
          } else {
            console.warn("Background session-sync skipped due to server/database transient issue:", err);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const resp = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
      setStoredToken(resp.token);
      setStoredUser(resp.user);
      setToken(resp.token);
      setUser(resp.user);
      return resp.user;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (params: {
    companyName: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: string;
  }): Promise<User> => {
    setLoading(true);
    try {
      const resp = await api.post<{ token: string; user: User }>("/auth/signup", params);
      setStoredToken(resp.token);
      setStoredUser(resp.user);
      setToken(resp.token);
      setUser(resp.user);
      return resp.user;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    clearStoredUser();
    setToken(null);
    setUser(null);
  };

  const logout = () => {
    handleLogout();
  };

  const refreshUser = async () => {
    try {
      const storedUser = getStoredUser();
      if (!storedUser) return;
      const res = await api.get<{ user: any }>("/auth/me");
      if (res.user) {
        const updatedUser = { ...storedUser, role: res.user.role };
        setUser(updatedUser);
        setStoredUser(updatedUser);
      }
    } catch (err) {
      console.error("Failed to refresh user credentials", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};
