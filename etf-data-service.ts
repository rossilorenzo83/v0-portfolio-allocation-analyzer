// Real ETF composition data service

import { apiService } from "./lib/api-service"

export interface ETFHolding {
  symbol: string
  name: string
  weight: number
}

interface ETFComposition {
  symbol: string
  currency: { currency: string; weight: number }[]
  country: { country: string; weight: number }[]
  sector: { sector: string; weight: number }[]
  holdings: { symbol: string; name: string; weight: number }[]
  domicile: string
  withholdingTax: number
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

interface StockPrice {
  symbol: string
  price: number
  currency: string
  change: number
  changePercent: number
  lastUpdated: string
}

// Simple in-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

class ETFDataService {
  private async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheDuration: number = CACHE_DURATION_MS,
  ): Promise<T | null> {
    const cached = apiCache.get(key)
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      console.log(`Cache hit for ${key}`)
      return cached.data as T
    }

    console.log(`Cache miss for ${key}, fetching...`)
    try {
      const data = await fetcher()
      if (data) {
        apiCache.set(key, { data, timestamp: Date.now() })
      }
      return data
    } catch (error) {
      console.error(`Error fetching ${key}:`, error)
      return null
    }
  }

  /**
   * Fetches real-time stock price for a given symbol.
   * Implements a 200ms delay to avoid rate limiting.
   */
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    await new Promise((resolve) => setTimeout(resolve, 200)) // Delay to prevent rate limiting
    return this.fetchWithCache(`price-${symbol}`, () => apiService.getStockPrice(symbol), 5 * 60 * 1000) // Cache for 5 minutes
  }

  /**
   * Fetches asset metadata (name, sector, country, etc.) for a given symbol.
   * Implements smart symbol resolution for European ETFs.
   */
  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    await new Promise((resolve) => setTimeout(resolve, 200)) // Delay
    const cacheKey = `metadata-${symbol}`
    return this.fetchWithCache(cacheKey, async () => {
      // Try original symbol first
      let metadata = await apiService.getAssetMetadata(symbol)
      if (metadata) return metadata

      // If not found, try common European suffixes
      const europeanSuffixes = [".SW", ".L", ".DE", ".AS", ".PA", ".MI", ".VX"]
      for (const suffix of europeanSuffixes) {
        metadata = await apiService.getAssetMetadata(`${symbol}${suffix}`)
        if (metadata) {
          console.log(`Resolved ${symbol} to ${symbol}${suffix}`)
          return metadata
        }
      }
      console.warn(`Could not resolve metadata for symbol: ${symbol}`)
      return null
    })
  }

  /**
   * Fetches ETF composition (currency, country, sector breakdown) for a given ETF symbol.
   * Accepts freetext values from API scraping and processes them dynamically.
   * Provides realistic fallback compositions for common ETFs.
   */
  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    await new Promise((resolve) => setTimeout(resolve, 200)) // Delay
    const cacheKey = `etf-composition-${symbol}`
    return this.fetchWithCache(cacheKey, async () => {
      const composition = await apiService.getETFComposition(symbol)

      if (composition) {
        // Process freetext values if necessary (e.g., normalize country names)
        composition.country = composition.country.map((item) => ({
          country: this.normalizeCountryName(item.country),
          weight: item.weight,
        }))
        composition.sector = composition.sector.map((item) => ({
          sector: this.normalizeSectorName(item.sector),
          weight: item.weight,
        }))
        composition.currency = composition.currency.map((item) => ({
          currency: item.currency.toUpperCase(), // Ensure currency codes are uppercase
          weight: item.weight,
        }))
        return composition
      }

      // Fallback for common ETFs if API fails or returns empty
      const fallbackData = this.getFallbackETFComposition(symbol)
      if (fallbackData) {
        console.warn(`Using fallback ETF composition for ${symbol}`)
        return fallbackData
      }

      console.warn(`No ETF composition found for: ${symbol}`)
      return null
    })
  }

  private normalizeCountryName(country: string): string {
    const countryMap: { [key: string]: string } = {
      "united states": "United States",
      usa: "United States",
      us: "United States",
      ireland: "Ireland",
      ie: "Ireland",
      luxembourg: "Luxembourg",
      lu: "Luxembourg",
      switzerland: "Switzerland",
      ch: "Switzerland",
      germany: "Germany",
      de: "Germany",
      france: "France",
      fr: "France",
      japan: "Japan",
      jp: "Japan",
      "united kingdom": "United Kingdom",
      uk: "United Kingdom",
      gb: "United Kingdom",
      canada: "Canada",
      ca: "Canada",
      australia: "Australia",
      au: "Australia",
      china: "China",
      cn: "China",
      india: "India",
      in: "India",
      brazil: "Brazil",
      br: "Brazil",
    }
    return countryMap[country.toLowerCase()] || country
  }

  private normalizeSectorName(sector: string): string {
    const sectorMap: { [key: string]: string } = {
      "information technology": "Technology",
      it: "Technology",
      financials: "Financial Services",
      finance: "Financial Services",
      "health care": "Healthcare",
      "consumer discretionary": "Consumer Discretionary",
      "consumer staples": "Consumer Staples",
      industrials: "Industrials",
      "communication services": "Communication Services",
      utilities: "Utilities",
      energy: "Energy",
      materials: "Materials",
      "real estate": "Real Estate",
    }
    return sectorMap[sector.toLowerCase()] || sector
  }

  private getFallbackETFComposition(symbol: string): ETFComposition | null {
    const lowerSymbol = symbol.toLowerCase()
    if (lowerSymbol.includes("vwrl")) {
      return {
        symbol: "VWRL",
        currency: [
          { currency: "USD", weight: 60 },
          { currency: "EUR", weight: 20 },
          { currency: "JPY", weight: 10 },
          { currency: "GBP", weight: 10 },
        ],
        country: [
          { country: "United States", weight: 55 },
          { country: "Japan", weight: 10 },
          { country: "United Kingdom", weight: 8 },
          { country: "Switzerland", weight: 5 },
          { country: "Other", weight: 22 },
        ],
        sector: [
          { sector: "Technology", weight: 25 },
          { sector: "Financial Services", weight: 15 },
          { sector: "Healthcare", weight: 12 },
          { sector: "Consumer Discretionary", weight: 10 },
          { sector: "Industrials", weight: 8 },
          { sector: "Other", weight: 30 },
        ],
        holdings: [],
        domicile: "IE",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      }
    }
    if (lowerSymbol.includes("vti")) {
      return {
        symbol: "VTI",
        currency: [{ currency: "USD", weight: 100 }],
        country: [{ country: "United States", weight: 100 }],
        sector: [
          { sector: "Technology", weight: 28 },
          { sector: "Financial Services", weight: 13 },
          { sector: "Healthcare", weight: 14 },
          { sector: "Consumer Discretionary", weight: 12 },
          { sector: "Industrials", weight: 10 },
          { sector: "Other", weight: 23 },
        ],
        holdings: [],
        domicile: "US",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      }
    }
    // Add more common ETF fallbacks here
    return null
  }
}

export const etfDataService = new ETFDataService()
