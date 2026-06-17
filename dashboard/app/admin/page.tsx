"use client";

import { useEffect } from "react";

export default function AdminRedirect() {
  useEffect(() => {
    window.location.replace("https://admin32.mrunalagro.in");
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Redirecting to admin panel…</p>
    </div>
  );
}
