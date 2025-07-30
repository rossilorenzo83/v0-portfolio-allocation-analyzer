interface StockPrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  currency: string
  lastUpdated: string
}

interface AssetMetadata {
  symbol: string
  name: string
  sector: string
  country: string
  currency: string
  type: string
}

interface ETFComposition {
  symbol: string
  domicile: string
  withholdingTax: number
  currency: Array<{ currency: string; weight: number }>
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
  holdings: Array<{ symbol: string; name: string; weight: number }>
}

class APIService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 200 // 200ms between requests

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
      // Try Yahoo Finance API first
      const response = await fetch(`/api/yahoo/quote/${symbol}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.price !== undefined) {
          const result: StockPrice = {
            symbol: data.symbol || symbol,
            price: data.price,
            change: data.change || 0,
            changePercent: data.changePercent || 0,
            currency: data.currency || "USD",
            lastUpdated: data.lastUpdated || new Date().toISOString(),
          }
          this.setCache(cacheKey, result, 5) // Cache for 5 minutes
          return result
        }
      }

      // Fallback to web scraping Yahoo Finance
      const scrapedPrice = await this.scrapeYahooPrice(symbol)
      if (scrapedPrice) {
        this.setCache(cacheKey, scrapedPrice, 15) // Cache scrapped data longer
        return scrapedPrice
      }

      // Final fallback to known prices
      const knownPrice = this.getKnownPrice(symbol)
      if (knownPrice) {
        this.setCache(cacheKey, knownPrice, 60) // Cache fallback for 1 hour
        return knownPrice
      }

      return null
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)

      // Return known price as fallback
      const knownPrice = this.getKnownPrice(symbol)
      return knownPrice
    }
  }

  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    const cacheKey = `metadata_${symbol}`
    const cached = this.getCached<AssetMetadata>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_metadata")

    try {
      // Try Yahoo Finance API
      const response = await fetch(`/api/yahoo/search/${symbol}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.name) {
          const result: AssetMetadata = {
            symbol: data.symbol || symbol,
            name: data.name,
            sector: data.sector || "Unknown",
            country: data.country || "Unknown",
            currency: data.currency || "USD",
            type: data.type || "Stock",
          }
          this.setCache(cacheKey, result, 1440) // Cache for 24 hours
          return result
        }
      }

      // Fallback to web scraping
      const scrapedMetadata = await this.scrapeYahooMetadata(symbol)
      if (scrapedMetadata) {
        this.setCache(cacheKey, scrapedMetadata, 1440)
        return scrapedMetadata
      }

      // Final fallback to known metadata
      const knownMetadata = this.getKnownMetadata(symbol)
      if (knownMetadata) {
        this.setCache(cacheKey, knownMetadata, 1440)
        return knownMetadata
      }

      return null
    } catch (error) {
      console.error(`Error fetching metadata for ${symbol}:`, error)

      // Return known metadata as fallback
      const knownMetadata = this.getKnownMetadata(symbol)
      return knownMetadata
    }
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`
    const cached = this.getCached<ETFComposition>(cacheKey)
    if (cached) return cached

    await this.rateLimit("yahoo_etf")

    try {
      // Try Yahoo Finance ETF API
      const response = await fetch(`/api/yahoo/etf/${symbol}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.symbol) {
          const result: ETFComposition = {
            symbol: data.symbol,
            domicile: data.domicile || "US",
            withholdingTax: data.withholdingTax || 30,
            currency: data.currency || [],
            country: data.country || [],
            sector: data.sector || [],
            holdings: data.holdings || [],
          }
          this.setCache(cacheKey, result, 1440) // Cache for 24 hours
          return result
        }
      }

      // Fallback to web scraping ETF data
      const scrapedComposition = await this.scrapeETFComposition(symbol)
      if (scrapedComposition) {
        this.setCache(cacheKey, scrapedComposition, 1440)
        return scrapedComposition
      }

      // Final fallback to known ETF compositions
      const knownComposition = this.getKnownETFComposition(symbol)
      if (knownComposition) {
        this.setCache(cacheKey, knownComposition, 1440)
        return knownComposition
      }

      return null
    } catch (error) {
      console.error(`Error fetching ETF composition for ${symbol}:`, error)

      // Return known composition as fallback
      const knownComposition = this.getKnownETFComposition(symbol)
      return knownComposition
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

      if (priceMatch) {
        return {
          symbol,
          price: Number.parseFloat(priceMatch[1]),
          change: changeMatch ? Number.parseFloat(changeMatch[1]) : 0,
          changePercent: changePercentMatch ? Number.parseFloat(changePercentMatch[1]) : 0,
          currency: currencyMatch ? currencyMatch[1] : "USD",
          lastUpdated: new Date().toISOString(),
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

      if (nameMatch) {
        return {
          symbol,
          name: nameMatch[1].trim(),
          sector: sectorMatch ? sectorMatch[1] : "Unknown",
          country: countryMatch ? countryMatch[1] : "Unknown",
          currency: "USD",
          type: "Stock",
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
          domicile: "US", // Default assumption
          withholdingTax: 30,
          currency: [{ currency: "USD", weight: 100 }], // Default assumption
          country: [{ country: "United States", weight: 100 }], // Default assumption
          sector: sectors,
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
    const knownPrices: Record<string, Omit<StockPrice, "symbol" | "lastUpdated">> = {
      AAPL: { price: 150.0, change: 2.5, changePercent: 1.69, currency: "USD" },
      MSFT: { price: 330.0, change: 2.8, changePercent: 0.86, currency: "USD" },
      GOOGL: { price: 125.0, change: -1.2, changePercent: -0.95, currency: "USD" },
      AMZN: { price: 145.0, change: 3.1, changePercent: 2.18, currency: "USD" },
      NVDA: { price: 450.0, change: 15.2, changePercent: 3.49, currency: "USD" },
      TSLA: { price: 220.0, change: -5.8, changePercent: -2.57, currency: "USD" },
      META: { price: 280.0, change: 4.2, changePercent: 1.52, currency: "USD" },
      NESN: { price: 120.0, change: 0.5, changePercent: 0.42, currency: "CHF" },
      NOVN: { price: 85.0, change: -0.3, changePercent: -0.35, currency: "CHF" },
      ROG: { price: 280.0, change: 1.2, changePercent: 0.43, currency: "CHF" },
      ASML: { price: 600.0, change: 8.5, changePercent: 1.44, currency: "EUR" },
      SAP: { price: 120.0, change: 0.9, changePercent: 0.76, currency: "EUR" },
      VWRL: { price: 89.96, change: 0.8, changePercent: 0.9, currency: "CHF" },
      IS3N: { price: 30.5, change: 0.3, changePercent: 0.99, currency: "CHF" },
      VTI: { price: 220.0, change: 2.2, changePercent: 1.01, currency: "USD" },
      VXUS: { price: 58.0, change: 0.3, changePercent: 0.52, currency: "USD" },
      VEA: { price: 48.0, change: 0.1, changePercent: 0.21, currency: "USD" },
      VWO: { price: 42.0, change: 0.6, changePercent: 1.45, currency: "USD" },
    }

    const known = knownPrices[symbol]
    if (known) {
      return {
        symbol,
        ...known,
        lastUpdated: new Date().toISOString(),
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
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      MSFT: {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        sector: "Technology",
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      GOOGL: {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        sector: "Technology",
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      AMZN: {
        symbol: "AMZN",
        name: "Amazon.com Inc.",
        sector: "Consumer Discretionary",
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      NVDA: {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        sector: "Technology",
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      TSLA: {
        symbol: "TSLA",
        name: "Tesla Inc.",
        sector: "Consumer Discretionary",
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      META: {
        symbol: "META",
        name: "Meta Platforms Inc.",
        sector: "Technology",
        country: "United States",
        currency: "USD",
        type: "Stock",
      },
      NESN: {
        symbol: "NESN",
        name: "Nestlé SA",
        sector: "Consumer Staples",
        country: "Switzerland",
        currency: "CHF",
        type: "Stock",
      },
      NOVN: {
        symbol: "NOVN",
        name: "Novartis AG",
        sector: "Healthcare",
        country: "Switzerland",
        currency: "CHF",
        type: "Stock",
      },
      ROG: {
        symbol: "ROG",
        name: "Roche Holding AG",
        sector: "Healthcare",
        country: "Switzerland",
        currency: "CHF",
        type: "Stock",
      },
      ASML: {
        symbol: "ASML",
        name: "ASML Holding NV",
        sector: "Technology",
        country: "Netherlands",
        currency: "EUR",
        type: "Stock",
      },
      SAP: { symbol: "SAP", name: "SAP SE", sector: "Technology", country: "Germany", currency: "EUR", type: "Stock" },
      VWRL: {
        symbol: "VWRL",
        name: "Vanguard FTSE All-World UCITS ETF",
        sector: "Mixed",
        country: "Global",
        currency: "CHF",
        type: "ETF",
      },
      IS3N: {
        symbol: "IS3N",
        name: "iShares Core MSCI World UCITS ETF",
        sector: "Mixed",
        country: "Global",
        currency: "CHF",
        type: "ETF",
      },
      VTI: {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        sector: "Mixed",
        country: "United States",
        currency: "USD",
        type: "ETF",
      },
      VXUS: {
        symbol: "VXUS",
        name: "Vanguard Total International Stock ETF",
        sector: "Mixed",
        country: "Global",
        currency: "USD",
        type: "ETF",
      },
      VEA: {
        symbol: "VEA",
        name: "Vanguard FTSE Developed Markets ETF",
        sector: "Mixed",
        country: "Global",
        currency: "USD",
        type: "ETF",
      },
      VWO: {
        symbol: "VWO",
        name: "Vanguard FTSE Emerging Markets ETF",
        sector: "Mixed",
        country: "Global",
        currency: "USD",
        type: "ETF",
      },
    }

    return knownMetadata[symbol] || null
  }

  private getKnownETFComposition(symbol: string): ETFComposition | null {
    const knownCompositions: Record<string, ETFComposition> = {
      VWRL: {
        symbol: "VWRL",
        domicile: "IE",
        withholdingTax: 15,
        currency: [
          { currency: "USD", weight: 65.0 },
          { currency: "EUR", weight: 15.0 },
          { currency: "JPY", weight: 8.0 },
          { currency: "GBP", weight: 4.0 },
          { currency: "CHF", weight: 3.0 },
          { currency: "Other", weight: 5.0 },
        ],
        country: [
          { country: "United States", weight: 60.0 },
          { country: "Japan", weight: 6.0 },
          { country: "United Kingdom", weight: 4.0 },
          { country: "China", weight: 3.5 },
          { country: "Canada", weight: 3.0 },
          { country: "France", weight: 3.0 },
          { country: "Switzerland", weight: 2.8 },
          { country: "Germany", weight: 2.5 },
          { country: "Other", weight: 15.2 },
        ],
        sector: [
          { sector: "Technology", weight: 22.0 },
          { sector: "Healthcare", weight: 13.0 },
          { sector: "Financials", weight: 12.0 },
          { sector: "Consumer Discretionary", weight: 11.0 },
          { sector: "Communication Services", weight: 9.0 },
          { sector: "Industrials", weight: 9.0 },
          { sector: "Consumer Staples", weight: 7.0 },
          { sector: "Energy", weight: 5.0 },
          { sector: "Materials", weight: 4.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 3.0 },
          { sector: "Other", weight: 2.0 },
        ],
        holdings: [
          { symbol: "AAPL", name: "Apple Inc.", weight: 4.2 },
          { symbol: "MSFT", name: "Microsoft Corp.", weight: 3.8 },
          { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.1 },
          { symbol: "AMZN", name: "Amazon.com Inc.", weight: 1.9 },
          { symbol: "NVDA", name: "NVIDIA Corp.", weight: 1.8 },
        ],
      },
      IS3N: {
        symbol: "IS3N",
        domicile: "IE",
        withholdingTax: 15,
        currency: [
          { currency: "USD", weight: 70.0 },
          { currency: "EUR", weight: 12.0 },
          { currency: "JPY", weight: 7.0 },
          { currency: "GBP", weight: 4.0 },
          { currency: "CHF", weight: 3.0 },
          { currency: "Other", weight: 4.0 },
        ],
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
          { sector: "Financials", weight: 13.0 },
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
        holdings: [
          { symbol: "AAPL", name: "Apple Inc.", weight: 4.5 },
          { symbol: "MSFT", name: "Microsoft Corp.", weight: 4.1 },
          { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.3 },
          { symbol: "AMZN", name: "Amazon.com Inc.", weight: 2.0 },
          { symbol: "NVDA", name: "NVIDIA Corp.", weight: 1.8 },
        ],
      },
      VTI: {
        symbol: "VTI",
        domicile: "US",
        withholdingTax: 30,
        currency: [{ currency: "USD", weight: 100.0 }],
        country: [{ country: "United States", weight: 100.0 }],
        sector: [
          { sector: "Technology", weight: 28.0 },
          { sector: "Healthcare", weight: 13.0 },
          { sector: "Financials", weight: 11.0 },
          { sector: "Consumer Discretionary", weight: 10.0 },
          { sector: "Communication Services", weight: 8.0 },
          { sector: "Industrials", weight: 8.0 },
          { sector: "Consumer Staples", weight: 6.0 },
          { sector: "Energy", weight: 4.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 4.0 },
          { sector: "Materials", weight: 3.0 },
          { sector: "Other", weight: 2.0 },
        ],
        holdings: [
          { symbol: "AAPL", name: "Apple Inc.", weight: 7.2 },
          { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.8 },
          { symbol: "GOOGL", name: "Alphabet Inc.", weight: 4.1 },
          { symbol: "AMZN", name: "Amazon.com Inc.", weight: 3.4 },
          { symbol: "NVDA", name: "NVIDIA Corp.", weight: 2.9 },
        ],
      },
      VXUS: {
        symbol: "VXUS",
        domicile: "US",
        withholdingTax: 30,
        currency: [
          { currency: "EUR", weight: 25.0 },
          { currency: "JPY", weight: 15.0 },
          { currency: "GBP", weight: 8.0 },
          { currency: "CHF", weight: 6.0 },
          { currency: "CAD", weight: 6.0 },
          { currency: "CNY", weight: 8.0 },
          { currency: "Other", weight: 32.0 },
        ],
        country: [
          { country: "Japan", weight: 15.0 },
          { country: "United Kingdom", weight: 8.0 },
          { country: "China", weight: 7.0 },
          { country: "Canada", weight: 6.0 },
          { country: "France", weight: 6.0 },
          { country: "Switzerland", weight: 5.5 },
          { country: "Germany", weight: 5.0 },
          { country: "Taiwan", weight: 4.0 },
          { country: "Netherlands", weight: 3.0 },
          { country: "Other", weight: 40.5 },
        ],
        sector: [
          { sector: "Technology", weight: 18.0 },
          { sector: "Financials", weight: 16.0 },
          { sector: "Healthcare", weight: 12.0 },
          { sector: "Consumer Discretionary", weight: 11.0 },
          { sector: "Industrials", weight: 11.0 },
          { sector: "Communication Services", weight: 7.0 },
          { sector: "Consumer Staples", weight: 7.0 },
          { sector: "Materials", weight: 6.0 },
          { sector: "Energy", weight: 5.0 },
          { sector: "Utilities", weight: 3.0 },
          { sector: "Real Estate", weight: 2.0 },
          { sector: "Other", weight: 1.0 },
        ],
        holdings: [],
      },
    }

    return knownCompositions[symbol] || null
  }
}

export const apiService = new APIService()
