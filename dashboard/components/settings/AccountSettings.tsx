"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon, ShieldCheck, EyeOff, Bell, Wallet, Calculator, Globe,
  Accessibility, BookOpen, LifeBuoy, Loader2, Save, Check, ChevronRight,
  Mail, Phone, Clock, MessageCircleQuestion, AlertTriangle, X,
} from "lucide-react";
import { httpClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { TranslationKey } from "@/lib/translations";
import {
  ApiResponse, User, Address, EmergencyContact, NotificationCategory,
  NotificationPreferences, LegalDocumentSummary, LegalDocument, FaqTopic, Organization,
} from "@/lib/types";

type MenuKey =
  | "personal" | "security" | "privacy" | "notifications" | "payments"
  | "taxes" | "translation" | "accessibility" | "legal" | "support";

const MENU: { key: MenuKey; labelKey: TranslationKey; icon: typeof UserIcon }[] = [
  { key: "personal", labelKey: "acset_menu_personal", icon: UserIcon },
  { key: "security", labelKey: "acset_menu_security", icon: ShieldCheck },
  { key: "privacy", labelKey: "acset_menu_privacy", icon: EyeOff },
  { key: "notifications", labelKey: "acset_menu_notifications", icon: Bell },
  { key: "payments", labelKey: "acset_menu_payments", icon: Wallet },
  { key: "taxes", labelKey: "acset_menu_taxes", icon: Calculator },
  { key: "translation", labelKey: "acset_menu_translation", icon: Globe },
  { key: "accessibility", labelKey: "acset_menu_accessibility", icon: Accessibility },
  { key: "legal", labelKey: "acset_menu_legal", icon: BookOpen },
  { key: "support", labelKey: "acset_menu_support", icon: LifeBuoy },
];

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500";
const labelCls = "block text-xs font-medium text-slate-500 mb-1";

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  const { t } = useLocale();
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {t("common_save")}
    </button>
  );
}

function ComingSoonPanel({ title }: { title: string }) {
  const { t } = useLocale();
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-sm text-slate-400">{t("acset_coming_soon")}</p>
    </div>
  );
}

// ─── Personal information ──────────────────────────────────────────────────
function PersonalInfoPanel({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const { t } = useLocale();
  const [preferredFirstName, setPreferredFirstName] = useState(user.preferred_first_name ?? "");
  const [residential, setResidential] = useState<Address>(user.residential_address ?? {});
  const [emergency, setEmergency] = useState<EmergencyContact>(user.emergency_contact ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await httpClient.put<ApiResponse<User>>("/auth/me", {
        preferred_first_name: preferredFirstName || null,
        residential_address: residential,
        emergency_contact: emergency,
      });
      onSaved(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1">{t("acset_legal_name")}</p>
        <p className="text-sm text-slate-500">{user.name}</p>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <label className={labelCls}>{t("acset_preferred_first_name")}</label>
        <input className={inputCls} value={preferredFirstName} onChange={(e) => setPreferredFirstName(e.target.value)} placeholder={t("acset_not_provided")} />
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">{t("acset_residential_address")}</p>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder={t("acset_address_line1")} value={residential.line1 ?? ""} onChange={(e) => setResidential((a) => ({ ...a, line1: e.target.value }))} />
          <input className={inputCls} placeholder={t("acset_address_line2")} value={residential.line2 ?? ""} onChange={(e) => setResidential((a) => ({ ...a, line2: e.target.value }))} />
          <input className={inputCls} placeholder={t("acset_city")} value={residential.city ?? ""} onChange={(e) => setResidential((a) => ({ ...a, city: e.target.value }))} />
          <input className={inputCls} placeholder={t("acset_state")} value={residential.state ?? ""} onChange={(e) => setResidential((a) => ({ ...a, state: e.target.value }))} />
          <input className={inputCls} placeholder={t("acset_pincode")} value={residential.pincode ?? ""} onChange={(e) => setResidential((a) => ({ ...a, pincode: e.target.value }))} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">{t("acset_emergency_contact")}</p>
        <div className="grid grid-cols-3 gap-3">
          <input className={inputCls} placeholder={t("acset_name")} value={emergency.name ?? ""} onChange={(e) => setEmergency((c) => ({ ...c, name: e.target.value }))} />
          <input className={inputCls} placeholder={t("acset_phone")} value={emergency.phone ?? ""} onChange={(e) => setEmergency((c) => ({ ...c, phone: e.target.value }))} />
          <input className={inputCls} placeholder={t("acset_relationship")} value={emergency.relationship ?? ""} onChange={(e) => setEmergency((c) => ({ ...c, relationship: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <SaveButton saving={saving} saved={saved} onClick={save} />
      </div>
    </div>
  );
}

// ─── Privacy ────────────────────────────────────────────────────────────────
function PrivacyPanel({ user, onSaved, onOpenLegalDoc }: { user: User; onSaved: (u: User) => void; onOpenLegalDoc: (slug: string) => void }) {
  const { t } = useLocale();
  const [analyticsOptIn, setAnalyticsOptIn] = useState(user.analytics_opt_in ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : t("acset_generic_error");
  }

  async function toggleAnalytics(value: boolean) {
    setAnalyticsOptIn(value);
    setError(null);
    try {
      const res = await httpClient.put<ApiResponse<User>>("/auth/me", { analytics_opt_in: value });
      onSaved(res.data);
    } catch (err) {
      setAnalyticsOptIn(!value); // revert
      setError(errorMessage(err));
    }
  }

  async function requestExport() {
    setBusy(true);
    setError(null);
    try {
      await httpClient.post("/auth/me/request-data-export");
      setMessage(t("acset_export_requested"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await httpClient.post<ApiResponse<User>>("/auth/me/request-deletion");
      onSaved(res.data);
      setConfirmingDelete(false);
      setMessage(t("acset_account_deletion_requested"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancelDeletion() {
    setBusy(true);
    setError(null);
    try {
      const res = await httpClient.post<ApiResponse<User>>("/auth/me/cancel-deletion");
      onSaved(res.data);
      setMessage(t("acset_deletion_cancelled"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {message}
          <button onClick={() => setMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-800">{t("acset_data_privacy")}</p>
        <button onClick={() => onOpenLegalDoc("privacy-policy")}
          className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          {t("acset_privacy_policy")} <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <button onClick={requestExport} disabled={busy}
          className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
          {t("acset_request_my_data")} <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">{t("acset_help_improve")}</p>
            <p className="text-xs text-slate-500 max-w-sm">{t("acset_help_improve_desc")}</p>
          </div>
          <input type="checkbox" checked={analyticsOptIn} onChange={(e) => toggleAnalytics(e.target.checked)} className="accent-accent-600 w-5 h-5 shrink-0" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {user.deletion_requested_at ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700">
              {t("acset_deletion_requested_on", { date: new Date(user.deletion_requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) })}
            </p>
            <button onClick={cancelDeletion} disabled={busy}
              className="mt-3 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {t("acset_cancel_deletion")}
            </button>
          </div>
        ) : confirmingDelete ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {t("acset_delete_account_confirm_title")}</p>
            <p className="text-xs text-red-600 mt-1">{t("acset_delete_account_confirm_body")}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setConfirmingDelete(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">{t("common_cancel")}</button>
              <button onClick={confirmDelete} disabled={busy} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">{t("acset_delete_my_account")}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            {t("acset_delete_my_account")} <ChevronRight className="w-4 h-4 text-red-300" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Notifications ──────────────────────────────────────────────────────────
function NotificationsPanel({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const { t } = useLocale();
  const NOTIF_SECTIONS: { title: string; categories: { key: NotificationCategory; label: string }[] }[] = [
    {
      title: t("acset_notif_section_farm_offers"),
      categories: [
        { key: "promo_offers", label: t("acset_notif_promo_offers") },
        { key: "farming_tips", label: t("acset_notif_farming_tips") },
      ],
    },
    {
      title: t("acset_notif_section_app_updates"),
      categories: [
        { key: "news_updates", label: t("acset_notif_news_updates") },
        { key: "feedback_requests", label: t("acset_notif_feedback_requests") },
        { key: "service_alerts", label: t("acset_notif_service_alerts") },
      ],
    },
    {
      title: t("acset_notif_section_account"),
      categories: [
        { key: "account_activity", label: t("acset_notif_account_activity") },
        { key: "order_policies", label: t("acset_notif_order_policies") },
      ],
    },
    {
      title: t("acset_notif_section_reminders"),
      categories: [
        { key: "schedule_reminders", label: t("acset_notif_schedule_reminders") },
        { key: "support_messages", label: t("acset_notif_support_messages") },
      ],
    },
  ];
  const [prefs, setPrefs] = useState<NotificationPreferences>(user.notification_preferences ?? ({} as NotificationPreferences));
  const [saving, setSaving] = useState(false);

  async function toggle(category: NotificationCategory, channel: "email" | "push" | "sms", value: boolean) {
    const next = { ...prefs, [category]: { ...prefs[category], [channel]: value } };
    setPrefs(next);
    setSaving(true);
    try {
      const res = await httpClient.put<ApiResponse<User>>("/auth/me", { notification_preferences: next });
      onSaved(res.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {NOTIF_SECTIONS.map((section) => (
        <div key={section.title} className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-800 mb-3">{section.title}</p>
          <div className="space-y-3">
            {section.categories.map((cat) => {
              const p = prefs[cat.key] ?? { email: false, push: false, sms: false };
              return (
                <div key={cat.key} className="flex items-center justify-between border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                  <p className="text-sm text-slate-700">{cat.label}</p>
                  <div className="flex items-center gap-4">
                    {(["email", "push", "sms"] as const).map((channel) => (
                      <label key={channel} className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                        <input type="checkbox" disabled={saving} checked={p[channel]} onChange={(e) => toggle(cat.key, channel, e.target.checked)} className="accent-accent-600 w-4 h-4" />
                        {channel.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Payments ───────────────────────────────────────────────────────────────
function PaymentsPanel({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const { t } = useLocale();
  const [method, setMethod] = useState(user.preferred_payment_method ?? "cod");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await httpClient.put<ApiResponse<User>>("/auth/me", { preferred_payment_method: method });
      onSaved(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">{t("acset_preferred_payment_method")}</p>
      <div className="flex gap-2">
        {([["cod", t("acset_payment_cod")], ["card", t("acset_payment_card")], ["upi", t("acset_payment_upi")]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setMethod(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${method === value ? "bg-accent-600 text-white border-accent-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <SaveButton saving={saving} saved={saved} onClick={save} />
      </div>
    </div>
  );
}

// ─── Legal ──────────────────────────────────────────────────────────────────
function LegalPanel({ openRequest }: { openRequest: { slug: string; nonce: number } | null }) {
  const { t } = useLocale();
  const [docs, setDocs] = useState<LegalDocumentSummary[]>([]);
  const [active, setActive] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpClient.get<ApiResponse<LegalDocumentSummary[]>>("/legal/documents")
      .then((res) => setDocs(res.data))
      .catch(() => setError(t("acset_legal_docs_load_error")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function open(slug: string) {
    setError(null);
    try {
      const res = await httpClient.get<ApiResponse<LegalDocument>>(`/legal/documents/${slug}`);
      setActive(res.data);
    } catch {
      setError(t("acset_legal_doc_load_error"));
    }
  }

  // Triggered when the Privacy panel's "Privacy Policy" row is clicked —
  // nonce changes on every click so re-clicking the same doc still re-opens it.
  useEffect(() => {
    if (openRequest) open(openRequest.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.nonce]);

  if (error && !active) {
    return <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>;
  }

  if (active) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <button onClick={() => setActive(null)} className="text-sm text-accent-600 font-medium mb-4 hover:underline">{t("acset_back_to_legal")}</button>
        <h3 className="text-lg font-semibold text-slate-800">{active.title}</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          {t("acset_last_updated", { date: new Date(active.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) })}
        </p>
        <div className="space-y-5">
          {active.sections.map((s) => (
            <div key={s.heading}>
              <p className="text-sm font-semibold text-slate-800 mb-1">{s.heading}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {loading ? (
        <p className="text-sm text-slate-500 p-5">{t("common_loading")}</p>
      ) : (
        docs.map((doc) => (
          <button key={doc.slug} onClick={() => open(doc.slug)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
            <span className="text-sm font-medium text-slate-700">{doc.title}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))
      )}
    </div>
  );
}

// ─── Find support ───────────────────────────────────────────────────────────
function SupportPanel() {
  const { t } = useLocale();
  const [contact, setContact] = useState<Organization | null>(null);
  const [faqs, setFaqs] = useState<FaqTopic[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpClient.get<ApiResponse<Organization>>("/support/contact").then((res) => setContact(res.data)).catch(() => setError(t("acset_contact_load_error")));
    httpClient.get<ApiResponse<FaqTopic[]>>("/support/faqs").then((res) => setFaqs(res.data)).catch(() => setError(t("acset_faqs_load_error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800 mb-1">{t("acset_how_can_we_help")}</p>
        {contact?.support_email && (
          <a href={`mailto:${contact.support_email}`} className="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
            <Mail className="w-4 h-4 text-slate-500" /> {contact.support_email}
          </a>
        )}
        {contact?.support_phone && (
          <a href={`tel:${contact.support_phone}`} className="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
            <Phone className="w-4 h-4 text-slate-500" /> {contact.support_phone}
            {contact.support_hours && <span className="text-slate-400 text-xs ml-1">· {contact.support_hours}</span>}
          </a>
        )}
        {!contact && !error && <p className="text-sm text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" /> {t("acset_loading_contact")}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-800 px-5 pt-5 pb-2 flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-accent-600" /> {t("acset_faqs_title")}
        </p>
        <div className="divide-y divide-slate-100">
          {faqs.map((faq) => (
            <button key={faq.id} onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
              className="w-full text-left px-5 py-3">
              <p className="text-sm font-medium text-slate-700">{faq.question}</p>
              {openFaq === faq.id && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{faq.answer}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────
export default function AccountSettings() {
  const { t } = useLocale();
  const { user, updateUser } = useAuth();
  const [active, setActive] = useState<MenuKey>("personal");
  const [legalOpenRequest, setLegalOpenRequest] = useState<{ slug: string; nonce: number } | null>(null);

  function openLegalDoc(slug: string) {
    setActive("legal");
    setLegalOpenRequest((prev) => ({ slug, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  if (!user) return <p className="text-sm text-slate-500">{t("acset_loading_account")}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 max-w-4xl">
      <div className="bg-white rounded-xl border border-slate-200 p-2 h-fit">
        {MENU.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active === item.key ? "bg-accent-50 text-accent-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      <div>
        {active === "personal" && <PersonalInfoPanel user={user} onSaved={updateUser} />}
        {active === "security" && <ComingSoonPanel title={t("acset_menu_security")} />}
        {active === "privacy" && <PrivacyPanel user={user} onSaved={updateUser} onOpenLegalDoc={openLegalDoc} />}
        {active === "notifications" && <NotificationsPanel user={user} onSaved={updateUser} />}
        {active === "payments" && <PaymentsPanel user={user} onSaved={updateUser} />}
        {active === "taxes" && <ComingSoonPanel title={t("acset_menu_taxes")} />}
        {active === "translation" && <ComingSoonPanel title={t("acset_menu_translation")} />}
        {active === "accessibility" && <ComingSoonPanel title={t("acset_menu_accessibility")} />}
        {active === "legal" && <LegalPanel openRequest={legalOpenRequest} />}
        {active === "support" && <SupportPanel />}
      </div>
    </div>
  );
}
