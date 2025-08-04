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

    console.log(`📊 Fetching share metadata for ${symbol} with session`)

    // Make the external API call server-side using the session
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,summaryDetail`
    
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
      const summaryProfile = data.quoteSummary?.result?.[0]?.summaryProfile
      const summaryDetail = data.quoteSummary?.result?.[0]?.summaryDetail
      
      if (summaryProfile) {
        const metadata: ShareMetadata = {
          symbol: symbol, // Always return original symbol
          name: summaryProfile.longName || summaryProfile.shortName || symbol,
          sector: summaryProfile.sector || inferSector(symbol),
          country: summaryProfile.country || inferCountry(symbol),
          currency: summaryProfile.currency || inferCurrency(symbol),
          type: summaryProfile.quoteType || inferAssetType(symbol),
          exchange: summaryProfile.exchange || inferExchange(symbol),
        }

        console.log(`✅ Real share metadata found for ${symbol} with session:`, metadata)
        return NextResponse.json(metadata)
      } else {
        console.warn(`⚠️ No summaryProfile found in response for ${symbol}`)
      }
    } else {
      console.warn(`⚠️ External API request failed for ${symbol}: ${response.status} - ${response.statusText}`)
    }
    
    // Fallback to search API if quoteSummary fails
    console.log(`🔄 quoteSummary failed for ${symbol}, trying search API with session...`)
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}`
    const searchResponse = await fetch(searchUrl, { headers })

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      const result = searchData.quotes?.[0]
      if (result) {
        // Check if the search result is actually relevant to our symbol
        const searchName = (result.longname || result.shortname || '').toLowerCase()
        const symbolLower = symbol.toLowerCase()
        
        // If the search result doesn't match our symbol well, use inference instead
        const isRelevantResult = searchName.includes(symbolLower) || 
                                symbolLower.includes(searchName) ||
                                searchName.includes('inc') || 
                                searchName.includes('corp') ||
                                searchName.includes('ltd')
        
        const metadata: ShareMetadata = {
          symbol: symbol, // Always return original symbol
          name: isRelevantResult ? (result.longname || result.shortname || symbol) : symbol,
          sector: inferSector(symbol), // Always use inference for sector
          country: inferCountry(symbol), // Always use inference for country
          currency: result.currency || inferCurrency(symbol),
          type: inferAssetType(symbol),
          exchange: result.exchange || inferExchange(symbol),
        }

        console.log(`✅ Search share metadata found for ${symbol} with session:`, metadata)
        return NextResponse.json(metadata)
      } else {
        console.warn(`⚠️ No search results found for ${symbol}`)
      }
    } else {
      console.warn(`⚠️ Search API also failed for ${symbol}: ${searchResponse.status}`)
    }

    // Return fallback
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
    'BTC': 'Cryptocurrency',
    'ETH': 'Cryptocurrency',
    'ADA': 'Cryptocurrency',
    'DOT': 'Cryptocurrency',
    'SOL': 'Cryptocurrency',
    'ATOM': 'Cryptocurrency',
    'ONDO': 'Cryptocurrency',
  }
  
  return sectorMap[symbol] || 'Unknown'
}

function inferCountry(symbol: string): string {
  const countryMap: Record<string, string> = {
    'AAPL': 'United States',
    'MSFT': 'United States',
    'GOOGL': 'United States',
    'AMZN': 'United States',
    'TSLA': 'United States',
    'META': 'United States',
    'NVDA': 'United States',
    'NFLX': 'United States',
    'JPM': 'United States',
    'JNJ': 'United States',
    'UNH': 'United States',
    'DIS': 'United States',
    'PG': 'United States',
    'KO': 'United States',
    'BA': 'United States',
    'CAT': 'United States',
    'XOM': 'United States',
    'CVX': 'United States',
    'LIN': 'United States',
    'APD': 'United States',
    'AMT': 'United States',
    'PLD': 'United States',
    'NEE': 'United States',
    'DUK': 'United States',
    'BTC': 'Global',
    'ETH': 'Global',
    'ADA': 'Global',
    'DOT': 'Global',
    'SOL': 'Global',
    'ATOM': 'Global',
    'ONDO': 'Global',
  }
  
  return countryMap[symbol] || 'United States'
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
    symbol,
    name: symbol,
    sector: inferSector(symbol),
    country: inferCountry(symbol),
    currency: inferCurrency(symbol),
    type: inferAssetType(symbol),
    exchange: inferExchange(symbol),
  }
} 