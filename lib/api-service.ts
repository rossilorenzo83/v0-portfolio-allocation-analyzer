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

// European ETF symbol mapping for Yahoo Finance
const EUROPEAN_ETF_MAPPING: Record<string, string[]> = {
  // Vanguard ETFs
  VWRL: ["VWRL.L", "VWRL.AS", "VWRL.DE", "VWRL.MI"], // FTSE All-World
  VWCE: ["VWCE.DE", "VWCE.L", "VWCE.AS", "VWCE.MI"], // FTSE All-World Accumulating
  VUSA: ["VUSA.L", "VUSA.AS", "VUSA.DE", "VUSA.MI"], // S&P 500
  VUSD: ["VUSD.L", "VUSD.AS", "VUSD.DE", "VUSD.MI"], // S&P 500 Accumulating
  VEUR: ["VEUR.L", "VEUR.AS", "VEUR.DE", "VEUR.MI"], // FTSE Developed Europe
  VJPN: ["VJPN.L", "VJPN.AS", "VJPN.DE", "VJPN.MI"], // FTSE Japan
  VFEM: ["VFEM.L", "VFEM.AS", "VFEM.DE", "VFEM.MI"], // FTSE Emerging Markets

  // iShares ETFs
  IS3N: ["IS3N.SW", "IS3N.DE", "IS3N.L", "IS3N.AS"], // Core MSCI World
  IWDA: ["IWDA.L", "IWDA.AS", "IWDA.DE", "IWDA.MI"], // Core MSCI World
  IUSA: ["IUSA.L", "IUSA.AS", "IUSA.DE", "IUSA.MI"], // Core S&P 500
  IEUR: ["IEUR.L", "IEUR.AS", "IEUR.DE", "IEUR.MI"], // Core MSCI Europe
  IJPN: ["IJPN.L", "IJPN.AS", "IJPN.DE", "IJPN.MI"], // Core MSCI Japan
  IEMM: ["IEMM.L", "IEMM.AS", "IEMM.DE", "IEMM.MI"], // Core MSCI Emerging Markets
  EUNL: ["EUNL.DE", "EUNL.L", "EUNL.AS", "EUNL.MI"], // Core MSCI Europe

  // SPDR ETFs
  SPYY: ["SPYY.L", "SPYY.AS", "SPYY.DE", "SPYY.MI"], // S&P 500
  SPXP: ["SPXP.L", "SPXP.AS", "SPXP.DE", "SPXP.MI"], // S&P 500 Accumulating

  // Xtrackers ETFs
  XMWO: ["XMWO.DE", "XMWO.L", "XMWO.AS", "XMWO.MI"], // MSCI World
  XMEU: ["XMEU.DE", "XMEU.L", "XMEU.AS", "XMEU.MI"], // MSCI Europe
  XMUS: ["XMUS.DE", "XMUS.L", "XMUS.AS", "XMUS.MI"], // MSCI USA
}

// Swiss stock symbol mapping
const SWISS_STOCK_MAPPING: Record<string, string> = {
  NESN: "NESN.SW", // Nestlé
  NOVN: "NOVN.SW", // Novartis
  ROG: "ROG.SW", // Roche
  UHR: "UHR.SW", // Swatch Group
  ABBN: "ABBN.SW", // ABB
  UBSG: "UBSG.SW", // UBS
  CS: "CSGN.SW", // Credit Suisse (historical)
  CSGN: "CSGN.SW", // Credit Suisse
  ZURN: "ZURN.SW", // Zurich Insurance
  SLHN: "SLHN.SW", // Swiss Life
  LONN: "LONN.SW", // Lonza
  GIVN: "GIVN.SW", // Givaudan
  SCMN: "SCMN.SW", // Swisscom
  BAER: "BAER.SW", // Julius Baer
  CFR: "CFR.SW", // Compagnie Financière Richemont
}

// Fallback ETF composition data for when APIs fail
const FALLBACK_ETF_DATA: Record<string, Partial<ETFComposition>> = {
  VWRL: {
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
      { sector: "Financials", weight: 15 },
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
    domicile: "IE",
    withholdingTax: 15,
  },
  VWCE: {
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
      { sector: "Financials", weight: 15 },
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
    domicile: "IE",
    withholdingTax: 15,
  },
  IS3N: {
    currency: [
      { currency: "USD", weight: 70 },
      { currency: "EUR", weight: 12 },
      { currency: "JPY", weight: 8 },
      { currency: "GBP", weight: 4 },
      { currency: "Other", weight: 6 },
    ],
    country: [
      { country: "United States", weight: 70 },
      { country: "Japan", weight: 8 },
      { country: "United Kingdom", weight: 4 },
      { country: "Canada", weight: 3 },
      { country: "France", weight: 3 },
      { country: "Germany", weight: 3 },
      { country: "Other", weight: 9 },
    ],
    sector: [
      { sector: "Technology", weight: 28 },
      { sector: "Financials", weight: 13 },
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
    domicile: "IE",
    withholdingTax: 15,
  },
  IWDA: {
    currency: [
      { currency: "USD", weight: 70 },
      { currency: "EUR", weight: 12 },
      { currency: "JPY", weight: 8 },
      { currency: "GBP", weight: 4 },
      { currency: "Other", weight: 6 },
    ],
    country: [
      { country: "United States", weight: 70 },
      { country: "Japan", weight: 8 },
      { country: "United Kingdom", weight: 4 },
      { country: "Canada", weight: 3 },
      { country: "France", weight: 3 },
      { country: "Germany", weight: 3 },
      { country: "Other", weight: 9 },
    ],
    sector: [
      { sector: "Technology", weight: 28 },
      { sector: "Financials", weight: 13 },
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
    domicile: "IE",
    withholdingTax: 15,
  },
}

class APIService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 200 // 200ms between requests
  private baseUrl = "/api/yahoo"

  private baseURL = "/api/yahoo"

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    console.log(`Fetching price for ${symbol}...`)

    // Try multiple symbol variations for European ETFs and Swiss stocks
    const symbolVariations = this.getSymbolVariations(symbol)

    for (const symbolVariation of symbolVariations) {
      try {
        console.log(`Trying symbol variation: ${symbolVariation}`)

        const response = await fetch(`${this.baseURL}/quote/${symbolVariation}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Successfully fetched price for ${symbolVariation}:`, data)
          return {
            symbol: symbol, // Return original symbol
            price: data.price || data.regularMarketPrice || 0,
            currency: data.currency || this.inferCurrency(symbolVariation),
            change: data.change || data.regularMarketChange || 0,
            changePercent: data.changePercent || data.regularMarketChangePercent || 0,
            lastUpdated: new Date().toISOString(),
          }
        }
      } catch (error) {
        console.log(`Failed to fetch ${symbolVariation}:`, error)
        continue
      }
    }

    console.log(`❌ All symbol variations failed for ${symbol}, using fallback`)
    return this.getFallbackPrice(symbol)
  }

  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    console.log(`Fetching metadata for ${symbol}...`)

    const symbolVariations = this.getSymbolVariations(symbol)

    for (const symbolVariation of symbolVariations) {
      try {
        const response = await fetch(`${this.baseURL}/search/${symbolVariation}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Successfully fetched metadata for ${symbolVariation}:`, data)
          return {
            symbol: symbol, // Return original symbol
            name: data.name || data.longName || symbol,
            sector: data.sector || this.inferSector(symbol),
            country: data.country || this.inferCountry(symbolVariation),
            currency: data.currency || this.inferCurrency(symbolVariation),
            type: data.type || this.inferAssetType(symbol),
          }
        }
      } catch (error) {
        console.log(`Failed to fetch metadata for ${symbolVariation}:`, error)
        continue
      }
    }

    console.log(`❌ All metadata requests failed for ${symbol}, using fallback`)
    return this.getFallbackMetadata(symbol)
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    console.log(`Fetching ETF composition for ${symbol}...`)

    // Check if we have fallback data first
    if (FALLBACK_ETF_DATA[symbol]) {
      console.log(`Using fallback ETF data for ${symbol}`)
      const fallbackData = FALLBACK_ETF_DATA[symbol]
      return {
        symbol: symbol,
        currency: fallbackData.currency || [],
        country: fallbackData.country || [],
        sector: fallbackData.sector || [],
        holdings: [],
        domicile: fallbackData.domicile || "Unknown",
        withholdingTax: fallbackData.withholdingTax || 15,
        lastUpdated: new Date().toISOString(),
      }
    }

    const symbolVariations = this.getSymbolVariations(symbol)

    for (const symbolVariation of symbolVariations) {
      try {
        const response = await fetch(`${this.baseURL}/etf/${symbolVariation}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Successfully fetched ETF composition for ${symbolVariation}:`, data)
          return {
            symbol: symbol, // Return original symbol
            currency: data.currency || [],
            country: data.country || [],
            sector: data.sector || [],
            holdings: data.holdings || [],
            domicile: data.domicile || this.inferDomicile(symbol),
            withholdingTax: data.withholdingTax || this.inferWithholdingTax(symbol),
            lastUpdated: new Date().toISOString(),
          }
        }
      } catch (error) {
        console.log(`Failed to fetch ETF composition for ${symbolVariation}:`, error)
        continue
      }
    }

    console.log(`❌ All ETF composition requests failed for ${symbol}, using generic fallback`)
    return this.getFallbackETFComposition(symbol)
  }

  private getSymbolVariations(symbol: string): string[] {
    const variations = [symbol] // Start with original symbol

    // Add European ETF variations
    if (EUROPEAN_ETF_MAPPING[symbol]) {
      variations.push(...EUROPEAN_ETF_MAPPING[symbol])
    }

    // Add Swiss stock variations
    if (SWISS_STOCK_MAPPING[symbol]) {
      variations.push(SWISS_STOCK_MAPPING[symbol])
    }

    // Auto-detect European symbols and add exchange suffixes
    if (this.isEuropeanSymbol(symbol)) {
      const exchanges = [".L", ".DE", ".AS", ".MI", ".PA", ".SW"]
      exchanges.forEach((exchange) => {
        if (!symbol.includes(".")) {
          variations.push(`${symbol}${exchange}`)
        }
      })
    }

    // Remove duplicates and return
    return [...new Set(variations)]
  }

  private isEuropeanSymbol(symbol: string): boolean {
    // Common European ETF patterns
    const europeanPatterns = [
      /^V[A-Z]{3}$/, // Vanguard ETFs (VWRL, VWCE, etc.)
      /^I[A-Z]{3}$/, // iShares ETFs (IWDA, IUSA, etc.)
      /^IS[0-9][A-Z]$/, // iShares numbered ETFs (IS3N, etc.)
      /^X[A-Z]{3}$/, // Xtrackers ETFs
      /^SP[A-Z]{2}$/, // SPDR ETFs
    ]

    return (
      europeanPatterns.some((pattern) => pattern.test(symbol)) || Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)
    )
  }

  private inferCurrency(symbol: string): string {
    if (symbol.endsWith(".L")) return "GBP" // London
    if (symbol.endsWith(".DE")) return "EUR" // Germany
    if (symbol.endsWith(".AS")) return "EUR" // Amsterdam
    if (symbol.endsWith(".MI")) return "EUR" // Milan
    if (symbol.endsWith(".PA")) return "EUR" // Paris
    if (symbol.endsWith(".SW")) return "CHF" // Switzerland
    return "USD" // Default
  }

  private inferCountry(symbol: string): string {
    if (symbol.endsWith(".L")) return "United Kingdom"
    if (symbol.endsWith(".DE")) return "Germany"
    if (symbol.endsWith(".AS")) return "Netherlands"
    if (symbol.endsWith(".MI")) return "Italy"
    if (symbol.endsWith(".PA")) return "France"
    if (symbol.endsWith(".SW")) return "Switzerland"
    return "United States" // Default
  }

  private inferSector(symbol: string): string {
    // ETFs are typically diversified
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol) || Object.keys(FALLBACK_ETF_DATA).includes(symbol)) {
      return "Diversified"
    }
    return "Unknown"
  }

  private inferAssetType(symbol: string): string {
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol) || Object.keys(FALLBACK_ETF_DATA).includes(symbol)) {
      return "ETF"
    }
    return "Stock"
  }

  private inferDomicile(symbol: string): string {
    // Most European ETFs are domiciled in Ireland or Luxembourg for tax efficiency
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      return "IE" // Ireland is most common
    }
    return "Unknown"
  }

  private inferWithholdingTax(symbol: string): number {
    // Irish and Luxembourg ETFs typically have 15% withholding tax
    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      return 15
    }
    return 30 // US default
  }

  private getFallbackPrice(symbol: string): StockPrice {
    // Provide realistic fallback prices based on asset type
    let price = 100 // Default price
    let currency = "USD"

    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      // European ETFs typically trade in 50-100 range
      price = 75 + Math.random() * 50
      currency = "EUR"
    } else if (Object.keys(SWISS_STOCK_MAPPING).includes(symbol)) {
      // Swiss stocks can be quite expensive
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
    let name = symbol
    let sector = "Unknown"
    let country = "Unknown"
    let currency = "USD"
    let type = "Stock"

    if (Object.keys(EUROPEAN_ETF_MAPPING).includes(symbol)) {
      name = this.getETFName(symbol)
      sector = "Diversified"
      country = "Ireland"
      currency = "EUR"
      type = "ETF"
    } else if (Object.keys(SWISS_STOCK_MAPPING).includes(symbol)) {
      name = this.getSwissStockName(symbol)
      country = "Switzerland"
      currency = "CHF"
      sector = this.getSwissStockSector(symbol)
    }

    return {
      symbol: symbol,
      name: name,
      sector: sector,
      country: country,
      currency: currency,
      type: type,
    }
  }

  private getFallbackETFComposition(symbol: string): ETFComposition {
    // Generic diversified portfolio allocation
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
        { sector: "Financials", weight: 15 },
        { sector: "Healthcare", weight: 12 },
        { sector: "Consumer Discretionary", weight: 10 },
        { sector: "Industrials", weight: 10 },
        { sector: "Other", weight: 28 },
      ],
      holdings: [],
      domicile: "IE",
      withholdingTax: 15,
      lastUpdated: new Date().toISOString(),
    }
  }

  private getETFName(symbol: string): string {
    const names: Record<string, string> = {
      VWRL: "Vanguard FTSE All-World UCITS ETF",
      VWCE: "Vanguard FTSE All-World UCITS ETF (Acc)",
      IS3N: "iShares Core MSCI World UCITS ETF",
      IWDA: "iShares Core MSCI World UCITS ETF",
      EUNL: "iShares Core MSCI Europe UCITS ETF",
    }
    return names[symbol] || `${symbol} ETF`
  }

  private getSwissStockName(symbol: string): string {
    const names: Record<string, string> = {
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
    return names[symbol] || `${symbol} AG`
  }

  private getSwissStockSector(symbol: string): string {
    const sectors: Record<string, string> = {
      NESN: "Consumer Staples",
      NOVN: "Healthcare",
      ROG: "Healthcare",
      UHR: "Consumer Discretionary",
      ABBN: "Industrials",
      UBSG: "Financials",
      CSGN: "Financials",
      ZURN: "Financials",
      SLHN: "Financials",
      LONN: "Healthcare",
      GIVN: "Materials",
      SCMN: "Communication Services",
      BAER: "Financials",
      CFR: "Consumer Discretionary",
    }
    return sectors[symbol] || "Unknown"
  }
}

export const apiService = new APIService()
