"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { httpClient } from "@/lib/api";
import { ApiResponse, User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = httpClient.getToken();
    if (!token) { setIsLoading(false); return; }

    httpClient
      .get<ApiResponse<User>>("/auth/me")
      .then((res) => {
        if (!res.data.is_admin) {
          httpClient.clearToken();
          router.replace("/login");
        } else {
          setUser(res.data);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "Unauthorized") httpClient.clearToken();
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  async function login(email: string, password: string) {
    const res = await httpClient.post<ApiResponse<{ user: User; token: string }>>("/auth/login", { email, password });
    if (!res.data.user.is_admin) throw new Error("Access denied. Admin account required.");
    httpClient.setToken(res.data.token);
    setUser(res.data.user);
    router.push("/overview");
  }

  function logout() {
    httpClient.clearToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
