import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers") || "AAPL,MSFT,NVDA,AMZN,TSLA";
    const tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 20);

    const quotes = await Promise.all(tickers.map(async (ticker) => {
      try {
        const quote = await yahooFinance.quote(ticker) as any;
        return {
          ticker,
          name: quote.longName || quote.shortName || ticker,
          price: typeof quote.regularMarketPrice === "number" ? quote.regularMarketPrice : null,
          changePercent: typeof quote.regularMarketChangePercent === "number" ? quote.regularMarketChangePercent : null,
          previousClose: typeof quote.regularMarketPreviousClose === "number" ? quote.regularMarketPreviousClose : null,
          volume: typeof quote.regularMarketVolume === "number" ? quote.regularMarketVolume : null,
          marketState: quote.marketState || null,
        };
      } catch {
        return { ticker, name: ticker, price: null, changePercent: null, previousClose: null, volume: null, marketState: null };
      }
    }));

    return NextResponse.json({ ok: true, delayedOrBestEffort: true, source: "yahoo-finance2", data: quotes });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to fetch market data." }, { status: 500 });
  }
}
