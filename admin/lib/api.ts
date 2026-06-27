const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010/api/v1";

const TOKEN_KEY = "admin_auth_token";

class HttpClient {
  private baseURL: string;
  constructor(baseURL: string) { this.baseURL = baseURL; }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  }
  setToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  }
  clearToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseURL}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed with ${res.status}`);
    return data as T;
  }

  // Multipart upload — must NOT set Content-Type: application/json or send a
  // JSON-stringified body; the browser sets its own multipart boundary header
  // when the body is a real FormData instance.
  async uploadFile<T>(path: string, file: File, fieldName = "image"): Promise<T> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append(fieldName, file);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseURL}${path}`, { method: "POST", headers, body: formData });

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed with ${res.status}`);
    return data as T;
  }

  get<T>(path: string): Promise<T> { return this.request<T>(path, { method: "GET" }); }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
  }
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
  }
  delete<T>(path: string): Promise<T> { return this.request<T>(path, { method: "DELETE" }); }
}

export const httpClient = new HttpClient(API_BASE_URL);
