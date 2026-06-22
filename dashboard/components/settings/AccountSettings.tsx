"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon, ShieldCheck, EyeOff, Bell, Wallet, Calculator, Globe,
  Accessibility, BookOpen, LifeBuoy, Loader2, Save, Check, ChevronRight,
  Mail, Phone, Clock, MessageCircleQuestion, AlertTriangle, X,
} from "lucide-react";
import { httpClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiResponse, User, Address, EmergencyContact, NotificationCategory,
  NotificationPreferences, LegalDocumentSummary, LegalDocument, FaqTopic, Organization,
} from "@/lib/types";

type MenuKey =
  | "personal" | "security" | "privacy" | "notifications" | "payments"
  | "taxes" | "translation" | "accessibility" | "legal" | "support";

const MENU: { key: MenuKey; label: string; icon: typeof UserIcon }[] = [
  { key: "personal", label: "Personal information", icon: UserIcon },
  { key: "security", label: "Login & security", icon: ShieldCheck },
  { key: "privacy", label: "Privacy", icon: EyeOff },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "taxes", label: "Taxes (GST)", icon: Calculator },
  { key: "translation", label: "Translation", icon: Globe },
  { key: "accessibility", label: "Accessibility", icon: Accessibility },
  { key: "legal", label: "Legal", icon: BookOpen },
  { key: "support", label: "Find support", icon: LifeBuoy },
];

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";
const labelCls = "block text-xs font-medium text-slate-500 mb-1";

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      Save
    </button>
  );
}

function ComingSoonPanel({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-sm text-slate-400">Coming soon.</p>
    </div>
  );
}

// ─── Personal information ──────────────────────────────────────────────────
function PersonalInfoPanel({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
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
        <p className="text-sm font-semibold text-slate-800 mb-1">Legal name</p>
        <p className="text-sm text-slate-500">{user.name}</p>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <label className={labelCls}>Preferred first name</label>
        <input className={inputCls} value={preferredFirstName} onChange={(e) => setPreferredFirstName(e.target.value)} placeholder="Not provided" />
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Residential address</p>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Address line 1" value={residential.line1 ?? ""} onChange={(e) => setResidential((a) => ({ ...a, line1: e.target.value }))} />
          <input className={inputCls} placeholder="Address line 2" value={residential.line2 ?? ""} onChange={(e) => setResidential((a) => ({ ...a, line2: e.target.value }))} />
          <input className={inputCls} placeholder="City" value={residential.city ?? ""} onChange={(e) => setResidential((a) => ({ ...a, city: e.target.value }))} />
          <input className={inputCls} placeholder="State" value={residential.state ?? ""} onChange={(e) => setResidential((a) => ({ ...a, state: e.target.value }))} />
          <input className={inputCls} placeholder="Pincode" value={residential.pincode ?? ""} onChange={(e) => setResidential((a) => ({ ...a, pincode: e.target.value }))} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Emergency contact</p>
        <div className="grid grid-cols-3 gap-3">
          <input className={inputCls} placeholder="Name" value={emergency.name ?? ""} onChange={(e) => setEmergency((c) => ({ ...c, name: e.target.value }))} />
          <input className={inputCls} placeholder="Phone" value={emergency.phone ?? ""} onChange={(e) => setEmergency((c) => ({ ...c, phone: e.target.value }))} />
          <input className={inputCls} placeholder="Relationship" value={emergency.relationship ?? ""} onChange={(e) => setEmergency((c) => ({ ...c, relationship: e.target.value }))} />
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
  const [analyticsOptIn, setAnalyticsOptIn] = useState(user.analytics_opt_in ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : "Something went wrong. Please try again.";
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
      setMessage("Request received — we'll email your data export when it's ready.");
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
      setMessage("Account deletion requested.");
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
      setMessage("Deletion request cancelled.");
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
        <p className="text-sm font-semibold text-slate-800">Data privacy</p>
        <button onClick={() => onOpenLegalDoc("privacy-policy")}
          className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Privacy Policy <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <button onClick={requestExport} disabled={busy}
          className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
          Request my personal data <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Help improve the app</p>
            <p className="text-xs text-slate-500 max-w-sm">Use anonymous usage data to improve features across farm management, irrigation scheduling, and the marketplace.</p>
          </div>
          <input type="checkbox" checked={analyticsOptIn} onChange={(e) => toggleAnalytics(e.target.checked)} className="accent-primary-600 w-5 h-5 shrink-0" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {user.deletion_requested_at ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700">
              Account deletion requested on {new Date(user.deletion_requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
            </p>
            <button onClick={cancelDeletion} disabled={busy}
              className="mt-3 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              Cancel deletion
            </button>
          </div>
        ) : confirmingDelete ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Delete your account?</p>
            <p className="text-xs text-red-600 mt-1">This schedules your account, farms, devices, and order history for permanent deletion after a grace period. You can cancel anytime before it's processed.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setConfirmingDelete(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} disabled={busy} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">Delete my account</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            Delete my account <ChevronRight className="w-4 h-4 text-red-300" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Notifications ──────────────────────────────────────────────────────────
const NOTIF_SECTIONS: { title: string; categories: { key: NotificationCategory; label: string }[] }[] = [
  {
    title: "Farm offers & tips",
    categories: [
      { key: "promo_offers", label: "Promotions and offers" },
      { key: "farming_tips", label: "Farming tips" },
    ],
  },
  {
    title: "Mrunal Agro updates",
    categories: [
      { key: "news_updates", label: "News and features" },
      { key: "feedback_requests", label: "Feedback requests" },
      { key: "service_alerts", label: "Service alerts" },
    ],
  },
  {
    title: "Account activity and policies",
    categories: [
      { key: "account_activity", label: "Account activity" },
      { key: "order_policies", label: "Order policies" },
    ],
  },
  {
    title: "Reminders & support",
    categories: [
      { key: "schedule_reminders", label: "Schedule reminders" },
      { key: "support_messages", label: "Messages" },
    ],
  },
];

function NotificationsPanel({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
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
                        <input type="checkbox" disabled={saving} checked={p[channel]} onChange={(e) => toggle(cat.key, channel, e.target.checked)} className="accent-primary-600 w-4 h-4" />
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
      <p className="text-sm font-semibold text-slate-800">Preferred payment method</p>
      <div className="flex gap-2">
        {([["cod", "Cash on Delivery"], ["card", "Card"], ["upi", "UPI"]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setMethod(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${method === value ? "bg-primary-600 text-white border-primary-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
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
  const [docs, setDocs] = useState<LegalDocumentSummary[]>([]);
  const [active, setActive] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpClient.get<ApiResponse<LegalDocumentSummary[]>>("/legal/documents")
      .then((res) => setDocs(res.data))
      .catch(() => setError("Could not load legal documents."))
      .finally(() => setLoading(false));
  }, []);

  async function open(slug: string) {
    setError(null);
    try {
      const res = await httpClient.get<ApiResponse<LegalDocument>>(`/legal/documents/${slug}`);
      setActive(res.data);
    } catch {
      setError("Could not load this document.");
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
        <button onClick={() => setActive(null)} className="text-sm text-primary-600 font-medium mb-4 hover:underline">← Back to Legal</button>
        <h3 className="text-lg font-semibold text-slate-800">{active.title}</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Last updated {new Date(active.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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
        <p className="text-sm text-slate-500 p-5">Loading...</p>
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
  const [contact, setContact] = useState<Organization | null>(null);
  const [faqs, setFaqs] = useState<FaqTopic[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpClient.get<ApiResponse<Organization>>("/support/contact").then((res) => setContact(res.data)).catch(() => setError("Could not load contact details."));
    httpClient.get<ApiResponse<FaqTopic[]>>("/support/faqs").then((res) => setFaqs(res.data)).catch(() => setError("Could not load FAQs."));
  }, []);

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800 mb-1">How can we help?</p>
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
        {!contact && !error && <p className="text-sm text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Loading contact details...</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-800 px-5 pt-5 pb-2 flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-primary-600" /> Frequently asked questions
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
  const { user, updateUser } = useAuth();
  const [active, setActive] = useState<MenuKey>("personal");
  const [legalOpenRequest, setLegalOpenRequest] = useState<{ slug: string; nonce: number } | null>(null);

  function openLegalDoc(slug: string) {
    setActive("legal");
    setLegalOpenRequest((prev) => ({ slug, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  if (!user) return <p className="text-sm text-slate-500">Loading account...</p>;

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
                active === item.key ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div>
        {active === "personal" && <PersonalInfoPanel user={user} onSaved={updateUser} />}
        {active === "security" && <ComingSoonPanel title="Login & security" />}
        {active === "privacy" && <PrivacyPanel user={user} onSaved={updateUser} onOpenLegalDoc={openLegalDoc} />}
        {active === "notifications" && <NotificationsPanel user={user} onSaved={updateUser} />}
        {active === "payments" && <PaymentsPanel user={user} onSaved={updateUser} />}
        {active === "taxes" && <ComingSoonPanel title="Taxes (GST)" />}
        {active === "translation" && <ComingSoonPanel title="Translation" />}
        {active === "accessibility" && <ComingSoonPanel title="Accessibility" />}
        {active === "legal" && <LegalPanel openRequest={legalOpenRequest} />}
        {active === "support" && <SupportPanel />}
      </div>
    </div>
  );
}
