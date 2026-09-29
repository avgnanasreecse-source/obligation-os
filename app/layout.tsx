import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Obligation OS",
  description: "Every bill, renewal and deadline on one timeline, sequenced by what hurts most if you miss it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
