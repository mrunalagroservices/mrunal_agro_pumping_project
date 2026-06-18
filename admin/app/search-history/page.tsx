"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, History } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { httpClient } from "@/lib/api";
import { SearchHistoryEntry, ApiResponse } from "@/lib/types";

export default function SearchHistoryPage() {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = search.trim() ? `/admin/search-history?q=${encodeURIComponent(search.trim())}` : "/admin/search-history";
      const res = await httpClient.get<ApiResponse<SearchHistoryEntry[]>>(url);
      setEntries(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Aggregate top queries
  const topQueries = Object.entries(
    entries.reduce((acc, e) => { acc[e.query] = (acc[e.query] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <AdminShell title="Search History">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top searches summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" /> Top Searches
          </h2>
          {topQueries.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topQueries.map(([q, count], i) => (
                <div key={q} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700 font-medium truncate">{q}</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full log */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by query or user…"
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <span className="text-sm text-slate-500">{entries.length} entries</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Query</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Results</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-16">
                        <History className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 font-medium">No searches recorded</p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">"{e.query}"</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-600">{e.user_name || "—"}</p>
                          <p className="text-xs text-slate-400">{e.user_email || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(e.results_count ?? 0) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"}`}>
                            {e.results_count ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
