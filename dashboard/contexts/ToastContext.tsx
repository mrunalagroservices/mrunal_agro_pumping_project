"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const STYLES: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
  success: { bg: "bg-white",  border: "border-l-4 border-l-emerald-500", icon: "text-emerald-500", bar: "bg-emerald-500" },
  error:   { bg: "bg-white",  border: "border-l-4 border-l-red-500",     icon: "text-red-500",     bar: "bg-red-500"     },
  warning: { bg: "bg-white",  border: "border-l-4 border-l-amber-500",   icon: "text-amber-500",   bar: "bg-amber-500"   },
  info:    { bg: "bg-white",  border: "border-l-4 border-l-blue-500",    icon: "text-blue-500",    bar: "bg-blue-500"    },
};

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

let nextId = 1;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const s = STYLES[toast.type];
  const Icon = ICONS[toast.type];

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 10);
    // Progress bar
    const step = 100 / (toast.duration / 50);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) { clearInterval(intervalRef.current!); return 0; }
        return p - step;
      });
    }, 50);
    // Auto dismiss
    const dismissTimer = setTimeout(() => dismiss(), toast.duration);
    return () => { clearTimeout(t); clearTimeout(dismissTimer); clearInterval(intervalRef.current!); };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg border border-slate-200 ${s.bg} ${s.border} w-80 transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.icon}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
          {toast.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>}
        </div>
        <button onClick={dismiss} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-1 mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className={`h-0.5 ${s.bar} transition-all ease-linear`} style={{ width: `${progress}%` }} />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message: message || "", duration }]);
  }, []);

  const success = useCallback((title: string, message?: string) => showToast("success", title, message), [showToast]);
  const error   = useCallback((title: string, message?: string) => showToast("error",   title, message, 6000), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast("warning", title, message), [showToast]);
  const info    = useCallback((title: string, message?: string) => showToast("info",    title, message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
