"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Cat = { name: string; envelope_cents: number };

export default function FieldGuidePage() {
  const [period, setPeriod] = useState("");
  const [cats, setCats] = useState<Cat[]>([
    { name: "Groceries", envelope_cents: 30000 },
    { name: "Gas", envelope_cents: 15000 },
  ]);
  const [status, setStatus] = useState<string>("");
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadBudgets() {
    setLoading(true);
    // thanks to the FK (categories.budget_id -> budgets.id) we can use embedded select
    const { data, error } = await supabase
      .from("budgets")
      .select("id, period, created_at, categories(name, envelope_cents)")
      .order("created_at", { ascending: false });
    if (!error && data) setBudgets(data);
    setLoading(false);
  }

  useEffect(() => {
    loadBudgets();
  }, []);

  const addCat = () =>
    setCats((prev) => [...prev, { name: "", envelope_cents: 0 }]);

  const updateCat = (i: number, field: keyof Cat, value: string) => {
    const v =
      field === "envelope_cents" ? Number(value.replace(/[^\d]/g, "") || 0) : value;
    setCats((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: v as any } : c))
    );
  };

  const removeCat = (i: number) =>
    setCats((prev) => prev.filter((_, idx) => idx !== i));

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    // 1) create budget row
    const { data: bData, error: bErr } = await supabase
      .from("budgets")
      .insert([{ period }])
      .select("id")
      .single();

    if (bErr || !bData) {
      setStatus("Error creating budget: " + (bErr?.message ?? "unknown"));
      return;
    }

    // 2) insert categories for this budget (filter out empty names)
    const rows = cats
      .filter((c) => c.name.trim() !== "")
      .map((c) => ({
        budget_id: bData.id, // <-- int8 identity from budgets
        name: c.name.trim(),
        envelope_cents: Number.isFinite(c.envelope_cents)
          ? c.envelope_cents
          : 0,
        actual_cents: 0,
      }));

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
    setCats([{ name: "Groceries", envelope_cents: 30000 }]);
    await loadBudgets();
  };

  return (
    <main className="p-6 pb-24 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Field Guide — Create Budget</h1>

      <form onSubmit={onCreate} className="space-y-4 border rounded-xl p-4">
        <label className="block">
          <div className="mb-1 font-medium">Budget Period (e.g., 2025-10)</div>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2025-10"
            className="w-full border rounded px-3 py-2"
            required
          />
        </label>

        <div className="space-y-2">
          <div className="font-medium">Categories (amounts in cents)</div>
          {cats.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Category name"
                value={c.name}
                onChange={(e) => updateCat(i, "name", e.target.value)}
              />
              <input
                className="w-40 border rounded px-3 py-2"
                placeholder="Amount (cents)"
                inputMode="numeric"
                value={String(c.envelope_cents)}
                onChange={(e) => updateCat(i, "envelope_cents", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeCat(i)}
                className="px-3 py-2 border rounded"
                aria-label="Remove category"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCat}
            className="px-3 py-2 border rounded"
          >
            + Add Category
          </button>
        </div>

        <button className="bg-black text-white rounded px-4 py-2">
          Create Budget
        </button>
        {status && <p>{status}</p>}
      </form>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Recent Budgets</h2>
        {loading ? (
          <p>Loading…</p>
        ) : budgets.length === 0 ? (
          <p>No budgets yet.</p>
        ) : (
          budgets.map((b) => (
            <div key={b.id} className="border rounded-lg p-3">
              <div className="font-medium">
                {b.period} <span className="opacity-60">(# {b.id})</span>
              </div>
              <ul className="list-disc ml-5">
                {(b.categories ?? []).map((c: any, idx: number) => (
                  <li key={idx}>
                    {c.name} — ${(c.envelope_cents / 100).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
