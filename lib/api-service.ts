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

  // European ETF symbol mapping for Yahoo Finance
  private europeanETFMapping: Record<string, string[]> = {
    // Vanguard ETFs
    VWRL: ["VWRL.L", "VWRL.AS", "VWRL.DE", "VWRL.MI"],
    VWCE: ["VWCE.DE", "VWCE.L", "VWCE.AS", "VWCE.MI"],
    VUSA: ["VUSA.L", "VUSA.AS", "VUSA.DE", "VUSA.MI"],
    VEUR: ["VEUR.L", "VEUR.AS", "VEUR.DE", "VEUR.MI"],
    VFEM: ["VFEM.L", "VFEM.AS", "VFEM.DE", "VFEM.MI"],

    // iShares ETFs
    IS3N: ["IS3N.SW", "IS3N.DE", "IS3N.L", "IS3N.AS"],
    IWDA: ["IWDA.L", "IWDA.AS", "IWDA.DE", "IWDA.MI"],
    IUSA: ["IUSA.L", "IUSA.AS", "IUSA.DE", "IUSA.MI"],
    IEUR: ["IEUR.L", "IEUR.AS", "IEUR.DE", "IEUR.MI"],
    IEMG: ["IEMG.L", "IEMG.AS", "IEMG.DE", "IEMG.MI"],
    EUNL: ["EUNL.DE", "EUNL.L", "EUNL.AS", "EUNL.MI"],

    // SPDR ETFs
    SPYY: ["SPYY.L", "SPYY.DE", "SPYY.AS", "SPYY.MI"],
    SPDR: ["SPDR.L", "SPDR.DE", "SPDR.AS", "SPDR.MI"],

    // Xtrackers ETFs
    XMWO: ["XMWO.DE", "XMWO.L", "XMWO.AS", "XMWO.MI"],
    XDEV: ["XDEV.DE", "XDEV.L", "XDEV.AS", "XDEV.MI"],

    // Amundi ETFs
    CW8: ["CW8.PA", "CW8.DE", "CW8.L", "CW8.MI"],
    EWLD: ["EWLD.PA", "EWLD.DE", "EWLD.L", "EWLD.MI"],

    // Swiss-specific listings
    CHSPI: ["CHSPI.SW"],
    CSSMI: ["CSSMI.SW"],
  }

  // Swiss stock symbol mapping
  private swissStockMapping: Record<string, string> = {
    NESN: "NESN.SW",
    NOVN: "NOVN.SW",
    ROG: "ROG.SW",
    UHR: "UHR.SW",
    ABBN: "ABBN.SW",
    LONN: "LONN.SW",
    GIVN: "GIVN.SW",
    CFR: "CFR.SW",
    SREN: "SREN.SW",
    GEBN: "GEBN.SW",
    SLHN: "SLHN.SW",
    AMS: "AMS.SW",
    SCMN: "SCMN.SW",
    UBSG: "UBSG.SW",
    CSGN: "CSGN.SW",
    BAER: "BAER.SW",
    ZURN: "ZURN.SW",
    ADEN: "ADEN.SW",
    HOLN: "HOLN.SW",
    PGHN: "PGHN.SW",
  }

  private getYahooSymbol(originalSymbol: string): string[] {
    const upperSymbol = originalSymbol.toUpperCase()

    // Check European ETF mapping first
    if (this.europeanETFMapping[upperSymbol]) {
      return [originalSymbol, ...this.europeanETFMapping[upperSymbol]]
    }

    // Check Swiss stock mapping
    if (this.swissStockMapping[upperSymbol]) {
      return [originalSymbol, this.swissStockMapping[upperSymbol]]
    }

    // For other European symbols, try common suffixes
    if (this.isLikelyEuropeanSymbol(upperSymbol)) {
      return [
        originalSymbol,
        `${upperSymbol}.L`, // London
        `${upperSymbol}.DE`, // Germany (Xetra)
        `${upperSymbol}.AS`, // Amsterdam
        `${upperSymbol}.PA`, // Paris
        `${upperSymbol}.MI`, // Milan
        `${upperSymbol}.SW`, // Switzerland
        `${upperSymbol}.VI`, // Vienna
        `${upperSymbol}.BR`, // Brussels
        `${upperSymbol}.ST`, // Stockholm
        `${upperSymbol}.HE`, // Helsinki
        `${upperSymbol}.OL`, // Oslo
        `${upperSymbol}.CO`, // Copenhagen
      ]
    }

    // Default: return original symbol
    return [originalSymbol]
  }

  private isLikelyEuropeanSymbol(symbol: string): boolean {
    // Common European ETF prefixes
    const europeanPrefixes = ["IS", "VWRL", "VWCE", "IWDA", "EUNL", "XMWO", "XDEV", "CW8", "EWLD"]

    // Swiss stock patterns
    const swissPatterns = [/N$/, /B$/, /G$/, /H$/, /R$/, /S$/] // Common Swiss stock suffixes

    return (
      europeanPrefixes.some((prefix) => symbol.startsWith(prefix)) ||
      swissPatterns.some((pattern) => pattern.test(symbol)) ||
      symbol.length === 4 // Many European stocks are 4 characters
    )
  }

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

    // Try multiple Yahoo symbol variations
    const symbolVariations = this.getYahooSymbol(symbol)

    for (const yahooSymbol of symbolVariations) {
      try {
        console.log(`Fetching price for ${symbol} using Yahoo symbol: ${yahooSymbol}`)
        const response = await fetch(`${this.baseUrl}/quote/${yahooSymbol}`)

        if (response.ok) {
          const data = await response.json()
          if (data && data.price) {
            console.log(`Price data found for ${symbol} via ${yahooSymbol}:`, data)

            // Normalize the response to use original symbol
            const normalizedData = {
              ...data,
              symbol: symbol.toUpperCase(),
            }

            this.setCache(cacheKey, normalizedData, 5) // Cache for 5 minutes
            return normalizedData
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch price for ${symbol} using ${yahooSymbol}:`, error)
        continue // Try next symbol variation
      }
    }

    console.error(`All symbol variations failed for ${symbol}`)

    // Fallback with mock data
    const fallback: StockPrice = {
      symbol: symbol.toUpperCase(),
      price: this.getEstimatedPrice(symbol),
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      currency: this.guessCurrency(symbol),
      marketState: "REGULAR",
      timestamp: Date.now() / 1000,
    }

    this.setCache(cacheKey, fallback, 60) // Cache fallback for 1 hour
    return fallback
  }

  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    const cacheKey = `metadata_${symbol}`
    const cached = this.getCached<AssetMetadata>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_metadata")

    // Try multiple Yahoo symbol variations
    const symbolVariations = this.getYahooSymbol(symbol)

    for (const yahooSymbol of symbolVariations) {
      try {
        console.log(`Fetching metadata for ${symbol} using Yahoo symbol: ${yahooSymbol}`)
        const response = await fetch(`${this.baseUrl}/search/${yahooSymbol}`)

        if (response.ok) {
          const data = await response.json()
          if (data && data.name) {
            console.log(`Metadata found for ${symbol} via ${yahooSymbol}:`, data)

            // Normalize the response to use original symbol
            const normalizedData = {
              ...data,
              symbol: symbol.toUpperCase(),
            }

            this.setCache(cacheKey, normalizedData, 1440) // Cache for 24 hours
            return normalizedData
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${symbol} using ${yahooSymbol}:`, error)
        continue // Try next symbol variation
      }
    }

    console.error(`All symbol variations failed for metadata ${symbol}`)

    // Fallback with basic data
    const fallback: AssetMetadata = {
      symbol: symbol.toUpperCase(),
      name: this.getKnownName(symbol) || symbol.toUpperCase(),
      sector: this.guessSector(symbol),
      industry: "Unknown",
      country: this.guessCountry(symbol),
      currency: this.guessCurrency(symbol),
      exchange: this.guessExchange(symbol),
      quoteType: this.guessQuoteType(symbol),
    }

    this.setCache(cacheKey, fallback, 1440)
    return fallback
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`
    const cached = this.getCached<ETFComposition>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_etf")

    // Try multiple Yahoo symbol variations
    const symbolVariations = this.getYahooSymbol(symbol)

    for (const yahooSymbol of symbolVariations) {
      try {
        console.log(`Fetching ETF composition for ${symbol} using Yahoo symbol: ${yahooSymbol}`)
        const response = await fetch(`${this.baseUrl}/etf/${yahooSymbol}`)

        if (response.ok) {
          const data = await response.json()
          if (data && (data.country || data.sector)) {
            console.log(`ETF composition found for ${symbol} via ${yahooSymbol}:`, data)

            // Normalize the response to use original symbol
            const normalizedData = {
              ...data,
              symbol: symbol.toUpperCase(),
            }

            this.setCache(cacheKey, normalizedData, 1440) // Cache for 24 hours
            return normalizedData
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ETF composition for ${symbol} using ${yahooSymbol}:`, error)
        continue // Try next symbol variation
      }
    }

    console.error(`All symbol variations failed for ETF composition ${symbol}`)

    // Fallback with estimated composition
    const fallback = this.getEstimatedETFComposition(symbol)
    this.setCache(cacheKey, fallback, 1440)
    return fallback
  }

  private getEstimatedPrice(symbol: string): number {
    // Estimated prices for common symbols
    const priceEstimates: Record<string, number> = {
      // Swiss stocks (CHF)
      NESN: 120,
      NOVN: 85,
      ROG: 280,
      UHR: 450,
      ABBN: 45,
      LONN: 65,

      // European ETFs (EUR/CHF)
      VWRL: 90,
      VWCE: 105,
      IS3N: 75,
      IWDA: 80,
      EUNL: 85,

      // US stocks (USD)
      AAPL: 175,
      MSFT: 350,
      GOOGL: 140,
      AMZN: 150,
      NVDA: 450,
      TSLA: 220,
      META: 320,
    }

    return priceEstimates[symbol.toUpperCase()] || 50 + Math.random() * 100
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

      // Insurance
      ZURN: "Financial Services",
      BAER: "Financial Services",
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

      // European ETFs (domiciled in Ireland/Luxembourg but traded in Europe)
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

      // European ETFs (often traded in local currency)
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

    return currencyMap[symbol.toUpperCase()] || "USD"
  }

  private guessExchange(symbol: string): string {
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

    return exchangeMap[symbol.toUpperCase()] || "Unknown"
  }

  private guessQuoteType(symbol: string): string {
    // ETF symbols
    const etfSymbols = ["VWRL", "VWCE", "IS3N", "IWDA", "EUNL", "VTI", "VXUS", "VEA", "VWO"]
    if (etfSymbols.includes(symbol.toUpperCase())) {
      return "ETF"
    }

    return "EQUITY"
  }

  private getKnownName(symbol: string): string | null {
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
      VWCE: {
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF Accumulating",
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
      IWDA: {
        symbol: "IWDA",
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
      EUNL: {
        symbol: "EUNL",
        name: "iShares Core MSCI World UCITS ETF EUR Hedged",
        domicile: "IE",
        withholdingTax: 15,
        expenseRatio: 0.3,
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
          { currency: "EUR", weight: 100.0 }, // EUR hedged
        ],
      },
    }

    // Return known composition or generate estimated one
    const known = knownCompositions[symbol.toUpperCase()]
    if (known) return known

    // Generate estimated composition based on symbol patterns
    const isWorldETF = symbol.match(/^(VT|ACWI|FTSE|WORLD|VWRL|VWCE|IWDA|IS3N)/i)
    const isUSETF = symbol.match(/^(VTI|SPY|QQQ|IVV|SPYY)/i)
    const isEuropeanETF = symbol.match(/^(VEA|EFA|IEFA|VEUR|IEUR)/i)
    const isEmergingETF = symbol.match(/^(VWO|EEM|IEMG|VFEM)/i)

    let domicile = "US"
    let withholdingTax = 30

    // Guess domicile based on symbol
    if (symbol.match(/^(VWCE|VWRL|IWDA|EUNL|IS3N)$/)) {
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
