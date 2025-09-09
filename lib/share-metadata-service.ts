// Share/Stock Metadata Service
// Handles fetching sector, country, and other metadata for individual shares/stocks

import { YahooSession, AssetMetadata } from '@/types/yahoo'

// Alias AssetMetadata as ShareMetadata for compatibility
type ShareMetadata = AssetMetadata

class ShareMetadataService {
  private cache = new Map<string, { data: ShareMetadata; timestamp: number; ttl: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly RATE_LIMIT_DELAY = 200

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }
    return null
  }

  private setCache<T>(key: string, data: T, ttlMinutes: number): void {
    this.cache.set(key, {
      data: data as any,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    })
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const lastCall = this.rateLimitMap.get('metadata') || 0
    const timeSinceLastCall = now - lastCall
    
    if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastCall))
    }
    
    this.rateLimitMap.set('metadata', Date.now())
  }

  async getShareMetadataWithSession(symbol: string, session: YahooSession): Promise<ShareMetadata | null> {
    const cacheKey = `share_metadata_${symbol}`
    const cached = this.getCached<ShareMetadata>(cacheKey)
    if (cached) return cached

    console.log(`📊 Fetching share metadata for ${symbol} with session`)

    try {
      await this.rateLimit()
      
      // Use Next.js API route instead of direct external API calls
      const url = `/api/yahoo/share-metadata/${encodeURIComponent(symbol)}`
      
      console.log(`🔗 Making API call to: ${url}`)
      
      const response = await fetch(url)

      if (response.ok) {
        const metadata = await response.json()
        
        if (metadata && metadata.symbol) {
          console.log(`✅ Real share metadata found for ${symbol} via API route:`, metadata)
          this.setCache(cacheKey, metadata, 60) // Cache for 1 hour
          return metadata
        } else {
          console.warn(`⚠️ Invalid metadata response for ${symbol}`)
        }
      } else {
        console.warn(`⚠️ API route failed for ${symbol}: ${response.status} - ${response.statusText}`)
      }
      
    } catch (error) {
      console.error(`❌ Error fetching share metadata for ${symbol}:`, error)
    }

    // Return fallback with better inference
    console.log(`🔄 Using fallback metadata for ${symbol}`)
    const fallback = this.getFallbackMetadata(symbol)
    this.setCache(cacheKey, fallback, 60)
    return fallback
  }

  // Helper methods for inference
  private inferSector(symbol: string): string {
    // Simple sector inference based on symbol patterns
    const sectorMap: Record<string, string> = {
      // Technology
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'META': 'Technology',
      'NVDA': 'Technology',
      'ADBE': 'Technology',
      'CRM': 'Technology',
      'ORCL': 'Technology',
      'CSCO': 'Technology',
      'INTC': 'Technology',
      'AMD': 'Technology',
      'QCOM': 'Technology',
      'AVGO': 'Technology',
      'TXN': 'Technology',
      'MU': 'Technology',
      'KLAC': 'Technology',
      'LRCX': 'Technology',
      'ADI': 'Technology',
      'MCHP': 'Technology',
      'MRVL': 'Technology',
      
      // Consumer Discretionary
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Consumer Discretionary',
      'HD': 'Consumer Discretionary',
      'NKE': 'Consumer Discretionary',
      'SBUX': 'Consumer Discretionary',
      'MCD': 'Consumer Discretionary',
      'LOW': 'Consumer Discretionary',
      'TJX': 'Consumer Discretionary',
      'BKNG': 'Consumer Discretionary',
      'MAR': 'Consumer Discretionary',
      'HLT': 'Consumer Discretionary',
      'YUM': 'Consumer Discretionary',
      'CMG': 'Consumer Discretionary',
      'DRI': 'Consumer Discretionary',
      'ROST': 'Consumer Discretionary',
      
      // Financial Services
      'JPM': 'Financial Services',
      'V': 'Financial Services',
      'MA': 'Financial Services',
      'BAC': 'Financial Services',
      'WFC': 'Financial Services',
      'GS': 'Financial Services',
      'MS': 'Financial Services',
      'BLK': 'Financial Services',
      'C': 'Financial Services',
      'USB': 'Financial Services',
      'PNC': 'Financial Services',
      'COF': 'Financial Services',
      'AXP': 'Financial Services',
      'SCHW': 'Financial Services',
      'TFC': 'Financial Services',
      'CB': 'Financial Services',
      'MET': 'Financial Services',
      'PRU': 'Financial Services',
      'AIG': 'Financial Services',
      'ALL': 'Financial Services',
      
      // Healthcare
      'JNJ': 'Healthcare',
      'UNH': 'Healthcare',
      'PFE': 'Healthcare',
      'ABBV': 'Healthcare',
      'TMO': 'Healthcare',
      'ABT': 'Healthcare',
      'DHR': 'Healthcare',
      'LLY': 'Healthcare',
      'BMY': 'Healthcare',
      'AMGN': 'Healthcare',
      'GILD': 'Healthcare',
      'CVS': 'Healthcare',
      'CI': 'Healthcare',
      'ANTM': 'Healthcare',
      'HUM': 'Healthcare',
      'ISRG': 'Healthcare',
      'REGN': 'Healthcare',
      'VRTX': 'Healthcare',
      'BIIB': 'Healthcare',
      'ALXN': 'Healthcare',
      
      // Communication Services
      'NFLX': 'Communication Services',
      'DIS': 'Communication Services',
      'CMCSA': 'Communication Services',
      'CHTR': 'Communication Services',
      'VZ': 'Communication Services',
      'T': 'Communication Services',
      'TMUS': 'Communication Services',
      'FOX': 'Communication Services',
      'FOXA': 'Communication Services',
      'PARA': 'Communication Services',
      'WBD': 'Communication Services',
      'LYV': 'Communication Services',
      'MTCH': 'Communication Services',
      'SNAP': 'Communication Services',
      'TWTR': 'Communication Services',
      'PINS': 'Communication Services',
      'ZG': 'Communication Services',
      'RBLX': 'Communication Services',
      'SPOT': 'Communication Services',
      'TTD': 'Communication Services',
      
      // Consumer Staples
      'PG': 'Consumer Staples',
      'KO': 'Consumer Staples',
      'PEP': 'Consumer Staples',
      'WMT': 'Consumer Staples',
      'COST': 'Consumer Staples',
      'PM': 'Consumer Staples',
      'MO': 'Consumer Staples',
      'EL': 'Consumer Staples',
      'CL': 'Consumer Staples',
      'GIS': 'Consumer Staples',
      'KMB': 'Consumer Staples',
      'HSY': 'Consumer Staples',
      'SJM': 'Consumer Staples',
      'CAG': 'Consumer Staples',
      'K': 'Consumer Staples',
      'HRL': 'Consumer Staples',
      'CPB': 'Consumer Staples',
      'TSN': 'Consumer Staples',
      'ADM': 'Consumer Staples',
      
      // Industrials
      'BA': 'Industrials',
      'CAT': 'Industrials',
      'MMM': 'Industrials',
      'UPS': 'Industrials',
      'RTX': 'Industrials',
      'LMT': 'Industrials',
      'NOC': 'Industrials',
      'GD': 'Industrials',
      'HON': 'Industrials',
      'EMR': 'Industrials',
      'ETN': 'Industrials',
      'ITW': 'Industrials',
      'DOV': 'Industrials',
      'PH': 'Industrials',
      'XYL': 'Industrials',
      'AME': 'Industrials',
      'FTV': 'Industrials',
      'OTIS': 'Industrials',
      'CTAS': 'Industrials',
      'FAST': 'Industrials',
      
      // Energy
      'XOM': 'Energy',
      'CVX': 'Energy',
      'COP': 'Energy',
      'EOG': 'Energy',
      'SLB': 'Energy',
      'PSX': 'Energy',
      'VLO': 'Energy',
      'MPC': 'Energy',
      'OXY': 'Energy',
      'HAL': 'Energy',
      'BKR': 'Energy',
      'KMI': 'Energy',
      'WMB': 'Energy',
      'OKE': 'Energy',
      'PXD': 'Energy',
      'DVN': 'Energy',
      'HES': 'Energy',
      'FANG': 'Energy',
      'CTRA': 'Energy',
      'APA': 'Energy',
      
      // Materials
      'LIN': 'Materials',
      'APD': 'Materials',
      'ECL': 'Materials',
      'SHW': 'Materials',
      'NEM': 'Materials',
      'FCX': 'Materials',
      'NUE': 'Materials',
      'BLL': 'Materials',
      'ALB': 'Materials',
      'DOW': 'Materials',
      'DD': 'Materials',
      'IFF': 'Materials',
      'VMC': 'Materials',
      'MLM': 'Materials',
      'X': 'Materials',
      'AA': 'Materials',
      
      // Real Estate
      'AMT': 'Real Estate',
      'PLD': 'Real Estate',
      'CCI': 'Real Estate',
      'EQIX': 'Real Estate',
      'PSA': 'Real Estate',
      'SPG': 'Real Estate',
      'O': 'Real Estate',
      'DLR': 'Real Estate',
      'WELL': 'Real Estate',
      'AVB': 'Real Estate',
      'EQR': 'Real Estate',
      'MAA': 'Real Estate',
      'ESS': 'Real Estate',
      'UDR': 'Real Estate',
      'ARE': 'Real Estate',
      'VICI': 'Real Estate',
      'IRM': 'Real Estate',
      'WY': 'Real Estate',
      'BXP': 'Real Estate',
      'KIM': 'Real Estate',
      
      // Utilities
      'NEE': 'Utilities',
      'DUK': 'Utilities',
      'SO': 'Utilities',
      'D': 'Utilities',
      'AEP': 'Utilities',
      'SRE': 'Utilities',
      'XEL': 'Utilities',
      'WEC': 'Utilities',
      'DTE': 'Utilities',
      'ED': 'Utilities',
      'EIX': 'Utilities',
      'PEG': 'Utilities',
      'AEE': 'Utilities',
      'CMS': 'Utilities',
      'CNP': 'Utilities',
      'ETR': 'Utilities',
      'FE': 'Utilities',
      'PCG': 'Utilities',
      'PPL': 'Utilities',
      'VST': 'Utilities',
      
      // Cryptocurrency
      'BTC': 'Cryptocurrency',
      'ETH': 'Cryptocurrency',
      'ADA': 'Cryptocurrency',
      'DOT': 'Cryptocurrency',
      'SOL': 'Cryptocurrency',
      'ATOM': 'Cryptocurrency',
      'ONDO': 'Cryptocurrency',
      'XRP': 'Cryptocurrency',
      'LTC': 'Cryptocurrency',
      'BCH': 'Cryptocurrency',
      'LINK': 'Cryptocurrency',
      'UNI': 'Cryptocurrency',
      'AVAX': 'Cryptocurrency',
      'MATIC': 'Cryptocurrency',
      'ALGO': 'Cryptocurrency',
      'VET': 'Cryptocurrency',
      'ICP': 'Cryptocurrency',
      'FIL': 'Cryptocurrency',
      'THETA': 'Cryptocurrency',
      'XLM': 'Cryptocurrency',
    }
    
    return sectorMap[symbol] || 'Unknown'
  }

  private inferCountry(symbol: string): string {
    // Simple country inference based on symbol patterns
    const countryMap: Record<string, string> = {
      // US Stocks
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
      'PG': 'United States',
      'V': 'United States',
      'HD': 'United States',
      'MA': 'United States',
      'UNH': 'United States',
      'DIS': 'United States',
      'PYPL': 'United States',
      'ADBE': 'United States',
      'CRM': 'United States',
      'NKE': 'United States',
      'BAC': 'United States',
      'WFC': 'United States',
      'GS': 'United States',
      'MS': 'United States',
      'BLK': 'United States',
      'C': 'United States',
      'USB': 'United States',
      'PNC': 'United States',
      'COF': 'United States',
      'AXP': 'United States',
      'SCHW': 'United States',
      'TFC': 'United States',
      'CB': 'United States',
      'MET': 'United States',
      'PRU': 'United States',
      'AIG': 'United States',
      'ALL': 'United States',
      'PFE': 'United States',
      'ABBV': 'United States',
      'TMO': 'United States',
      'ABT': 'United States',
      'DHR': 'United States',
      'LLY': 'United States',
      'BMY': 'United States',
      'AMGN': 'United States',
      'GILD': 'United States',
      'CVS': 'United States',
      'CI': 'United States',
      'ANTM': 'United States',
      'HUM': 'United States',
      'ISRG': 'United States',
      'REGN': 'United States',
      'VRTX': 'United States',
      'BIIB': 'United States',
      'ALXN': 'United States',
      'KO': 'United States',
      'PEP': 'United States',
      'WMT': 'United States',
      'COST': 'United States',
      'PM': 'United States',
      'MO': 'United States',
      'EL': 'United States',
      'CL': 'United States',
      'GIS': 'United States',
      'KMB': 'United States',
      'HSY': 'United States',
      'SJM': 'United States',
      'CAG': 'United States',
      'K': 'United States',
      'HRL': 'United States',
      'CPB': 'United States',
      'TSN': 'United States',
      'ADM': 'United States',
      'BA': 'United States',
      'CAT': 'United States',
      'MMM': 'United States',
      'UPS': 'United States',
      'RTX': 'United States',
      'LMT': 'United States',
      'NOC': 'United States',
      'GD': 'United States',
      'HON': 'United States',
      'EMR': 'United States',
      'ETN': 'United States',
      'ITW': 'United States',
      'DOV': 'United States',
      'PH': 'United States',
      'XYL': 'United States',
      'AME': 'United States',
      'FTV': 'United States',
      'OTIS': 'United States',
      'CTAS': 'United States',
      'FAST': 'United States',
      'XOM': 'United States',
      'CVX': 'United States',
      'COP': 'United States',
      'EOG': 'United States',
      'SLB': 'United States',
      'PSX': 'United States',
      'VLO': 'United States',
      'MPC': 'United States',
      'OXY': 'United States',
      'HAL': 'United States',
      'BKR': 'United States',
      'KMI': 'United States',
      'WMB': 'United States',
      'OKE': 'United States',
      'PXD': 'United States',
      'DVN': 'United States',
      'HES': 'United States',
      'FANG': 'United States',
      'CTRA': 'United States',
      'APA': 'United States',
      'LIN': 'United States',
      'APD': 'United States',
      'ECL': 'United States',
      'SHW': 'United States',
      'NEM': 'United States',
      'FCX': 'United States',
      'NUE': 'United States',
      'BLL': 'United States',
      'ALB': 'United States',
      'DOW': 'United States',
      'DD': 'United States',
      'IFF': 'United States',
      'VMC': 'United States',
      'MLM': 'United States',
      'X': 'United States',
      'AA': 'United States',
      'AMT': 'United States',
      'PLD': 'United States',
      'CCI': 'United States',
      'EQIX': 'United States',
      'PSA': 'United States',
      'SPG': 'United States',
      'O': 'United States',
      'DLR': 'United States',
      'WELL': 'United States',
      'AVB': 'United States',
      'EQR': 'United States',
      'MAA': 'United States',
      'ESS': 'United States',
      'UDR': 'United States',
      'ARE': 'United States',
      'VICI': 'United States',
      'IRM': 'United States',
      'WY': 'United States',
      'BXP': 'United States',
      'KIM': 'United States',
      'NEE': 'United States',
      'DUK': 'United States',
      'SO': 'United States',
      'D': 'United States',
      'AEP': 'United States',
      'SRE': 'United States',
      'XEL': 'United States',
      'WEC': 'United States',
      'DTE': 'United States',
      'ED': 'United States',
      'EIX': 'United States',
      'PEG': 'United States',
      'AEE': 'United States',
      'CMS': 'United States',
      'CNP': 'United States',
      'ETR': 'United States',
      'FE': 'United States',
      'PCG': 'United States',
      'PPL': 'United States',
      'VST': 'United States',
      
      // Cryptocurrency (Global)
      'BTC': 'Global',
      'ETH': 'Global',
      'ADA': 'Global',
      'DOT': 'Global',
      'SOL': 'Global',
      'ATOM': 'Global',
      'ONDO': 'Global',
      'XRP': 'Global',
      'LTC': 'Global',
      'BCH': 'Global',
      'LINK': 'Global',
      'UNI': 'Global',
      'AVAX': 'Global',
      'MATIC': 'Global',
      'ALGO': 'Global',
      'VET': 'Global',
      'ICP': 'Global',
      'FIL': 'Global',
      'THETA': 'Global',
      'XLM': 'Global',
    }
    
    return countryMap[symbol] || 'United States'
  }

  private inferCurrency(symbol: string): string {
    // Most US stocks are in USD
    return 'USD'
  }

  private inferAssetType(symbol: string): string {
    // Most individual stocks are EQUITY
    return 'EQUITY'
  }

  private inferExchange(symbol: string): string {
    // Most US stocks are on major exchanges
    return 'NMS'
  }

  private getFallbackMetadata(symbol: string): ShareMetadata {
    return {
      symbol,
      name: symbol,
      sector: this.inferSector(symbol),
      country: this.inferCountry(symbol),
      currency: this.inferCurrency(symbol),
      type: this.inferAssetType(symbol),
      exchange: this.inferExchange(symbol),
    }
  }
}

// Export singleton instance
export const shareMetadataService = new ShareMetadataService()
export type { ShareMetadata, YahooSession } 