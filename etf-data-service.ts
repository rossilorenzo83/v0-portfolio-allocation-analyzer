// Real ETF composition data service

import { apiService } from "./lib/api-service"

// Interface for the position object passed to resolveSymbolAndFetchData
interface Position {
  symbol: string
  name: string
  currency: string
  exchange: string
  averagePrice: number
  category: string
}

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

export interface EtfComposition {
  sectors: { [key: string]: number }
  countries: { [key: string]: number }
  currencies: { [key: string]: number }
}

export interface EtfData {
  symbol: string
  name: string
  currency: string
  exchange: string
  domicile: string // ISO 3166-1 alpha-2 country code (e.g., 'US', 'IE', 'CH')
  composition: EtfComposition
}

export interface QuoteData {
  price: number
  currency: string
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
  currency: string
}

interface AssetMetadata {
  symbol: string
  name: string
  sector: string
  country: string
  currency: string
  type: string
}

// Simple in-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const etfDataCache = new Map<string, { data: EtfData; timestamp: number }>()
const quoteDataCache = new Map<string, { data: QuoteData; timestamp: number }>()
const searchCache = new Map<string, { data: SearchResult[]; timestamp: number }>()

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours for ETF data
const QUOTE_CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes for quotes
const SEARCH_CACHE_DURATION_MS = 1 * 60 * 60 * 1000 // 1 hour for search results

const API_DELAY_MS = 200 // Delay between API calls to prevent rate limiting

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
  async getStockPrice(symbol: string): Promise<QuoteData | null> {
    await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS)) // Delay to prevent rate limiting
    return this.fetchWithCache(`price-${symbol}`, () => apiService.getStockPrice(symbol), QUOTE_CACHE_DURATION_MS) // Cache for 5 minutes
  }

  /**
   * Fetches asset metadata (name, sector, country, etc.) for a given symbol.
   * Implements smart symbol resolution for European ETFs.
   */
  async getAssetMetadata(symbol: string): Promise<AssetMetadata | null> {
    await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS)) // Delay
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
    await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS)) // Delay
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
          { country: "United States", weight: 60 },
          { country: "Switzerland", weight: 15 },
          { country: "Japan", weight: 10 },
          { country: "Other", weight: 15 },
        ],
        sector: [
          { sector: "Technology", weight: 40 },
          { sector: "Financials", weight: 20 },
          { sector: "Healthcare", weight: 15 },
          { sector: "Consumer Discretionary", weight: 12 },
          { sector: "Other", weight: 13 },
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

const FALLBACK_ETF_DATA: { [symbol: string]: EtfData } = {
  "VUSA.L": {
    symbol: "VUSA.L",
    name: "Vanguard S&P 500 UCITS ETF",
    currency: "USD",
    exchange: "LSE",
    domicile: "IE",
    composition: {
      sectors: { "Information Technology": 0.28, Financials: 0.13, "Health Care": 0.12, Other: 0.47 },
      countries: { "United States": 1.0 },
      currencies: { USD: 1.0 },
    },
  },
  "VWRL.L": {
    symbol: "VWRL.L",
    name: "Vanguard FTSE All-World UCITS ETF",
    currency: "USD",
    exchange: "LSE",
    domicile: "IE",
    composition: {
      sectors: { "Technology": 0.4, "Financials": 0.2, "Healthcare": 0.15, "Consumer Discretionary": 0.12, Other: 0.13 },
      countries: { "United States": 0.6, "Switzerland": 0.15, "Japan": 0.1, Other: 0.15 },
      currencies: { USD: 0.65, EUR: 0.15, JPY: 0.07, Other: 0.13 },
    },
  },
  "VWRL": {
    symbol: "VWRL",
    name: "Vanguard FTSE All-World UCITS ETF",
    currency: "USD",
    exchange: "LSE",
    domicile: "IE",
    composition: {
      sectors: { "Technology": 0.4, "Financials": 0.2, "Healthcare": 0.15, "Consumer Discretionary": 0.12, Other: 0.13 },
      countries: { "United States": 0.6, "Switzerland": 0.15, "Japan": 0.1, Other: 0.15 },
      currencies: { USD: 0.65, EUR: 0.15, JPY: 0.07, Other: 0.13 },
    },
  },
  SMH: {
    symbol: "SMH",
    name: "VanEck Semiconductor ETF",
    currency: "USD",
    exchange: "NASDAQ",
    domicile: "US",
    composition: {
      sectors: { "Information Technology": 1.0 },
      countries: { "United States": 0.8, Taiwan: 0.15, Netherlands: 0.05 },
      currencies: { USD: 0.8, TWD: 0.15, EUR: 0.05 },
    },
  },
  // Add more common ETFs as needed
}

const FALLBACK_QUOTE_DATA: { [symbol: string]: QuoteData } = {
  "VUSA.L": { price: 72.5, currency: "USD" },
  "VWRL.L": { price: 105.2, currency: "USD" },
  "VWRL": { price: 105.2, currency: "USD" },
  SMH: { price: 260.15, currency: "USD" },
  // Add more common ETF quotes as needed
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper to fetch from internal API routes
async function fetchFromApi<T>(
  path: string,
  cacheMap: Map<string, { data: T; timestamp: number }>,
  cacheDuration: number,
): Promise<T | null> {
  const cached = cacheMap.get(path)
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    console.log(`Cache hit for ${path}`)
    return cached.data
  }

  console.log(`Cache miss for ${path}, fetching from API...`)
  try {
    await delay(API_DELAY_MS) // Introduce delay
    const response = await fetch(`/api/yahoo/${path}`)
    if (!response.ok) {
      if (response.status === 401) {
        console.error(`API Key Unauthorized for ${path}`)
        // Optionally, clear cache for this item if 401 indicates invalid data
        cacheMap.delete(path)
        return null
      }
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`)
    }
    const data: T = await response.json()
    cacheMap.set(path, { data, timestamp: Date.now() })
    return data
  } catch (error) {
    console.error(`Error fetching ${path}:`, error)
    return null
  }
}

export async function getEtfData(symbol: string): Promise<EtfData | null> {
  const data = await fetchFromApi<EtfData>(`etf/${symbol}`, etfDataCache, CACHE_DURATION_MS)
  if (data) {
    // Ensure composition fields are present, even if empty
    data.composition = data.composition || { sectors: {}, countries: {}, currencies: {} }
    data.composition.sectors = data.composition.sectors || {}
    data.composition.countries = data.composition.countries || {}
    data.composition.currencies = data.composition.currencies || {}
  }
  return data
}

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  return fetchFromApi<QuoteData>(`quote/${symbol}`, quoteDataCache, QUOTE_CACHE_DURATION_MS)
}

export async function searchSymbol(query: string): Promise<SearchResult[]> {
  const results = await fetchFromApi<SearchResult[]>(`search/${query}`, searchCache, SEARCH_CACHE_DURATION_MS)
  return results || []
}

export async function getEtfDataWithFallback(symbol: string): Promise<EtfData | null> {
  let data = await getEtfData(symbol)
  if (!data || (data.composition && Object.keys(data.composition.countries).length === 0)) {
    console.warn(`No ETF data or empty composition found for ${symbol} from API. Using fallback.`)
    data = FALLBACK_ETF_DATA[symbol.toUpperCase()]
  }
  return data
}

export async function getQuoteWithFallback(symbol: string): Promise<QuoteData | null> {
  let quote = await getQuote(symbol)
  if (!quote) {
    console.warn(`No quote data found for ${symbol} from API. Using fallback.`)
    quote = FALLBACK_QUOTE_DATA[symbol.toUpperCase()]
  }
  return quote
}

export async function resolveSymbolAndFetchData(
  position: Position,
): Promise<{ etfData: EtfData | null; quoteData: QuoteData | null }> {
  let etfData: EtfData | null = null
  let quoteData: QuoteData | null = null

  // Use the sophisticated symbol resolution from apiService for European ETFs
  console.log(`🔍 Resolving symbol for ${position.symbol} using apiService...`)
  
  try {
    // Use apiService to resolve the symbol (this handles European ETF mapping)
    const resolvedSymbol = await apiService.resolveSymbol(position.symbol)
    console.log(`✅ Symbol resolved: ${position.symbol} -> ${resolvedSymbol}`)
    
    // Try fetching with the resolved symbol
    etfData = await getEtfDataWithFallback(resolvedSymbol)
    quoteData = await getQuoteWithFallback(resolvedSymbol)
    
    if (etfData && quoteData) {
      console.log(`Direct fetch successful for ${position.symbol} (resolved to ${resolvedSymbol})`)
      return { etfData, quoteData }
    }
  } catch (error) {
    console.warn(`Symbol resolution failed for ${position.symbol}:`, error)
  }

  // Fallback: Try fetching directly with the provided symbol
  console.log(`Falling back to direct fetch for ${position.symbol}...`)
  etfData = await getEtfDataWithFallback(position.symbol)
  quoteData = await getQuoteWithFallback(position.symbol)

  if (etfData && quoteData) {
    console.log(`Direct fetch successful for ${position.symbol}`)
    return { etfData, quoteData }
  }

  // If direct fetch fails, try searching for the symbol
  console.log(`Direct fetch failed for ${position.symbol}. Attempting search...`)
  const searchResults = await searchSymbol(position.symbol)

  if (searchResults && Array.isArray(searchResults)) {
    for (const result of searchResults) {
      // Prioritize results matching currency or exchange if available in position
      if (position.currency && result.currency !== position.currency) {
        continue
      }
      if (position.exchange && result.exchange && result.exchange.toLowerCase() !== position.exchange.toLowerCase()) {
        continue
      }

      etfData = await getEtfDataWithFallback(result.symbol)
      quoteData = await getQuoteWithFallback(result.symbol)

      if (etfData && quoteData) {
        console.log(`Search and fetch successful for ${position.symbol} (resolved to ${result.symbol})`)
        return { etfData, quoteData }
      }
    }
  }

  console.warn(`Could not resolve and fetch data for ${position.symbol} after search. Using minimal fallback.`)
  // If all attempts fail, provide minimal fallback data based on the original position
  return {
    etfData: {
      symbol: position.symbol,
      name: position.name || position.symbol,
      currency: position.currency,
      exchange: position.exchange || "UNKNOWN",
      domicile: "UNKNOWN", // Default to unknown if not found
      composition: {
        sectors: { Unknown: 1.0 },
        countries: { Unknown: 1.0 },
        currencies: { [position.currency]: 1.0 },
      },
    },
    quoteData: {
      price: position.averagePrice, // Use average price as a last resort for current price
      currency: position.currency,
    },
  }
}

export const etfDataService = new ETFDataService()
