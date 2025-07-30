import { type NextRequest, NextResponse } from "next/server"
import { mapSector, mapCountry, mapCurrency, mapExchange, isETF } from "./utils" // Assuming these functions are moved to a separate utils file

// Mock data for symbol search and metadata
const mockSearchResults: { [key: string]: any[] } = {
  apple: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      type: "EQUITY",
      exchange: "NASDAQ",
      country: "United States",
      sector: "Technology",
    },
  ],
  microsoft: [
    {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      type: "EQUITY",
      exchange: "NASDAQ",
      country: "United States",
      sector: "Technology",
    },
  ],
  google: [
    {
      symbol: "GOOG",
      name: "Alphabet Inc. (Class C)",
      type: "EQUITY",
      exchange: "NASDAQ",
      country: "United States",
      sector: "Communication Services",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc. (Class A)",
      type: "EQUITY",
      exchange: "NASDAQ",
      country: "United States",
      sector: "Communication Services",
    },
  ],
  vanguard: [
    {
      symbol: "VWRL.L",
      name: "Vanguard FTSE All-World UCITS ETF",
      type: "ETF",
      exchange: "LSE",
      country: "Ireland",
      sector: "Diversified",
    },
    {
      symbol: "VUSA.L",
      name: "Vanguard S&P 500 UCITS ETF",
      type: "ETF",
      exchange: "LSE",
      country: "Ireland",
      sector: "Diversified",
    },
  ],
  ishares: [
    {
      symbol: "IWDA.AS",
      name: "iShares Core MSCI World UCITS ETF",
      type: "ETF",
      exchange: "AMS",
      country: "Ireland",
      sector: "Diversified",
    },
  ],
  nestle: [
    {
      symbol: "NESN.SW",
      name: "Nestle S.A.",
      type: "EQUITY",
      exchange: "SWX",
      country: "Switzerland",
      sector: "Consumer Staples",
    },
  ],
  novartis: [
    {
      symbol: "NOVN.SW",
      name: "Novartis AG",
      type: "EQUITY",
      exchange: "SWX",
      country: "Switzerland",
      sector: "Healthcare",
    },
  ],
  roche: [
    {
      symbol: "ROG.SW",
      name: "Roche Holding AG",
      type: "EQUITY",
      exchange: "SWX",
      country: "Switzerland",
      sector: "Healthcare",
    },
  ],
  // Add more mock data as needed
}

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const { symbol } = params
  const apiKey = process.env.YAHOO_FINANCE_API_KEY
  const baseUrl = "https://yfapi.net/v6/finance/search"

  if (!apiKey) {
    return NextResponse.json({ error: "Yahoo Finance API key not configured." }, { status: 500 })
  }

  try {
    const url = `${baseUrl}?q=${encodeURIComponent(symbol)}`
    const response = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Yahoo Finance API error for search query "${symbol}": ${response.status} - ${errorText}`)
      return NextResponse.json({ error: `Failed to search for ${symbol}` }, { status: response.status })
    }

    const data = await response.json()
    const quotes = data.quotes || []
    if (quotes.length === 0) {
      throw new Error("No search results found")
    }

    const quote = quotes[0]

    const assetMetadata = {
      symbol: symbol.toUpperCase(),
      name: quote.longname || quote.shortname || symbol.toUpperCase(),
      sector: quote.sector || mapSector(symbol) || "Unknown",
      industry: quote.industry || "Unknown",
      country: quote.country || mapCountry(symbol) || "Unknown",
      currency: quote.currency || mapCurrency(symbol) || "USD",
      exchange: quote.exchange || quote.fullExchangeName || mapExchange(symbol) || "Unknown",
      quoteType: quote.quoteType || (isETF(symbol) ? "ETF" : "EQUITY"),
      marketCap: quote.marketCap || 0,
      regularMarketPrice: quote.regularMarketPrice || 0,
    }

    console.log(`Processed search result for ${symbol}:`, assetMetadata)

    return NextResponse.json(assetMetadata, {
      headers: {
        "Cache-Control": "public, max-age=3600", // 1 hour
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error(`Error searching for ${symbol}:`, error)

    // Fallback to mock data
    const searchTerm = symbol.toLowerCase()
    const results = Object.keys(mockSearchResults)
      .filter((key) => searchTerm.includes(key) || key.includes(searchTerm))
      .flatMap((key) => mockSearchResults[key])

    // If no direct search result, try to find by exact symbol match
    if (results.length === 0) {
      for (const key in mockSearchResults) {
        const exactMatch = mockSearchResults[key].find((item) => item.symbol.toLowerCase() === searchTerm)
        if (exactMatch) {
          results.push(exactMatch)
          break
        }
      }
    }

    if (results.length > 0) {
      return NextResponse.json(results[0]) // Return the first relevant result for metadata
    } else {
      // Fallback for unknown symbols
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        type: "UNKNOWN",
        exchange: "UNKNOWN",
        country: "Unknown",
        sector: "Unknown",
      })
    }
  }
}
