interface StockPrice {
  price: number
  changePercent: number
  currency: string
}

interface AssetMetadata {
  name: string
  sector: string
  country: string
  marketCap?: number
}

interface ETFComposition {
  domicile: string
  withholdingTax: number
  currency: Array<{ currency: string; weight: number }>
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
}

class APIService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 100 // 100ms between requests

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
        if (data && data.price) {
          const result: StockPrice = {
            price: data.price,
            changePercent: data.changePercent || 0,
            currency: data.currency || "USD",
          }
          this.setCache(cacheKey, result, 5) // Cache for 5 minutes
          return result
        }
      }

      // Fallback to known prices
      const knownPrices = this.getKnownPrices()
      if (knownPrices[symbol]) {
        const result = knownPrices[symbol]
        this.setCache(cacheKey, result, 60) // Cache fallback for 1 hour
        return result
      }

      return null
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)

      // Return known price as fallback
      const knownPrices = this.getKnownPrices()
      return knownPrices[symbol] || null
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
            name: data.name,
            sector: data.sector || "Unknown",
            country: data.country || "Unknown",
            marketCap: data.marketCap,
          }
          this.setCache(cacheKey, result, 1440) // Cache for 24 hours
          return result
        }
      }

      // Fallback to known metadata
      const knownMetadata = this.getKnownMetadata()
      if (knownMetadata[symbol]) {
        const result = knownMetadata[symbol]
        this.setCache(cacheKey, result, 1440)
        return result
      }

      return null
    } catch (error) {
      console.error(`Error fetching metadata for ${symbol}:`, error)

      // Return known metadata as fallback
      const knownMetadata = this.getKnownMetadata()
      return knownMetadata[symbol] || null
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
        if (data && data.holdings) {
          const result: ETFComposition = {
            domicile: data.domicile || "US",
            withholdingTax: data.withholdingTax || 30,
            currency: data.currency || [],
            country: data.country || [],
            sector: data.sector || [],
          }
          this.setCache(cacheKey, result, 1440) // Cache for 24 hours
          return result
        }
      }

      // Fallback to known ETF compositions
      const knownCompositions = this.getKnownETFCompositions()
      if (knownCompositions[symbol]) {
        const result = knownCompositions[symbol]
        this.setCache(cacheKey, result, 1440)
        return result
      }

      return null
    } catch (error) {
      console.error(`Error fetching ETF composition for ${symbol}:`, error)

      // Return known composition as fallback
      const knownCompositions = this.getKnownETFCompositions()
      return knownCompositions[symbol] || null
    }
  }

  private getKnownPrices(): Record<string, StockPrice> {
    return {
      AAPL: { price: 150.0, changePercent: 1.5, currency: "USD" },
      MSFT: { price: 330.0, changePercent: 0.8, currency: "USD" },
      GOOGL: { price: 2800.0, changePercent: -0.5, currency: "USD" },
      AMZN: { price: 3200.0, changePercent: 2.1, currency: "USD" },
      NVDA: { price: 450.0, changePercent: 3.2, currency: "USD" },
      TSLA: { price: 800.0, changePercent: -1.2, currency: "USD" },
      META: { price: 280.0, changePercent: 1.8, currency: "USD" },
      NESN: { price: 120.0, changePercent: 0.3, currency: "CHF" },
      NOVN: { price: 85.0, changePercent: -0.2, currency: "CHF" },
      ROG: { price: 280.0, changePercent: 0.5, currency: "CHF" },
      ASML: { price: 600.0, changePercent: 1.2, currency: "EUR" },
      SAP: { price: 120.0, changePercent: 0.7, currency: "EUR" },
      VWRL: { price: 89.96, changePercent: 0.9, currency: "CHF" },
      IS3N: { price: 30.5, changePercent: 1.1, currency: "CHF" },
      VTI: { price: 220.0, changePercent: 1.0, currency: "USD" },
      VXUS: { price: 58.0, changePercent: 0.5, currency: "USD" },
      VEA: { price: 48.0, changePercent: 0.3, currency: "USD" },
      VWO: { price: 42.0, changePercent: 1.5, currency: "USD" },
    }
  }

  private getKnownMetadata(): Record<string, AssetMetadata> {
    return {
      AAPL: { name: "Apple Inc.", sector: "Technology", country: "United States" },
      MSFT: { name: "Microsoft Corporation", sector: "Technology", country: "United States" },
      GOOGL: { name: "Alphabet Inc.", sector: "Technology", country: "United States" },
      AMZN: { name: "Amazon.com Inc.", sector: "Consumer Discretionary", country: "United States" },
      NVDA: { name: "NVIDIA Corporation", sector: "Technology", country: "United States" },
      TSLA: { name: "Tesla Inc.", sector: "Consumer Discretionary", country: "United States" },
      META: { name: "Meta Platforms Inc.", sector: "Technology", country: "United States" },
      NESN: { name: "Nestlé SA", sector: "Consumer Staples", country: "Switzerland" },
      NOVN: { name: "Novartis AG", sector: "Healthcare", country: "Switzerland" },
      ROG: { name: "Roche Holding AG", sector: "Healthcare", country: "Switzerland" },
      ASML: { name: "ASML Holding NV", sector: "Technology", country: "Netherlands" },
      SAP: { name: "SAP SE", sector: "Technology", country: "Germany" },
      VWRL: { name: "Vanguard FTSE All-World UCITS ETF", sector: "Mixed", country: "Global" },
      IS3N: { name: "iShares Core MSCI World UCITS ETF", sector: "Mixed", country: "Global" },
      VTI: { name: "Vanguard Total Stock Market ETF", sector: "Mixed", country: "United States" },
      VXUS: { name: "Vanguard Total International Stock ETF", sector: "Mixed", country: "Global" },
      VEA: { name: "Vanguard FTSE Developed Markets ETF", sector: "Mixed", country: "Global" },
      VWO: { name: "Vanguard FTSE Emerging Markets ETF", sector: "Mixed", country: "Global" },
    }
  }

  private getKnownETFCompositions(): Record<string, ETFComposition> {
    return {
      VWRL: {
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
      },
      IS3N: {
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
      },
      VTI: {
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
      },
      VXUS: {
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
      },
    }
  }
}

export const apiService = new APIService()
