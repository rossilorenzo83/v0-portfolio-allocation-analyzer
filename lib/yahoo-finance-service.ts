// Conditional import for Playwright - only on server side
let playwright: any = null
let Browser: any = null
let Page: any = null

if (typeof window === 'undefined') {
  // Server-side only
  try {
    playwright = require('playwright')
    Browser = playwright.Browser
    Page = playwright.Page
  } catch (error) {
    console.warn('Playwright not available:', error)
  }
}

import { apiService } from './api-service'

interface YahooSession {
  cookies: string
  crumb: string
  userAgent: string
}

interface QuoteData {
  symbol: string
  price: number
  currency: string
  change: number
  changePercent: number
  lastUpdated: string
}

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
  currency: string
}

interface ETFComposition {
  symbol: string
  name: string
  domicile: string
  withholdingTax: number
  expenseRatio: number
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
  currency: Array<{ currency: string; weight: number }>
}

class YahooFinanceService {
  private browser: any = null
  private session: YahooSession | null = null
  private sessionExpiry: number = 0
  private readonly SESSION_DURATION = 5 * 60 * 1000 // 5 minutes (as requested)

  private async getBrowser(): Promise<any> {
    if (!playwright) {
      throw new Error('Playwright not available on client side')
    }
    
    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })
    }
    return this.browser
  }

  async createPage(): Promise<any> {
    if (!playwright) {
      throw new Error('Playwright not available on client side')
    }
    
    if (!this.browser) {
      this.browser = await this.getBrowser()
    }
    
    return await this.browser.newPage()
  }

  async handleEUDisclaimer(page: any): Promise<void> {
    if (!playwright) {
      throw new Error('Playwright not available on client side')
    }
    
    try {
      console.log('🔍 Checking for EU disclaimer...')
      
      // Wait for potential disclaimer elements
      const disclaimerSelectors = [
        '[data-testid="consent-accept-all"]',
        '[data-testid="accept-all"]',
        'button[aria-label*="Accept"]',
        'button[aria-label*="Accept all"]',
        'button:has-text("Accept all")',
        'button:has-text("Accept")',
        '.accept-all',
        '#consent-accept-all'
      ]

      for (const selector of disclaimerSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            console.log(`✅ Found disclaimer element: ${selector}`)
            await element.click()
            await page.waitForTimeout(2000) // Wait for page to load
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (error) {
      console.log('⚠️ No EU disclaimer found or error handling it:', error)
    }
  }

  private async extractCrumbFromPage(page: any): Promise<string | null> {
    if (!playwright) {
      throw new Error('Playwright not available on client side')
    }
    
    try {
      console.log('🔑 Attempting to extract crumb token...')
      
      // Try multiple methods to extract crumb
      const crumbScript = await page.evaluate(() => {
        // Method 1: Look for CrumbStore in script tags
        const scripts = document.querySelectorAll('script')
        for (const script of Array.from(scripts)) {
          const content = script.textContent || ''
          const crumbMatch = content.match(/CrumbStore":\s*{\s*"crumb":\s*"([^"]+)"/)
          if (crumbMatch) {
            return crumbMatch[1]
          }
        }
        
        // Method 2: Look for crumb in window.__INITIAL_STATE__
        if ((window as any).__INITIAL_STATE__) {
          const state = (window as any).__INITIAL_STATE__
          if (state.crumb) {
            return state.crumb
          }
        }
        
        // Method 3: Look for crumb in meta tags
        const metaCrumb = document.querySelector('meta[name="crumb"]')
        if (metaCrumb) {
          return metaCrumb.getAttribute('content')
        }
        
        // Method 4: Look for crumb in any script with "crumb" in it
        for (const script of Array.from(scripts)) {
          const content = script.textContent || ''
          const crumbMatch = content.match(/"crumb":\s*"([^"]+)"/)
          if (crumbMatch) {
            return crumbMatch[1]
          }
        }
        
        return null
      })
      
      if (crumbScript && crumbScript !== 'default-crumb') {
        console.log('✅ Crumb token extracted successfully')
        return crumbScript
      }
      
      console.log('⚠️ Crumb token not found, will try without crumb')
      return null
    } catch (error) {
      console.log('⚠️ Error extracting crumb token:', error)
      return null
    }
  }

  private async establishSession(): Promise<YahooSession> {
    console.log('🔐 Establishing new Yahoo Finance session...')
    
    const page = await this.createPage()
    
    try {
      // Navigate to Yahoo Finance homepage with shorter timeout
      await page.goto('https://finance.yahoo.com', { waitUntil: 'domcontentloaded', timeout: 15000 })
      
      // Handle EU disclaimer
      await this.handleEUDisclaimer(page)
      
      // Wait a bit for the page to settle
      await page.waitForTimeout(2000)
      
      // Get cookies and filter only essential ones
      const allCookies = await page.context().cookies()
      const essentialCookies = allCookies.filter((cookie: any) => 
        ['B', 'A1', 'A3', 'A1S', 'A2', 'GUC', 'cmp', 'euconsent-v2'].includes(cookie.name)
      )
      const cookieString = essentialCookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
      
      // Get user agent
      const userAgent = await page.evaluate(() => navigator.userAgent)
      
      // Try to extract crumb, but don't fail if not found
      const crumb = await this.extractCrumbFromPage(page)
      
      const session: YahooSession = {
        cookies: cookieString,
        crumb: crumb || '',
        userAgent: userAgent
      }
      
      console.log('✅ New session established successfully')
      console.log(`🍪 Essential cookies: ${essentialCookies.length}/${allCookies.length} cookies`)
      console.log(`🍪 Cookie string length: ${cookieString.length} chars`)
      if (crumb) {
        console.log(`🔑 Crumb: ${crumb.substring(0, 10)}...`)
      } else {
        console.log('⚠️ No crumb found, using default')
      }
      
      return session
      
    } finally {
      await page.close()
    }
  }

  private async getValidSession(): Promise<YahooSession> {
    const now = Date.now()
    
    if (!this.session || now > this.sessionExpiry) {
      console.log('🔄 Session expired or not available, establishing new session...')
      this.session = await this.establishSession()
      this.sessionExpiry = now + this.SESSION_DURATION
      console.log(`⏰ Session will expire at: ${new Date(this.sessionExpiry).toLocaleTimeString()}`)
    } else {
      const remainingTime = Math.round((this.sessionExpiry - now) / 1000)
      console.log(`📋 Using cached session (${remainingTime}s remaining)`)
    }
    
    return this.session
  }

  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      // Check if Playwright is available
      if (!playwright) {
        console.log('⚠️ Playwright not available, using fallback quote data')
        return {
          symbol,
          price: 0,
          currency: 'USD',
          change: 0,
          changePercent: 0,
          lastUpdated: new Date().toISOString()
        }
      }
      
      const session = await this.getValidSession()
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
      
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
      
      const response = await fetch(url, { headers })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const result = data.chart?.result?.[0]
      
      if (!result) {
        throw new Error('No chart data found')
      }

      const meta = result.meta
      const currentPrice = meta.regularMarketPrice || meta.previousClose
      const previousClose = meta.previousClose || currentPrice
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

      // Add null checks before calling toFixed
      if (currentPrice === undefined || currentPrice === null) {
        throw new Error('No valid price data found')
      }

      return {
        symbol: symbol,
        price: Number(currentPrice.toFixed(2)),
        currency: meta.currency || 'USD',
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }

  async searchSymbol(query: string): Promise<SearchResult | null> {
    try {
      const session = await this.getValidSession()
      
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`
      
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
      
      const response = await fetch(url, { headers })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const quotes = data.quotes || []
      
      if (quotes.length === 0) {
        throw new Error('No search results found')
      }

      const quote = quotes[0]
      
      return {
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange || quote.fullExchangeName || 'Unknown',
        type: quote.quoteType || 'EQUITY',
        currency: quote.currency || 'USD',
      }
    } catch (error) {
      console.error(`Error searching for ${query}:`, error)
      return null
    }
  }

  async getETFComposition(symbol: string): Promise<ETFComposition | null> {
    try {
      // Get the current session first
      const session = await this.getValidSession()
      
      // Use the existing working logic from api-service.ts, but pass session data
      console.log(`📊 Using existing api-service logic for ETF composition: ${symbol}`)
      
      // Pass session data to apiService for authenticated calls
      const etfData = await apiService.getETFCompositionWithSession(symbol, session)
      
      if (etfData) {
        // Convert the api-service format to our format
        return {
          symbol: etfData.symbol,
          name: `${symbol} ETF`, // Use symbol as name since api-service doesn't have name
          domicile: etfData.domicile || 'US',
          withholdingTax: etfData.withholdingTax || 30,
          expenseRatio: 0.2, // Default
          country: etfData.country || [{ country: 'Unknown', weight: 100 }],
          sector: etfData.sector || [{ sector: 'Diversified', weight: 100 }],
          currency: etfData.currency || [{ currency: 'USD', weight: 100 }],
        }
      }
      
      return null
    } catch (error) {
      console.error(`Error fetching ETF composition for ${symbol}:`, error)
      return null
    }
  }

  // Add method to get current session for external use
  async getCurrentSession(): Promise<YahooSession | null> {
    try {
      return await this.getValidSession()
    } catch (error) {
      console.error('Error getting current session:', error)
      return null
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
    this.session = null
  }
}

// Export singleton instance
export const yahooFinanceService = new YahooFinanceService()

// Export types
export type { QuoteData, SearchResult, ETFComposition, YahooSession } 