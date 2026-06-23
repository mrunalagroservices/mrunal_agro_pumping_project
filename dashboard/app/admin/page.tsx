"use client";

import { useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdminRedirect() {
  const { t } = useLocale();
  useEffect(() => {
    window.location.replace("https://admin32.mrunalagro.in");
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">{t("admin_redirecting")}</p>
    </div>
  );
}
