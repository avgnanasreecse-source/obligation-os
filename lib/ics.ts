import type { Obligation } from "./types";

export function toICS(items: Obligation[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ObligationOS//EN"];
  for (const o of items) {
    const d = o.dueDate.replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:${o.id}@obligation-os`, `DTSTAMP:${d}T000000Z`, `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:${o.title}${o.amount ? ` (Rs ${o.amount})` : ""}`, `DESCRIPTION:${o.penalty ?? "Due today"}`,
      "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", "DESCRIPTION:Due in 2 days", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
