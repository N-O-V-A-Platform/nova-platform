"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authService, RegisterRequest, TokenResponse, UserResponse } from "@/services/auth";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  theme: "light" | "dark";
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: RegisterRequest) => Promise<TokenResponse>;
  googleLogin: (idToken: string) => Promise<void>;
  onboard: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function redirectAfterAuth(user: UserResponse, router: ReturnType<typeof useRouter>) {
  if (user.role_name === "Admin") {
    router.push("/admin");
  } else if (!user.is_onboarded) {
    router.push("/onboarding");
  } else if (user.role_name === "Lecturer") {
    router.push("/lecturer/dashboard");
  } else {
    router.push("/student/dashboard");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light">("light");
  const router = useRouter();

  // Force Light (Whiteboard) theme per requirement
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nova_theme");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nova_theme");
      document.documentElement.classList.remove("dark");
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
        setInitializing(false);
      }, remainingTime);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authService.login(credentials);
    setUser(res.user);
    redirectAfterAuth(res.user, router);
  };

  const register = async (data: RegisterRequest): Promise<TokenResponse> => {
    const res = await authService.register(data);

    // Empty tokens mean registration succeeded but email verification or
    // lecturer approval is still required — stay on the register page.
    if (!res.access_token) {
      return res;
    }

    setUser(res.user);
    redirectAfterAuth(res.user, router);
    return res;
  };

  const googleLogin = async (idToken: string) => {
    const res = await authService.googleAuth(idToken);
    setUser(res.user);
    redirectAfterAuth(res.user, router);
  };

  const onboard = async (data: any) => {
    const res = await authService.onboard(data);
    setUser(res.user);

    if (res.user.role_name === "Lecturer") {
      router.push("/lecturer/dashboard");
    } else {
      router.push("/student/dashboard");
    }
  };

  const logout = () => {
    authService.clearToken();
    setUser(null);
    router.push("/login");
  };


  return (
    <AuthContext.Provider value={{ user, loading: initializing, theme, login, register, googleLogin, onboard, logout, refreshUser, toggleTheme }}>
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
