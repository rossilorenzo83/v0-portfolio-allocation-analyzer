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
      exchange: quote.exchange || quote.fullExchangeName || "Unknown",
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

function mapSector(symbol: string): string | null {
  const sectorMap: Record<string, string> = {
    // Technology
    AAPL: "Technology",
    MSFT: "Technology",
    GOOGL: "Technology",
    AMZN: "Technology",
    NVDA: "Technology",
    META: "Technology",
    TSLA: "Technology",
    ASML: "Technology",
    SAP: "Technology",

    // Healthcare
    NOVN: "Healthcare",
    ROG: "Healthcare",
    JNJ: "Healthcare",
    PFE: "Healthcare",
    UNH: "Healthcare",

    // Consumer Staples
    NESN: "Consumer Staples",
    PG: "Consumer Staples",
    KO: "Consumer Staples",

    // Financial Services
    JPM: "Financial Services",
    BAC: "Financial Services",
    WFC: "Financial Services",
    UBSG: "Financial Services",
    CSGN: "Financial Services",

    // Industrials
    ABBN: "Industrials",
    GEBN: "Industrials",
    SCMN: "Industrials",

    // Consumer Discretionary
    UHR: "Consumer Discretionary",
    SREN: "Consumer Discretionary",

    // Materials
    GIVN: "Materials",
    HOLN: "Materials",
  }

  return sectorMap[symbol.toUpperCase()] || null
}

function mapCountry(symbol: string): string | null {
  const countryMap: Record<string, string> = {
    // Swiss symbols
    NESN: "Switzerland",
    NOVN: "Switzerland",
    ROG: "Switzerland",
    UHR: "Switzerland",
    ABBN: "Switzerland",
    LONN: "Switzerland",
    GIVN: "Switzerland",
    CFR: "Switzerland",
    SREN: "Switzerland",
    GEBN: "Switzerland",
    SLHN: "Switzerland",
    AMS: "Switzerland",
    SCMN: "Switzerland",
    UBSG: "Switzerland",
    CSGN: "Switzerland",
    BAER: "Switzerland",
    ZURN: "Switzerland",
    ADEN: "Switzerland",
    HOLN: "Switzerland",
    PGHN: "Switzerland",

    // European ETFs (domiciled in Ireland/Luxembourg)
    VWRL: "Ireland",
    VWCE: "Ireland",
    IS3N: "Ireland",
    IWDA: "Ireland",
    EUNL: "Ireland",

    // European symbols
    ASML: "Netherlands",
    SAP: "Germany",
    SAN: "Spain",
    INGA: "Netherlands",

    // US symbols
    AAPL: "United States",
    MSFT: "United States",
    GOOGL: "United States",
    AMZN: "United States",
    NVDA: "United States",
    META: "United States",
    TSLA: "United States",
  }

  return countryMap[symbol.toUpperCase()] || null
}

function mapCurrency(symbol: string): string | null {
  const currencyMap: Record<string, string> = {
    // Swiss symbols
    NESN: "CHF",
    NOVN: "CHF",
    ROG: "CHF",
    UHR: "CHF",
    ABBN: "CHF",
    LONN: "CHF",
    GIVN: "CHF",
    CFR: "CHF",
    SREN: "CHF",
    GEBN: "CHF",
    SLHN: "CHF",
    AMS: "CHF",
    SCMN: "CHF",
    UBSG: "CHF",
    CSGN: "CHF",
    BAER: "CHF",
    ZURN: "CHF",
    ADEN: "CHF",
    HOLN: "CHF",
    PGHN: "CHF",

    // European ETFs (trading currency)
    VWRL: "CHF", // When traded in Switzerland
    VWCE: "EUR",
    IS3N: "CHF", // When traded in Switzerland
    IWDA: "EUR",
    EUNL: "EUR",

    // European symbols
    ASML: "EUR",
    SAP: "EUR",
    SAN: "EUR",
    INGA: "EUR",
  }

  return currencyMap[symbol.toUpperCase()] || null
}

function mapExchange(symbol: string): string | null {
  const exchangeMap: Record<string, string> = {
    // Swiss symbols
    NESN: "SWX Swiss Exchange",
    NOVN: "SWX Swiss Exchange",
    ROG: "SWX Swiss Exchange",
    UHR: "SWX Swiss Exchange",
    ABBN: "SWX Swiss Exchange",
    LONN: "SWX Swiss Exchange",

    // European ETFs
    VWRL: "London Stock Exchange",
    VWCE: "Xetra",
    IS3N: "SWX Swiss Exchange",
    IWDA: "London Stock Exchange",
    EUNL: "Xetra",

    // European symbols
    ASML: "Euronext Amsterdam",
    SAP: "Xetra",

    // US symbols
    AAPL: "NASDAQ",
    MSFT: "NASDAQ",
    GOOGL: "NASDAQ",
    AMZN: "NASDAQ",
    NVDA: "NASDAQ",
    META: "NASDAQ",
    TSLA: "NASDAQ",
  }

  return exchangeMap[symbol.toUpperCase()] || null
}

function isETF(symbol: string): boolean {
  const etfSymbols = ["VWRL", "VWCE", "IS3N", "IWDA", "EUNL", "VTI", "VXUS", "VEA", "VWO"]
  return etfSymbols.includes(symbol.toUpperCase())
}

function getKnownName(symbol: string): string | null {
  const nameMap: Record<string, string> = {
    // US stocks
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corporation",
    GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com Inc.",
    NVDA: "NVIDIA Corporation",
    META: "Meta Platforms Inc.",
    TSLA: "Tesla Inc.",

    // Swiss stocks
    NESN: "Nestlé SA",
    NOVN: "Novartis AG",
    ROG: "Roche Holding AG",
    UHR: "The Swatch Group AG",
    ABBN: "ABB Ltd",
    LONN: "Lonza Group AG",
    GIVN: "Givaudan SA",
    CFR: "Compagnie Financière Richemont SA",
    SREN: "Swiss Re AG",
    GEBN: "Geberit AG",
    SLHN: "Sonova Holding AG",
    AMS: "AMS AG",
    SCMN: "Schindler Holding AG",
    UBSG: "UBS Group AG",
    CSGN: "Credit Suisse Group AG",
    BAER: "Julius Baer Group Ltd",
    ZURN: "Zurich Insurance Group AG",
    ADEN: "Adecco Group AG",
    HOLN: "Holcim Ltd",
    PGHN: "Partners Group Holding AG",

    // European stocks
    ASML: "ASML Holding NV",
    SAP: "SAP SE",

    // ETFs
    VWRL: "Vanguard FTSE All-World UCITS ETF",
    VWCE: "Vanguard FTSE All-World UCITS ETF Accumulating",
    IS3N: "iShares Core MSCI World UCITS ETF",
    IWDA: "iShares Core MSCI World UCITS ETF",
    EUNL: "iShares Core MSCI World UCITS ETF EUR Hedged",
    VTI: "Vanguard Total Stock Market ETF",
    VXUS: "Vanguard Total International Stock ETF",
  }

  return nameMap[symbol.toUpperCase()] || null
}
