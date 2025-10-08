"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Choice = "field" | "debt";

export default function GetStarted() {
  const [choice, setChoice] = useState<Choice>("field");
  const router = useRouter();
  const go = () => router.push(choice === "field" ? "/field-guide" : "/debt-lab");

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <section className="pt-12 pb-6 px-6 text-center" style={{ background: "var(--cp-grad)", color: "white" }}>
        <div className="mx-auto max-w-sm">
          <div className="mx-auto w-20 h-20 relative logo-shadow">
            <Image src="/clearpath-logo.png" alt="ClearPath" fill sizes="80px" style={{ objectFit: "contain" }} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Welcome to ClearPath</h1>
          <p className="mt-1 opacity-90">Pick your starting path. You can switch anytime.</p>
        </div>
      </section>

      <section className="flex-1 px-6 py-6 grid gap-4 max-w-sm w-full mx-auto">
        <label className={`card cursor-pointer ${choice==="field" ? "ring-2 ring-blue-500" : ""}`}>
          <input type="radio" name="mode" className="hidden" checked={choice==="field"} onChange={() => setChoice("field")} />
          <div className="flex items-start gap-3">
            <div className="text-2xl">🗺️</div>
            <div>
              <div className="font-semibold">Mission-Ready Field Guide</div>
              <div className="text-sm opacity-80">Create monthly budget envelopes in minutes.</div>
            </div>
          </div>
        </label>

        <label className={`card cursor-pointer ${choice==="debt" ? "ring-2 ring-blue-500" : ""}`}>
          <input type="radio" name="mode" className="hidden" checked={choice==="debt"} onChange={() => setChoice("debt")} />
          <div className="flex items-start gap-3">
            <div className="text-2xl">🏁</div>
            <div>
              <div className="font-semibold">Debt Demolition</div>
              <div className="text-sm opacity-80">Add debts & see snowball payoff dates.</div>
            </div>
          </div>
        </label>

        <button className="btn btn-primary mt-2" onClick={go}>Get Started</button>
        <button className="btn btn-ghost" onClick={() => router.push("/")}>Back</button>
      </section>
    </main>
  );
}
