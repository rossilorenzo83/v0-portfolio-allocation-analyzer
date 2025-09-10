import { NextRequest, NextResponse } from 'next/server'
import { yahooFinanceService } from '@/lib/yahoo-finance-service'
import { ETFComposition } from '@/types/yahoo'
import { normalizeSectorName, normalizeCountryName } from '@/lib/normalization-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params

  console.log(`🚀 API ROUTE CALLED - Yahoo ETF Composition API`)
  console.log(`Request URL: ${request.url}`)
  console.log(`Request method: ${request.method}`)

  try {
    // Get a valid session from the sophisticated service
    const session = await yahooFinanceService.getCurrentSession()
    
    if (!session) {
      console.error('❌ No session available for ETF composition')
      return NextResponse.json(
        { error: 'No session available' },
        { status: 500 }
      )
    }

    console.log(`📊 Fetching ETF composition for ${symbol} with session`)

    // Validate session data
    if (!session.cookies || session.cookies.length < 10) {
      console.error(`❌ Invalid session cookies for ${symbol}: ${session.cookies}`)
      const fallback = getFallbackETFComposition(symbol)
      return NextResponse.json(fallback)
    }

    // Make the external API call server-side using the session
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=topHoldings,fundProfile,summaryProfile`
    
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
    
    console.log(`🔗 Making external API call to: ${url}`)
    console.log(`🍪 Using cookies: ${session.cookies.substring(0, 50)}...`)
    console.log(`🔑 Using crumb: ${session.crumb}`)
    console.log(`👤 Using User-Agent: ${session.userAgent.substring(0, 50)}...`)
    
    const response = await fetch(url, { 
      headers,
      // Disable SSL certificate validation for development
      ...(process.env.NODE_ENV === 'development' && { 
        agent: new (require('https').Agent)({ rejectUnauthorized: false })
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`📊 API Response for ${symbol}:`, JSON.stringify(data, null, 2))
      
      const result = data.quoteSummary?.result?.[0]
      if (result) {
        console.log(`📋 Result structure for ${symbol}:`, JSON.stringify(result, null, 2))
        
        const fundProfile = result.fundProfile
        const summaryProfile = result.summaryProfile

        console.log(`🏦 Fund Profile for ${symbol}:`, JSON.stringify(fundProfile, null, 2))
        console.log(`📈 Summary Profile for ${symbol}:`, JSON.stringify(summaryProfile, null, 2))

        // Process sector breakdown from topHoldings (sectorWeightings is array of objects)
        const sectorWeightingsArray = result.topHoldings?.sectorWeightings || []
        console.log(`🏭 Sector Weightings Array for ${symbol}:`, JSON.stringify(sectorWeightingsArray, null, 2))
        
        const sectors = sectorWeightingsArray
          .flatMap((sectorObj: any) => 
            Object.entries(sectorObj).map(([sector, data]) => ({
              sector: normalizeSectorName(sector),
              weight: ((data as any)?.raw || 0) * 100,
            }))
          )
          .filter((s) => s.weight > 0 && s.sector !== 'Unknown' && s.sector !== 'unknown')

        console.log(`✅ Processed sectors for ${symbol}:`, sectors)

        // Process holdings
        const holdings = (result.topHoldings?.holdings || [])
          .map((holding: any) => ({
            symbol: holding.symbol,
            name: holding.holdingName,
            weight: (holding.holdingPercent?.raw || 0) * 100,
          }))
          .filter((h: any) => h.symbol && h.weight > 0)

        console.log(`📊 Holdings for ${symbol}:`, holdings.length, "holdings")

        // Process country breakdown - prioritize actual country weightings from API
        const countries: Array<{ country: string; weight: number }> = []
        
        // Try to get actual country distribution from fundProfile
        const countryWeightings = fundProfile?.countryWeightings
        console.log(`🌍 Raw country weightings for ${symbol}:`, JSON.stringify(countryWeightings, null, 2))
        
        if (countryWeightings && typeof countryWeightings === 'object') {
          Object.entries(countryWeightings).forEach(([country, weightData]) => {
            const weight = (weightData as any)?.raw || (typeof weightData === 'number' ? weightData : 0)
            if (weight && weight > 0) {
              console.log(`🌍 Processing country ${country}: ${weight} -> ${weight * 100}%`)
              countries.push({
                country: normalizeCountryName(country),
                weight: weight * 100
              })
            }
          })
        }
        
        // Only fall back to inference if no API data available
        if (countries.length === 0) {
          console.log(`⚠️ No country weightings from API for ${symbol}, using fallback logic`)
          const domicile = summaryProfile?.domicile || inferDomicile(symbol)
          if (domicile === 'US' || symbol.match(/^[A-Z]{2,5}$/)) {
            // For US-listed ETFs without country data, provide a reasonable default
            countries.push({ country: 'United States', weight: 100 })
          }
        }

        console.log(`🌍 Countries for ${symbol}:`, countries)

        // Process currency (USD for US-listed ETFs)
        const currencies = []
        if (symbol.match(/^[A-Z]{2,5}$/)) {
          // For US-listed symbols, assume USD
          currencies.push({ currency: 'USD', weight: 100 })
        }

        console.log(`💰 Currencies for ${symbol}:`, currencies)

        // Check if we have rich data (real sector data from API)
        const hasRichData = sectors.length > 0 && 
                           !sectors.every(s => s.sector === 'Other')

        console.log(`🔍 Rich data check for ${symbol}:`, {
          hasSectors: sectors.length > 0,
          hasNonOtherSectors: !sectors.every(s => s.sector === 'Other'),
          hasCountries: countries.length > 0,
          hasNonUSDCountries: !countries.every(c => c.country === 'United States'),
          hasRichData
        })

        if (hasRichData) {
          const etfComposition: ETFComposition = {
            symbol: symbol, // Always return original symbol
            currency: currencies,
            country: countries,
            sector: sectors,
            holdings: holdings,
            domicile: summaryProfile?.domicile || fundProfile?.domicile || inferDomicileFromCountryAndSymbol(summaryProfile?.country, symbol),
            withholdingTax: inferWithholdingTax(symbol),
            lastUpdated: new Date().toISOString(),
          }

          console.log(`✅ Real ETF composition found for ${symbol} with session:`, etfComposition)
          return NextResponse.json(etfComposition)
        } else {
          console.log(`🔄 API returned poor quality data for ${symbol}, trying web scraping...`)
        }
      } else {
        console.warn(`⚠️ No result found in response for ${symbol}`)
        console.warn(`⚠️ Full response data:`, JSON.stringify(data, null, 2))
      }
    } else {
      console.warn(`⚠️ External API request failed for ${symbol}: ${response.status} - ${response.statusText}`)
      console.warn(`⚠️ Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)
      
      // Try to get response body for debugging
      try {
        const errorBody = await response.text()
        console.warn(`⚠️ Error response body:`, errorBody)
      } catch (e) {
        console.warn(`⚠️ Could not read error response body:`, e)
      }
    }

    // Try web scraping as fallback (when API fails OR returns poor quality data)
    console.log(`🔄 Trying web scraping fallback for ${symbol}...`)
    const scrapedData = await scrapeETFDataFromWeb(symbol)
    if (scrapedData) {
      console.log(`✅ Web scraping successful for ${symbol}:`, scrapedData)
      return NextResponse.json(scrapedData)
    }

    // Return fallback
    console.log(`🔄 Using fallback ETF composition for ${symbol}`)
    const fallback = getFallbackETFComposition(symbol)
    return NextResponse.json(fallback)

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
    console.log(`🌐 Attempting web scraping for ${symbol}...`)
    
    // Get a valid session for web scraping
    const session = await yahooFinanceService.getCurrentSession()
    if (!session) {
      console.warn(`⚠️ No session available for web scraping ${symbol}`)
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
        if ((window as any).__INITIAL_STATE__) {
          const state = (window as any).__INITIAL_STATE__
          return state
        }
        return null
      })
      
      if (etfData) {
        const composition = parseETFDataFromHTML(etfData, symbol)
        if (composition) {
          console.log(`✅ Web scraping successful for ${symbol}`)
          return composition
        }
      }
      
      console.warn(`⚠️ No ETF data found in page for ${symbol}`)
      return null
      
    } finally {
      await page.close()
    }
    
  } catch (error) {
    console.error(`❌ Web scraping failed for ${symbol}:`, error)
    return null
  }
}

function parseETFDataFromHTML(data: any, symbol: string): ETFComposition | null {
  try {
    // Extract sector breakdown
    const sectors: Array<{ sector: string; weight: number }> = []
    const sectorData = data?.quoteSummary?.result?.[0]?.fundProfile?.sectorWeightings
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
    const countries: Array<{ country: string; weight: number }> = []
    const countryData = data?.quoteSummary?.result?.[0]?.fundProfile?.countryWeightings
    if (countryData) {
      Object.entries(countryData).forEach(([country, weightData]) => {
        const weight = (weightData as any)?.raw || (typeof weightData === 'number' ? weightData : 0)
        if (weight && weight > 0) {
          countries.push({
            country: normalizeCountryName(country),
            weight: weight * 100
          })
        }
      })
    }
    
    // Extract currency breakdown
    const currencies: Array<{ currency: string; weight: number }> = []
    const currencyData = data?.quoteSummary?.result?.[0]?.fundProfile?.currencyWeightings
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
    const holdings: Array<{ symbol: string; name: string; weight: number }> = []
    const holdingsData = data?.quoteSummary?.result?.[0]?.topHoldings?.holdings
    if (holdingsData && Array.isArray(holdingsData)) {
      holdingsData.forEach((holding: any) => {
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
    const fundProfile = data?.quoteSummary?.result?.[0]?.fundProfile
    const summaryProfile = data?.quoteSummary?.result?.[0]?.summaryProfile
    
    const composition: ETFComposition = {
      symbol: symbol,
      currency: currencies.length > 0 ? currencies : [{ currency: 'USD', weight: 100 }],
      country: countries.length > 0 ? countries : [{ country: 'United States', weight: 100 }],
      sector: sectors.length > 0 ? sectors : [{ sector: 'Other', weight: 100 }],
      holdings: holdings,
      domicile: summaryProfile?.domicile || fundProfile?.domicile || inferDomicileFromCountryAndSymbol(summaryProfile?.country, symbol),
      withholdingTax: inferWithholdingTax(symbol),
      lastUpdated: new Date().toISOString()
    }
    
    return composition
    
  } catch (error) {
    console.error(`❌ Error parsing ETF data from HTML for ${symbol}:`, error)
    return null
  }
}


function processCurrencyData(currencies: any[]): Array<{ currency: string; weight: number }> {
  if (!currencies || currencies.length === 0) {
    return [{ currency: 'USD', weight: 100 }]
  }
  
  return currencies.map((currency: any) => ({
    currency: currency.currency || 'USD',
    weight: currency.weight || 100,
  }))
}

function processCountryData(countries: any[]): Array<{ country: string; weight: number }> {
  if (!countries || countries.length === 0) {
    return [{ country: 'United States', weight: 100 }]
  }
  
  return countries.map((country: any) => ({
    country: country.country || 'United States',
    weight: country.weight || 100,
  }))
}

function processSectorData(sectors: any[]): Array<{ sector: string; weight: number }> {
  if (!sectors || sectors.length === 0) {
    return [{ sector: 'Other', weight: 100 }]
  }
  
  return sectors.map((sector: any) => ({
    sector: sector.sector || 'Other',
    weight: sector.weight || 100,
  }))
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