import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    console.log(`Searching for symbol: ${symbol}`)

    // Try Yahoo Finance search API
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-US&region=US&quotesCount=1&newsCount=0`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Yahoo Finance search API error: ${response.status} ${response.statusText}`)
      throw new Error(`Yahoo Finance search API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Raw search data for ${symbol}:`, JSON.stringify(data, null, 2))

    if (!data.quotes?.[0]) {
      throw new Error("No search results found")
    }

    const quote = data.quotes[0]

    const metadata = {
      symbol: quote.symbol || symbol,
      name: quote.longname || quote.shortname || symbol,
      sector: quote.sector || "Unknown",
      industry: quote.industry || "Unknown",
      country: quote.country || "Unknown",
      currency: quote.currency || "USD",
      exchange: quote.exchange || "Unknown",
      quoteType: quote.quoteType || "EQUITY",
    }

    console.log(`Processed metadata for ${symbol}:`, metadata)

    return NextResponse.json(metadata, {
      headers: {
        "Cache-Control": "public, max-age=3600", // 1 hour
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error(`Error searching for ${symbol}:`, error)

    // Return fallback metadata
    const fallbackMetadata = {
      symbol: symbol,
      name: symbol,
      sector: guessSector(symbol),
      industry: "Unknown",
      country: guessCountry(symbol),
      currency: guessCurrency(symbol),
      exchange: "Unknown",
      quoteType: "EQUITY",
    }

    return NextResponse.json(fallbackMetadata, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes for fallback
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}

function guessSector(symbol: string): string {
  const techSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"]
  const financeSymbols = ["JPM", "BAC", "WFC", "GS", "MS", "C"]
  const healthSymbols = ["JNJ", "PFE", "UNH", "ABBV", "MRK", "TMO", "NOVN", "ROG"]
  const consumerSymbols = ["NESN", "PG", "KO", "PEP"]

  const upperSymbol = symbol.toUpperCase()

  if (techSymbols.includes(upperSymbol)) return "Technology"
  if (financeSymbols.includes(upperSymbol)) return "Financial Services"
  if (healthSymbols.includes(upperSymbol)) return "Healthcare"
  if (consumerSymbols.includes(upperSymbol)) return "Consumer Staples"

  return "Unknown"
}

function guessCountry(symbol: string): string {
  // Swiss symbols
  if (symbol.match(/^(NESN|NOVN|ROG|UHR|ABBN|LONN|GIVN|SLHN|SREN|BAER)$/)) return "Switzerland"

  // European symbols
  if (symbol.match(/^(ASML|SAP|SAN|INGA|OR|MC|AI|DTE|SU|RDSA)$/)) return "Europe"

  // Default to US for most symbols
  return "United States"
}

function guessCurrency(symbol: string): string {
  // Swiss symbols
  if (symbol.match(/^(NESN|NOVN|ROG|UHR|ABBN|LONN|GIVN|SLHN|SREN|BAER)$/)) return "CHF"

  // European symbols
  if (symbol.match(/^(ASML|SAP|SAN|INGA|OR|MC|AI|DTE|SU|RDSA)$/)) return "EUR"

  // Default to USD
  return "USD"
}
