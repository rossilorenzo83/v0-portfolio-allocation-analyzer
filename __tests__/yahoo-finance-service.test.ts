import { yahooFinanceService } from '../lib/yahoo-finance-service'

// Mock the api-service to avoid actual API calls during testing
jest.mock('../lib/api-service', () => ({
  apiService: {
    getETFComposition: jest.fn()
  }
}))

describe('YahooFinanceService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  afterAll(async () => {
    // Clean up the service
    await yahooFinanceService.close()
  })

  describe('Session Management', () => {
    it('should establish a valid session with cookies and user agent', async () => {
      // This test will actually establish a real session
      const session = await (yahooFinanceService as any).establishSession()
      
      expect(session).toBeDefined()
      expect(session.cookies).toBeDefined()
      expect(session.userAgent).toBeDefined()
      expect(session.crumb).toBeDefined()
      expect(session.cookies.length).toBeGreaterThan(0)
      expect(session.userAgent).toContain('Mozilla')
    })

    it('should reuse existing session within expiry time', async () => {
      // First call should establish session
      const session1 = await (yahooFinanceService as any).getValidSession()
      
      // Second call should reuse the same session
      const session2 = await (yahooFinanceService as any).getValidSession()
      
      expect(session1).toBe(session2)
      expect(session1.cookies).toBe(session2.cookies)
      expect(session1.userAgent).toBe(session2.userAgent)
    })
  })

  describe('Quote Data', () => {
    it('should fetch real-time quote data for a valid symbol', async () => {
      const quoteData = await yahooFinanceService.getQuote('AAPL')
      
      expect(quoteData).toBeDefined()
      expect(quoteData?.symbol).toBe('AAPL')
      expect(quoteData?.price).toBeGreaterThan(0)
      expect(quoteData?.currency).toBe('USD')
      expect(quoteData?.change).toBeDefined()
      expect(quoteData?.changePercent).toBeDefined()
      expect(quoteData?.lastUpdated).toBeDefined()
    })

    it('should handle invalid symbols gracefully', async () => {
      const quoteData = await yahooFinanceService.getQuote('INVALID_SYMBOL_12345')
      
      expect(quoteData).toBeNull()
    })

    it('should return consistent data format', async () => {
      const quoteData = await yahooFinanceService.getQuote('MSFT')
      
      if (quoteData) {
        expect(typeof quoteData.symbol).toBe('string')
        expect(typeof quoteData.price).toBe('number')
        expect(typeof quoteData.currency).toBe('string')
        expect(typeof quoteData.change).toBe('number')
        expect(typeof quoteData.changePercent).toBe('number')
        expect(typeof quoteData.lastUpdated).toBe('string')
        expect(Number.isFinite(quoteData.price)).toBe(true)
        expect(Number.isFinite(quoteData.change)).toBe(true)
        expect(Number.isFinite(quoteData.changePercent)).toBe(true)
      }
    })
  })

  describe('Search Data', () => {
    it('should fetch search metadata for a valid symbol', async () => {
      const searchData = await yahooFinanceService.searchSymbol('AAPL')
      
      expect(searchData).toBeDefined()
      expect(searchData?.symbol).toBe('AAPL')
      expect(searchData?.name).toBeDefined()
      expect(searchData?.exchange).toBeDefined()
      expect(searchData?.type).toBeDefined()
      expect(searchData?.currency).toBeDefined()
    })

    it('should handle search queries that return no results', async () => {
      const searchData = await yahooFinanceService.searchSymbol('INVALID_SYMBOL_12345')
      
      expect(searchData).toBeNull()
    })

    it('should return consistent search data format', async () => {
      const searchData = await yahooFinanceService.searchSymbol('MSFT')
      
      if (searchData) {
        expect(typeof searchData.symbol).toBe('string')
        expect(typeof searchData.name).toBe('string')
        expect(typeof searchData.exchange).toBe('string')
        expect(typeof searchData.type).toBe('string')
        expect(typeof searchData.currency).toBe('string')
        expect(searchData.symbol.length).toBeGreaterThan(0)
        expect(searchData.name.length).toBeGreaterThan(0)
      }
    })
  })

  describe('ETF Composition', () => {
    it('should fetch ETF composition using existing api-service logic', async () => {
      const { apiService } = require('../lib/api-service')
      
      // Mock the api-service to return test data
      const mockETFData = {
        symbol: 'VWRL',
        domicile: 'IE',
        withholdingTax: 15,
        country: [{ country: 'United States', weight: 65 }],
        sector: [{ sector: 'Technology', weight: 25 }],
        currency: [{ currency: 'USD', weight: 65 }]
      }
      
      apiService.getETFComposition.mockResolvedValue(mockETFData)
      
      const etfData = await yahooFinanceService.getETFComposition('VWRL')
      
      expect(apiService.getETFComposition).toHaveBeenCalledWith('VWRL')
      expect(etfData).toBeDefined()
      expect(etfData?.symbol).toBe('VWRL')
      expect(etfData?.name).toBe('VWRL ETF')
      expect(etfData?.domicile).toBe('IE')
      expect(etfData?.withholdingTax).toBe(15)
      expect(etfData?.country).toEqual([{ country: 'United States', weight: 65 }])
      expect(etfData?.sector).toEqual([{ sector: 'Technology', weight: 25 }])
      expect(etfData?.currency).toEqual([{ currency: 'USD', weight: 65 }])
    })

    it('should handle ETF composition failures gracefully', async () => {
      const { apiService } = require('../lib/api-service')
      
      // Mock the api-service to return null
      apiService.getETFComposition.mockResolvedValue(null)
      
      const etfData = await yahooFinanceService.getETFComposition('INVALID_ETF')
      
      expect(apiService.getETFComposition).toHaveBeenCalledWith('INVALID_ETF')
      expect(etfData).toBeNull()
    })

    it('should handle ETF composition errors gracefully', async () => {
      const { apiService } = require('../lib/api-service')
      
      // Mock the api-service to throw an error
      apiService.getETFComposition.mockRejectedValue(new Error('API Error'))
      
      const etfData = await yahooFinanceService.getETFComposition('ERROR_ETF')
      
      expect(apiService.getETFComposition).toHaveBeenCalledWith('ERROR_ETF')
      expect(etfData).toBeNull()
    })

    it('should return consistent ETF data format', async () => {
      const { apiService } = require('../lib/api-service')
      
      const mockETFData = {
        symbol: 'VT',
        domicile: 'US',
        withholdingTax: 30,
        country: [{ country: 'United States', weight: 100 }],
        sector: [{ sector: 'Diversified', weight: 100 }],
        currency: [{ currency: 'USD', weight: 100 }]
      }
      
      apiService.getETFComposition.mockResolvedValue(mockETFData)
      
      const etfData = await yahooFinanceService.getETFComposition('VT')
      
      if (etfData) {
        expect(typeof etfData.symbol).toBe('string')
        expect(typeof etfData.name).toBe('string')
        expect(typeof etfData.domicile).toBe('string')
        expect(typeof etfData.withholdingTax).toBe('number')
        expect(typeof etfData.expenseRatio).toBe('number')
        expect(Array.isArray(etfData.country)).toBe(true)
        expect(Array.isArray(etfData.sector)).toBe(true)
        expect(Array.isArray(etfData.currency)).toBe(true)
        expect(etfData.country.length).toBeGreaterThan(0)
        expect(etfData.sector.length).toBeGreaterThan(0)
        expect(etfData.currency.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      try {
        const quoteData = await yahooFinanceService.getQuote('AAPL')
        expect(quoteData).toBeNull()
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should handle API errors gracefully', async () => {
      // Mock fetch to simulate API error
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      
      try {
        const quoteData = await yahooFinanceService.getQuote('AAPL')
        expect(quoteData).toBeNull()
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should handle invalid JSON responses gracefully', async () => {
      // Mock fetch to simulate invalid JSON
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })
      
      try {
        const quoteData = await yahooFinanceService.getQuote('AAPL')
        expect(quoteData).toBeNull()
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('Performance', () => {
    it('should reuse sessions efficiently', async () => {
      const startTime = Date.now()
      
      // Make multiple calls to test session reuse
      await yahooFinanceService.getQuote('AAPL')
      await yahooFinanceService.getQuote('MSFT')
      await yahooFinanceService.searchSymbol('GOOGL')
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (session reuse should be fast)
      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should handle concurrent requests', async () => {
      const promises = [
        yahooFinanceService.getQuote('AAPL'),
        yahooFinanceService.getQuote('MSFT'),
        yahooFinanceService.getQuote('GOOGL'),
        yahooFinanceService.searchSymbol('TSLA'),
        yahooFinanceService.searchSymbol('AMZN')
      ]
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      expect(results.some(result => result !== null)).toBe(true)
    })
  })
}) 