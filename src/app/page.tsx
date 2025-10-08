"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────────────────────────────────────
// Lazy Supabase client (avoids build-time errors on Vercel)
let _supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!_supabase) _supabase = createClient(url, key);
  return _supabase;
}

// Force dynamic rendering so Next.js doesn’t try to prerender this route
export const dynamic = "force-dynamic";

// ───────────────────────────────────────────────────────────────────────────────
// Money helpers (format & parse dollars)
function usd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents || 0) / 100
  );
}
function dollarsToCents(input: string): number {
  const n = Number((input || "0").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

// ───────────────────────────────────────────────────────────────────────────────
// Types
type CatForm = { name: string; amount: string }; // dollars in text while editing
type CategoryLite = { name: string; envelope_cents: number };
type BudgetListItem = {
  id: number; // int8 identity
  period: string;
  created_at: string;
  categories: CategoryLite[] | null;
};

// ───────────────────────────────────────────────────────────────────────────────
export default function FieldGuidePage() {
  const [period, setPeriod] = useState("");
  const [cats, setCats] = useState<CatForm[]>([
    { name: "Groceries", amount: "300" },
    { name: "Gas", amount: "150" },
  ]);
  const [status, setStatus] = useState<string>("");
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const plannedTotalCents = useMemo(
    () => cats.reduce((sum, c) => sum + dollarsToCents(c.amount), 0),
    [cats]
  );

  // Load existing budgets (with categories)
  async function loadBudgets() {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("budgets")
      .select("id, period, created_at, categories(name, envelope_cents)")
      .order("created_at", { ascending: false })
      .returns<BudgetListItem[]>();

    if (error) {
      setStatus("Error loading budgets: " + error.message);
      setBudgets([]);
    } else {
      setStatus("");
      setBudgets(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadBudgets();
  }, []);

  // Form helpers
  const addCat = () => setCats((prev) => [...prev, { name: "", amount: "" }]);
  const updateCatName = (i: number, value: string) =>
    setCats((prev) => prev.map((c, idx) => (idx === i ? { ...c, name: value } : c)));
  const updateCatAmount = (i: number, value: string) => {
    const cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"); // one dot
    setCats((prev) => prev.map((c, idx) => (idx === i ? { ...c, amount: cleaned } : c)));
  };
  const removeCat = (i: number) =>
    setCats((prev) => prev.filter((_, idx) => idx !== i));

  // Create budget flow (with friendly duplicate handling)
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving...");

    if (!/^\d{4}-\d{2}$/.test(period)) {
      setStatus("Please enter period as YYYY-MM (e.g., 2025-10)");
      return;
    }

    const supabase = getSupabaseClient();

    // 1) Pre-check: does this period already exist?
    const { data: existing, error: exErr } = await supabase
      .from("budgets")
      .select("id")
      .eq("period", period)
      .maybeSingle<{ id: number }>();

    if (!exErr && existing) {
      setStatus(`A budget already exists for ${period}. Scroll down to view it.`);
      await loadBudgets();
      return;
    }

    // 2) Create the budget
    const { data: bData, error: bErr } = await supabase
      .from("budgets")
      .insert([{ period }])
      .select("id")
      .single<{ id: number }>();

    if (bErr || !bData) {
      const msg = bErr?.message ?? "";
      if ((bErr as { code?: string }).code === "23505" || /duplicate key|already exists/i.test(msg)) {
        setStatus(`A budget already exists for ${period}. Scroll down to view it.`);
        await loadBudgets();
        return;
      }
      setStatus("Error creating budget: " + (msg || "unknown"));
      return;
    }

    // 3) Insert categories for this budget
    const rows = cats
      .map((c) => ({ name: c.name.trim(), envelope_cents: dollarsToCents(c.amount) }))
      .filter((c) => c.name && c.envelope_cents >= 0)
      .map((c) => ({ ...c, actual_cents: 0, budget_id: bData.id }));

    if (rows.length === 0) {
      setStatus("Add at least one category.");
      return;
    }

    const { error: cErr } = await supabase.from("categories").insert(rows);
    if (cErr) {
      setStatus("Error adding categories: " + cErr.message);
      return;
    }

    setStatus("✅ Budget created!");
    setPeriod("");
    setCats([{ name: "Groceries", amount: "300" }]);
    await loadBudgets();
  }

  async function deleteBudget(id: number) {
    if (!confirm("Delete this budget (and its categories)?")) return;
    setStatus("Deleting...");
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) setStatus("Error deleting: " + error.message);
    else {
      setStatus("Deleted.");
      await loadBudgets();
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Field Guide — Create Budget</h1>

      <form onSubmit={onCreate} className="space-y-4 border rounded-xl p-4">
        <label className="block">
          <div className="mb-1 font-medium">Budget Period (YYYY-MM)</div>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2025-10"
            className="w-full border rounded px-3 py-2"
            required
          />
        </label>

        <div className="space-y-2">
          <div className="font-medium">Categories</div>
          {cats.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Category name"
                value={c.name}
                onChange={(e) => updateCatName(i, e.target.value)}
              />
              <input
                className="w-40 border rounded px-3 py-2"
                placeholder="$0.00"
                inputMode="decimal"
                value={c.amount}
                onChange={(e) => updateCatAmount(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeCat(i)}
                className="px-3 py-2 border rounded"
                aria-label="Remove category"
                title="Remove category"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addCat} className="px-3 py-2 border rounded">
            + Add Category
          </button>
        </div>

        <div className="text-sm opacity-70">
          Planned total: <span className="font-medium">{usd(plannedTotalCents)}</span>
        </div>

        <button className="bg-black text-white rounded px-4 py-2">Create Budget</button>
        {status && <p className="text-sm">{status}</p>}
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent Budgets</h2>
        {loading ? (
          <p>Loading…</p>
        ) : budgets.length === 0 ? (
          <p>No budgets yet.</p>
        ) : (
          budgets.map((b) => {
            const catTotal = (b.categories ?? []).reduce(
              (s, c) => s + (c.envelope_cents || 0),
              0
            );
            return (
              <div key={b.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {b.period} <span className="opacity-60">(# {b.id})</span>
                  </div>
                  <div className="text-sm opacity-70">{usd(catTotal)}</div>
                </div>
                <ul className="list-disc ml-5">
                  {(b.categories ?? []).map((c, idx) => (
                    <li key={idx}>
                      {c.name} — {usd(c.envelope_cents)}
                    </li>
                  ))}
                </ul>
                <button onClick={() => deleteBudget(b.id)} className="mt-2 text-sm underline">
                  Delete
                </button>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
