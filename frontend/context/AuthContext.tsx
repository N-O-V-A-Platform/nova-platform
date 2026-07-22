"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authService, UserResponse } from "@/services/auth";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  theme: "light" | "dark";
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  onboard: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();

  // Load theme preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("nova_theme") as "light" | "dark";
      // Force default to light theme (Whiteboard) per requirement
      const initialTheme = savedTheme || "light";
      
      setTheme(initialTheme);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const refreshUser = async () => {
    const startTime = Date.now();
    try {
      const token = authService.getToken();
      if (token) {
        const userData = await authService.getMe();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to load user info:", err);
      authService.clearToken();
      setUser(null);
    } finally {
      const elapsed = Date.now() - startTime;
      const minDuration = 1600; // 1.6s minimum splash loading time
      const remainingTime = Math.max(0, minDuration - elapsed);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      setUser(res.user);
      setLoading(false);
      
      // Redirect based on role and onboarding status
      if (res.user.role_name === "Admin") {
        router.push("/admin");
      } else if (!res.user.is_onboarded) {
        router.push("/onboarding");
      } else if (res.user.role_name === "Lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const res = await authService.register(data);

      // If access_token is empty, registration succeeded but email verification is required
      if (!res.access_token) {
        setLoading(false);
        // Don't store tokens or set user — let the register page show the success message
        return;
      }

      setUser(res.user);
      setLoading(false);
      
      // Redirect based on role and onboarding status
      if (res.user.role_name === "Admin") {
        router.push("/admin");
      } else if (!res.user.is_onboarded) {
        router.push("/onboarding");
      } else if (res.user.role_name === "Lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const googleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const res = await authService.googleAuth(idToken);
      setUser(res.user);
      setLoading(false);
      
      // Redirect based on role and onboarding status
      if (res.user.role_name === "Admin") {
        router.push("/admin");
      } else if (!res.user.is_onboarded) {
        router.push("/onboarding");
      } else if (res.user.role_name === "Lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const onboard = async (data: any) => {
    setLoading(true);
    try {
      const res = await authService.onboard(data);
      setUser(res.user);
      setLoading(false);
      
      if (res.user.role_name === "Lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    authService.clearToken();
    setUser(null);
    router.push("/login");
  };


  return (
    <AuthContext.Provider value={{ user, loading, theme, login, register, googleLogin, onboard, logout, refreshUser, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
