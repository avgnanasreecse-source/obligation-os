import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackExtract } from "@/lib/fallbackParser";
import type { Obligation } from "@/lib/types";

const Body = z.object({ text: z.string().min(5, "Paste at least one message").max(8000, "Text too long (max 8000 characters)") });

const Item = z.object({
  title: z.string().min(1).max(80),
  category: z.enum(["bill", "insurance", "vehicle", "subscription", "document", "appointment", "other"]).catch("other"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nullable().catch(null),
  criticality: z.number().int().min(1).max(3).catch(1),
  penalty: z.string().nullable().catch(null),
  source: z.string().catch("unknown"),
  tip: z.string().nullable().catch(null),
});

function buildPrompt(text: string, today: string) {
  return `Today is ${today}. Extract every obligation (bill, renewal, expiry, subscription, appointment) from the messages below.
Return ONLY a JSON array. Each item: {"title":string,"category":"bill|insurance|vehicle|subscription|document|appointment|other","dueDate":"YYYY-MM-DD","amount":number|null,"criticality":1|2|3,"penalty":string|null,"source":"email|SMS|WhatsApp|letter|other","tip":string|null}.
criticality: 3 = coverage lapse or legal risk, 2 = late fee, 1 = low impact. "tip" = one short money-saving suggestion or null. Skip items with no date.
MESSAGES:
${text}`;
}

async function askLLM(text: string): Promise<string | null> {
  const p = buildPrompt(text, new Date().toISOString().slice(0, 10));
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: p }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}`);
    const j = await r.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: p }] }),
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}`);
    const j = await r.json();
    return j.content?.[0]?.text ?? null;
  }
  return null;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { text } = parsed.data;

  try {
    const raw = await askLLM(text);
    if (raw) {
      const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const items: Obligation[] = [];
      for (const x of Array.isArray(json) ? json : []) {
        const r = Item.safeParse(x);
        if (r.success) items.push({ ...r.data, criticality: r.data.criticality as 1 | 2 | 3, id: crypto.randomUUID() });
      }
      if (items.length) return NextResponse.json({ items, mode: "ai" });
    }
  } catch (e) {
    console.error("LLM extraction failed, using fallback:", e);
  }
  return NextResponse.json({ items: fallbackExtract(text), mode: "rules" });
}
