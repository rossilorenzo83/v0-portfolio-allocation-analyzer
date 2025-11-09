import { NextRequest, NextResponse } from 'next/server'
import { yahooFinanceService } from '@/lib/yahoo-finance-service'
import { ETFComposition } from '@/types/yahoo'
import { normalizeSectorName, normalizeCountryName } from '@/lib/normalization-utils'

// Helper function to validate session
function validateSession(session: any, symbol: string): { isValid: boolean; response?: NextResponse } {
  if (!session) {
    console.error('❌ No session available for ETF composition')
    return {
      isValid: false,
      response: NextResponse.json({ error: 'No session available' }, { status: 500 })
    }
  }

  if (!session.cookies || session.cookies.length < 10) {
    console.error(`❌ Invalid session cookies for ${symbol}: ${session.cookies}`)
    const fallback = getFallbackETFComposition(symbol)
    return {
      isValid: false,
      response: NextResponse.json(fallback)
    }
  }

  return { isValid: true }
}

// Helper function to create request headers
function createRequestHeaders(session: any): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': session.userAgent,
    'Accept': 'application/json',
    'Cookie': session.cookies,
    'Referer': 'https://finance.yahoo.com',
  }
  
  // Only add crumb if it's not the default
  if (session.crumb && session.crumb !== 'default-crumb') {
    headers['X-Crumb'] = session.crumb
  }
  
  return headers
}

// Helper function to process sector data
function processSectorData(sectorWeightingsArray: SectorWeightingObject[]): Array<{ sector: string; weight: number }> {
  return sectorWeightingsArray
    .flatMap((sectorObj: SectorWeightingObject) => 
      Object.entries(sectorObj).map(([sector, data]) => ({
        sector: normalizeSectorName(sector),
        weight: (data?.raw || 0) * 100,
      }))
    )
    .filter((s) => s.weight > 0 && s.sector !== 'Unknown' && s.sector !== 'unknown')
}

// Helper function to process holdings data
function processHoldingsData(holdings: HoldingData[]): ProcessedHolding[] {
  return holdings
    .map((holding: HoldingData): ProcessedHolding => ({
      symbol: holding.symbol,
      name: holding.holdingName || holding.symbol,
      weight: (holding.holdingPercent?.raw || 0) * 100,
    }))
    .filter((h: ProcessedHolding) => h.symbol && h.weight > 0)
}

// Helper function to process country data
function processCountryData(fundProfile: any): CountryData[] {
  const countries: CountryData[] = []
  const countryWeightings: CountryWeightings = fundProfile?.countryWeightings
  
  if (countryWeightings && typeof countryWeightings === 'object') {
    Object.entries(countryWeightings).forEach(([country, weightData]) => {
      const weight = (weightData as CountryWeightingData)?.raw || (typeof weightData === 'number' ? weightData : 0)
      if (weight && weight > 0) {
        countries.push({
          country: normalizeCountryName(country),
          weight: weight * 100
        })
      }
    })
  }
  
  return countries
}

// TypeScript interfaces for the Yahoo Finance API data structures
interface SectorWeightingData {
  raw?: number
}

interface SectorWeightingObject {
  [sector: string]: SectorWeightingData
}

interface HoldingData {
  symbol: string
  holdingName?: string
  holdingPercent?: {
    raw?: number
  }
  weight?: number
  name?: string
}

interface ProcessedHolding {
  symbol: string
  name: string
  weight: number
}

interface CurrencyData {
  currency: string
  weight: number
}

interface CountryData {
  country: string
  weight: number
}

interface SectorData {
  sector: string
  weight: number
}

interface CountryWeightingData {
  raw?: number
}

interface CountryWeightings {
  [country: string]: CountryWeightingData | number
}

// Helper function to fetch API data
async function fetchETFDataFromAPI(symbol: string, session: any): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=topHoldings,fundProfile,summaryProfile`
  const headers = createRequestHeaders(session)
  
  const response = await fetch(url, { 
    headers,
    // Disable SSL certificate validation for development
    ...(process.env.NODE_ENV === 'development' && { 
      agent: new (require('https').Agent)({ rejectUnauthorized: false })
    })
  })

  if (response.ok) {
    const data = await response.json()
    return data.quoteSummary?.result?.[0]
  }
  
  return null
}

// Helper function to process API result into ETF composition
function processAPIResult(result: any, symbol: string): ETFComposition | null {
  if (!result) return null
  
  const fundProfile = result.fundProfile
  const summaryProfile = result.summaryProfile

  // Process data using helper functions
  const sectorWeightingsArray: SectorWeightingObject[] = result.topHoldings?.sectorWeightings || []
  const sectors = processSectorData(sectorWeightingsArray)
  const holdings = processHoldingsData(result.topHoldings?.holdings || [])
  const countries = processCountryData(fundProfile)
  
  // Add default country data if missing
  addDefaultCountryIfMissing(countries, summaryProfile?.domicile || inferDomicile(symbol), symbol)
  
  // Process currency data
  const currencies = processCurrencyData(symbol)
  
  // Check if we have rich data
  const hasRichData = hasQualityData(sectors)
  
  if (hasRichData) {
    return {
      symbol,
      currency: currencies,
      country: countries,
      sector: sectors,
      holdings,
      domicile: summaryProfile?.domicile || fundProfile?.domicile || inferDomicileFromCountryAndSymbol(summaryProfile?.country, symbol),
      withholdingTax: inferWithholdingTax(symbol),
      lastUpdated: new Date().toISOString(),
    }
  }
  
  return null
}

// Helper function to add default country data when missing
function addDefaultCountryIfMissing(countries: CountryData[], domicile: string, symbol: string): void {
  if (countries.length === 0) {
    if (domicile === 'US' || symbol.match(/^[A-Z]{2,5}$/)) {
      countries.push({ country: 'United States', weight: 100 })
    }
  }
}

// Helper function to process currency data
function processCurrencyData(symbol: string): CurrencyData[] {
  const currencies: CurrencyData[] = []
  if (symbol.match(/^[A-Z]{2,5}$/)) {
    currencies.push({ currency: 'USD', weight: 100 })
  }
  return currencies
}

// Helper function to check data quality
function hasQualityData(sectors: SectorData[]): boolean {
  return sectors.length > 0 && !sectors.every(s => s.sector === 'Other')
}

// Helper function to handle ETF data retrieval with fallbacks
async function getETFCompositionWithFallbacks(symbol: string): Promise<NextResponse> {
  // Try web scraping as fallback
  const scrapedData = await scrapeETFDataFromWeb(symbol)
  if (scrapedData) {
    return NextResponse.json(scrapedData)
  }

  // Return fallback composition
  const fallback = getFallbackETFComposition(symbol)
  return NextResponse.json(fallback)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params

  try {
    // Get and validate session
    const session = await yahooFinanceService.getCurrentSession()
    const sessionValidation = validateSession(session, symbol)
    
    if (!sessionValidation.isValid) {
      return sessionValidation.response!
    }

    // Fetch data from API
    const apiResult = await fetchETFDataFromAPI(symbol, session)
    
    // Process API result
    const composition = processAPIResult(apiResult, symbol)
    
    if (composition) {
      return NextResponse.json(composition)
    }

    // Handle fallbacks
    return await getETFCompositionWithFallbacks(symbol)

  } catch (error) {
    console.error(`❌ Error fetching ETF composition for ${symbol}:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions (moved from service to avoid circular dependency)
async function scrapeETFDataFromWeb(symbol: string): Promise<ETFComposition | null> {
  try {
    // Get a valid session for web scraping
    const session = await yahooFinanceService.getCurrentSession()
    if (!session) {
      return null
    }

    // Navigate to the ETF page
    const page = await yahooFinanceService.createPage()
    try {
      const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      
      // Handle EU disclaimer
      await yahooFinanceService.handleEUDisclaimer(page)
      
      // Wait for the page to load
      await page.waitForTimeout(3000)
      
      // Extract data from the page
      const etfData = await page.evaluate(() => {
        // Look for window.__INITIAL_STATE__ which contains ETF data
        return (window as any).__INITIAL_STATE__ || null
      })
      
      if (etfData) {
        const composition = parseETFDataFromHTML(etfData, symbol)
        if (composition) {
          return composition
        }
      }
      
      return null
      
    } finally {
      await page.close()
    }
    
  } catch (error) {
    console.error(`❌ Web scraping failed for ${symbol}:`, error)
    return null
  }
}

function parseETFDataFromHTML(data: unknown, symbol: string): ETFComposition | null {
  try {
    // Extract sector breakdown
    const sectors: SectorData[] = []
    const sectorData = (data as any)?.quoteSummary?.result?.[0]?.fundProfile?.sectorWeightings
    if (sectorData) {
      Object.entries(sectorData).forEach(([sector, weight]) => {
        if (weight && (weight as number) > 0) {
          sectors.push({
            sector: normalizeSectorName(sector),
            weight: (weight as number) * 100
          })
        }
      })
    }
    
    // Extract country breakdown
    const countries: CountryData[] = []
    const countryData = (data as any)?.quoteSummary?.result?.[0]?.fundProfile?.countryWeightings
    if (countryData) {
      Object.entries(countryData).forEach(([country, weightData]) => {
        const weight = (weightData as CountryWeightingData)?.raw || (typeof weightData === 'number' ? weightData : 0)
        if (weight && weight > 0) {
          countries.push({
            country: normalizeCountryName(country),
            weight: weight * 100
          })
        }
      })
    }
    
    // Extract currency breakdown
    const currencies: CurrencyData[] = []
    const currencyData = (data as any)?.quoteSummary?.result?.[0]?.fundProfile?.currencyWeightings
    if (currencyData) {
      Object.entries(currencyData).forEach(([currency, weight]) => {
        if (weight && (weight as number) > 0) {
          currencies.push({
            currency: currency.toUpperCase(),
            weight: (weight as number) * 100
          })
        }
      })
    }
    
    // Extract holdings
    const holdings: ProcessedHolding[] = []
    const holdingsData = (data as any)?.quoteSummary?.result?.[0]?.topHoldings?.holdings
    if (holdingsData && Array.isArray(holdingsData)) {
      holdingsData.forEach((holding: HoldingData) => {
        if (holding.symbol && holding.weight) {
          holdings.push({
            symbol: holding.symbol,
            name: holding.name || holding.symbol,
            weight: holding.weight
          })
        }
      })
    }
    
    // Get fund profile info
    const fundProfile = (data as any)?.quoteSummary?.result?.[0]?.fundProfile
    const summaryProfile = (data as any)?.quoteSummary?.result?.[0]?.summaryProfile
    
    return {
      symbol,
      currency: currencies.length > 0 ? currencies : [{ currency: 'USD', weight: 100 }],
      country: countries.length > 0 ? countries : [{ country: 'United States', weight: 100 }],
      sector: sectors.length > 0 ? sectors : [{ sector: 'Other', weight: 100 }],
      holdings,
      domicile: summaryProfile?.domicile || fundProfile?.domicile || inferDomicileFromCountryAndSymbol(summaryProfile?.country, symbol),
      withholdingTax: inferWithholdingTax(symbol),
      lastUpdated: new Date().toISOString()
    }
    
  } catch (error) {
    console.error(`❌ Error parsing ETF data from HTML for ${symbol}:`, error)
    return null
  }
}



function inferDomicile(symbol: string): string {
  // Simple domicile inference based on symbol patterns
  if (symbol.includes('.L') || symbol.includes('.SW') || symbol.includes('.AS')) {
    return 'IE' // Ireland for UCITS ETFs
  }
  return 'US'
}

function inferWithholdingTax(symbol: string): number {
  // Simple withholding tax inference based on domicile
  const domicile = inferDomicile(symbol)
  if (domicile === 'IE') {
    return 15 // Ireland-US tax treaty
  }
  return 30 // Default US withholding
}

function getFallbackETFComposition(symbol: string): ETFComposition {
  return {
    symbol,
    currency: [{ currency: 'USD', weight: 60 }, { currency: 'EUR', weight: 20 }, { currency: 'JPY', weight: 10 }, { currency: 'Other', weight: 10 }],
    country: [{ country: 'United States', weight: 60 }, { country: 'Europe', weight: 20 }, { country: 'Japan', weight: 10 }, { country: 'Other', weight: 10 }],
    sector: [
      { sector: 'Technology', weight: 25 },
      { sector: 'Financial Services', weight: 15 },
      { sector: 'Healthcare', weight: 12 },
      { sector: 'Consumer Discretionary', weight: 10 },
      { sector: 'Industrials', weight: 10 },
      { sector: 'Other', weight: 28 }
    ],
    holdings: [],
    domicile: inferDomicile(symbol),
    withholdingTax: inferWithholdingTax(symbol),
    lastUpdated: new Date().toISOString(),
  }
} 

function inferDomicileFromCountryAndSymbol(country: string, symbol: string): string {
  // First try explicit domicile inference based on symbol patterns
  const explicitDomicile = inferDomicile(symbol)
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