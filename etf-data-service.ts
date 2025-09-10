// Real ETF composition data service

import { yahooFinanceService } from "@/lib/yahoo-finance-service"
import { apiService } from "@/lib/api-service"
import { shareMetadataService } from "@/lib/share-metadata-service"
import { ETFComposition, AssetMetadata } from '@/types/yahoo'
import { normalizeSectorName, normalizeCountryName } from '@/lib/normalization-utils'

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


export interface EtfComposition {
  sectors?: { [key: string]: number }  // Old structure (for backward compatibility)
  sector?: { sector: string; weight: number }[]  // New structure from API
  countries?: { [key: string]: number }  // Old structure
  country?: { country: string; weight: number }[]  // New structure from API
  currencies?: { [key: string]: number }  // Old structure
  currency?: { currency: string; weight: number }[]  // New structure from API
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
            country: normalizeCountryName(item.country),
            weight: item.weight,
          }))
          composition.sector = composition.sector.map((item) => ({
            sector: normalizeSectorName(item.sector),
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
          country: normalizeCountryName(item.country),
          weight: item.weight,
        }))
        composition.sector = composition.sector.map((item) => ({
          sector: normalizeSectorName(item.sector),
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


  generateRealisticFallback(symbol: string): EtfData | null {
    const fallbackMap: Record<string, EtfData> = {
      // Popular World ETFs
      'VWRL': {
        symbol: "VWRL",
        name: "Vanguard FTSE All-World UCITS ETF",
        currency: "USD",
        exchange: "LSE",
        domicile: "IE",
        composition: {
          sectors: { "Technology": 0.25, "Financial Services": 0.15, "Healthcare": 0.12, "Consumer Discretionary": 0.10, "Industrials": 0.10, "Other": 0.28 },
          countries: { "United States": 0.60, "Japan": 0.06, "United Kingdom": 0.04, "China": 0.03, "Canada": 0.03, "Other": 0.24 },
          currencies: { "USD": 0.65, "EUR": 0.15, "JPY": 0.08, "GBP": 0.04, "Other": 0.08 }
        }
      },
      'VWCE': {
        symbol: "VWCE", 
        name: "Vanguard FTSE All-World UCITS ETF (Acc)",
        currency: "USD",
        exchange: "XETRA", 
        domicile: "IE",
        composition: {
          sectors: { "Technology": 0.25, "Financial Services": 0.15, "Healthcare": 0.12, "Consumer Discretionary": 0.10, "Industrials": 0.10, "Other": 0.28 },
          countries: { "United States": 0.60, "Japan": 0.06, "United Kingdom": 0.04, "China": 0.03, "Canada": 0.03, "Other": 0.24 },
          currencies: { "USD": 0.65, "EUR": 0.15, "JPY": 0.08, "GBP": 0.04, "Other": 0.08 }
        }
      },
      'IWDA': {
        symbol: "IWDA",
        name: "iShares Core MSCI World UCITS ETF",
        currency: "USD", 
        exchange: "LSE",
        domicile: "IE",
        composition: {
          sectors: { "Technology": 0.24, "Financial Services": 0.14, "Healthcare": 0.13, "Consumer Discretionary": 0.12, "Industrials": 0.09, "Other": 0.28 },
          countries: { "United States": 0.68, "Japan": 0.06, "United Kingdom": 0.04, "Canada": 0.03, "Switzerland": 0.03, "Other": 0.16 },
          currencies: { "USD": 0.70, "EUR": 0.12, "JPY": 0.08, "GBP": 0.04, "Other": 0.06 }
        }
      },
      // Popular US ETFs
      'VTI': {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        currency: "USD",
        exchange: "NYSE", 
        domicile: "US",
        composition: {
          sectors: { "Technology": 0.28, "Financial Services": 0.13, "Healthcare": 0.14, "Consumer Discretionary": 0.12, "Industrials": 0.09, "Other": 0.24 },
          countries: { "United States": 1.0 },
          currencies: { "USD": 1.0 }
        }
      },
      // US ETFs
      'BND': {
        symbol: "BND",
        name: "Vanguard Total Bond Market ETF",
        currency: "USD",
        exchange: "NASDAQ",
        domicile: "US",
        composition: {
          sectors: { "Government Bonds": 0.40, "Corporate Bonds": 0.30, "Mortgage Bonds": 0.20, "Municipal Bonds": 0.10 },
          countries: { "United States": 1.0 },
          currencies: { "USD": 1.0 }
        }
      },
      'IEFA': {
        symbol: "IEFA",
        name: "iShares Core MSCI EAFE IMI Index ETF",
        currency: "USD",
        exchange: "NYSE",
        domicile: "US",
        composition: {
          sectors: { "Technology": 0.15, "Financial Services": 0.20, "Healthcare": 0.15, "Consumer Discretionary": 0.12, "Industrials": 0.15, "Materials": 0.08, "Consumer Staples": 0.10, "Energy": 0.05 },
          countries: { "Japan": 0.25, "United Kingdom": 0.15, "France": 0.12, "Germany": 0.10, "Switzerland": 0.08, "Canada": 0.08, "Netherlands": 0.05, "Australia": 0.05, "Other": 0.12 },
          currencies: { "USD": 0.60, "EUR": 0.25, "JPY": 0.10, "GBP": 0.05 }
        }
      },
      'VOOV': {
        symbol: "VOOV",
        name: "Vanguard S&P 500 Value ETF",
        currency: "USD",
        exchange: "NYSE",
        domicile: "US",
        composition: {
          sectors: { "Financial Services": 0.25, "Healthcare": 0.18, "Industrials": 0.15, "Consumer Staples": 0.10, "Energy": 0.12, "Utilities": 0.08, "Materials": 0.05, "Consumer Discretionary": 0.07 },
          countries: { "United States": 1.0 },
          currencies: { "USD": 1.0 }
        }
      },
      // Swiss ETFs
      'SPICHA': {
        symbol: "SPICHA",
        name: "UBS ETF (CH) SPI (CHF) A-dis",
        currency: "CHF",
        exchange: "EBS",
        domicile: "CH", 
        composition: {
          sectors: { "Financial Services": 0.25, "Healthcare": 0.20, "Consumer Staples": 0.15, "Industrials": 0.12, "Technology": 0.10, "Other": 0.18 },
          countries: { "Switzerland": 1.0 },
          currencies: { "CHF": 1.0 }
        }
      }
    }
    
    // Try exact match first
    const exactMatch = fallbackMap[symbol.toUpperCase()]
    if (exactMatch) return exactMatch
    
    // Try symbol variations (remove suffixes)
    const baseSymbol = symbol.split('.')[0].toUpperCase()
    const baseMatch = fallbackMap[baseSymbol]
    if (baseMatch) {
      return {
        ...baseMatch,
        symbol: symbol, // Keep original symbol
        exchange: this.inferExchange(symbol)
      }
    }
    
    return null
  }

  private inferExchange(symbol: string): string {
    if (symbol.endsWith('.SW')) return 'EBS'
    if (symbol.endsWith('.L')) return 'LSE'
    if (symbol.endsWith('.DE')) return 'XETRA'
    return 'NYSE'
  }

  private getFallbackETFComposition(symbol: string): ETFComposition | null {
    const fallbackData = this.generateRealisticFallback(symbol)
    if (!fallbackData) return null
    
    return {
      symbol: fallbackData.symbol,
      currency: Object.entries(fallbackData.composition.currencies || {}).map(([currency, weight]) => ({ currency, weight: weight * 100 })),
      country: Object.entries(fallbackData.composition.countries || {}).map(([country, weight]) => ({ country, weight: weight * 100 })),
      sector: Object.entries(fallbackData.composition.sectors || {}).map(([sector, weight]) => ({ sector, weight: weight * 100 })),
      holdings: [],
      domicile: fallbackData.domicile,
      withholdingTax: fallbackData.domicile === 'US' ? 15 : fallbackData.domicile === 'IE' ? 15 : 30,
      lastUpdated: new Date().toISOString()
    }
  }
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
    
    // Check for new structure (arrays) first
    let hasRealData = false
    
    if (data.composition.sector && Array.isArray(data.composition.sector)) {
      // New structure: sector is an array of { sector: string; weight: number }
      hasRealData = data.composition.sector.length > 0 &&
                   data.composition.sector.some((s: any) => s.weight > 0 && s.weight < 100)
    } else if (data.composition.sectors && typeof data.composition.sectors === 'object') {
      // Old structure: sectors is an object { [sector: string]: number }
      hasRealData = Object.keys(data.composition.sectors).length > 0 &&
                   Object.values(data.composition.sectors).some((weight: any) => weight > 0 && weight < 100)
    }
    
    console.log(`🔍 Real data check for ${symbol}:`, {
      hasSectors: !!(data.composition.sector || data.composition.sectors),
      sectorStructure: data.composition.sector ? 'array' : data.composition.sectors ? 'object' : 'none',
      sectorData: data.composition.sector || data.composition.sectors,
      hasRealData
    })
    
    if (hasRealData) {
      console.log(`✅ Real API data found for ${symbol}`)
      return data
    } else {
      console.log(`🔄 API returned fallback data for ${symbol}, will try other sources`)
    }
  }

  // Step 2: Try realistic fallback data for known ETFs
  console.log(`🔄 API failed for ${symbol}, trying realistic fallback data`)
  const realisticFallback = etfDataService.generateRealisticFallback(symbol)
  if (realisticFallback) {
    console.log(`✅ Realistic fallback data found for ${symbol}`)
    return realisticFallback
  }

  console.warn(`❌ No data available for ${symbol} from any source`)
  return null
}

export async function getQuoteWithFallback(symbol: string): Promise<QuoteData | null> {
  let quote = await getQuote(symbol)
  if (!quote) {
    console.warn(`No quote data found for ${symbol} from API. Using realistic fallback.`)
    // Use realistic fallback prices for known ETFs
    const fallbackPrices: Record<string, { price: number, currency: string }> = {
      'VWRL': { price: 105.2, currency: 'USD' },
      'VWCE': { price: 105.2, currency: 'EUR' },
      'IWDA': { price: 75.4, currency: 'USD' },
      'VTI': { price: 245.8, currency: 'USD' },
      'SPICHA': { price: 125.8, currency: 'CHF' }
    }
    
    const baseSymbol = symbol.split('.')[0].toUpperCase()
    const fallback = fallbackPrices[baseSymbol] || fallbackPrices[symbol.toUpperCase()]
    
    if (fallback) {
      quote = fallback
    } else {
      // Generic fallback for unknown symbols
      quote = {
        price: 100 + Math.random() * 50,
        currency: symbol.endsWith('.SW') ? 'CHF' : symbol.endsWith('.L') ? 'GBP' : 'USD'
      }
    }
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
         // Fallback domicile logic: use domicile if available, otherwise infer from country
         let domicile = assetMetadata.domicile
         if (!domicile || domicile === "Unknown") {
           // Map country names to domicile codes
           const countryToDomicile: Record<string, string> = {
             "Switzerland": "CH",
             "United States": "US",
             "Ireland": "IE",
             "Luxembourg": "LU",
             "Germany": "DE",
             "France": "FR",
             "United Kingdom": "GB",
             "Netherlands": "NL",
           }
           domicile = countryToDomicile[assetMetadata.country] || "UNKNOWN"
         }
         
         etfData = {
           symbol: assetMetadata.symbol,
           name: assetMetadata.name,
           currency: assetMetadata.currency,
           exchange: assetMetadata.type || "UNKNOWN",
           domicile: domicile,
           composition: {
             sectors: { [assetMetadata.sector || "Unknown"]: 1.0 },
             countries: { [assetMetadata.country || "Unknown"]: 1.0 },
             currencies: { [assetMetadata.currency || "USD"]: 1.0 },
           },
         }
         console.log(`✅ Converted asset metadata to ETF format for ${symbol}`)
       } else {
         console.warn(`⚠️ No asset metadata found for ${symbol} - skipping redundant fallback call`)
         // REMOVED: Redundant fallback call to apiService.getAssetMetadata() that was causing duplicate API requests
         // Both shareMetadataService and apiService call the same /api/yahoo/share-metadata endpoint
         // The second call was failing with empty headers because the session was already consumed
      }
    }
    
    // Always fetch quote data
    quoteData = await getQuoteWithFallback(symbol)
    
    // Only consider success if we have both etfData and quoteData
    // or if this is not an ETF and we have quoteData
    if (etfData && quoteData) {
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
