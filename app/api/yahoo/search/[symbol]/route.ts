import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    console.log(`Searching for symbol: ${symbol}`)

    // Try Yahoo Finance search API
    try {
      const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}`
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.quotes && data.quotes.length > 0) {
          const quote = data.quotes[0]

          return NextResponse.json({
            symbol: quote.symbol,
            name: quote.longname || quote.shortname || quote.symbol,
            sector: quote.sector || "Unknown",
            industry: quote.industry || "Unknown",
            country: quote.country || "Unknown",
            currency: quote.currency || "USD",
            exchange: quote.exchange || "Unknown",
            quoteType: quote.quoteType || "EQUITY",
          })
        }
      }
    } catch (apiError) {
      console.warn(`Yahoo search API failed for ${symbol}:`, apiError)
    }

    // Fallback to web scraping
    try {
      const scrapeUrl = `https://finance.yahoo.com/quote/${symbol}`
      const response = await fetch(scrapeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (response.ok) {
        const html = await response.text()

        // Extract company name
        const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/data-reactid="[^"]*">([^<]+)<\/h1>/)
        const sectorMatch = html.match(/Sector[^>]*>([^<]+)</)
        const industryMatch = html.match(/Industry[^>]*>([^<]+)</)

        return NextResponse.json({
          symbol: symbol.toUpperCase(),
          name: nameMatch ? nameMatch[1].trim() : symbol.toUpperCase(),
          sector: sectorMatch ? sectorMatch[1].trim() : "Unknown",
          industry: industryMatch ? industryMatch[1].trim() : "Unknown",
          country: "Unknown",
          currency: "USD",
          exchange: "Unknown",
          quoteType: "EQUITY",
        })
      }
    } catch (scrapeError) {
      console.warn(`Web scraping failed for ${symbol}:`, scrapeError)
    }

    // Final fallback
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      sector: "Unknown",
      industry: "Unknown",
      country: "Unknown",
      currency: "USD",
      exchange: "Unknown",
      quoteType: "EQUITY",
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Failed to search symbol" }, { status: 500 })
  }
}
