import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

function sma(values: number[], period: number) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(values: number[], period = 14) {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / period / (losses / period);
  return 100 - 100 / (1 + rs);
}

function createSignal(price: number, sma20: number | null, sma50: number | null, rsi: number | null, changePercent: number | null) {
  const reasons: string[] = [];
  let confidence = 50;
  let signal: "Buy" | "Hold" | "Watch" | "Sell" = "Watch";
  let risk: "Low" | "Medium" | "High" = "Medium";

  if (sma20 && sma50 && price > sma20 && sma20 > sma50) {
    confidence += 15;
    reasons.push("Price above 20 SMA and 20 SMA above 50 SMA");
  }
  if (sma20 && sma50 && price < sma20 && sma20 < sma50) {
    confidence += 15;
    reasons.push("Price below 20 SMA and 20 SMA below 50 SMA");
  }
  if (rsi !== null) {
    if (rsi < 35) { confidence += 10; reasons.push("RSI suggests oversold rebound potential"); }
    else if (rsi > 70) { confidence += 10; reasons.push("RSI shows overbought conditions"); }
    else { reasons.push("RSI in neutral zone"); }
  }
  if ((changePercent ?? 0) > 2) reasons.push("Strong daily momentum");
  if ((changePercent ?? 0) < -2) reasons.push("Weak daily momentum");

  if (sma20 && sma50 && price > sma20 && sma20 > sma50 && (rsi ?? 50) < 70) {
    signal = "Buy"; risk = (rsi ?? 50) > 62 ? "Medium" : "Low"; confidence += 10;
  } else if (sma20 && sma50 && price < sma20 && sma20 < sma50 && (rsi ?? 50) > 35) {
    signal = "Sell"; risk = "High"; confidence += 10;
  } else if ((rsi ?? 50) > 40 && (rsi ?? 50) < 60) {
    signal = "Hold"; risk = "Low";
  } else {
    signal = "Watch"; risk = "Medium";
  }

  confidence = Math.max(35, Math.min(85, Math.round(confidence)));
  return { signal, confidence, risk, reason: reasons.join(", ") || "Insufficient data for a stronger signal" };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers") || "AAPL,MSFT,NVDA,AMZN,TSLA";
    const tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 20);

    const results = await Promise.all(tickers.map(async (ticker) => {
      try {
        const [quote, chart] = await Promise.all([
          yahooFinance.quote(ticker) as Promise<any>,
          yahooFinance.chart(ticker, { period1: "6mo", interval: "1d" }) as Promise<any>,
        ]);
        const closes = (chart?.quotes || []).map((q: any) => q.close).filter((n: any) => typeof n === "number");
        const sma20 = sma(closes, 20);
        const sma50 = sma(closes, 50);
        const rsi = calcRSI(closes, 14);
        const price = typeof quote.regularMarketPrice === "number" ? quote.regularMarketPrice : closes.at(-1) ?? null;
        const changePercent = typeof quote.regularMarketChangePercent === "number" ? quote.regularMarketChangePercent : null;
        return {
          ticker,
          name: quote.longName || quote.shortName || ticker,
          price,
          changePercent,
          ...createSignal(price ?? 0, sma20, sma50, rsi, changePercent),
        };
      } catch {
        return {
          ticker,
          name: ticker,
          price: null,
          changePercent: null,
          signal: "Watch",
          confidence: 40,
          risk: "High",
          reason: "Signal unavailable. Could not fetch enough free market data.",
        };
      }
    }));

    return NextResponse.json({ ok: true, delayedOrBestEffort: true, source: "yahoo-finance2 + simple rule engine", data: results });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to generate signals." }, { status: 500 });
  }
}
