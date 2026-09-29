import type { Obligation } from "./types";

export type Level = "critical" | "soon" | "upcoming";

export function daysLeft(due: string, now = new Date()): number {
  const d = new Date(due + "T00:00:00");
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

/** 0-100. Blends deadline pressure (55), consequence of missing it (30) and money at stake (15). */
export function priorityScore(o: Obligation): number {
  const d = daysLeft(o.dueDate);
  const urgency = d <= 0 ? 100 : Math.max(0, 100 - d * 5);
  const money = o.amount ? Math.min(o.amount / 20000, 1) : 0;
  return Math.round(urgency * 0.55 + (o.criticality / 3) * 30 + money * 15);
}

export function levelOf(score: number): Level {
  return score >= 70 ? "critical" : score >= 45 ? "soon" : "upcoming";
}

export function weekStart(due: string): string {
  const d = new Date(due + "T00:00:00");
  const shift = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - shift);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface Crunch { week: string; count: number; total: number; titles: string[] }

/** Weeks where obligations pile up: 3+ items or a large cash outflow. */
export function findCrunches(items: Obligation[]): Crunch[] {
  const map = new Map<string, Crunch>();
  for (const o of items.filter((i) => !i.done && daysLeft(i.dueDate) >= 0)) {
    const w = weekStart(o.dueDate);
    const c = map.get(w) ?? { week: w, count: 0, total: 0, titles: [] };
    c.count++; c.total += o.amount ?? 0; c.titles.push(o.title);
    map.set(w, c);
  }
  return [...map.values()].filter((c) => c.count >= 3 || c.total >= 20000).sort((a, b) => a.week.localeCompare(b.week));
}

export function savingsTip(o: Obligation): string | null {
  if (o.tip) return o.tip;
  const d = daysLeft(o.dueDate);
  if (o.category === "subscription") return "Cancel before renewal if you have not used it this month.";
  if (o.category === "insurance" && d > 7) return "Compare quotes now; renewing early often locks a lower premium.";
  if (o.category === "bill" && d > 3) return "Pay a few days early or set autopay to avoid a late fee.";
  return null;
}
