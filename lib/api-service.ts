interface StockPrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  currency: string
  marketState: string
  timestamp: number
}

interface AssetMetadata {
  symbol: string
  name: string
  sector: string
  industry: string
  country: string
  currency: string
  exchange: string
  quoteType: string
}

interface ETFComposition {
  symbol: string
  name: string
  domicile: string
  withholdingTax: number
  expenseRatio: number
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
  currency: Array<{ currency: string; weight: number }>
}

class APIService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 200 // 200ms between requests
  private baseUrl = "/api/yahoo"

  private async rateLimit(key: string): Promise<void> {
    const lastRequest = this.rateLimitMap.get(key) || 0
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequest

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest))
    }

    this.rateLimitMap.set(key, Date.now())
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }
    this.cache.delete(key)
    return null
  }

  private setCache<T>(key: string, data: T, ttlMinutes: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    })
  }

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const cacheKey = `price_${symbol}`
    const cached = this.getCached<StockPrice>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_price")

    try {
      console.log(`Fetching price for ${symbol}`)
      const response = await fetch(`${this.baseUrl}/quote/${symbol}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`Price data for ${symbol}:`, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error)

      // Fallback with mock data
      return {
        symbol: symbol.toUpperCase(),
        price: 100 + Math.random() * 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        currency: "USD",
        marketState: "REGULAR",
        timestamp: Date.now(),
      }
    }
  }

  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    const cacheKey = `metadata_${symbol}`
    const cached = this.getCached<AssetMetadata>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_metadata")

    try {
      console.log(`Fetching metadata for ${symbol}`)
      const response = await fetch(`${this.baseUrl}/search/${symbol}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`Metadata for ${symbol}:`, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch metadata for ${symbol}:`, error)

      // Fallback with basic data
      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        sector: this.guessSector(symbol),
        industry: "Unknown",
        country: this.guessCountry(symbol),
        currency: "USD",
        exchange: "Unknown",
        quoteType: "EQUITY",
      }
    }
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`
    const cached = this.getCached<ETFComposition>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_etf")

    try {
      console.log(`Fetching ETF composition for ${symbol}`)
      const response = await fetch(`${this.baseUrl}/etf/${symbol}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`ETF composition for ${symbol}:`, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch ETF composition for ${symbol}:`, error)

      // Fallback with estimated composition
      return this.getEstimatedETFComposition(symbol)
    }
  }

  private guessSector(symbol: string): string {
    const techSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"]
    const financeSymbols = ["JPM", "BAC", "WFC", "GS", "MS", "C"]
    const healthSymbols = ["JNJ", "PFE", "UNH", "ABBV", "MRK", "TMO"]

    if (techSymbols.includes(symbol.toUpperCase())) return "Technology"
    if (financeSymbols.includes(symbol.toUpperCase())) return "Financial Services"
    if (healthSymbols.includes(symbol.toUpperCase())) return "Healthcare"

    return "Unknown"
  }

  private guessCountry(symbol: string): string {
    // Swiss symbols
    if (symbol.match(/\.(SW|VX)$/)) return "Switzerland"

    // European symbols
    if (symbol.match(/\.(PA|MI|MC|AS|BR|L|F|BE|VI|ST|HE|OL|CO)$/)) return "Europe"

    // Asian symbols
    if (symbol.match(/\.(T|HK|SS|SZ|KS|TW)$/)) return "Asia"

    // Default to US
    return "United States"
  }

  private getEstimatedETFComposition(symbol: string): ETFComposition {
    const isIrishETF = symbol.includes("IWDA") || symbol.includes("VWCE") || symbol.includes("EUNL")
    const isLuxETF = symbol.includes("LU")
    const isEmergingMarkets = symbol.includes("EM") || symbol.includes("EMERGING")
    const isEurope = symbol.includes("EUR") || symbol.includes("EUROPE")
    const isAsia = symbol.includes("ASIA") || symbol.includes("PACIFIC")

    let countryAllocation = [
      { country: "United States", weight: 60 },
      { country: "Japan", weight: 10 },
      { country: "United Kingdom", weight: 8 },
      { country: "China", weight: 5 },
      { country: "Other", weight: 17 },
    ]

    if (isEmergingMarkets) {
      countryAllocation = [
        { country: "China", weight: 35 },
        { country: "India", weight: 15 },
        { country: "Taiwan", weight: 12 },
        { country: "South Korea", weight: 10 },
        { country: "Other", weight: 28 },
      ]
    } else if (isEurope) {
      countryAllocation = [
        { country: "United Kingdom", weight: 20 },
        { country: "Switzerland", weight: 15 },
        { country: "France", weight: 12 },
        { country: "Germany", weight: 12 },
        { country: "Other", weight: 41 },
      ]
    } else if (isAsia) {
      countryAllocation = [
        { country: "Japan", weight: 40 },
        { country: "China", weight: 25 },
        { country: "South Korea", weight: 15 },
        { country: "Taiwan", weight: 10 },
        { country: "Other", weight: 10 },
      ]
    }

    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} ETF`,
      domicile: isIrishETF ? "IE" : isLuxETF ? "LU" : "US",
      withholdingTax: isIrishETF || isLuxETF ? 15 : 30,
      expenseRatio: 0.2,
      country: countryAllocation,
      sector: [
        { sector: "Technology", weight: 25 },
        { sector: "Healthcare", weight: 15 },
        { sector: "Financial Services", weight: 12 },
        { sector: "Consumer Cyclical", weight: 10 },
        { sector: "Industrials", weight: 8 },
        { sector: "Consumer Defensive", weight: 8 },
        { sector: "Energy", weight: 5 },
        { sector: "Utilities", weight: 4 },
        { sector: "Real Estate", weight: 3 },
        { sector: "Other", weight: 10 },
      ],
      currency: [
        { currency: "USD", weight: 70 },
        { currency: "EUR", weight: 20 },
        { currency: "JPY", weight: 10 },
      ],
    }
  }

  // Web scraping methods
  private async scrapeYahooPrice(symbol: string): Promise<StockPrice | null> {
    try {
      const url = `https://finance.yahoo.com/quote/${symbol}`
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) return null

      const html = await response.text()

      // Extract price using regex patterns
      const priceMatch =
        html.match(/data-symbol="[^"]*"[^>]*data-field="regularMarketPrice"[^>]*>([^<]+)</i) ||
        html.match(/"regularMarketPrice":\{"raw":([^,}]+)/i)

      const changeMatch = html.match(/"regularMarketChange":\{"raw":([^,}]+)/i)
      const changePercentMatch = html.match(/"regularMarketChangePercent":\{"raw":([^,}]+)/i)
      const currencyMatch = html.match(/"currency":"([^"]+)"/i)
      const marketStateMatch = html.match(/"marketState":"([^"]+)"/i)

      if (priceMatch) {
        return {
          symbol,
          price: Number.parseFloat(priceMatch[1]),
          change: changeMatch ? Number.parseFloat(changeMatch[1]) : 0,
          changePercent: changePercentMatch ? Number.parseFloat(changePercentMatch[1]) : 0,
          currency: currencyMatch ? currencyMatch[1] : "USD",
          marketState: marketStateMatch ? marketStateMatch[1] : "REGULAR",
          timestamp: Date.now(),
        }
      }

      return null
    } catch (error) {
      console.error(`Error scraping price for ${symbol}:`, error)
      return null
    }
  }

  private async scrapeYahooMetadata(symbol: string): Promise<AssetMetadata | null> {
    try {
      const url = `https://finance.yahoo.com/quote/${symbol}/profile`
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) return null

      const html = await response.text()

      // Extract metadata using regex patterns
      const nameMatch = html.match(/<h1[^>]*>([^<]+)</i) || html.match(/"longName":"([^"]+)"/i)

      const sectorMatch = html.match(/"sector":"([^"]+)"/i) || html.match(/Sector[^>]*>([^<]+)</i)

      const countryMatch = html.match(/"country":"([^"]+)"/i) || html.match(/Country[^>]*>([^<]+)</i)

      const industryMatch = html.match(/"industry":"([^"]+)"/i) || html.match(/Industry[^>]*>([^<]+)</i)

      const exchangeMatch = html.match(/"exchange":"([^"]+)"/i) || html.match(/Exchange[^>]*>([^<]+)</i)

      const quoteTypeMatch = html.match(/"quoteType":"([^"]+)"/i) || html.match(/Quote Type[^>]*>([^<]+)</i)

      if (nameMatch) {
        return {
          symbol,
          name: nameMatch[1].trim(),
          sector: sectorMatch ? sectorMatch[1] : "Unknown",
          industry: industryMatch ? industryMatch[1] : "Unknown",
          country: countryMatch ? countryMatch[1] : "Unknown",
          currency: "USD",
          exchange: exchangeMatch ? exchangeMatch[1] : "Unknown",
          quoteType: quoteTypeMatch ? quoteTypeMatch[1] : "EQUITY",
        }
      }

      return null
    } catch (error) {
      console.error(`Error scraping metadata for ${symbol}:`, error)
      return null
    }
  }

  private async scrapeETFComposition(symbol: string): Promise<ETFComposition | null> {
    try {
      const url = `https://finance.yahoo.com/quote/${symbol}/holdings`
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) return null

      const html = await response.text()

      // Extract sector breakdown
      const sectorMatches = html.matchAll(/data-reactid="[^"]*"[^>]*>([^<]+)<\/span[^>]*>[^<]*<span[^>]*>([0-9.]+)%/gi)
      const sectors = Array.from(sectorMatches).map((match) => ({
        sector: match[1].trim(),
        weight: Number.parseFloat(match[2]),
      }))

      // Extract top holdings
      const holdingMatches = html.matchAll(
        /<a[^>]*>([A-Z0-9.]+)<\/a>[^<]*<[^>]*>([^<]+)<[^>]*>[^<]*<[^>]*>([0-9.]+)%/gi,
      )
      const holdings = Array.from(holdingMatches)
        .slice(0, 10)
        .map((match) => ({
          symbol: match[1].trim(),
          name: match[2].trim(),
          weight: Number.parseFloat(match[3]),
        }))

      if (sectors.length > 0 || holdings.length > 0) {
        return {
          symbol,
          name: `${symbol.toUpperCase()} ETF`,
          domicile: "US", // Default assumption
          withholdingTax: 30,
          expenseRatio: 0.2,
          country: [{ country: "United States", weight: 100 }], // Default assumption
          sector: sectors,
          currency: [{ currency: "USD", weight: 100 }], // Default assumption
          holdings,
        }
      }

      return null
    } catch (error) {
      console.error(`Error scraping ETF composition for ${symbol}:`, error)
      return null
    }
  }

  // Known data fallbacks
  private getKnownPrice(symbol: string): StockPrice | null {
    const knownPrices: Record<string, Omit<StockPrice, "symbol" | "timestamp">> = {
      AAPL: { price: 150.0, change: 2.5, changePercent: 1.69, currency: "USD", marketState: "REGULAR" },
      MSFT: { price: 330.0, change: 2.8, changePercent: 0.86, currency: "USD", marketState: "REGULAR" },
      GOOGL: { price: 125.0, change: -1.2, changePercent: -0.95, currency: "USD", marketState: "REGULAR" },
      AMZN: { price: 145.0, change: 3.1, changePercent: 2.18, currency: "USD", marketState: "REGULAR" },
      NVDA: { price: 450.0, change: 15.2, changePercent: 3.49, currency: "USD", marketState: "REGULAR" },
      TSLA: { price: 220.0, change: -5.8, changePercent: -2.57, currency: "USD", marketState: "REGULAR" },
      META: { price: 280.0, change: 4.2, changePercent: 1.52, currency: "USD", marketState: "REGULAR" },
      NESN: { price: 120.0, change: 0.5, changePercent: 0.42, currency: "CHF", marketState: "REGULAR" },
      NOVN: { price: 85.0, change: -0.3, changePercent: -0.35, currency: "CHF", marketState: "REGULAR" },
      ROG: { price: 280.0, change: 1.2, changePercent: 0.43, currency: "CHF", marketState: "REGULAR" },
      ASML: { price: 600.0, change: 8.5, changePercent: 1.44, currency: "EUR", marketState: "REGULAR" },
      SAP: { price: 120.0, change: 0.9, changePercent: 0.76, currency: "EUR", marketState: "REGULAR" },
      VWRL: { price: 89.96, change: 0.8, changePercent: 0.9, currency: "CHF", marketState: "REGULAR" },
      IS3N: { price: 30.5, change: 0.3, changePercent: 0.99, currency: "CHF", marketState: "REGULAR" },
      VTI: { price: 220.0, change: 2.2, changePercent: 1.01, currency: "USD", marketState: "REGULAR" },
      VXUS: { price: 58.0, change: 0.3, changePercent: 0.52, currency: "USD", marketState: "REGULAR" },
      VEA: { price: 48.0, change: 0.1, changePercent: 0.21, currency: "USD", marketState: "REGULAR" },
      VWO: { price: 42.0, change: 0.6, changePercent: 1.45, currency: "USD", marketState: "REGULAR" },
    }

    const known = knownPrices[symbol]
    if (known) {
      return {
        symbol,
        ...known,
        timestamp: Date.now(),
      }
    }
    return null
  }

  private getKnownMetadata(symbol: string): AssetMetadata | null {
    const knownMetadata: Record<string, AssetMetadata> = {
      AAPL: {
        symbol: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        industry: "Consumer Electronics",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      MSFT: {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        sector: "Technology",
        industry: "Software",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      GOOGL: {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        sector: "Technology",
        industry: "Internet Services",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      AMZN: {
        symbol: "AMZN",
        name: "Amazon.com Inc.",
        sector: "Consumer Discretionary",
        industry: "Internet Retail",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      NVDA: {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        sector: "Technology",
        industry: "Semiconductors",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      TSLA: {
        symbol: "TSLA",
        name: "Tesla Inc.",
        sector: "Consumer Discretionary",
        industry: "Automobiles",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      META: {
        symbol: "META",
        name: "Meta Platforms Inc.",
        sector: "Technology",
        industry: "Social Media",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      },
      NESN: {
        symbol: "NESN",
        name: "Nestlé SA",
        sector: "Consumer Staples",
        industry: "Food Products",
        country: "Switzerland",
        currency: "CHF",
        exchange: "SWX",
        quoteType: "EQUITY",
      },
      NOVN: {
        symbol: "NOVN",
        name: "Novartis AG",
        sector: "Healthcare",
        industry: "Pharmaceuticals",
        country: "Switzerland",
        currency: "CHF",
        exchange: "SWX",
        quoteType: "EQUITY",
      },
      ROG: {
        symbol: "ROG",
        name: "Roche Holding AG",
        sector: "Healthcare",
        industry: "Biotechnology",
        country: "Switzerland",
        currency: "CHF",
        exchange: "SWX",
        quoteType: "EQUITY",
      },
      ASML: {
        symbol: "ASML",
        name: "ASML Holding NV",
        sector: "Technology",
        industry: "Semiconductors",
        country: "Netherlands",
        currency: "EUR",
        exchange: "AMS",
        quoteType: "EQUITY",
      },
      SAP: {
        symbol: "SAP",
        name: "SAP SE",
        sector: "Technology",
        industry: "Software",
        country: "Germany",
        currency: "EUR",
        exchange: "FRA",
        quoteType: "EQUITY",
      },
      VWRL: {
        symbol: "VWRL",
        name: "Vanguard FTSE All-World UCITS ETF",
        sector: "Mixed",
        industry: "ETF",
        country: "Global",
        currency: "CHF",
        exchange: "Unknown",
        quoteType: "ETF",
      },
      IS3N: {
        symbol: "IS3N",
        name: "iShares Core MSCI World UCITS ETF",
        sector: "Mixed",
        industry: "ETF",
        country: "Global",
        currency: "CHF",
        exchange: "Unknown",
        quoteType: "ETF",
      },
      VTI: {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        sector: "Mixed",
        industry: "ETF",
        country: "United States",
        currency: "USD",
        exchange: "Unknown",
        quoteType: "ETF",
      },
      VXUS: {
        symbol: "VXUS",
        name: "Vanguard Total International Stock ETF",
        sector: "Mixed",
        industry: "ETF",
        country: "Global",
        currency: "USD",
        exchange: "Unknown",
        quoteType: "ETF",
      },
      VEA: {
        symbol: "VEA",
        name: "Vanguard FTSE Developed Markets ETF",
        sector: "Mixed",
        industry: "ETF",
        country: "Global",
        currency: "USD",
        exchange: "Unknown",
        quoteType: "ETF",
      },
      VWO: {
        symbol: "VWO",
        name: "Vanguard FTSE Emerging Markets ETF",
        sector: "Mixed",
        industry: "ETF",
        country: "Global",
        currency: "USD",
        exchange: "Unknown",
        quoteType: "ETF",
      },
    }

    return knownMetadata[symbol] || null
  }

  private getKnownETFComposition(symbol: string): ETFComposition | null {
    const knownCompositions: Record<string, ETFComposition> = {
      VWRL: {
        symbol: "VWRL",
        name: "Vanguard FTSE All-World UCITS ETF",
        domicile: "IE",
        withholdingTax: 15,
        expenseRatio: 0.2,
        country: [
          { country: "United States", weight: 65.0 },
          { country: "Japan", weight: 15.0 },
          { country: "United Kingdom", weight: 8.0 },
          { country: "China", weight: 5.0 },
          { country: "Other", weight: 17.0 },
        ],
        sector: [
          { sector: "Technology", weight: 25.0 },
          { sector: "Healthcare", weight: 15.0 },
          { sector: "Financial Services", weight: 12.0 },
          { sector: "Consumer Cyclical", weight: 10.0 },
          { sector: "Industrials", weight: 8.0 },
          { sector: "Consumer Defensive", weight: 8.0 },
          { sector: "Energy", weight: 5.0 },
          { sector: "Utilities", weight: 4.0 },
          { sector: "Real Estate", weight: 3.0 },
          { sector: "Other", weight: 10.0 },
        ],
        currency: [
          { currency: "USD", weight: 70.0 },
          { currency: "EUR", weight: 20.0 },
          { currency: "JPY", weight: 10.0 },
        ],
      },
      IS3N: {
        symbol: "IS3N",
        name: "iShares Core MSCI World UCITS ETF",
        domicile: "IE",
        withholdingTax: 15,
        expenseRatio: 0.2,
        country: [
          { country: "United States", weight: 65.0 },
          { country: "Japan", weight: 15.0 },
          { country: "United Kingdom", weight: 8.0 },
          { country: "China", weight: 5.0 },
          { country: "Other", weight: 17.0 },
        ],
        sector: [
          { sector: "Technology", weight: 25.0 },
          { sector: "Healthcare", weight: 15.0 },
          { sector: "Financial Services", weight: 12.0 },
          { sector: "Consumer Cyclical", weight: 10.0 },
          { sector: "Industrials", weight: 8.0 },
          { sector: "Consumer Defensive", weight: 8.0 },
          { sector: "Energy", weight: 5.0 },
          { sector: "Utilities", weight: 4.0 },
          { sector: "Real Estate", weight: 3.0 },
          { sector: "Other", weight: 10.0 },
        ],
        currency: [
          { currency: "USD", weight: 70.0 },
          { currency: "EUR", weight: 20.0 },
          { currency: "JPY", weight: 10.0 },
        ],
      },
      VTI: {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        domicile: "US",
        withholdingTax: 30,
        expenseRatio: 0.2,
        country: [{ country: "United States", weight: 100.0 }],
        sector: [
          { sector: "Technology", weight: 28.0 },
          { sector: "Healthcare", weight: 13.0 },
          { sector: "Financial Services", weight: 11.0 },
          { sector: "Consumer Cyclical", weight: 10.0 },
          { sector: "Industrials", weight: 8.0 },
          { sector: "Communication Services", weight: 8.0 },
          { sector: "Consumer Staples", weight: 6.0 },
          { sector: "Energy", weight: 4.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 4.0 },
          { sector: "Materials", weight: 3.0 },
          { sector: "Other", weight: 2.0 },
        ],
        currency: [{ currency: "USD", weight: 100.0 }],
      },
      VXUS: {
        symbol: "VXUS",
        name: "Vanguard Total International Stock ETF",
        domicile: "US",
        withholdingTax: 30,
        expenseRatio: 0.2,
        country: [
          { country: "Japan", weight: 15.0 },
          { country: "United Kingdom", weight: 8.0 },
          { country: "China", weight: 5.0 },
          { country: "Other", weight: 17.0 },
        ],
        sector: [
          { sector: "Technology", weight: 28.0 },
          { sector: "Healthcare", weight: 13.0 },
          { sector: "Financial Services", weight: 11.0 },
          { sector: "Consumer Cyclical", weight: 10.0 },
          { sector: "Industrials", weight: 8.0 },
          { sector: "Communication Services", weight: 8.0 },
          { sector: "Consumer Staples", weight: 6.0 },
          { sector: "Energy", weight: 4.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 4.0 },
          { sector: "Materials", weight: 3.0 },
          { sector: "Other", weight: 2.0 },
        ],
        currency: [
          { currency: "USD", weight: 70.0 },
          { currency: "EUR", weight: 20.0 },
          { currency: "JPY", weight: 10.0 },
        ],
      },
    }

    return knownCompositions[symbol] || null
  }
}

export const apiService = new APIService()
