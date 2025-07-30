import { type NextRequest, NextResponse } from "next/server"
import yahooFinance from "yahoo-finance2"

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol parameter is required" }, { status: 400 })
    }

    console.log(`Fetching ETF data for symbol: ${symbol}`)

    // Fetch ETF data from yahoo-finance2
    const quote = await yahooFinance.quote(symbol, {
      modules: ["topHoldings", "fundProfile", "price"],
    })

    if (!quote) {
      return NextResponse.json({ error: "No ETF data found for symbol" }, { status: 404 })
    }

    // Process holdings data
    const holdings = quote.topHoldings?.holdings || []
    const fundProfile = quote.fundProfile

    // Extract sector breakdown
    const sectorWeightings = fundProfile?.sectorWeightings || {}
    const sectors = Object.entries(sectorWeightings).map(([sector, weight]) => ({
      sector: sector.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      weight: (weight as number) * 100,
    }))

    // Extract country breakdown (limited in Yahoo data)
    const countries = [
      { country: "United States", weight: 60 }, // Default assumption for most ETFs
      { country: "Other", weight: 40 },
    ]

    // Extract currency breakdown (limited in Yahoo data)
    const currencies = [{ currency: quote.currency || "USD", weight: 100 }]

    const response = {
      symbol: quote.symbol || symbol,
      domicile: "US", // Default, would need additional lookup
      withholdingTax: 30, // Default for US domiciled
      currency: currencies,
      country: countries,
      sector: sectors,
      holdings: holdings.map((holding: any) => ({
        symbol: holding.symbol,
        name: holding.holdingName,
        weight: holding.holdingPercent * 100,
      })),
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("Yahoo Finance ETF API error:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch ETF data",
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
