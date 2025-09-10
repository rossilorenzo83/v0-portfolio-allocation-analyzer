import { YAHOO_FINANCE_API_BASE_URL } from "./config"
import { YahooSession, ETFComposition, AssetMetadata, QuoteData } from '@/types/yahoo'
import { normalizeSectorName, normalizeCountryName } from './normalization-utils'

// Alias QuoteData as StockPrice for compatibility
type StockPrice = QuoteData

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
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 200
  private baseUrl = YAHOO_FINANCE_API_BASE_URL

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl * 60 * 1000) {
      return cached.data as T
    }
    return null
  }

  private setCache<T>(key: string, data: T, ttlMinutes: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes
    })
  }

  private async rateLimit(): Promise<void> {
    const lastRequest = this.rateLimitMap.get("global") || 0
    const timeSinceLastRequest = Date.now() - lastRequest

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest))
    }

    this.rateLimitMap.set("global", Date.now())
  }

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const cacheKey = `price_${symbol}`
    const cached = this.getCached<StockPrice>(cacheKey)
    if (cached) return cached

    console.log(`💰 Fetching price for ${symbol}`)

    try {
      await this.rateLimit()
      
      // Check if we're running server-side (has access to process.env)
      if (typeof process !== 'undefined' && process.env) {
        // Server-side: Use free Yahoo Finance API
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
        const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
          const result = data.chart?.result?.[0]
          if (result) {
            const meta = result.meta
            const currentPrice = meta.regularMarketPrice || meta.previousClose
            const previousClose = meta.previousClose || currentPrice
            const change = currentPrice - previousClose
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

            const stockPrice: StockPrice = {
              symbol: symbol, // Always return original symbol
              price: Number(currentPrice.toFixed(2)),
              currency: meta.currency || this.inferCurrency(symbol),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              lastUpdated: new Date().toISOString(),
            }

            this.setCache(cacheKey, stockPrice, 5) // Cache for 5 minutes
            return stockPrice
          }
        }
      } else {
        // Client-side: Use Next.js API route
        const response = await fetch(`${this.baseUrl}/quote/${encodeURIComponent(symbol)}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Price data for ${symbol}:`, data)
        
        const result: StockPrice = {
          symbol: symbol, // Always return original symbol
            price: data.price || 0,
            currency: data.currency || this.inferCurrency(symbol),
            change: data.change || 0,
            changePercent: data.changePercent || 0,
          lastUpdated: new Date().toISOString(),
        }

        this.setCache(cacheKey, result, 5) // Cache for 5 minutes
        return result
      } else {
          console.error(`API route error for ${symbol}: ${response.status} - ${response.statusText}`)
        }
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

    try {
      await this.rateLimit()
      
      // Check if we're running server-side (has access to process.env)
      if (typeof process !== 'undefined' && process.env) {
        // Server-side: Use local share-metadata API route for proper Swiss symbol resolution
        const url = `/api/yahoo/share-metadata/${encodeURIComponent(symbol)}`
        const response = await fetch(`http://localhost:3000${url}`)

        if (response.ok) {
          const metadata = await response.json()
          
          if (metadata && metadata.symbol) {
            // Add domicile inference based on country and symbol
            const domicile = this.inferDomicileFromCountry(metadata.country, symbol)
            const enrichedMetadata = {
              ...metadata,
              domicile: domicile
            }
            
            console.log(`✅ Real metadata found for ${symbol}:`, enrichedMetadata)
            this.setCache(cacheKey, enrichedMetadata, 60) // Cache for 1 hour
            return enrichedMetadata
          }
        }
      } else {
        // Client-side: Use Next.js share-metadata API route  
        const response = await fetch(`${this.baseUrl}/share-metadata/${encodeURIComponent(symbol)}`)

        if (response.ok) {
          const metadata = await response.json()
          
          if (metadata && metadata.symbol) {
            // Add domicile inference based on country and symbol
            const domicile = this.inferDomicileFromCountry(metadata.country, symbol)
            const enrichedMetadata = {
              ...metadata,
              domicile: domicile
            }
            
            console.log(`✅ Client-side metadata found for ${symbol}:`, enrichedMetadata)
            this.setCache(cacheKey, enrichedMetadata, 60) // Cache for 1 hour
            return enrichedMetadata
          }
        } else {
          console.error(`API route error for ${symbol}: ${response.status} - ${response.statusText}`)
        }
      }
    } catch (error) {
      console.error(`Error fetching metadata for ${symbol}:`, error)
    }

    // Return fallback
    const fallback = this.getFallbackMetadata(symbol)
    this.setCache(cacheKey, fallback, 60)
    return fallback
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`
    const cached = this.getCached<ETFComposition>(cacheKey)
    if (cached) return cached

    console.log(`📊 Fetching ETF composition for ${symbol}`)

    try {
      await this.rateLimit()
      
      // Check if we're running server-side (has access to process.env)
      if (typeof process !== 'undefined' && process.env) {
        // Server-side: Use free Yahoo Finance API
        // Try Yahoo Finance ETF holdings API directly
        const holdingsUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=topHoldings,fundProfile,summaryProfile`
        const response = await fetch(holdingsUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          const result = data.quoteSummary?.result?.[0]
          if (result) {
            const fundProfile = result.fundProfile
            const summaryProfile = result.summaryProfile

            // Process sector breakdown
            const sectorWeightings = fundProfile?.sectorWeightings || {}
            const sectors = Object.entries(sectorWeightings)
              .map(([sector, weight]) => ({
                sector: normalizeSectorName(sector),
                weight: (weight as number) * 100,
              }))
              .filter((s) => s.weight > 0 && s.sector !== 'Unknown' && s.sector !== 'unknown')

            // Process country breakdown
            const countries = []
            if (summaryProfile?.country && summaryProfile.country !== 'Unknown' && summaryProfile.country !== 'unknown') {
              countries.push({ country: normalizeCountryName(summaryProfile.country), weight: 100 })
            }

            // Process currency
            const currencies = []
            if (summaryProfile?.currency && summaryProfile.currency !== 'Unknown' && summaryProfile.currency !== 'unknown') {
              currencies.push({ currency: summaryProfile.currency.toUpperCase(), weight: 100 })
            }

            const etfComposition: ETFComposition = {
              symbol: symbol, // Always return original symbol
              currency: currencies.length > 0 ? currencies : this.processCurrencyData([]),
              country: countries.length > 0 ? countries : this.processCountryData([]),
              sector: sectors.length > 0 ? sectors : this.processSectorData([]),
              holdings: [],
              domicile: summaryProfile?.domicile || this.inferDomicile(symbol),
              withholdingTax: this.inferWithholdingTax(symbol),
              lastUpdated: new Date().toISOString(),
            }

            this.setCache(cacheKey, etfComposition, 1440) // Cache for 24 hours
            return etfComposition
          }
        }
      } else {
        // Client-side: Use Next.js API route
        const response = await fetch(`${this.baseUrl}/etf/${encodeURIComponent(symbol)}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ETF composition for ${symbol}:`, data)

          // Process the ETF data
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
      } else {
          console.error(`API route error for ${symbol}: ${response.status} - ${response.statusText}`)
        }
      }
    } catch (error) {
      console.error(`Error fetching ETF composition for ${symbol}:`, error)
    }

    // Return fallback data
    console.log(`❌ All methods failed for ${symbol}, returning fallback data`)
    const fallbackData = this.getFallbackETFComposition(symbol)
    this.setCache(cacheKey, fallbackData, 60) // Cache for 1 hour
    return fallbackData
  }

  async getETFCompositionWithSession(symbol: string, session: YahooSession): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`
    const cached = this.getCached<ETFComposition>(cacheKey)
    if (cached) return cached

    console.log(`📊 Fetching ETF composition for ${symbol} with session`)

    try {
      await this.rateLimit()
      
      // Use Next.js API route instead of direct external API calls
      const url = `/api/yahoo/etf-composition/${encodeURIComponent(symbol)}`
      
      console.log(`🔗 Making API call to: ${url}`)
      
      const response = await fetch(url)

      if (response.ok) {
        const etfComposition = await response.json()
        
        if (etfComposition && etfComposition.symbol) {
          console.log(`✅ Real ETF composition found for ${symbol} via API route:`, etfComposition)
          this.setCache(cacheKey, etfComposition, 1440) // Cache for 24 hours
          return etfComposition
        } else {
          console.warn(`⚠️ Invalid ETF composition response for ${symbol}`)
        }
      } else {
        console.warn(`⚠️ API route failed for ${symbol}: ${response.status} - ${response.statusText}`)
      }
      
    } catch (error) {
      console.error(`❌ Error fetching ETF composition for ${symbol}:`, error)
    }

    // Return fallback data
    console.log(`❌ All methods failed for ${symbol}, returning fallback data`)
    const fallbackData = this.getFallbackETFComposition(symbol)
    this.setCache(cacheKey, fallbackData, 60) // Cache for 1 hour
    return fallbackData
  }



  async searchSymbol(query: string): Promise<SearchResult[]> {
    try {
      // Use Next.js API route which has access to server-side environment variables
      const response = await fetch(`${this.baseUrl}/search/${encodeURIComponent(query)}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Search results for ${query}:`, data)
        // Handle search results structure
        return Array.isArray(data) ? data : (data ? [data] : [])
      } else {
        console.error(`API route error for search ${query}: ${response.status} - ${response.statusText}`)
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

  private resolveSymbol(originalSymbol: string): Promise<string> {
    // This method is removed as symbol resolution is now handled by the search route.
    // The original symbol is returned directly.
    return Promise.resolve(originalSymbol);
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
    // US ETFs - Common US-domiciled ETFs
    if (symbol.match(/^(VTI|VXUS|VEA|VWO|SPY|QQQ|IVV|BND|IEFA|VOOV|VB|VO|VV|VTEB|VGIT|VMOT|VCIT|VCSH)$/)) {
      return "US"
    }

    // European ETFs are typically Irish or Luxembourg
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      return "IE" // Most are Irish
    }

    // Swiss ETFs
    if (symbol.match(/^(SPICHA|SPICHACC|CHSPI)$/) || symbol.endsWith('.SW')) {
      return "CH"
    }

    return "Unknown"
  }

  private inferDomicileFromCountry(country: string, symbol: string): string {
    // First try explicit domicile inference based on symbol patterns
    const explicitDomicile = this.inferDomicile(symbol)
    if (explicitDomicile !== "Unknown") {
      return explicitDomicile
    }

    // If we have country information, use it to infer domicile
    if (country) {
      const countryToDomicile: Record<string, string> = {
        "United States": "US",
        "Ireland": "IE", 
        "Switzerland": "CH",
        "Luxembourg": "LU",
        "Germany": "DE",
        "France": "FR",
        "United Kingdom": "GB",
        "Canada": "CA",
        "Netherlands": "NL",
      }
      
      const domicile = countryToDomicile[country]
      if (domicile) {
        return domicile
      }
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
    const country = this.inferCountry(symbol)
    return {
      symbol: symbol,
      name: this.getKnownName(symbol) || symbol,
      sector: this.inferSector(symbol),
      country: country,
      currency: this.inferCurrency(symbol),
      type: this.inferAssetType(symbol),
      exchange: this.inferExchange(symbol),
      domicile: this.inferDomicileFromCountry(country, symbol),
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


