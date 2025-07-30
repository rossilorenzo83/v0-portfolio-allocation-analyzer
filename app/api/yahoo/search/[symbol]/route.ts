import { type NextRequest, NextResponse } from "next/server"
import yahooFinance from "yahoo-finance2"

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol parameter is required" }, { status: 400 })
    }

    console.log(`Searching for symbol: ${symbol}`)

    // Try to get quote first (more reliable than search)
    try {
      const quote = await yahooFinance.quote(symbol, {
        modules: ["price", "summaryDetail", "assetProfile"],
      })

      if (quote) {
        const response = {
          symbol: quote.symbol || symbol,
          name: quote.longName || quote.shortName || symbol,
          sector: quote.sector || "Unknown",
          country: quote.country || "Unknown",
          currency: quote.currency || "USD",
          exchange: quote.fullExchangeName || quote.exchange || "Unknown",
          marketCap: quote.marketCap,
          type: quote.quoteType || "EQUITY",
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
      }
    } catch (quoteError) {
      console.log(`Quote failed for ${symbol}, trying search:`, quoteError)
    }

    // Fallback to search if quote fails
    const searchResults = await yahooFinance.search(symbol, {
      quotesCount: 1,
      newsCount: 0,
    })

    if (searchResults.quotes && searchResults.quotes.length > 0) {
      const result = searchResults.quotes[0]
      const response = {
        symbol: result.symbol || symbol,
        name: result.longname || result.shortname || symbol,
        sector: result.sector || "Unknown",
        country: result.country || "Unknown",
        currency: result.currency || "USD",
        exchange: result.fullExchangeName || result.exchange || "Unknown",
        type: result.quoteType || "EQUITY",
      }

      return NextResponse.json(response, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    return NextResponse.json({ error: "No search results found", symbol }, { status: 404 })
  } catch (error) {
    console.error("Yahoo Finance search error:", error)

    return NextResponse.json(
      {
        error: "Failed to search Yahoo Finance",
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
