import type { Category, Obligation } from "./types";

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const CATS: [Category, RegExp, 1 | 2 | 3][] = [
  ["insurance", /insurance|policy|premium/i, 3],
  ["vehicle", /vehicle|\bcar\b|bike|puc|service due|fastag/i, 2],
  ["subscription", /subscription|netflix|prime|spotify|renews?/i, 1],
  ["document", /passport|licen[cs]e|aadhaar|expire|expiry|document/i, 3],
  ["appointment", /appointment|scheduled|slot|visit/i, 1],
  ["bill", /bill|electricity|water|gas|due|invoice|recharge|emi|rent/i, 2],
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function fixYear(y: number | null, m: number, d: number): string {
  const now = new Date();
  let year = y ?? now.getFullYear();
  if (year < 100) year += 2000;
  if (y === null && new Date(year, m - 1, d).getTime() < now.getTime() - 30 * 86400000) year++;
  return iso(year, m, d);
}

export function parseDate(s: string): string | null {
  let m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) return fixYear(+m[3], +m[2], +m[1]);
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4})?/i);
  if (m) return fixYear(m[3] ? +m[3] : null, MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  m = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
  if (m) return fixYear(m[3] ? +m[3] : null, MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  return null;
}

/** Rule-based backup so the demo never breaks when the LLM is offline. Messages are separated by blank lines. */
export function fallbackExtract(text: string): Obligation[] {
  const out: Obligation[] = [];
  for (const block of text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)) {
    const due = parseDate(block);
    if (!due) continue;
    const amt = block.match(/(?:₹|rs\.?|inr|\$)\s*([\d,]+(?:\.\d+)?)/i);
    const cat = CATS.find(([, re]) => re.test(block));
    out.push({
      id: crypto.randomUUID(),
      title: block.split("\n")[0].slice(0, 60),
      category: cat ? cat[0] : "other",
      dueDate: due,
      amount: amt ? Number(amt[1].replace(/,/g, "")) : null,
      criticality: cat ? cat[2] : 1,
      penalty: /late fee|penalty|lapse|disconnect|fine/i.test(block) ? "Penalty or lapse mentioned" : null,
      source: "pasted text",
      tip: null,
    });
  }
  return out;
}
