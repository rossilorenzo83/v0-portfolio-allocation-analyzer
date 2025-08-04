// Real ETF composition data service

import { yahooFinanceService } from "@/lib/yahoo-finance-service"
import { apiService } from "@/lib/api-service"
import { shareMetadataService } from "@/lib/share-metadata-service"

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
      // Get a valid session from the sophisticated service
      const session = await yahooFinanceService.getCurrentSession()
      
      if (session) {
        // Use the new method with session
        const composition = await apiService.getETFCompositionWithSession(symbol, session)
        
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
      } else {
        console.warn(`No session available for ${symbol}, falling back to old method`)
        // Fallback to old method if no session
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
  "VWRL.SW": {
    symbol: "VWRL.SW",
    name: "Vanguard FTSE All-World UCITS ETF",
    currency: "USD",
    exchange: "EBS",
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
  "SPICHA.SW": {
    symbol: "SPICHA.SW",
    name: "UBS Core SPI ETF CHF dis",
    currency: "CHF",
    exchange: "EBS",
    domicile: "CH",
    composition: {
      sectors: { "Financials": 0.25, "Healthcare": 0.2, "Consumer Staples": 0.15, "Industrials": 0.12, "Technology": 0.1, Other: 0.18 },
      countries: { "Switzerland": 1.0 },
      currencies: { CHF: 1.0 },
    },
  },
  "SPICHA": {
    symbol: "SPICHA",
    name: "UBS Core SPI ETF CHF dis",
    currency: "CHF",
    exchange: "EBS",
    domicile: "CH",
    composition: {
      sectors: { "Financials": 0.25, "Healthcare": 0.2, "Consumer Staples": 0.15, "Industrials": 0.12, "Technology": 0.1, Other: 0.18 },
      countries: { "Switzerland": 1.0 },
      currencies: { CHF: 1.0 },
    },
  },
  "VOOV.SW": {
    symbol: "VOOV.SW",
    name: "Vanguard S&P 500 UCITS ETF",
    currency: "USD",
    exchange: "EBS",
    domicile: "IE",
    composition: {
      sectors: { "Information Technology": 0.28, Financials: 0.13, "Health Care": 0.12, Other: 0.47 },
      countries: { "United States": 1.0 },
      currencies: { USD: 1.0 },
    },
  },
  "VOOV": {
    symbol: "VOOV",
    name: "Vanguard S&P 500 UCITS ETF",
    currency: "USD",
    exchange: "EBS",
    domicile: "IE",
    composition: {
      sectors: { "Information Technology": 0.28, Financials: 0.13, "Health Care": 0.12, Other: 0.47 },
      countries: { "United States": 1.0 },
      currencies: { USD: 1.0 },
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
  "VWRL.SW": { price: 105.2, currency: "USD" },
  "VWRL": { price: 105.2, currency: "USD" },
  "SPICHA.SW": { price: 125.8, currency: "CHF" },
  "SPICHA": { price: 125.8, currency: "CHF" },
  "VOOV.SW": { price: 72.5, currency: "USD" },
  "VOOV": { price: 72.5, currency: "USD" },
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
  const data = await fetchFromApi<EtfData>(`etf-composition/${symbol}`, etfDataCache, CACHE_DURATION_MS)
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
  const result = await fetchFromApi<any>(`search/${query}`, searchCache, SEARCH_CACHE_DURATION_MS)
  
  if (result) {
    // The search route returns a single object, convert it to SearchResult format
    const searchResult: SearchResult = {
      symbol: result.symbol,
      name: result.name,
      exchange: result.exchange,
      currency: result.currency
    }
    return [searchResult]
  }
  
  return []
}

export async function getEtfDataWithFallback(symbol: string): Promise<EtfData | null> {
  console.log(`🔍 Fetching ETF data with fallback for ${symbol}`)
  
  // Step 1: Try API first (now using the consolidated etf-composition route)
  let data = await getEtfData(symbol)
  console.log(`📊 Raw API data for ${symbol}:`, JSON.stringify(data, null, 2))
  
  // Check if we got real data (not fallback) by looking for rich composition data
  if (data && data.composition) {
    console.log(`📋 Composition data for ${symbol}:`, JSON.stringify(data.composition, null, 2))
    
    const hasRealData = data.composition.sectors && 
                       Object.keys(data.composition.sectors).length > 0 &&
                       Object.values(data.composition.sectors).some((weight: any) => weight > 0 && weight < 100)
    
    console.log(`🔍 Real data check for ${symbol}:`, {
      hasSectors: !!data.composition.sectors,
      sectorKeys: data.composition.sectors ? Object.keys(data.composition.sectors) : [],
      sectorValues: data.composition.sectors ? Object.values(data.composition.sectors) : [],
      hasRealData
    })
    
    if (hasRealData) {
      console.log(`✅ Real API data found for ${symbol}`)
      return data
    } else {
      console.log(`🔄 API returned fallback data for ${symbol}, will try other sources`)
    }
  }

  // Step 2: Try static fallback data for the current symbol
  console.log(`🔄 API failed for ${symbol}, trying static fallback data`)
  data = FALLBACK_ETF_DATA[symbol.toUpperCase()]
  if (data) {
    console.log(`✅ Static fallback data found for ${symbol}`)
    return data
  }

  // Step 3: If this is a resolved symbol (e.g., SPICHA.SW), try the original symbol (e.g., SPICHA)
  if (symbol.includes('.') && symbol.includes('SW')) {
    const originalSymbol = symbol.split('.')[0] // Extract SPICHA from SPICHA.SW
    console.log(`🔄 Trying original symbol fallback: ${originalSymbol}`)
    data = FALLBACK_ETF_DATA[originalSymbol.toUpperCase()]
    if (data) {
      console.log(`✅ Static fallback data found for original symbol ${originalSymbol}`)
      return data
    }
  }

  console.warn(`❌ No data available for ${symbol} from any source`)
  return null
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

  // Determine if this position should fetch ETF data
  let shouldFetchETFData = position.category === "ETF" || position.category === "Funds"

  console.log(`🔍 Processing ${position.symbol} (category: ${position.category}, shouldFetchETF: ${shouldFetchETFData})`)

  // Helper function to fetch data for a given symbol
  const fetchDataForSymbol = async (symbol: string, stepName: string, forceETF?: boolean): Promise<boolean> => {
    console.log(`📊 Fetching data for ${symbol} (${stepName})...`)
    
    // For ETFs/Funds: Fetch ETF composition
    if (shouldFetchETFData || forceETF) {
      etfData = await getEtfDataWithFallback(symbol)
    } else {
      // For Shares/Stocks: Fetch asset metadata and convert to ETF-like format
      console.log(`📈 Fetching asset metadata for share: ${symbol}`)
      
             // Use the Next.js API route for share metadata (handles session management server-side)
       const assetMetadata = await shareMetadataService.getShareMetadataWithSession(symbol, {} as any)
       
       if (assetMetadata) {
         console.log(`✅ Asset metadata found for ${symbol}:`, assetMetadata)
         
         // Convert asset metadata to ETF-like format for consistent analysis
         etfData = {
           symbol: assetMetadata.symbol,
           name: assetMetadata.name,
           currency: assetMetadata.currency,
           exchange: assetMetadata.type || "UNKNOWN",
           domicile: assetMetadata.country || "UNKNOWN",
           composition: {
             sectors: { [assetMetadata.sector || "Unknown"]: 1.0 },
             countries: { [assetMetadata.country || "Unknown"]: 1.0 },
             currencies: { [assetMetadata.currency || "USD"]: 1.0 },
           },
         }
         console.log(`✅ Converted asset metadata to ETF format for ${symbol}`)
       } else {
         console.warn(`⚠️ No asset metadata found for ${symbol}`)
         // Fallback to basic method if API route fails
         const fallbackMetadata = await apiService.getAssetMetadata(symbol)
         
                   if (fallbackMetadata) {
            console.log(`✅ Asset metadata found for ${symbol} (fallback):`, fallbackMetadata)
            
            // Convert asset metadata to ETF-like format for consistent analysis
            etfData = {
              symbol: fallbackMetadata.symbol,
              name: fallbackMetadata.name,
              currency: fallbackMetadata.currency,
              exchange: fallbackMetadata.type || "UNKNOWN",
              domicile: fallbackMetadata.country || "UNKNOWN",
              composition: {
                sectors: { [fallbackMetadata.sector || "Unknown"]: 1.0 },
                countries: { [fallbackMetadata.country || "Unknown"]: 1.0 },
                currencies: { [fallbackMetadata.currency || "USD"]: 1.0 },
              },
            }
            console.log(`✅ Converted asset metadata to ETF format for ${symbol} (fallback)`)
          } else {
            console.warn(`⚠️ No asset metadata found for ${symbol}`)
          }
      }
    }
    
    // Always fetch quote data
    quoteData = await getQuoteWithFallback(symbol)
    
    if (etfData || quoteData) {
      console.log(`✅ ${stepName} successful for ${position.symbol} (resolved to ${symbol})`)
      return true
    }
    return false
  }

  // For ETFs and Funds: Use search-based symbol resolution
  if (shouldFetchETFData) {
    console.log(`🌍 ETF/Fund detected: ${position.symbol}, using search-based resolution`)
    
    try {
      // Step 1: Search for the symbol to get proper resolution
      const searchResults = await searchSymbol(position.symbol)
      
      if (searchResults && searchResults.length > 0) {
        console.log(`🔍 Search results for ${position.symbol}:`, searchResults.map(r => `${r.symbol} (${r.name})`))
        
        // Use the first search result (most relevant)
        const resolvedSymbol = searchResults[0].symbol
        console.log(`✅ Search resolution: ${position.symbol} -> ${resolvedSymbol}`)
        
        // Step 2: Fetch data using the resolved symbol
        if (await fetchDataForSymbol(resolvedSymbol, "Search-based resolution")) {
          return { etfData, quoteData }
        } else {
          console.warn(`⚠️ Failed to fetch data with resolved symbol ${resolvedSymbol}`)
        }
      } else {
        console.warn(`⚠️ No search results found for ${position.symbol}`)
      }
    } catch (error) {
      console.warn(`Search-based resolution failed for ${position.symbol}:`, error)
    }

    // Fallback: Try with original symbol
    console.log(`🔄 Search failed, trying with original symbol: ${position.symbol}`)
    if (await fetchDataForSymbol(position.symbol, "Original symbol")) {
      return { etfData, quoteData }
    }
  } else {
    // For Shares/Stocks: Fetch metadata and quote data
    console.log(`📈 Share/Stock detected: ${position.symbol}, fetching metadata and quote`)
    
    if (await fetchDataForSymbol(position.symbol, "Direct metadata and quote fetch")) {
      return { etfData, quoteData }
    }
  }

  console.warn(`❌ Could not resolve and fetch data for ${position.symbol} after all attempts. Using minimal fallback.`)
  
  // Final fallback: provide minimal data based on the original position
  return {
    etfData: {
      symbol: position.symbol,
      name: position.name || position.symbol,
      currency: position.currency,
      exchange: position.exchange || "UNKNOWN",
      domicile: "UNKNOWN",
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
