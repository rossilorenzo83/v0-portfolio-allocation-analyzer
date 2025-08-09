// Mock fetch globally
global.fetch = jest.fn()

// Mock apiService
jest.mock('../../lib/api-service', () => ({
  apiService: {
    getETFCompositionWithSession: jest.fn().mockResolvedValue({
      symbol: 'VWRL',
      domicile: 'IE',
      withholdingTax: 15,
      country: [{ country: 'United States', weight: 60 }],
      sector: [{ sector: 'Technology', weight: 25 }],
      currency: [{ currency: 'USD', weight: 100 }]
    })
  }
}))

import { yahooFinanceService } from '../../lib/yahoo-finance-service'

describe('Yahoo Finance Service Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(async () => {
    await yahooFinanceService.close()
  })

  describe('Quote Data Fetching - Fallback Mode', () => {
    it('should return fallback data when playwright not available', async () => {
      const quote = await yahooFinanceService.getQuote('AAPL')

      expect(quote).toEqual({
        symbol: 'AAPL',
        price: 0,
        currency: 'USD',
        change: 0,
        changePercent: 0,
        lastUpdated: expect.any(String)
      })
    })

    it('should handle empty symbol gracefully', async () => {
      const quote = await yahooFinanceService.getQuote('')

      expect(quote).toEqual({
        symbol: '',
        price: 0,
        currency: 'USD',
        change: 0,
        changePercent: 0,
        lastUpdated: expect.any(String)
      })
    })

    it('should handle special characters in symbols', async () => {
      const symbols = ['BRK-B', 'VWRL.L', '^GSPC', '0700.HK']
      
      for (const symbol of symbols) {
        const quote = await yahooFinanceService.getQuote(symbol)
        expect(quote?.symbol).toBe(symbol)
        expect(quote?.price).toBe(0) // Fallback mode
      }
    })
  })

  describe('Symbol Search', () => {
    it('should search symbols successfully with valid session', async () => {
      // Mock a valid session
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test-cookies',
        crumb: 'test-crumb',
        userAgent: 'Test UserAgent'
      })

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          quotes: [{
            symbol: 'AAPL',
            longname: 'Apple Inc.',
            exchange: 'NASDAQ',
            quoteType: 'EQUITY',
            currency: 'USD'
          }]
        })
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await yahooFinanceService.searchSymbol('Apple')

      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        type: 'EQUITY',
        currency: 'USD'
      })
    })

    it('should handle search with no results', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ quotes: [] })
      })

      const result = await yahooFinanceService.searchSymbol('NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should handle search API failure', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      const result = await yahooFinanceService.searchSymbol('ERROR')
      expect(result).toBeNull()
    })

    it('should handle search with minimal quote data', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          quotes: [{
            symbol: 'MINIMAL',
            shortname: 'Minimal Corp'
            // Missing other fields
          }]
        })
      })

      const result = await yahooFinanceService.searchSymbol('minimal')

      expect(result).toEqual({
        symbol: 'MINIMAL',
        name: 'Minimal Corp',
        exchange: 'Unknown',
        type: 'EQUITY',
        currency: 'USD'
      })
    })
  })

  describe('ETF Composition', () => {
    it('should fetch ETF composition successfully', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      const composition = await yahooFinanceService.getETFComposition('VWRL')

      expect(composition).toEqual({
        symbol: 'VWRL',
        name: 'VWRL ETF',
        domicile: 'IE',
        withholdingTax: 15,
        expenseRatio: 0.2,
        country: [{ country: 'United States', weight: 60 }],
        sector: [{ sector: 'Technology', weight: 25 }],
        currency: [{ currency: 'USD', weight: 100 }]
      })
    })

    it('should handle ETF composition fetch failure', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      const { apiService } = require('../../lib/api-service')
      apiService.getETFCompositionWithSession.mockResolvedValue(null)

      const composition = await yahooFinanceService.getETFComposition('INVALID')
      expect(composition).toBeNull()
    })

    it('should handle ETF composition with defaults', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      const { apiService } = require('../../lib/api-service')
      apiService.getETFCompositionWithSession.mockResolvedValue({
        symbol: 'MINIMAL'
        // Missing optional fields
      })

      const composition = await yahooFinanceService.getETFComposition('MINIMAL')

      expect(composition).toEqual({
        symbol: 'MINIMAL',
        name: 'MINIMAL ETF',
        domicile: 'US',
        withholdingTax: 30,
        expenseRatio: 0.2,
        country: [{ country: 'Unknown', weight: 100 }],
        sector: [{ sector: 'Diversified', weight: 100 }],
        currency: [{ currency: 'USD', weight: 100 }]
      })
    })

    it('should handle ETF composition errors gracefully', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockRejectedValue(new Error('Session error'))

      const composition = await yahooFinanceService.getETFComposition('ERROR')
      expect(composition).toBeNull()
    })
  })

  describe('Service Lifecycle', () => {
    it('should close browser and reset session', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue(undefined)
      }

      ;(yahooFinanceService as any).browser = mockBrowser

      await yahooFinanceService.close()

      expect(mockBrowser.close).toHaveBeenCalled()
      expect((yahooFinanceService as any).browser).toBeNull()
      expect((yahooFinanceService as any).session).toBeNull()
    })

    it('should handle close when no browser exists', async () => {
      ;(yahooFinanceService as any).browser = null

      await expect(yahooFinanceService.close()).resolves.not.toThrow()
    })

    it('should handle getCurrentSession error', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockRejectedValue(new Error('Session error'))

      const session = await yahooFinanceService.getCurrentSession()
      expect(session).toBeNull()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const search = await yahooFinanceService.searchSymbol('NETWORK_ERROR')
      expect(search).toBeNull()
    })

    it('should handle JSON parsing errors', async () => {
      jest.spyOn(yahooFinanceService as any, 'getValidSession').mockResolvedValue({
        cookies: 'test', crumb: 'test', userAgent: 'test'
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      const search = await yahooFinanceService.searchSymbol('INVALID_JSON')
      expect(search).toBeNull()
    })

    it('should handle different currency responses', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF']
      
      for (const currency of currencies) {
        const quote = await yahooFinanceService.getQuote(`TEST_${currency}`)
        expect(quote?.currency).toBe('USD') // Always USD in fallback mode
      }
    })

    it('should handle special symbols correctly', async () => {
      const specialSymbols = ['BRK.B', 'VWRL.L', '^GSPC', '0700.HK', 'BTC-USD']
      
      for (const symbol of specialSymbols) {
        const quote = await yahooFinanceService.getQuote(symbol)
        expect(quote?.symbol).toBe(symbol)
      }
    })
  })
})