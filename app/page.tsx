"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bell, Brain, ChevronDown, LineChart, Shield, TrendingUp, Wallet, RefreshCw } from "lucide-react";

type SignalRow = {
  ticker: string;
  name: string;
  price: number | null;
  signal: "Buy" | "Hold" | "Watch" | "Sell";
  confidence: number;
  risk: "Low" | "Medium" | "High";
  reason: string;
  changePercent: number | null;
};

type PaperTrade = {
  id: string;
  ticker: string;
  action: "Buy" | "Sell";
  price: number | null;
  createdAt: string;
  confidence: number;
  risk: string;
  status: "Approved" | "Rejected";
};

const defaultTickers = "AAPL,MSFT,NVDA,AMZN,TSLA,META,AMD,GOOGL";

const strategyCards = [
  { title: "Live-ish Free Data", text: "Uses free best-effort market data so you can prototype without paying for exchange feeds first.", icon: LineChart },
  { title: "Signal Engine", text: "Builds signals from moving averages, RSI, and momentum instead of random guesses.", icon: Brain },
  { title: "Risk Filter", text: "Labels each setup low, medium, or high risk for easier review.", icon: Shield },
  { title: "Paper Trading Flow", text: "Approve or reject trades first before you ever connect broker automation.", icon: Wallet },
];

function badgeClasses(signal: string) {
  if (signal === "Buy") return { border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.15)", color: "#86efac" };
  if (signal === "Sell") return { border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.15)", color: "#fda4af" };
  if (signal === "Hold") return { border: "1px solid rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.15)", color: "#7dd3fc" };
  return { border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.15)", color: "#fcd34d" };
}

export default function Page() {
  const [tickers, setTickers] = useState(defaultTickers);
  const [query, setQuery] = useState("");
  const [selectedSignal, setSelectedSignal] = useState("All");
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<SignalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("paperTradesV1");
      if (saved) setPaperTrades(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("paperTradesV1", JSON.stringify(paperTrades));
    } catch {}
  }, [paperTrades]);

  async function refreshData() {
    try {
      setLoading(true);
      setError("");
      const encoded = encodeURIComponent(tickers);
      const signalRes = await fetch(`/api/signals?tickers=${encoded}`, { cache: "no-store" });
      const signalJson = await signalRes.json();
      if (!signalJson.ok) throw new Error(signalJson.error || "Could not load data.");
      setSignals(signalJson.data);
      setSelectedTicker((current) => {
        if (!current) return signalJson.data[0] || null;
        return signalJson.data.find((x: SignalRow) => x.ticker === current.ticker) || signalJson.data[0] || null;
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load free market data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
    const id = setInterval(refreshData, 60000);
    return () => clearInterval(id);
  }, []);

  const filteredSignals = useMemo(() => {
    return signals.filter((item) => {
      const matchesQuery = `${item.ticker} ${item.name}`.toLowerCase().includes(query.toLowerCase());
      const matchesSignal = selectedSignal === "All" || item.signal === selectedSignal;
      return matchesQuery && matchesSignal;
    });
  }, [signals, query, selectedSignal]);

  function queuePaperTrade(status: "Approved" | "Rejected") {
    if (!selectedTicker) return;
    const action = selectedTicker.signal === "Sell" ? "Sell" : "Buy";
    const trade: PaperTrade = {
      id: `${selectedTicker.ticker}-${Date.now()}`,
      ticker: selectedTicker.ticker,
      action,
      price: selectedTicker.price,
      createdAt: new Date().toLocaleString(),
      confidence: selectedTicker.confidence,
      risk: selectedTicker.risk,
      status,
    };
    setPaperTrades((prev) => [trade, ...prev]);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07111f", color: "white" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#09182b", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: 10, background: "rgba(34,211,238,0.12)", color: "#67e8f9" }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>Stock Signal Dashboard</div>
              <div style={{ color: "#94a3b8", fontSize: 14 }}>Free connected data + signals + paper trading</div>
            </div>
          </div>
          <button onClick={refreshData} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "white", padding: "12px 16px", cursor: "pointer" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><RefreshCw size={16} />Refresh Now</span>
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <section style={{ display: "grid", gap: 24, gridTemplateColumns: "1.15fr 0.85fr" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(135deg,#0c1d33,#102844 55%,#0b1526)", padding: 28 }}>
            <div style={{ display: "inline-block", border: "1px solid rgba(34,211,238,0.2)", background: "rgba(34,211,238,0.08)", color: "#a5f3fc", padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
              Version 1 — free connected build
            </div>
            <h1 style={{ marginTop: 20, fontSize: 44, lineHeight: 1.05, textTransform: "uppercase" }}>
              Connected signal site with manual approval and paper trading.
            </h1>
            <p style={{ marginTop: 18, color: "#cbd5e1", lineHeight: 1.8, fontSize: 18 }}>
              This build pulls best-effort free market data, runs a simple rule-based signal engine, and lets you approve or reject paper trades.
            </p>
            <div style={{ marginTop: 20, color: "#fbbf24", lineHeight: 1.7 }}>
              Free data can be delayed, limited, or inconsistent. This is for research and simulation — not guaranteed profit.
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0b1728", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bell size={20} color="#67e8f9" />
              <div>
                <div style={{ fontWeight: 900, textTransform: "uppercase", fontSize: 22 }}>Status</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Connection + usage notes</div>
              </div>
            </div>
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 16 }}>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Data mode</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Free / best-effort Yahoo feed</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 16 }}>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Refresh cadence</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Auto-refresh every 60 seconds</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 16 }}>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Trade mode</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Paper trading only</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, 1fr)", marginTop: 24 }}>
          {strategyCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0b1728", padding: 20 }}>
                <div style={{ display: "inline-flex", padding: 10, background: "rgba(34,211,238,0.1)", color: "#67e8f9" }}>
                  <Icon size={18} />
                </div>
                <div style={{ marginTop: 14, fontWeight: 900, textTransform: "uppercase", fontSize: 18 }}>{card.title}</div>
                <div style={{ marginTop: 10, color: "#cbd5e1", lineHeight: 1.7, fontSize: 14 }}>{card.text}</div>
              </div>
            );
          })}
        </section>

        <section style={{ marginTop: 24, border: "1px solid rgba(255,255,255,0.1)", background: "#0b1728", padding: 20 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 }}>Tickers (comma separated)</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input value={tickers} onChange={(e) => setTickers(e.target.value.toUpperCase())} style={{ flex: 1, minWidth: 300, padding: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }} />
              <button onClick={refreshData} style={{ padding: "14px 18px", background: "#22d3ee", color: "#082f49", border: "none", fontWeight: 700, cursor: "pointer" }}>Load Tickers</button>
            </div>
            {error ? <div style={{ color: "#fda4af" }}>{error}</div> : null}
          </div>
        </section>

        <section style={{ display: "grid", gap: 24, gridTemplateColumns: "1.05fr 0.95fr", marginTop: 24 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0b1728", padding: 24 }}>
            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, textTransform: "uppercase", fontSize: 26 }}>Signal Table</div>
                <div style={{ color: "#94a3b8", marginTop: 4 }}>Generated from free connected data</div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker..." style={{ padding: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }} />
                <div style={{ position: "relative" }}>
                  <select value={selectedSignal} onChange={(e) => setSelectedSignal(e.target.value)} style={{ padding: "12px 38px 12px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "white", appearance: "none" }}>
                    <option>All</option><option>Buy</option><option>Hold</option><option>Watch</option><option>Sell</option>
                  </select>
                  <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              {loading ? (
                <div style={{ color: "#cbd5e1" }}>Loading connected data...</div>
              ) : filteredSignals.length === 0 ? (
                <div style={{ color: "#cbd5e1" }}>No signals match your search.</div>
              ) : (
                filteredSignals.map((item) => (
                  <button key={item.ticker} onClick={() => setSelectedTicker(item)} style={{ textAlign: "left", border: selectedTicker?.ticker === item.ticker ? "1px solid rgba(34,211,238,0.5)" : "1px solid rgba(255,255,255,0.08)", background: selectedTicker?.ticker === item.ticker ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.04)", padding: 18, color: "white", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 900, fontSize: 20, textTransform: "uppercase" }}>{item.ticker}</div>
                          <div style={{ ...badgeClasses(item.signal), padding: "4px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{item.signal}</div>
                        </div>
                        <div style={{ marginTop: 6, color: "#cbd5e1" }}>{item.name}</div>
                        <div style={{ marginTop: 10, color: "#94a3b8", lineHeight: 1.7 }}>{item.reason}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(100px, 1fr))", gap: 10, minWidth: 220 }}>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Price</div><div style={{ marginTop: 4, fontWeight: 700 }}>{item.price ? `$${item.price.toFixed(2)}` : "n/a"}</div></div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Change</div><div style={{ marginTop: 4, fontWeight: 700, color: (item.changePercent ?? 0) >= 0 ? "#86efac" : "#fda4af" }}>{typeof item.changePercent === "number" ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%` : "n/a"}</div></div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Confidence</div><div style={{ marginTop: 4, fontWeight: 700 }}>{item.confidence}%</div></div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Risk</div><div style={{ marginTop: 4, fontWeight: 700 }}>{item.risk}</div></div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0b1728", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 900, textTransform: "uppercase", fontSize: 26 }}>Trade Review</div><div style={{ color: "#94a3b8", marginTop: 4 }}>Approve or reject paper trades</div></div>
              {selectedTicker ? <div style={{ ...badgeClasses(selectedTicker.signal), padding: "6px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{selectedTicker.signal}</div> : null}
            </div>

            {!selectedTicker ? <div style={{ marginTop: 20, color: "#cbd5e1" }}>Pick a signal from the table.</div> : (
              <>
                <div style={{ marginTop: 18, border: "1px solid rgba(34,211,238,0.2)", background: "rgba(34,211,238,0.08)", padding: 18 }}>
                  <div style={{ color: "#a5f3fc", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>Selected ticker</div>
                  <div style={{ marginTop: 6, fontWeight: 900, fontSize: 34 }}>{selectedTicker.ticker}</div>
                  <div style={{ marginTop: 4, color: "#cbd5e1" }}>{selectedTicker.name}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 16 }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 14 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Price</div><div style={{ marginTop: 6, fontWeight: 700, fontSize: 20 }}>{selectedTicker.price ? `$${selectedTicker.price.toFixed(2)}` : "n/a"}</div></div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 14 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Confidence</div><div style={{ marginTop: 6, fontWeight: 700, fontSize: 20 }}>{selectedTicker.confidence}%</div></div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 14 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Risk</div><div style={{ marginTop: 6, fontWeight: 700, fontSize: 20 }}>{selectedTicker.risk}</div></div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 14 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Action</div><div style={{ marginTop: 6, fontWeight: 700, fontSize: 20 }}>{selectedTicker.signal}</div></div>
                </div>

                <div style={{ marginTop: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 14 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>Why this fired</div>
                  <div style={{ marginTop: 10, lineHeight: 1.7, color: "#cbd5e1" }}>{selectedTicker.reason}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 16 }}>
                  <button onClick={() => queuePaperTrade("Approved")} style={{ padding: "14px 16px", background: "#22c55e", color: "#052e16", border: "none", fontWeight: 800, cursor: "pointer" }}>Approve Paper Trade</button>
                  <button onClick={() => queuePaperTrade("Rejected")} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 800, cursor: "pointer" }}>Reject Signal</button>
                </div>
              </>
            )}
          </div>
        </section>

        <section style={{ marginTop: 24, border: "1px solid rgba(255,255,255,0.1)", background: "#0b1728", padding: 24 }}>
          <div style={{ fontWeight: 900, textTransform: "uppercase", fontSize: 24 }}>Paper Trade Log</div>
          <div style={{ color: "#94a3b8", marginTop: 4 }}>Stored locally in your browser for version 1</div>
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {paperTrades.length === 0 ? (
              <div style={{ color: "#cbd5e1" }}>No paper trades yet. Approve or reject one from the panel above.</div>
            ) : (
              paperTrades.map((trade) => (
                <div key={trade.id} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div><div style={{ fontWeight: 800 }}>{trade.ticker} — {trade.action}</div><div style={{ marginTop: 6, color: "#94a3b8", fontSize: 14 }}>{trade.createdAt}</div></div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <div>Price: <strong>{trade.price ? `$${trade.price.toFixed(2)}` : "n/a"}</strong></div>
                    <div>Confidence: <strong>{trade.confidence}%</strong></div>
                    <div>Risk: <strong>{trade.risk}</strong></div>
                    <div>Status: <strong>{trade.status}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
