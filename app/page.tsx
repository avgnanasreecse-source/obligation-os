"use client";
import { useEffect, useMemo, useState } from "react";
import type { Obligation } from "@/lib/types";
import { daysLeft, findCrunches, levelOf, priorityScore, savingsTip, weekStart } from "@/lib/scoring";
import { demoData } from "@/lib/demo";
import { toICS } from "@/lib/ics";

const KEY = "obligation-os:v1";
const SAMPLE = `Your electricity bill of Rs 2,450 is due on 5 Oct. Pay before due date to avoid late fee.

HDFC Ergo: your car insurance policy expires 03/10/2026. Renewal premium Rs 14,200. Policy lapses if not renewed.`;

const when = (d: number) => (d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : d === 1 ? "due tomorrow" : `in ${d} days`);
const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function Home() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      setItems(saved ? JSON.parse(saved) : demoData());
    } catch { setItems(demoData()); }
  }, []);
  useEffect(() => {
    try { if (items.length) localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);

  const active = useMemo(
    () => items.filter((i) => !i.done).map((o) => ({ o, score: priorityScore(o) })).sort((a, b) => b.score - a.score),
    [items]
  );
  const crunches = useMemo(() => findCrunches(items), [items]);
  const groups = useMemo(() => {
    const g = new Map<string, Obligation[]>();
    [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).forEach((o) => {
      const w = weekStart(o.dueDate);
      g.set(w, [...(g.get(w) ?? []), o]);
    });
    return [...g.entries()];
  }, [items]);

  async function extract() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Extraction failed");
      if (!j.items.length) throw new Error("No dated obligations found. Include a due date in each message.");
      setItems((prev) => { const base = prev.filter((p) => !p.id.startsWith("demo-")); const seen = new Set(base.map((p) => p.title + "|" + p.dueDate)); return [...base, ...j.items.filter((n: Obligation) => !seen.has(n.title + "|" + n.dueDate))]; });
      setMode(j.mode); setText("");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  function download() {
    const blob = new Blob([toICS(active.map((a) => a.o))], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "obligations.ics"; a.click();
  }

  const toggle = (id: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  return (
    <main>
      <h1>Every obligation, one timeline.</h1>
      <p className="lead">Paste bills, renewals and notices from any channel. We pull out the dates, then order them by what costs you most if you miss them.</p>

      <div className="grid">
        <section className="panel" aria-label="Add messages">
          <h2>Add messages</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste emails, SMS or WhatsApp texts. Separate messages with a blank line." aria-label="Messages to scan" />
          <div className="row">
            <button onClick={extract} disabled={busy || text.trim().length < 5}>{busy ? "Reading..." : "Extract obligations"}</button>
            <button className="ghost" onClick={() => setText(SAMPLE)}>Use sample</button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {mode && <p className="note">Read with {mode === "ai" ? "AI extraction" : "the built-in rule parser"}.</p>}
          <div className="row">
            <button className="ghost" onClick={() => setItems(demoData())}>Reset demo data</button>
            <button className="ghost" onClick={download} disabled={!active.length}>Export to calendar</button>
          </div>
        </section>

        <section aria-label="Timeline">
          {crunches.map((c) => (
            <div className="alert" key={c.week}>
              <b>Busy week from {fmt(c.week)}:</b> {c.count} obligations{c.total ? ` totalling ₹${c.total.toLocaleString("en-IN")}` : ""}. Move payments you can pay early into the week before.
            </div>
          ))}

          {active.length > 0 && (
            <>
              <h2>Do them in this order</h2>
              <ol className="plan">
                {active.slice(0, 5).map(({ o, score }, i) => (
                  <li key={o.id}><span className="rank">{i + 1}</span><span><b>{o.title}</b>, {when(daysLeft(o.dueDate))} <span className="meta">(priority {score})</span></span></li>
                ))}
              </ol>
            </>
          )}

          <h2>Timeline</h2>
          {!items.length && <div className="empty">Nothing tracked yet. Paste a message on the left, or load the sample.</div>}
          {groups.map(([week, list]) => (
            <div key={week}>
              <div className="weeklabel">Week of {fmt(week)}</div>
              <div className="rail">
                {list.map((o) => {
                  const score = priorityScore(o); const lvl = levelOf(score); const tip = savingsTip(o);
                  return (
                    <article key={o.id} className={`item ${lvl} ${o.done ? "done" : ""}`}>
                      <div className="top"><span>{o.title}</span><span className="pill">{o.done ? "done" : lvl}</span></div>
                    <div className="meta">{fmt(o.dueDate)}, {when(daysLeft(o.dueDate))} · {o.category} · via {o.source}{o.amount ? ` · ₹${o.amount.toLocaleString("en-IN")}` : ""}</div>{!o.done && <button className="ghost small" onClick={() => { window.location.href = `upi://pay?pa=YOURUPI@bank&pn=Payee&am=${o.amount ?? ""}&cu=INR&tn=${encodeURIComponent(o.title)}`; }}>Pay now</button>}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
