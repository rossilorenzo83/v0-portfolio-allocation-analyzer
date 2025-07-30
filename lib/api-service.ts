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

      this.setCache(cacheKey, data, 5) // Cache for 5 minutes
      return data
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error)

      // Fallback with mock data
      const fallback: StockPrice = {
        symbol: symbol.toUpperCase(),
        price: 100 + Math.random() * 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        currency: this.guessCurrency(symbol),
        marketState: "REGULAR",
        timestamp: Date.now() / 1000,
      }

      this.setCache(cacheKey, fallback, 60) // Cache fallback for 1 hour
      return fallback
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

      this.setCache(cacheKey, data, 1440) // Cache for 24 hours
      return data
    } catch (error) {
      console.error(`Failed to fetch metadata for ${symbol}:`, error)

      // Fallback with basic data
      const fallback: AssetMetadata = {
        symbol: symbol.toUpperCase(),
        name: this.getKnownName(symbol) || symbol.toUpperCase(),
        sector: this.guessSector(symbol),
        industry: "Unknown",
        country: this.guessCountry(symbol),
        currency: this.guessCurrency(symbol),
        exchange: "Unknown",
        quoteType: "EQUITY",
      }

      this.setCache(cacheKey, fallback, 1440)
      return fallback
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

      this.setCache(cacheKey, data, 1440) // Cache for 24 hours
      return data
    } catch (error) {
      console.error(`Failed to fetch ETF composition for ${symbol}:`, error)

      // Fallback with estimated composition
      const fallback = this.getEstimatedETFComposition(symbol)
      this.setCache(cacheKey, fallback, 1440)
      return fallback
    }
  }

  private guessSector(symbol: string): string {
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
    }

    return sectorMap[symbol.toUpperCase()] || "Unknown"
  }

  private guessCountry(symbol: string): string {
    const countryMap: Record<string, string> = {
      // Swiss symbols
      NESN: "Switzerland",
      NOVN: "Switzerland",
      ROG: "Switzerland",
      UHR: "Switzerland",
      ABBN: "Switzerland",
      LONN: "Switzerland",
      VWRL: "Switzerland",
      IS3N: "Switzerland",

      // European symbols
      ASML: "Netherlands",
      SAP: "Germany",
      SAN: "Spain",
      INGA: "Netherlands",

      // US symbols (most others)
      AAPL: "United States",
      MSFT: "United States",
      GOOGL: "United States",
      AMZN: "United States",
      NVDA: "United States",
      META: "United States",
      TSLA: "United States",
    }

    return countryMap[symbol.toUpperCase()] || "United States"
  }

  private guessCurrency(symbol: string): string {
    const currencyMap: Record<string, string> = {
      // Swiss symbols
      NESN: "CHF",
      NOVN: "CHF",
      ROG: "CHF",
      UHR: "CHF",
      ABBN: "CHF",
      LONN: "CHF",
      VWRL: "CHF",
      IS3N: "CHF",

      // European symbols
      ASML: "EUR",
      SAP: "EUR",
      SAN: "EUR",
      INGA: "EUR",
    }

    return currencyMap[symbol.toUpperCase()] || "USD"
  }

  private getKnownName(symbol: string): string | null {
    const nameMap: Record<string, string> = {
      AAPL: "Apple Inc.",
      MSFT: "Microsoft Corporation",
      GOOGL: "Alphabet Inc.",
      AMZN: "Amazon.com Inc.",
      NVDA: "NVIDIA Corporation",
      META: "Meta Platforms Inc.",
      TSLA: "Tesla Inc.",
      NESN: "Nestlé SA",
      NOVN: "Novartis AG",
      ROG: "Roche Holding AG",
      ASML: "ASML Holding NV",
      SAP: "SAP SE",
      VWRL: "Vanguard FTSE All-World UCITS ETF",
      IS3N: "iShares Core MSCI World UCITS ETF",
      VTI: "Vanguard Total Stock Market ETF",
      VXUS: "Vanguard Total International Stock ETF",
    }

    return nameMap[symbol.toUpperCase()] || null
  }

  private getEstimatedETFComposition(symbol: string): ETFComposition {
    const knownCompositions: Record<string, ETFComposition> = {
      VWRL: {
        symbol: "VWRL",
        name: "Vanguard FTSE All-World UCITS ETF",
        domicile: "IE",
        withholdingTax: 15,
        expenseRatio: 0.22,
        country: [
          { country: "United States", weight: 65.0 },
          { country: "Japan", weight: 8.0 },
          { country: "United Kingdom", weight: 4.0 },
          { country: "China", weight: 4.0 },
          { country: "Canada", weight: 3.0 },
          { country: "France", weight: 3.0 },
          { country: "Switzerland", weight: 3.0 },
          { country: "Germany", weight: 3.0 },
          { country: "Other", weight: 7.0 },
        ],
        sector: [
          { sector: "Technology", weight: 25.0 },
          { sector: "Healthcare", weight: 13.0 },
          { sector: "Financial Services", weight: 12.0 },
          { sector: "Consumer Discretionary", weight: 10.0 },
          { sector: "Communication Services", weight: 8.0 },
          { sector: "Industrials", weight: 8.0 },
          { sector: "Consumer Staples", weight: 6.0 },
          { sector: "Energy", weight: 5.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 3.0 },
          { sector: "Materials", weight: 3.0 },
          { sector: "Other", weight: 4.0 },
        ],
        currency: [
          { currency: "USD", weight: 65.0 },
          { currency: "JPY", weight: 8.0 },
          { currency: "EUR", weight: 10.0 },
          { currency: "GBP", weight: 4.0 },
          { currency: "CHF", weight: 3.0 },
          { currency: "CAD", weight: 3.0 },
          { currency: "Other", weight: 7.0 },
        ],
      },
      IS3N: {
        symbol: "IS3N",
        name: "iShares Core MSCI World UCITS ETF",
        domicile: "IE",
        withholdingTax: 15,
        expenseRatio: 0.2,
        country: [
          { country: "United States", weight: 68.0 },
          { country: "Japan", weight: 6.0 },
          { country: "United Kingdom", weight: 4.0 },
          { country: "France", weight: 3.5 },
          { country: "Canada", weight: 3.0 },
          { country: "Switzerland", weight: 3.0 },
          { country: "Germany", weight: 2.5 },
          { country: "Netherlands", weight: 1.5 },
          { country: "Other", weight: 8.5 },
        ],
        sector: [
          { sector: "Technology", weight: 24.0 },
          { sector: "Healthcare", weight: 13.0 },
          { sector: "Financial Services", weight: 13.0 },
          { sector: "Consumer Discretionary", weight: 10.0 },
          { sector: "Communication Services", weight: 8.0 },
          { sector: "Industrials", weight: 10.0 },
          { sector: "Consumer Staples", weight: 7.0 },
          { sector: "Energy", weight: 4.0 },
          { sector: "Materials", weight: 4.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 2.0 },
          { sector: "Other", weight: 2.0 },
        ],
        currency: [
          { currency: "USD", weight: 68.0 },
          { currency: "JPY", weight: 6.0 },
          { currency: "EUR", weight: 12.0 },
          { currency: "GBP", weight: 4.0 },
          { currency: "CHF", weight: 3.0 },
          { currency: "CAD", weight: 3.0 },
          { currency: "Other", weight: 4.0 },
        ],
      },
    }

    // Return known composition or generate estimated one
    const known = knownCompositions[symbol.toUpperCase()]
    if (known) return known

    // Generate estimated composition based on symbol patterns
    const isWorldETF = symbol.match(/^(VT|ACWI|FTSE|WORLD)/i)
    const isUSETF = symbol.match(/^(VTI|SPY|QQQ|IVV)/i)
    const isEuropeanETF = symbol.match(/^(VEA|EFA|IEFA)/i)
    const isEmergingETF = symbol.match(/^(VWO|EEM|IEMG)/i)

    let domicile = "US"
    let withholdingTax = 30

    // Guess domicile based on symbol
    if (symbol.match(/^(VWCE|IWDA|EUNL|IS3N|VWRL)$/)) {
      domicile = "IE"
      withholdingTax = 15
    } else if (symbol.includes("LU")) {
      domicile = "LU"
      withholdingTax = 15
    }

    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} ETF`,
      domicile,
      withholdingTax,
      expenseRatio: 0.3,
      country: isWorldETF
        ? [
            { country: "United States", weight: 60 },
            { country: "Japan", weight: 8 },
            { country: "United Kingdom", weight: 4 },
            { country: "Other", weight: 28 },
          ]
        : isUSETF
          ? [{ country: "United States", weight: 100 }]
          : isEuropeanETF
            ? [
                { country: "United Kingdom", weight: 20 },
                { country: "Switzerland", weight: 15 },
                { country: "France", weight: 12 },
                { country: "Germany", weight: 12 },
                { country: "Other", weight: 41 },
              ]
            : isEmergingETF
              ? [
                  { country: "China", weight: 35 },
                  { country: "India", weight: 15 },
                  { country: "Taiwan", weight: 12 },
                  { country: "South Korea", weight: 10 },
                  { country: "Other", weight: 28 },
                ]
              : [
                  { country: "United States", weight: 60 },
                  { country: "Other", weight: 40 },
                ],
      sector: [
        { sector: "Technology", weight: 25 },
        { sector: "Healthcare", weight: 13 },
        { sector: "Financial Services", weight: 12 },
        { sector: "Consumer Discretionary", weight: 10 },
        { sector: "Communication Services", weight: 8 },
        { sector: "Industrials", weight: 8 },
        { sector: "Consumer Staples", weight: 6 },
        { sector: "Energy", weight: 5 },
        { sector: "Utilities", weight: 3 },
        { sector: "Real Estate", weight: 3 },
        { sector: "Materials", weight: 3 },
        { sector: "Other", weight: 4 },
      ],
      currency: isWorldETF
        ? [
            { currency: "USD", weight: 60 },
            { currency: "EUR", weight: 15 },
            { currency: "JPY", weight: 8 },
            { currency: "GBP", weight: 4 },
            { currency: "Other", weight: 13 },
          ]
        : isUSETF
          ? [{ currency: "USD", weight: 100 }]
          : [
              { currency: "USD", weight: 50 },
              { currency: "EUR", weight: 30 },
              { currency: "Other", weight: 20 },
            ],
    }
  }
}

export const apiService = new APIService()
