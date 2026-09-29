export type Category = "bill" | "insurance" | "vehicle" | "subscription" | "document" | "appointment" | "other";

export interface Obligation {
  id: string;
  title: string;
  category: Category;
  dueDate: string; // YYYY-MM-DD
  amount: number | null;
  criticality: 1 | 2 | 3; // 3 = coverage lapse / legal risk, 2 = late fee, 1 = low impact
  penalty: string | null;
  source: string; // where it came from: email, SMS, WhatsApp, letter...
  tip: string | null;
  done?: boolean;
}
