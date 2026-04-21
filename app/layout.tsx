import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Signal Dashboard | Live-ish Free Data + Paper Trading",
  description: "Straight-edge stock signal dashboard with free market data, rule-based signals, and paper trading approval flow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
