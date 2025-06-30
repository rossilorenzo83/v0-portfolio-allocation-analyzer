// API Configuration
export const API_CONFIG = {
  // Alpha Vantage API
  ALPHA_VANTAGE: {
    KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || "demo",
    BASE_URL: "https://www.alphavantage.co/query",
    RATE_LIMIT: 5, // requests per minute for free tier
  },

  // Finnhub API
  FINNHUB: {
    KEY: process.env.NEXT_PUBLIC_FINNHUB_KEY || "demo",
    BASE_URL: "https://finnhub.io/api/v1",
    RATE_LIMIT: 60, // requests per minute for free tier
  },

  // Yahoo Finance (no key required)
  YAHOO_FINANCE: {
    BASE_URL: "https://query1.finance.yahoo.com",
    RATE_LIMIT: 2000, // requests per hour
  },

  // CoinGecko API (no key required for basic usage)
  COINGECKO: {
    BASE_URL: "https://api.coingecko.com/api/v3",
    RATE_LIMIT: 50, // requests per minute for free tier
  },

  // Exchange Rate API
  EXCHANGE_RATE: {
    BASE_URL: "https://api.exchangerate-api.com/v4",
    RATE_LIMIT: 1500, // requests per month for free tier
  },
}

// Validate API configuration
export function validateAPIConfig() {
  const warnings: string[] = []

  if (API_CONFIG.ALPHA_VANTAGE.KEY === "demo") {
    warnings.push("Alpha Vantage API key not configured - using demo key with limited functionality")
  }

  if (API_CONFIG.FINNHUB.KEY === "demo") {
    warnings.push("Finnhub API key not configured - using demo key with limited functionality")
  }

  if (warnings.length > 0) {
    console.warn("API Configuration Warnings:", warnings)
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  canMakeRequest(apiName: string, limit: number, windowMs = 60000): boolean {
    const now = Date.now()
    const requests = this.requests.get(apiName) || []

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < windowMs)

    if (validRequests.length >= limit) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(apiName, validRequests)

    return true
  }

  getWaitTime(apiName: string, limit: number, windowMs = 60000): number {
    const requests = this.requests.get(apiName) || []
    if (requests.length < limit) return 0

    const oldestRequest = Math.min(...requests)
    return Math.max(0, windowMs - (Date.now() - oldestRequest))
  }
}

export const rateLimiter = new RateLimiter()
