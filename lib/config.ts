// API Configuration - Focused on Yahoo Finance only
export const API_CONFIG = {
  // Yahoo Finance (no key required)
  YAHOO_FINANCE: {
    BASE_URL: "https://query1.finance.yahoo.com",
    RATE_LIMIT: 2000, // requests per hour
  },

  // Exchange Rate API for currency conversion
  EXCHANGE_RATE: {
    BASE_URL: "https://api.exchangerate-api.com/v4",
    RATE_LIMIT: 1500, // requests per month for free tier
  },
}

// Validate API configuration
export function validateAPIConfig() {
  const warnings: string[] = []

  // Yahoo Finance doesn't require API keys, so no validation needed
  console.log("Using Yahoo Finance API - no API key required")

  return {
    isValid: true,
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

  getRemainingRequests(apiName: string, limit: number, windowMs = 60000): number {
    const now = Date.now()
    const requests = this.requests.get(apiName) || []
    const validRequests = requests.filter((time) => now - time < windowMs)
    return Math.max(0, limit - validRequests.length)
  }

  getRequestHistory(apiName: string): number[] {
    return this.requests.get(apiName) || []
  }
}

export const rateLimiter = new RateLimiter()
