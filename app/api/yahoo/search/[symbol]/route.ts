import { type NextRequest, NextResponse } from "next/server"
import { mapSector, mapCountry, mapCurrency, mapExchange, isETF, getKnownName } from "./utils" // Assuming these functions are moved to a separate utils file

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

    // Return estimated metadata
    const estimatedMetadata = {
      symbol: symbol.toUpperCase(),
      name: getKnownName(symbol) || symbol.toUpperCase(),
      sector: mapSector(symbol) || "Unknown",
      industry: "Unknown",
      country: mapCountry(symbol) || "Unknown",
      currency: mapCurrency(symbol) || "USD",
      exchange: mapExchange(symbol) || "Unknown",
      quoteType: isETF(symbol) ? "ETF" : "EQUITY",
      marketCap: 0,
      regularMarketPrice: 0,
    }

    return NextResponse.json(estimatedMetadata, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes for fallback
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}
