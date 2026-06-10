"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { httpClient } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { ApiResponse, Organization, User } from "@/lib/types";

interface RegisterPayload {
  organization_name: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = httpClient.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    httpClient
      .get<ApiResponse<User>>("/auth/me")
      .then((res) => {
        setUser(res.data);
        socketClient.connect(token);
      })
      .catch(() => {
        httpClient.clearToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await httpClient.post<
      ApiResponse<{ user: User; token: string }>
    >("/auth/login", { email, password });
    httpClient.setToken(res.data.token);
    setUser(res.data.user);
    socketClient.connect(res.data.token);
    router.push("/");
  }

  async function register(payload: RegisterPayload) {
    const res = await httpClient.post<
      ApiResponse<{ user: User; organization: Organization; token: string }>
    >("/auth/register", payload);
    httpClient.setToken(res.data.token);
    setUser(res.data.user);
    socketClient.connect(res.data.token);
    router.push("/");
  }

  function logout() {
    httpClient.clearToken();
    socketClient.disconnect();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
