import { NextRequest, NextResponse } from 'next/server'
import { yahooFinanceService } from '@/lib/yahoo-finance-service'

interface ShareMetadata {
  symbol: string
  name: string
  sector: string
  country: string
  currency: string
  type: string
  exchange: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params

  console.log(`🚀 API ROUTE CALLED - Yahoo Share Metadata API`)
  console.log(`Request URL: ${request.url}`)
  console.log(`Request method: ${request.method}`)

  try {
    // Get a valid session from the sophisticated service
    const session = await yahooFinanceService.getCurrentSession()
    
    if (!session) {
      console.error('❌ No session available for share metadata')
      return NextResponse.json(
        { error: 'No session available' },
        { status: 500 }
      )
    }

    // Step 1: Try to resolve the symbol first (like ETFs do)
    console.log(`🔍 Attempting symbol resolution for ${symbol}...`)
    let resolvedSymbol = symbol
    let symbolResolutionData = null
    
    try {
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}`
      const searchHeaders: Record<string, string> = {
        'User-Agent': session.userAgent,
        'Accept': 'application/json',
        'Cookie': session.cookies,
        'Referer': 'https://finance.yahoo.com',
      }
      
      if (session.crumb && session.crumb !== 'default-crumb') {
        searchHeaders['X-Crumb'] = session.crumb
      }
      
      const searchResponse = await fetch(searchUrl, { headers: searchHeaders })
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        console.log(`🔍 Search results for ${symbol}:`, JSON.stringify(searchData, null, 2))
        
        const results = searchData.quotes || []
        
        // For Swiss companies, prioritize Swiss exchanges
        const swissCompanies = ['NOVN', 'ROG', 'NESN', 'UBSG', 'CSGN', 'SQN', 'ZURN', 'SREN', 'GIVN', 'LONN', 'SLOG', 'BAER', 'CFR', 'SCMN', 'SGS', 'TEMN', 'VZUG', 'GEBN', 'HOLN', 'KER', 'LHN', 'PARG', 'RUS', 'SGSN', 'UHR', 'VACN']
        const isSwissCompany = swissCompanies.includes(symbol)
        
        if (isSwissCompany) {
          // Look for Swiss exchange version first
          const swissResult = results.find((r: any) => 
            r.symbol && (r.symbol.includes('.SW') || r.symbol.includes('.SWX') || r.symbol.includes('.LS'))
          )
          if (swissResult) {
            resolvedSymbol = swissResult.symbol
            symbolResolutionData = swissResult
            console.log(`✅ Swiss symbol resolution: ${symbol} -> ${resolvedSymbol}`)
          } else {
            // If no Swiss exchange found, use the first result
            const result = results[0]
            if (result && result.symbol) {
              resolvedSymbol = result.symbol
              symbolResolutionData = result
              console.log(`✅ Symbol resolution: ${symbol} -> ${resolvedSymbol}`)
            }
          }
        } else {
          // For non-Swiss companies, use the first result
          const result = results[0]
          if (result && result.symbol) {
            resolvedSymbol = result.symbol
            symbolResolutionData = result
            console.log(`✅ Symbol resolution: ${symbol} -> ${resolvedSymbol}`)
          }
        }
        
        if (resolvedSymbol === symbol) {
          console.log(`📋 Symbol resolution: ${symbol} -> ${symbol} (no change)`)
        }
      }
    } catch (error) {
      console.warn(`⚠️ Symbol resolution failed for ${symbol}:`, error)
    }

    console.log(`📊 Fetching share metadata for ${resolvedSymbol} with session`)

    // Step 2: Try quoteSummary with resolved symbol first
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(resolvedSymbol)}?modules=summaryProfile,summaryDetail`
    
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
    
    const response = await fetch(url, { headers })

    if (response.ok) {
      const data = await response.json()
      console.log(`📊 API Response for ${resolvedSymbol}:`, JSON.stringify(data, null, 2))
      
      const summaryProfile = data.quoteSummary?.result?.[0]?.summaryProfile
      const summaryDetail = data.quoteSummary?.result?.[0]?.summaryDetail
      
      if (summaryProfile) {
        // Check if we have good quality data
        const hasGoodData = summaryProfile.sector && 
                           summaryProfile.sector !== 'Unknown' && 
                           summaryProfile.sector !== 'unknown' &&
                           summaryProfile.country && 
                           summaryProfile.country !== 'Unknown' && 
                           summaryProfile.country !== 'unknown'

        console.log(`🔍 Data quality check for ${resolvedSymbol}:`, {
          hasSector: !!summaryProfile.sector,
          sector: summaryProfile.sector,
          hasCountry: !!summaryProfile.country,
          country: summaryProfile.country,
          hasGoodData
        })

        if (hasGoodData) {
          const metadata: ShareMetadata = {
            symbol: symbol, // Always return original symbol
            name: summaryProfile.longName || summaryProfile.shortName || symbol,
            sector: summaryProfile.sector,
            country: summaryProfile.country,
            currency: summaryProfile.currency || inferCurrency(symbol),
            type: summaryProfile.quoteType || inferAssetType(symbol),
            exchange: summaryProfile.exchange || inferExchange(symbol),
          }

          console.log(`✅ Real share metadata found for ${symbol} with session:`, metadata)
          return NextResponse.json(metadata)
        } else {
          console.log(`🔄 API returned poor quality data for ${resolvedSymbol}, trying original symbol...`)
        }
      } else {
        console.warn(`⚠️ No summaryProfile found in response for ${resolvedSymbol}`)
      }
    } else {
      console.warn(`⚠️ External API request failed for ${resolvedSymbol}: ${response.status} - ${response.statusText}`)
    }
    
    // Step 3: If resolved symbol failed or had poor data, try original symbol
    if (resolvedSymbol !== symbol) {
      console.log(`🔄 Trying original symbol ${symbol} as fallback...`)
      const originalUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,summaryDetail`
      const originalResponse = await fetch(originalUrl, { headers })

      if (originalResponse.ok) {
        const data = await originalResponse.json()
        const summaryProfile = data.quoteSummary?.result?.[0]?.summaryProfile
        
        if (summaryProfile) {
          const hasGoodData = summaryProfile.sector && 
                             summaryProfile.sector !== 'Unknown' && 
                             summaryProfile.sector !== 'unknown' &&
                             summaryProfile.country && 
                             summaryProfile.country !== 'Unknown' && 
                             summaryProfile.country !== 'unknown'

          if (hasGoodData) {
            const metadata: ShareMetadata = {
              symbol: symbol,
              name: summaryProfile.longName || summaryProfile.shortName || symbol,
              sector: summaryProfile.sector,
              country: summaryProfile.country,
              currency: summaryProfile.currency || inferCurrency(symbol),
              type: summaryProfile.quoteType || inferAssetType(symbol),
              exchange: summaryProfile.exchange || inferExchange(symbol),
            }

            console.log(`✅ Real share metadata found for ${symbol} (original symbol):`, metadata)
            return NextResponse.json(metadata)
          }
        }
      }
    }
    
    // Step 4: Use symbol resolution data if available
    if (symbolResolutionData) {
      console.log(`🔄 Using symbol resolution data for ${symbol}...`)
      const metadata: ShareMetadata = {
        symbol: symbol,
        name: symbolResolutionData.longname || symbolResolutionData.shortname || symbol,
        sector: inferSector(symbol),
        country: inferCountry(symbol),
        currency: symbolResolutionData.currency || inferCurrency(symbol),
        type: inferAssetType(symbol),
        exchange: symbolResolutionData.exchange || inferExchange(symbol),
      }

      console.log(`✅ Symbol resolution metadata for ${symbol}:`, metadata)
      return NextResponse.json(metadata)
    }
    
    // Step 5: Try web scraping as fallback
    console.log(`🔄 Trying web scraping fallback for ${symbol}...`)
    const scrapedData = await scrapeShareDataFromWeb(symbol)
    if (scrapedData) {
      console.log(`✅ Web scraping successful for ${symbol}:`, scrapedData)
      return NextResponse.json(scrapedData)
    }
    
    // Step 6: Final fallback
    console.log(`🔄 Using fallback metadata for ${symbol}`)
    const fallback = getFallbackMetadata(symbol)
    return NextResponse.json(fallback)

  } catch (error) {
    console.error(`❌ Error fetching share metadata for ${symbol}:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions for inference (moved from service to avoid circular dependency)
function inferSector(symbol: string): string {
  const sectorMap: Record<string, string> = {
    // US Companies
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'META': 'Technology',
    'NVDA': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'JPM': 'Financial Services',
    'V': 'Financial Services',
    'JNJ': 'Healthcare',
    'UNH': 'Healthcare',
    'NFLX': 'Communication Services',
    'DIS': 'Communication Services',
    'PG': 'Consumer Staples',
    'KO': 'Consumer Staples',
    'BA': 'Industrials',
    'CAT': 'Industrials',
    'XOM': 'Energy',
    'CVX': 'Energy',
    'LIN': 'Materials',
    'APD': 'Materials',
    'AMT': 'Real Estate',
    'PLD': 'Real Estate',
    'NEE': 'Utilities',
    'DUK': 'Utilities',
    
    // Swiss Companies
    'NOVN': 'Healthcare',
    'ROG': 'Healthcare',
    'NESN': 'Consumer Staples',
    'UBSG': 'Financial Services',
    'CSGN': 'Financial Services',
    'SQN': 'Financial Services',
    'ZURN': 'Financial Services',
    'SREN': 'Consumer Discretionary',
    'GIVN': 'Healthcare',
    'LONN': 'Consumer Staples',
    'SLOG': 'Consumer Staples',
    'BAER': 'Financial Services',
    'CFR': 'Financial Services',
    'SCMN': 'Financial Services',
    'SGS': 'Industrials',
    'TEMN': 'Technology',
    'VZUG': 'Consumer Discretionary',
    'GEBN': 'Consumer Staples',
    'HOLN': 'Consumer Staples',
    'KER': 'Consumer Discretionary',
    'LHN': 'Real Estate',
    'PARG': 'Financial Services',
    'RUS': 'Financial Services',
    'SGSN': 'Financial Services',
    'UHR': 'Consumer Discretionary',
    'VACN': 'Consumer Discretionary',
    
    // Cryptocurrencies
    'BTC': 'Cryptocurrency',
    'ETH': 'Cryptocurrency',
    'ADA': 'Cryptocurrency',
    'DOT': 'Cryptocurrency',
    'SOL': 'Cryptocurrency',
    'ATOM': 'Cryptocurrency',
    'ONDO': 'Cryptocurrency',
  }
  
  return sectorMap[symbol] || 'Technology'
}

function inferCountry(symbol: string): string {
  // Check for Swiss symbols first
  if (symbol.includes('.SW') || symbol.includes('.SWX')) {
    return 'Switzerland'
  }
  
  // Check for specific Swiss companies
  const swissCompanies = ['NOVN', 'ROG', 'NESN', 'UBSG', 'CSGN', 'SQN', 'ZURN', 'SREN', 'GIVN', 'LONN', 'SLOG', 'BAER', 'CFR', 'SCMN', 'SGS', 'TEMN', 'VZUG', 'GEBN', 'HOLN', 'KER', 'LHN', 'PARG', 'RUS', 'SGSN', 'UHR', 'VACN']
  if (swissCompanies.includes(symbol)) {
    return 'Switzerland'
  }
  
  // Check for other European exchanges
  if (symbol.includes('.L') || symbol.includes('.LN')) {
    return 'United Kingdom'
  }
  if (symbol.includes('.AS') || symbol.includes('.AMS')) {
    return 'Netherlands'
  }
  if (symbol.includes('.F') || symbol.includes('.ETR')) {
    return 'Germany'
  }
  if (symbol.includes('.PA') || symbol.includes('.EPA')) {
    return 'France'
  }
  if (symbol.includes('.MI') || symbol.includes('.BIT')) {
    return 'Italy'
  }
  if (symbol.includes('.ST') || symbol.includes('.OMX')) {
    return 'Sweden'
  }
  if (symbol.includes('.OL') || symbol.includes('.OSE')) {
    return 'Norway'
  }
  if (symbol.includes('.VI') || symbol.includes('.WBAG')) {
    return 'Austria'
  }
  if (symbol.includes('.BR') || symbol.includes('.EBR')) {
    return 'Belgium'
  }
  if (symbol.includes('.LS') || symbol.includes('.SIX')) {
    return 'Switzerland'
  }
  
  // Check for US exchanges
  if (symbol.includes('.O') || symbol.includes('.OB')) {
    return 'United States'
  }
  if (symbol.includes('.PK') || symbol.includes('.PINK')) {
    return 'United States'
  }
  
  // Default to US for most symbols
  return 'United States'
}

function inferCurrency(symbol: string): string {
  return 'USD'
}

function inferAssetType(symbol: string): string {
  return 'EQUITY'
}

function inferExchange(symbol: string): string {
  return 'NMS'
}

function getFallbackMetadata(symbol: string): ShareMetadata {
  return {
    symbol: symbol,
    name: symbol,
    sector: inferSector(symbol),
    country: inferCountry(symbol),
    currency: inferCurrency(symbol),
    type: inferAssetType(symbol),
    exchange: inferExchange(symbol),
  }
}

// Web scraping functions for share metadata
async function scrapeShareDataFromWeb(symbol: string): Promise<ShareMetadata | null> {
  try {
    console.log(`🌐 Attempting web scraping for share ${symbol}...`)
    
    // Get a valid session for web scraping
    const session = await yahooFinanceService.getCurrentSession()
    if (!session) {
      console.warn(`⚠️ No session available for web scraping ${symbol}`)
      return null
    }

    // Navigate to the share page
    const page = await yahooFinanceService.createPage()
    try {
      const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      
      // Handle EU disclaimer
      await yahooFinanceService.handleEUDisclaimer(page)
      
      // Wait for the page to load
      await page.waitForTimeout(3000)
      
      // Extract data from the page
      const shareData = await page.evaluate(() => {
        // Look for window.__INITIAL_STATE__ which contains share data
        if ((window as any).__INITIAL_STATE__) {
          const state = (window as any).__INITIAL_STATE__
          return state
        }
        return null
      })
      
      if (shareData) {
        const metadata = parseShareDataFromHTML(shareData, symbol)
        if (metadata) {
          console.log(`✅ Web scraping successful for share ${symbol}`)
          return metadata
        }
      }
      
      console.warn(`⚠️ No share data found in page for ${symbol}`)
      return null
      
    } finally {
      await page.close()
    }
    
  } catch (error) {
    console.error(`❌ Web scraping failed for share ${symbol}:`, error)
    return null
  }
}

function parseShareDataFromHTML(data: any, symbol: string): ShareMetadata | null {
  try {
    console.log(`📊 Parsing share data from HTML for ${symbol}:`, JSON.stringify(data, null, 2))
    
    // Extract from quoteSummary if available
    const summaryProfile = data?.quoteSummary?.result?.[0]?.summaryProfile
    if (summaryProfile) {
      const metadata: ShareMetadata = {
        symbol: symbol,
        name: summaryProfile.longName || summaryProfile.shortName || symbol,
        sector: summaryProfile.sector || inferSector(symbol),
        country: summaryProfile.country || inferCountry(symbol),
        currency: summaryProfile.currency || inferCurrency(symbol),
        type: summaryProfile.quoteType || inferAssetType(symbol),
        exchange: summaryProfile.exchange || inferExchange(symbol),
      }
      
      console.log(`✅ Parsed share metadata from HTML for ${symbol}:`, metadata)
      return metadata
    }
    
    // Try to extract from other data structures
    const quoteData = data?.quoteData?.result?.[0]
    if (quoteData) {
      const metadata: ShareMetadata = {
        symbol: symbol,
        name: quoteData.longName || quoteData.shortName || symbol,
        sector: quoteData.sector || inferSector(symbol),
        country: quoteData.country || inferCountry(symbol),
        currency: quoteData.currency || inferCurrency(symbol),
        type: quoteData.quoteType || inferAssetType(symbol),
        exchange: quoteData.exchange || inferExchange(symbol),
      }
      
      console.log(`✅ Parsed share metadata from quote data for ${symbol}:`, metadata)
      return metadata
    }
    
    console.warn(`⚠️ Could not parse share data from HTML for ${symbol}`)
    return null
    
  } catch (error) {
    console.error(`❌ Error parsing share data from HTML for ${symbol}:`, error)
    return null
  }
} 