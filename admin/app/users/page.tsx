"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, UserCircle, ShoppingBag, ChevronRight } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { AdminUser, ApiResponse } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<ApiResponse<AdminUser[]>>("/admin/users");
      setUsers(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.org_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Users">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or org…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-72 transition"
          />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Organisation</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Orders</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <UserCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No users found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-teal-700">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.org_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${Number(u.order_count) > 0 ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
                        <ShoppingBag className="w-3 h-3" /> {u.order_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {u.last_order_at
                        ? new Date(u.last_order_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/users/${u.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition-colors">
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
