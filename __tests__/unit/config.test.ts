import { 
  API_CONFIG, 
  API_BASE_URL, 
  YAHOO_FINANCE_API_BASE_URL, 
  YAHOO_FINANCE_API_KEY,
  PDF_WORKER_URL,
  validateAPIConfig,
  RateLimiter,
  rateLimiter
} from '../../lib/config'

describe('Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('API Configuration', () => {
    it('should have Yahoo Finance API configuration', () => {
      expect(API_CONFIG.YAHOO_FINANCE).toBeDefined()
      expect(API_CONFIG.YAHOO_FINANCE.BASE_URL).toBe('https://query1.finance.yahoo.com')
      expect(API_CONFIG.YAHOO_FINANCE.RATE_LIMIT).toBe(2000)
    })

    it('should have Exchange Rate API configuration', () => {
      expect(API_CONFIG.EXCHANGE_RATE).toBeDefined()
      expect(API_CONFIG.EXCHANGE_RATE.BASE_URL).toBe('https://api.exchangerate-api.com/v4')
      expect(API_CONFIG.EXCHANGE_RATE.RATE_LIMIT).toBe(1500)
    })

    it('should use environment variables for API base URL', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://test-api.example.com'
      
      // Re-import to get fresh config
      const { API_BASE_URL: freshApiBaseUrl } = require('../../lib/config')
      expect(freshApiBaseUrl).toBe('https://test-api.example.com')
    })

    it('should have fallback values when environment variables are not set', () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
      
      const { API_BASE_URL: freshApiBaseUrl } = require('../../lib/config')
      expect(freshApiBaseUrl).toBe('/api')
    })
  })

  describe('Yahoo Finance Configuration', () => {
    it('should have Yahoo Finance API base URL', () => {
      expect(YAHOO_FINANCE_API_BASE_URL).toBeDefined()
      expect(typeof YAHOO_FINANCE_API_BASE_URL).toBe('string')
    })

    it('should use environment variable for Yahoo Finance API base URL', () => {
      process.env.NEXT_PUBLIC_YAHOO_FINANCE_API_BASE_URL = 'https://test-yahoo.example.com'
      
      const { YAHOO_FINANCE_API_BASE_URL: freshYahooBaseUrl } = require('../../lib/config')
      expect(freshYahooBaseUrl).toBe('https://test-yahoo.example.com')
    })

    it('should have fallback for Yahoo Finance API base URL', () => {
      delete process.env.NEXT_PUBLIC_YAHOO_FINANCE_API_BASE_URL
      
      const { YAHOO_FINANCE_API_BASE_URL: freshYahooBaseUrl } = require('../../lib/config')
      expect(freshYahooBaseUrl).toBe('/api/yahoo')
    })

    it('should have Yahoo Finance API key', () => {
      expect(YAHOO_FINANCE_API_KEY).toBeDefined()
      expect(typeof YAHOO_FINANCE_API_KEY).toBe('string')
    })

    it('should use environment variable for Yahoo Finance API key', () => {
      process.env.YAHOO_FINANCE_API_KEY = 'test-api-key'
      
      const { YAHOO_FINANCE_API_KEY: freshApiKey } = require('../../lib/config')
      expect(freshApiKey).toBe('test-api-key')
    })

    it('should have fallback for Yahoo Finance API key', () => {
      delete process.env.YAHOO_FINANCE_API_KEY
      
      const { YAHOO_FINANCE_API_KEY: freshApiKey } = require('../../lib/config')
      expect(freshApiKey).toBe('YOUR_YAHOO_FINANCE_API_KEY')
    })
  })

  describe('PDF Configuration', () => {
    it('should have PDF worker URL', () => {
      expect(PDF_WORKER_URL).toBeDefined()
      expect(PDF_WORKER_URL).toContain('pdfjs-dist')
      expect(PDF_WORKER_URL).toContain('pdf.worker.min.mjs')
    })
  })

  describe('API Validation', () => {
    it('should validate API configuration successfully', () => {
      const result = validateAPIConfig()
      
      expect(result.isValid).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('should return valid configuration status', () => {
      const result = validateAPIConfig()
      
      expect(result).toHaveProperty('isValid')
      expect(result).toHaveProperty('warnings')
      expect(typeof result.isValid).toBe('boolean')
      expect(Array.isArray(result.warnings)).toBe(true)
    })
  })

  describe('Rate Limiter', () => {
    let limiter: RateLimiter

    beforeEach(() => {
      limiter = new RateLimiter()
    })

    it('should allow requests within limit', () => {
      expect(limiter.canMakeRequest('test-api', 5)).toBe(true)
      expect(limiter.canMakeRequest('test-api', 5)).toBe(true)
      expect(limiter.canMakeRequest('test-api', 5)).toBe(true)
      expect(limiter.canMakeRequest('test-api', 5)).toBe(true)
      expect(limiter.canMakeRequest('test-api', 5)).toBe(true)
    })

    it('should block requests over limit', () => {
      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        limiter.canMakeRequest('test-api', 5)
      }
      
      // 6th request should be blocked
      expect(limiter.canMakeRequest('test-api', 5)).toBe(false)
    })

    it('should calculate wait time correctly', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.canMakeRequest('test-api', 5)
      }
      
      const waitTime = limiter.getWaitTime('test-api', 5)
      expect(waitTime).toBeGreaterThan(0)
      expect(waitTime).toBeLessThanOrEqual(60000)
    })

    it('should calculate remaining requests correctly', () => {
      expect(limiter.getRemainingRequests('test-api', 5)).toBe(5)
      
      limiter.canMakeRequest('test-api', 5)
      expect(limiter.getRemainingRequests('test-api', 5)).toBe(4)
      
      limiter.canMakeRequest('test-api', 5)
      expect(limiter.getRemainingRequests('test-api', 5)).toBe(3)
    })

    it('should return request history', () => {
      limiter.canMakeRequest('test-api', 5)
      limiter.canMakeRequest('test-api', 5)
      
      const history = limiter.getRequestHistory('test-api')
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBe(2)
    })
  })

  describe('Global Rate Limiter Instance', () => {
    it('should export a global rate limiter instance', () => {
      expect(rateLimiter).toBeInstanceOf(RateLimiter)
    })

    it('should be the same instance across imports', () => {
      const { rateLimiter: rateLimiter2 } = require('../../lib/config')
      expect(rateLimiter).toEqual(rateLimiter2)
    })
  })
})
