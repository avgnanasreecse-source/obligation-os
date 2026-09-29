import type { Obligation } from "./types";

const inDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function demoData(): Obligation[] {
  const mk = (i: number, title: string, category: Obligation["category"], days: number, amount: number | null,
    criticality: 1 | 2 | 3, penalty: string | null, source: string, tip: string | null = null): Obligation =>
    ({ id: `demo-${i}`, title, category, dueDate: inDays(days), amount, criticality, penalty, source, tip });
  return [
    mk(1, "Electricity bill", "bill", 2, 2450, 2, "Late fee ₹150 and disconnection notice", "SMS"),
    mk(2, "Car insurance renewal", "insurance", 3, 14200, 3, "Policy lapses; claims void", "Email"),
    mk(3, "Credit card minimum due", "bill", 3, 5800, 2, "Interest plus ₹800 late fee", "Email"),
    mk(4, "Vehicle pollution certificate", "vehicle", 9, 100, 3, "Fine up to ₹10,000", "WhatsApp"),
    mk(5, "Cloud storage subscription", "subscription", 6, 650, 1, null, "Email", "Unused for 60 days. Cancel before it renews."),
    mk(6, "Passport expiry", "document", 34, null, 3, "Cannot travel; renewal takes weeks", "Letter"),
    mk(7, "Dental check-up", "appointment", 11, null, 1, null, "Calendar"),
  ];
}
