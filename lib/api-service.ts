import { API_CONFIG, rateLimiter } from "./config"
import finnhub, {DefaultApi} from 'finnhub-ts'


export interface StockPrice {
  symbol: string
  price: number
  currency: string
  change: number
  changePercent: number
  lastUpdated: string
}

export interface ETFComposition {
  symbol: string
  currency: Array<{ currency: string; weight: number }>
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
  holdings: Array<{
    symbol: string
    name: string
    weight: number
    sector: string
    country: string
  }>
  domicile: string
  withholdingTax: number
  lastUpdated: string
}

export interface AssetMetadata {
  symbol: string
  name: string
  sector: string
  country: string
  currency: string
  type: "Stock" | "ETF" | "Bond" | "Crypto"
}

// Set up API key


const finnhubClient = new DefaultApi({ apiKey: `${API_CONFIG.FINNHUB.KEY}` , isJsonMime: (input: string) => {
  try {
    JSON.parse(input);
    return true;
  } catch (error) {
    return false;
  }
}});

class APIService {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for prices, longer for metadata


  private getCachedData(key: string, maxAge: number = this.CACHE_DURATION): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const cacheKey = `price_${symbol}`
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    try {
      // Try multiple APIs in order of preference
      let price = await this.fetchFromYahooFinance(symbol)
      if (!price) {
        price = await this.fetchFromAlphaVantage(symbol)
      }
      if (!price) {
        price = await this.fetchFromFinnhub(symbol)
      }

      if (price) {
        this.setCachedData(cacheKey, price)
      }
      return price
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      return null
    }
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    const cacheKey = `etf_${symbol}`;
    const cached = this.getCachedData(cacheKey, 24 * 60 * 60 * 1000); // 24 hours
    if (cached) return cached;

    try {
      // 1. Try Yahoo Finance
      let composition = await this.fetchETFFromYahoo(symbol);

      // 2. Check if composition is unreliable (empty, missing sector, or sector is only "Mixed")
      const isUnreliable = !composition || !composition.sector || composition.sector.length === 0 ||
          (composition.sector.length === 1 && composition.sector[0].sector.toLowerCase() === 'mixed');

      if (isUnreliable) {
        // 3. Fallback to Alpha Vantage
        composition = await this.fetchETFFromAlphaVantage(symbol);
      }

      // 4. If still unreliable, fallback to Finnhub
      if (!composition || !composition.sector || composition.sector.length === 0 ||
          (composition.sector.length === 1 && composition.sector[0].sector.toLowerCase() === 'mixed')) {
        composition = await this.fetchETFFromFinnhub(symbol);
      }

      if (composition) {
        this.setCachedData(cacheKey, composition);
        return composition;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching ETF composition for ${symbol}:`, error);
      return null;
    }
  }

  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    const cacheKey = `metadata_${symbol}`
    const cached = this.getCachedData(cacheKey, 24 * 60 * 60 * 1000) // 24 hours
    if (cached) return cached

    try {
      let metadata = await this.fetchMetadataFromYahoo(symbol)
      if (!metadata) {
        metadata = await this.fetchMetadataFromAlphaVantage(symbol)
      }
      if (!metadata) {
        metadata = this.getKnownAssetMetadata(symbol)
      }

      if (metadata) {
        this.setCachedData(cacheKey, metadata)
      }
      return metadata
    } catch (error) {
      console.error(`Error fetching metadata for ${symbol}:`, error)
      return this.getKnownAssetMetadata(symbol)
    }
  }

  private async fetchFromYahooFinance(symbol: string): Promise<StockPrice | null> {
    if (!rateLimiter.canMakeRequest("yahoo", 100, 60000)) {
      console.warn("Yahoo Finance rate limit reached")
      return null
    }

    try {
      const response = await fetch(`/api/yahoo/quote/${symbol}`);
      const quote = await response.json();

      if (!quote) return null;

      return {
        symbol,
        price: quote.regularMarketPrice || quote.previousClose || 0,
        currency: quote.currency || "USD",
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        lastUpdated: new Date().toISOString(),
      };

    } catch (error) {
      console.error("Yahoo Finance API error:", error);
      return null;
    }
  }

  private async fetchFromAlphaVantage(symbol: string): Promise<StockPrice | null> {
    if (!rateLimiter.canMakeRequest("alphavantage", 5, 60000)) {
      console.warn("Alpha Vantage rate limit reached")
      return null
    }

    try {
      const response = await fetch(
        `${API_CONFIG.ALPHA_VANTAGE.BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.KEY}`,
      )

      if (!response.ok) throw new Error(`Alpha Vantage API error: ${response.status}`)

      const data = await response.json()
      const quote = data["Global Quote"]

      if (!quote) return null

      return {
        symbol,
        price: Number.parseFloat(quote["05. price"]) || 0,
        currency: "USD", // Alpha Vantage typically returns USD
        change: Number.parseFloat(quote["09. change"]) || 0,
        changePercent: Number.parseFloat(quote["10. change percent"]?.replace("%", "")) || 0,
        lastUpdated: quote["07. latest trading day"] || new Date().toISOString(),
      }
    } catch (error) {
      console.error("Alpha Vantage API error:", error)
      return null
    }
  }

  private async fetchFromFinnhub(symbol: string): Promise<StockPrice | null> {
    if (!rateLimiter.canMakeRequest("finnhub", 60, 60000)) {
      console.warn("Finnhub rate limit reached")
      return null
    }

    try {
      const response = await fetch(
        `${API_CONFIG.FINNHUB.BASE_URL}/quote?symbol=${symbol}&token=${API_CONFIG.FINNHUB.KEY}`,
      )

      if (!response.ok) throw new Error(`Finnhub API error: ${response.status}`)

      const data = await response.json()

      if (!data.c) return null

      return {
        symbol,
        price: data.c || 0,
        currency: "USD", // Finnhub typically returns USD
        change: data.d || 0,
        changePercent: data.dp || 0,
        lastUpdated: new Date(data.t * 1000).toISOString(),
      }
    } catch (error) {
      console.error("Finnhub API error:", error)
      return null
    }
  }

  private async fetchETFFromYahoo(symbol: string): Promise<ETFComposition | null> {
    try {

      const response = await fetch(`/api/yahoo/etf/${symbol}`);
      const modules = await response.json();

      if (!modules) return null;

      const topHoldings = modules.topHoldings?.holdings || [];
      const fundProfile = modules.fundProfile;
      const summaryProfile = modules.summaryProfile;

      // Extract holdings
      const holdings = topHoldings.slice(0, 10).map((holding: any) => ({
        symbol: holding.symbol || "",
        name: holding.holdingName || "",
        weight: (holding.holdingPercent || 0) * 100,
        sector: holding.sector || "Unknown",
        country: "Unknown", // Yahoo doesn't provide country data
      }));

      // Extract sector breakdown
      const sectorWeightings = fundProfile?.sectorWeightings || {};
      const sectors = Object.entries(sectorWeightings).map(([sector, weight]) => ({
        sector,
        weight: (weight as number) * 100,
      }));

      return {
        symbol,
        currency: [{ currency: "USD", weight: 100 }], // Default assumption
        country: [{ country: "Unknown", weight: 100 }],
        sector: sectors.length > 0 ? sectors : [{ sector: "Mixed", weight: 100 }],
        holdings,
        domicile: this.getDomicileFromSymbol(symbol),
        withholdingTax: this.getWithholdingTax(symbol),
        lastUpdated: new Date().toISOString(),
      };

    } catch (error) {
      console.error("Yahoo ETF API error:", error);
      return null;
    }
  }

  private async fetchETFFromAlphaVantage(symbol: string): Promise<ETFComposition | null> {
    // Alpha Vantage doesn't have ETF composition data in free tier
    return null
  }

  private async fetchETFFromFinnhub(symbol: string): Promise<ETFComposition | null> {
    if (!rateLimiter.canMakeRequest('finnhub', 60, 60000)) {
      console.warn('Finnhub rate limit reached');
      return null;
    }

    try {
      // Fetch ETF holdings using finnhub-ts
      const holdingsResponse = await finnhubClient.etfsHoldings(symbol);

      // Fetch ETF sector exposure using finnhub-ts
      const sectorResponse = await finnhubClient.etfsSectorExposure(symbol);

      // Map holdings data
      const holdings = (holdingsResponse.data?.holdings || []).map(h => ({
        symbol: h.symbol || '',
        name: h.name || '',
        weight: h.weight || 0,
        sector: h.sector || 'Unknown',
        country: h.country || 'Unknown',
      }));

      // Map sector exposure data
      const sectors = (sectorResponse.data?.sectorExposure || []).map(s => ({
        sector: s.name || 'Unknown',
        weight: s.weight || 0,
      }));

      return {
        symbol,
        currency: [{ currency: 'USD', weight: 100 }],
        country: [{ country: 'Unknown', weight: 100 }],
        sector: sectors.length > 0 ? sectors : [{ sector: 'Mixed', weight: 100 }],
        holdings,
        domicile: this.getDomicileFromSymbol(symbol),
        withholdingTax: this.getWithholdingTax(symbol),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Finnhub ETF API error:', error);
      return null;
    }
  }

  private async fetchMetadataFromYahoo(symbol: string): Promise<AssetMetadata | null> {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}`)

      if (!response.ok) return null

      const data = await response.json()
      const quote = data.quotes?.[0]

      if (!quote) return null

      return {
        symbol,
        name: quote.longname || quote.shortname || symbol,
        sector: quote.sector || "Unknown",
        country: quote.country || "Unknown",
        currency: quote.currency || "USD",
        type: this.determineAssetType(quote.quoteType),
      }
    } catch (error) {
      console.error("Yahoo metadata API error:", error)
      return null
    }
  }

  private async fetchMetadataFromAlphaVantage(symbol: string): Promise<AssetMetadata | null> {
    try {
      const response = await fetch(
        `${API_CONFIG.ALPHA_VANTAGE.BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.KEY}`,
      )

      if (!response.ok) return null

      const data = await response.json()

      if (!data.Symbol) return null

      return {
        symbol,
        name: data.Name || symbol,
        sector: data.Sector || "Unknown",
        country: data.Country || "Unknown",
        currency: data.Currency || "USD",
        type: this.determineAssetType(data.AssetType),
      }
    } catch (error) {
      console.error("Alpha Vantage metadata API error:", error)
      return null
    }
  }

  private determineAssetType(quoteType: string): "Stock" | "ETF" | "Bond" | "Crypto" {
    const type = quoteType?.toLowerCase() || ""
    if (type.includes("etf")) return "ETF"
    if (type.includes("bond")) return "Bond"
    if (type.includes("crypto") || type.includes("currency")) return "Crypto"
    return "Stock"
  }

  private getDomicileFromSymbol(symbol: string): string {
    // Known ETF domiciles
    const domiciles: Record<string, string> = {
      VWRL: "IE", // Ireland
      IS3N: "IE", // Ireland
      IEFA: "IE", // Ireland
      VTI: "US", // United States
      BND: "US", // United States
      SPICHA: "CH", // Switzerland
      VOOV: "US", // United States
    }
    return domiciles[symbol] || "Unknown"
  }

  private getWithholdingTax(symbol: string): number {
    const domicile = this.getDomicileFromSymbol(symbol)
    switch (domicile) {
      case "IE": // Ireland
      case "LU": // Luxembourg
        return 15
      case "US": // United States
        return 30
      case "CH": // Switzerland
        return 0
      default:
        return 15
    }
  }

  private getKnownETFComposition(symbol: string): ETFComposition | null {
    // Comprehensive known ETF compositions
    const compositions: Record<string, ETFComposition> = {
      VWRL: {
        symbol: "VWRL",
        currency: [
          { currency: "USD", weight: 60.2 },
          { currency: "EUR", weight: 15.1 },
          { currency: "JPY", weight: 7.8 },
          { currency: "GBP", weight: 4.2 },
          { currency: "CHF", weight: 3.1 },
          { currency: "CAD", weight: 2.8 },
          { currency: "CNY", weight: 3.9 },
          { currency: "Others", weight: 2.9 },
        ],
        country: [
          { country: "United States", weight: 60.2 },
          { country: "Japan", weight: 7.8 },
          { country: "United Kingdom", weight: 4.2 },
          { country: "China", weight: 3.9 },
          { country: "France", weight: 3.1 },
          { country: "Switzerland", weight: 3.1 },
          { country: "Canada", weight: 2.8 },
          { country: "Germany", weight: 2.5 },
          { country: "Others", weight: 12.4 },
        ],
        sector: [
          { sector: "Technology", weight: 22.1 },
          { sector: "Financials", weight: 15.8 },
          { sector: "Healthcare", weight: 12.4 },
          { sector: "Consumer Discretionary", weight: 10.9 },
          { sector: "Industrials", weight: 10.2 },
          { sector: "Consumer Staples", weight: 7.1 },
          { sector: "Energy", weight: 5.8 },
          { sector: "Materials", weight: 4.9 },
          { sector: "Communication Services", weight: 4.2 },
          { sector: "Utilities", weight: 3.8 },
          { sector: "Real Estate", weight: 2.8 },
        ],
        holdings: [
          { symbol: "AAPL", name: "Apple Inc.", weight: 4.8, sector: "Technology", country: "United States" },
          { symbol: "MSFT", name: "Microsoft Corp.", weight: 4.1, sector: "Technology", country: "United States" },
          { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.4, sector: "Technology", country: "United States" },
          {
            symbol: "AMZN",
            name: "Amazon.com Inc.",
            weight: 2.1,
            sector: "Consumer Discretionary",
            country: "United States",
          },
          { symbol: "NVDA", name: "NVIDIA Corp.", weight: 1.9, sector: "Technology", country: "United States" },
        ],
        domicile: "IE",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      },
      IS3N: {
        symbol: "IS3N",
        currency: [
          { currency: "USD", weight: 64.8 },
          { currency: "EUR", weight: 15.2 },
          { currency: "JPY", weight: 7.9 },
          { currency: "GBP", weight: 4.1 },
          { currency: "CHF", weight: 3.2 },
          { currency: "CAD", weight: 2.9 },
          { currency: "Others", weight: 1.9 },
        ],
        country: [
          { country: "United States", weight: 64.8 },
          { country: "Japan", weight: 7.9 },
          { country: "United Kingdom", weight: 4.1 },
          { country: "France", weight: 3.5 },
          { country: "Switzerland", weight: 3.2 },
          { country: "Canada", weight: 2.9 },
          { country: "Germany", weight: 2.7 },
          { country: "Others", weight: 10.9 },
        ],
        sector: [
          { sector: "Technology", weight: 23.2 },
          { sector: "Financials", weight: 15.1 },
          { sector: "Healthcare", weight: 13.2 },
          { sector: "Consumer Discretionary", weight: 10.8 },
          { sector: "Industrials", weight: 10.1 },
          { sector: "Consumer Staples", weight: 7.2 },
          { sector: "Energy", weight: 5.9 },
          { sector: "Materials", weight: 4.8 },
          { sector: "Communication Services", weight: 4.1 },
          { sector: "Utilities", weight: 3.2 },
          { sector: "Real Estate", weight: 2.4 },
        ],
        holdings: [],
        domicile: "IE",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      },
    }

    return compositions[symbol] || null
  }

  private getKnownAssetMetadata(symbol: string): AssetMetadata | null {
    const metadata: Record<string, AssetMetadata> = {
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
        name: "Microsoft Corp.",
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
      VWRL: {
        symbol: "VWRL",
        name: "Vanguard FTSE All-World",
        sector: "Mixed",
        country: "Global",
        currency: "CHF",
        type: "ETF",
      },
      IS3N: {
        symbol: "IS3N",
        name: "iShares Core MSCI World",
        sector: "Mixed",
        country: "Global",
        currency: "CHF",
        type: "ETF",
      },
      IEFA: {
        symbol: "IEFA",
        name: "iShares Core MSCI EAFE",
        sector: "Mixed",
        country: "Europe",
        currency: "CHF",
        type: "ETF",
      },
    }

    return metadata[symbol] || null
  }
}

export const apiService = new APIService()
