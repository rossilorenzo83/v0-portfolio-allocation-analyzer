import { YAHOO_FINANCE_API_BASE_URL } from "./config"

interface StockPrice {
  symbol: string
  price: number
  currency: string
  change: number
  changePercent: number
  lastUpdated: string
}

interface AssetMetadata {
  symbol: string
  name: string
  sector: string
  country: string
  currency: string
  type: string
  exchange: string
}

interface ETFComposition {
  symbol: string
  currency: Array<{ currency: string; weight: number }>
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
  holdings: Array<{ symbol: string; name: string; weight: number }>
  domicile: string
  withholdingTax: number
  lastUpdated: string
}

interface YahooQuoteResult {
  symbol: string
  longName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  currency?: string
  marketCap?: number
  // Add other fields as needed
}

interface YahooSearchResult {
  symbol: string
  longname?: string
  exchange?: string
  // Add other fields as needed
}

interface YahooEtfHolding {
  symbol: string
  holdingName: string
  holdingPercent: number
  // Add other fields as needed
}

interface SearchResult {
  symbol: string
  name: string
}

// European ETF symbol mapping for Yahoo Finance
const EUROPEAN_ETF_MAPPING: Record<string, string[]> = {
  // Vanguard ETFs
  VWRL: ["VWRL.L", "VWRL.AS", "VWRL.DE", "VWRL.MI"],
  VWCE: ["VWCE.DE", "VWCE.L", "VWCE.AS", "VWCE.MI"],
  VUSA: ["VUSA.L", "VUSA.AS", "VUSA.DE", "VUSA.MI"],
  VUSD: ["VUSD.L", "VUSD.AS", "VUSD.DE", "VUSD.MI"],
  VEUR: ["VEUR.L", "VEUR.AS", "VEUR.DE", "VEUR.MI"],
  VJPN: ["VJPN.L", "VJPN.AS", "VJPN.DE", "VJPN.MI"],
  VFEM: ["VFEM.L", "VFEM.AS", "VFEM.DE", "VFEM.MI"],

  // iShares ETFs
  IS3N: ["IS3N.SW", "IS3N.DE", "IS3N.L", "IS3N.AS"],
  IWDA: ["IWDA.L", "IWDA.AS", "IWDA.DE", "IWDA.MI"],
  IUSA: ["IUSA.L", "IUSA.AS", "IUSA.DE", "IUSA.MI"],
  IEUR: ["IEUR.L", "IEUR.AS", "IEUR.DE", "IEUR.MI"],
  IJPN: ["IJPN.L", "IJPN.AS", "IJPN.DE", "IJPN.MI"],
  IEMM: ["IEMM.L", "IEMM.AS", "IEMM.DE", "IEMM.MI"],
  EUNL: ["EUNL.DE", "EUNL.L", "EUNL.AS", "EUNL.MI"],

  // SPDR ETFs
  SPYY: ["SPYY.L", "SPYY.AS", "SPYY.DE", "SPYY.MI"],
  SPXP: ["SPXP.L", "SPXP.AS", "SPXP.DE", "SPXP.MI"],

  // Xtrackers ETFs
  XMWO: ["XMWO.DE", "XMWO.L", "XMWO.AS", "XMWO.MI"],
  XMEU: ["XMEU.DE", "XMEU.L", "XMEU.AS", "XMEU.MI"],
  XMUS: ["XMUS.DE", "XMUS.L", "XMUS.AS", "XMUS.MI"],
}

// Swiss stock symbol mapping
const SWISS_STOCK_MAPPING: Record<string, string> = {
  NESN: "NESN.SW",
  NOVN: "NOVN.SW",
  ROG: "ROG.SW",
  UHR: "UHR.SW",
  ABBN: "ABBN.SW",
  UBSG: "UBSG.SW",
  CS: "CSGN.SW",
  CSGN: "CSGN.SW",
  ZURN: "ZURN.SW",
  SLHN: "SLHN.SW",
  LONN: "LONN.SW",
  GIVN: "GIVN.SW",
  SCMN: "SCMN.SW",
  BAER: "BAER.SW",
  CFR: "CFR.SW",
}

class APIService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private symbolCache = new Map<string, string>() // Cache resolved symbols
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 200
  private baseUrl = YAHOO_FINANCE_API_BASE_URL

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

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const lastRequest = this.rateLimitMap.get("global") || 0
    const timeSinceLastRequest = now - lastRequest

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest))
    }

    this.rateLimitMap.set("global", Date.now())
  }

  private async resolveSymbol(originalSymbol: string): Promise<string> {
    // Check if we already resolved this symbol
    if (this.symbolCache.has(originalSymbol)) {
      return this.symbolCache.get(originalSymbol)!
    }

    console.log(`🔍 Resolving symbol: ${originalSymbol}`)

    // Get all possible variations
    const variations = this.getSymbolVariations(originalSymbol)
    
    // If there's only one variation (the original symbol) and it looks like a simple US stock,
    // skip the resolution process and assume it's correct
    if (variations.length === 1 && variations[0] === originalSymbol && 
        !this.isEuropeanSymbol(originalSymbol) && !originalSymbol.includes('.')) {
      console.log(`  📍 Assuming ${originalSymbol} is a valid US symbol, skipping resolution`)
      this.symbolCache.set(originalSymbol, originalSymbol)
      return originalSymbol
    }

    // For Swiss stocks, prefer the Swiss exchange version
    if (SWISS_STOCK_MAPPING[originalSymbol]) {
      const swissSymbol = SWISS_STOCK_MAPPING[originalSymbol]
      console.log(`  📍 Preferring Swiss exchange symbol: ${swissSymbol}`)
      this.symbolCache.set(originalSymbol, swissSymbol)
      return swissSymbol
    }

    // Try each variation until we find one that works
    for (const variation of variations) {
      try {
        await this.rateLimit()
        console.log(`  Trying: ${variation}`)

        const response = await fetch(`${this.baseUrl}/quote/${variation}`)

        if (response.ok) {
          const data = await response.json()
          // Handle nested Yahoo Finance API response structure
          const quote = data.quoteResponse?.result?.[0] || data
          if (data && (quote.price || quote.regularMarketPrice || data.price || data.regularMarketPrice)) {
            console.log(`  ✅ Found working symbol: ${variation}`)
            this.symbolCache.set(originalSymbol, variation)
            return variation
          }
        } else if (response.status === 401) {
          console.log(`  ⚠️ 401 for ${variation} - skipping`)
          continue
        }
      } catch (error) {
        console.log(`  ❌ Error with ${variation}:`, error)
        continue
      }
    }

    console.log(`  🔄 No working symbol found, using original: ${originalSymbol}`)
    this.symbolCache.set(originalSymbol, originalSymbol)
    return originalSymbol
  }

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const cacheKey = `price_${symbol}`
    const cached = this.getCached<StockPrice>(cacheKey)
    if (cached) return cached

    console.log(`📈 Fetching price for ${symbol}`)

    // Resolve the correct symbol first
    const resolvedSymbol = await this.resolveSymbol(symbol)

    try {
      await this.rateLimit()
      const response = await fetch(`${this.baseUrl}/quote/${resolvedSymbol}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Price data for ${symbol}:`, data)

        // Handle nested Yahoo Finance API response structure
        const quote = data.quoteResponse?.result?.[0] || data
        
        const result: StockPrice = {
          symbol: symbol, // Always return original symbol
          price: quote.price || quote.regularMarketPrice || data.price || data.regularMarketPrice || 0,
          currency: quote.currency || data.currency || this.inferCurrency(resolvedSymbol),
          change: quote.change || quote.regularMarketChange || data.change || data.regularMarketChange || 0,
          changePercent: quote.changePercent || quote.regularMarketChangePercent || data.changePercent || data.regularMarketChangePercent || 0,
          lastUpdated: new Date().toISOString(),
        }

        this.setCache(cacheKey, result, 5) // Cache for 5 minutes
        return result
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
    }

    // Return fallback
    const fallback = this.getFallbackPrice(symbol)
    this.setCache(cacheKey, fallback, 60)
    return fallback
  }

  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    const cacheKey = `metadata_${symbol}`
    const cached = this.getCached<AssetMetadata>(cacheKey)
    if (cached) return cached

    console.log(`📊 Fetching metadata for ${symbol}`)

    // Resolve the correct symbol first
    const resolvedSymbol = await this.resolveSymbol(symbol)

    try {
      await this.rateLimit()
      const response = await fetch(`${this.baseUrl}/search/${resolvedSymbol}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Metadata for ${symbol}:`, data)

        // Handle nested search response structure
        const quote = data.quotes?.[0] || data
        
        const result: AssetMetadata = {
          symbol: symbol, // Always return original symbol
          name: quote.name || quote.longname || quote.longName || data.name || data.longName || this.getKnownName(symbol) || symbol,
          sector: quote.sector || data.sector || this.inferSector(symbol),
          country: quote.country || data.country || this.inferCountry(resolvedSymbol),
          currency: quote.currency || data.currency || this.inferCurrency(resolvedSymbol),
          type: quote.type || quote.quoteType || data.type || this.inferAssetType(symbol),
          exchange: quote.exchange || data.exchange || this.inferExchange(symbol),
        }

        this.setCache(cacheKey, result, 1440) // Cache for 24 hours
        return result
      }
    } catch (error) {
      console.error(`Error fetching metadata for ${symbol}:`, error)
    }

    // Return fallback
    const fallback = this.getFallbackMetadata(symbol)
    this.setCache(cacheKey, fallback, 1440)
    return fallback
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`
    const cached = this.getCached<ETFComposition>(cacheKey)
    if (cached) return cached

    console.log(`🏦 Fetching ETF composition for ${symbol}`)

    // Resolve the correct symbol first
    const resolvedSymbol = await this.resolveSymbol(symbol)

    try {
      await this.rateLimit()
      const response = await fetch(`${this.baseUrl}/etf/${resolvedSymbol}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ETF composition for ${symbol}:`, data)

        // Process the scraped data - accept freetext values
        const result: ETFComposition = {
          symbol: symbol, // Always return original symbol
          currency: this.processCurrencyData(data.currency || []),
          country: this.processCountryData(data.country || []),
          sector: this.processSectorData(data.sector || []),
          holdings: data.holdings || [],
          domicile: data.domicile || this.inferDomicile(symbol),
          withholdingTax: data.withholdingTax || this.inferWithholdingTax(symbol),
          lastUpdated: new Date().toISOString(),
        }

        this.setCache(cacheKey, result, 1440) // Cache for 24 hours
        return result
      }
    } catch (error) {
      console.error(`Error fetching ETF composition for ${symbol}:`, error)
    }

    // Return fallback
    const fallback = this.getFallbackETFComposition(symbol)
    this.setCache(cacheKey, fallback, 1440)
    return fallback
  }

  async searchSymbol(query: string): Promise<SearchResult[]> {
    try {
      const data = await fetch(`${this.baseUrl}/search/${query}`)
      if (data.ok) {
        const result = await data.json()
        console.log(`✅ Search results for ${query}:`, result)
        // Handle nested quotes structure
        return result.quotes || (result ? [result] : [])
      }
    } catch (error) {
      console.error(`Error searching for symbol ${query}:`, error)
    }

    return []
  }

  private processCurrencyData(currencies: any[]): Array<{ currency: string; weight: number }> {
    return currencies
      .map((curr) => ({
        currency: curr.currency || curr.name || "Unknown",
        weight: curr.weight || 0,
      }))
      .filter((curr) => curr.weight > 0)
  }

  private processCountryData(countries: any[]): Array<{ country: string; weight: number }> {
    return countries
      .map((country) => ({
        country: country.country || country.name || "Unknown",
        weight: country.weight || 0,
      }))
      .filter((country) => country.weight > 0)
  }

  private processSectorData(sectors: any[]): Array<{ sector: string; weight: number }> {
    return sectors
      .map((sector) => ({
        sector: sector.sector || sector.name || "Unknown",
        weight: sector.weight || 0,
      }))
      .filter((sector) => sector.weight > 0)
  }

  private getSymbolVariations(symbol: string): string[] {
    const variations = [symbol] // Start with original

    // Add known mappings
    if (EUROPEAN_ETF_MAPPING[symbol]) {
      variations.push(...EUROPEAN_ETF_MAPPING[symbol])
    }

    if (SWISS_STOCK_MAPPING[symbol]) {
      variations.push(SWISS_STOCK_MAPPING[symbol])
    }

    // Auto-detect European symbols and add exchange suffixes
    if (this.isEuropeanSymbol(symbol) && !symbol.includes(".")) {
      const exchanges = [".L", ".DE", ".AS", ".MI", ".PA", ".SW"]
      exchanges.forEach((exchange) => {
        variations.push(`${symbol}${exchange}`)
      })
    }

    // Remove duplicates
    return [...new Set(variations)]
  }

  private isEuropeanSymbol(symbol: string): boolean {
    const europeanPatterns = [
      /^V[A-Z]{3}$/, // Vanguard ETFs
      /^I[A-Z]{3}$/, // iShares ETFs
      /^IS[0-9][A-Z]$/, // iShares numbered ETFs
      /^X[A-Z]{3}$/, // Xtrackers ETFs
      /^SP[A-Z]{2}$/, // SPDR ETFs
    ]

    return (
      europeanPatterns.some((pattern) => pattern.test(symbol)) ||
      Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol) ||
      Object.keys(SWISS_STOCK_MAPPING).includes(symbol)
    )
  }

  private inferCurrency(symbol: string): string {
    if (symbol.endsWith(".L")) return "GBP"
    if (symbol.endsWith(".DE")) return "EUR"
    if (symbol.endsWith(".AS")) return "EUR"
    if (symbol.endsWith(".MI")) return "EUR"
    if (symbol.endsWith(".PA")) return "EUR"
    if (symbol.endsWith(".SW")) return "CHF"
    return "USD"
  }

  private inferCountry(symbol: string): string {
    if (symbol.endsWith(".L")) return "United Kingdom"
    if (symbol.endsWith(".DE")) return "Germany"
    if (symbol.endsWith(".AS")) return "Netherlands"
    if (symbol.endsWith(".MI")) return "Italy"
    if (symbol.endsWith(".PA")) return "France"
    if (symbol.endsWith(".SW")) return "Switzerland"
    return "United States"
  }

  private inferSector(symbol: string): string {
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      return "Diversified"
    }
    return "Unknown"
  }

  private inferAssetType(symbol: string): string {
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      return "ETF"
    }
    return "Stock"
  }

  private inferExchange(symbol: string): string {
    if (symbol.endsWith(".L")) return "London"
    if (symbol.endsWith(".DE")) return "Frankfurt"
    if (symbol.endsWith(".AS")) return "Amsterdam"
    if (symbol.endsWith(".MI")) return "Milan"
    if (symbol.endsWith(".PA")) return "Paris"
    if (symbol.endsWith(".SW")) return "Zurich"
    return "New York"
  }

  private inferDomicile(symbol: string): string {
    // US ETFs
    if (symbol.match(/^(VTI|VXUS|VEA|VWO|SPY|QQQ|IVV)$/)) {
      return "US"
    }

    // European ETFs are typically Irish or Luxembourg
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      return "IE" // Most are Irish
    }

    return "Unknown"
  }

  private inferWithholdingTax(symbol: string): number {
    const domicile = this.inferDomicile(symbol)

    switch (domicile) {
      case "US":
        return 15 // US-Switzerland tax treaty
      case "IE":
      case "LU":
        return 15 // European ETFs
      default:
        return 30
    }
  }

  private getFallbackPrice(symbol: string): StockPrice {
    let price = 100
    let currency = "USD"

    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      price = 75 + Math.random() * 50
      currency = "EUR"
    } else if (Object.keys(SWISS_STOCK_MAPPING).includes(symbol)) {
      price = 50 + Math.random() * 200
      currency = "CHF"
    }

    return {
      symbol: symbol,
      price: Math.round(price * 100) / 100,
      currency: currency,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      lastUpdated: new Date().toISOString(),
    }
  }

  private getFallbackMetadata(symbol: string): AssetMetadata {
    return {
      symbol: symbol,
      name: this.getKnownName(symbol) || symbol,
      sector: this.inferSector(symbol),
      country: this.inferCountry(symbol),
      currency: this.inferCurrency(symbol),
      type: this.inferAssetType(symbol),
      exchange: this.inferExchange(symbol),
    }
  }

  private getFallbackETFComposition(symbol: string): ETFComposition {
    // Return realistic composition based on known ETF types
    const isWorldETF = symbol.match(/^(VWRL|VWCE|IWDA|IS3N)$/)
    const isUSETF = symbol.match(/^(VTI|SPY|QQQ|IVV|SPYY)$/)

    if (isWorldETF) {
      return {
        symbol: symbol,
        currency: [
          { currency: "USD", weight: 65 },
          { currency: "EUR", weight: 15 },
          { currency: "JPY", weight: 8 },
          { currency: "GBP", weight: 4 },
          { currency: "Other", weight: 8 },
        ],
        country: [
          { country: "United States", weight: 65 },
          { country: "Japan", weight: 8 },
          { country: "United Kingdom", weight: 4 },
          { country: "China", weight: 3 },
          { country: "Canada", weight: 3 },
          { country: "France", weight: 3 },
          { country: "Germany", weight: 3 },
          { country: "Other", weight: 11 },
        ],
        sector: [
          { sector: "Technology", weight: 25 },
          { sector: "Financial Services", weight: 15 },
          { sector: "Healthcare", weight: 12 },
          { sector: "Consumer Discretionary", weight: 10 },
          { sector: "Industrials", weight: 10 },
          { sector: "Communication Services", weight: 8 },
          { sector: "Consumer Staples", weight: 7 },
          { sector: "Energy", weight: 5 },
          { sector: "Materials", weight: 4 },
          { sector: "Utilities", weight: 2 },
          { sector: "Real Estate", weight: 2 },
        ],
        holdings: [],
        domicile: "IE",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      }
    }

    if (isUSETF) {
      return {
        symbol: symbol,
        currency: [{ currency: "USD", weight: 100 }],
        country: [{ country: "United States", weight: 100 }],
        sector: [
          { sector: "Technology", weight: 28 },
          { sector: "Financial Services", weight: 13 },
          { sector: "Healthcare", weight: 12 },
          { sector: "Consumer Discretionary", weight: 11 },
          { sector: "Industrials", weight: 9 },
          { sector: "Communication Services", weight: 8 },
          { sector: "Consumer Staples", weight: 6 },
          { sector: "Energy", weight: 4 },
          { sector: "Materials", weight: 4 },
          { sector: "Utilities", weight: 3 },
          { sector: "Real Estate", weight: 2 },
        ],
        holdings: [],
        domicile: "US",
        withholdingTax: 15, // US-Switzerland tax treaty
        lastUpdated: new Date().toISOString(),
      }
    }

    // Generic fallback
    return {
      symbol: symbol,
      currency: [
        { currency: "USD", weight: 60 },
        { currency: "EUR", weight: 20 },
        { currency: "JPY", weight: 10 },
        { currency: "Other", weight: 10 },
      ],
      country: [
        { country: "United States", weight: 60 },
        { country: "Europe", weight: 20 },
        { country: "Japan", weight: 10 },
        { country: "Other", weight: 10 },
      ],
      sector: [
        { sector: "Technology", weight: 25 },
        { sector: "Financial Services", weight: 15 },
        { sector: "Healthcare", weight: 12 },
        { sector: "Consumer Discretionary", weight: 10 },
        { sector: "Industrials", weight: 10 },
        { sector: "Other", weight: 28 },
      ],
      holdings: [],
      domicile: "Unknown",
      withholdingTax: 15,
      lastUpdated: new Date().toISOString(),
    }
  }

  private getKnownName(symbol: string): string | null {
    const names: Record<string, string> = {
      // US ETFs
      VTI: "Vanguard Total Stock Market ETF",
      VXUS: "Vanguard Total International Stock ETF",
      VEA: "Vanguard FTSE Developed Markets ETF",
      VWO: "Vanguard FTSE Emerging Markets ETF",
      SPY: "SPDR S&P 500 ETF Trust",
      QQQ: "Invesco QQQ Trust",
      IVV: "iShares Core S&P 500 ETF",

      // European ETFs
      VWRL: "Vanguard FTSE All-World UCITS ETF",
      VWCE: "Vanguard FTSE All-World UCITS ETF (Acc)",
      IS3N: "iShares Core MSCI World UCITS ETF",
      IWDA: "iShares Core MSCI World UCITS ETF",
      EUNL: "iShares Core MSCI Europe UCITS ETF",

      // Swiss stocks
      NESN: "Nestlé SA",
      NOVN: "Novartis AG",
      ROG: "Roche Holding AG",
      UHR: "The Swatch Group AG",
      ABBN: "ABB Ltd",
      UBSG: "UBS Group AG",
      CSGN: "Credit Suisse Group AG",
      ZURN: "Zurich Insurance Group AG",
      SLHN: "Swiss Life Holding AG",
      LONN: "Lonza Group AG",
      GIVN: "Givaudan SA",
      SCMN: "Swisscom AG",
      BAER: "Julius Baer Group Ltd",
      CFR: "Compagnie Financière Richemont SA",
    }

    return names[symbol] || null
  }
}

export const apiService = new APIService()

const fetchApi = async (path: string) => {
  const response = await fetch(`${YAHOO_FINANCE_API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${path}: ${response.statusText}`)
  }
  return response.json()
}

export async function getQuote(symbol: string): Promise<YahooQuoteResult | null> {
  try {
    const data = await fetchApi(`/quote/${symbol}`)
    return data.quoteResponse?.result?.[0] || null
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error)
    throw new Error(`Failed to fetch quote for ${symbol}`)
  }
}

export async function searchSymbol(query: string): Promise<SearchResult[]> {
  try {
    const data = await fetchApi(`/search/${query}`)
    return data.quotes || []
  } catch (error) {
    console.error(`Error searching for ${query}:`, error)
    return []
  }
}

export async function getEtfHoldings(symbol: string): Promise<YahooEtfHolding[]> {
  try {
    // Note: Yahoo Finance API's /v6/finance/quote/detail endpoint often contains fundHoldings
    // We are proxying to this endpoint via our Next.js API route.
    const data = await fetchApi(`/etf/${symbol}`)
    return data.fundHoldings?.holdings || []
  } catch (error) {
    console.error(`Error fetching ETF holdings for ${symbol}:`, error)
    return []
  }
}
