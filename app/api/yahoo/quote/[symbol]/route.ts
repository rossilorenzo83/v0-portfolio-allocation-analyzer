import { type NextRequest, NextResponse } from "next/server"
import yahooFinance from "yahoo-finance2"

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol parameter is required" }, { status: 400 })
    }

    console.log(`Fetching quote for symbol: ${symbol}`)

    // Fetch quote data from yahoo-finance2
    const quote = await yahooFinance.quote(symbol, {
      modules: ["price", "summaryDetail"],
    })

    if (!quote) {
      return NextResponse.json({ error: "No data found for symbol" }, { status: 404 })
    }

    // Transform the response to match our expected format
    const response = {
      symbol: quote.symbol || symbol,
      price: quote.regularMarketPrice || quote.price || 0,
      previousClose: quote.regularMarketPreviousClose || quote.previousClose || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      currency: quote.currency || "USD",
      marketCap: quote.marketCap,
      volume: quote.regularMarketVolume || quote.volume,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error("Yahoo Finance API error:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch Yahoo Finance data",
        details: error instanceof Error ? error.message : String(error),
        symbol: (await params).symbol,
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
