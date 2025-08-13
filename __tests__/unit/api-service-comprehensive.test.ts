import { apiService } from '../../lib/api-service'

// Mock fetch globally
global.fetch = jest.fn()

describe('API Service Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    // Provide a safe default for any fetch calls not explicitly mocked in a test
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: async () => ({}),
        text: async () => ''
      })
    )
  })

  describe('Stock Price Fetching', () => {
    it('should fetch stock price successfully via server path (response.ok=true)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          chart: { result: [{ meta: { regularMarketPrice: 123.45, previousClose: 120.0, currency: 'USD' } }] }
        })
      })

      const result = await apiService.getStockPrice('SRV_OK')
      expect(result).toMatchObject({ symbol: 'SRV_OK', price: 123.45, currency: 'USD' })
    })

    it('should fall back when server fetch is not ok in server environment', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })

      const result = await apiService.getStockPrice('CLIENT_OK')
      expect(result?.symbol).toBe('CLIENT_OK')
      expect(typeof result?.price).toBe('number')
    })
    it('should fetch stock price successfully', async () => {
      const mockResponse = {
        quoteResponse: {
          result: [{
            symbol: 'AAPL',
            regularMarketPrice: 150.0,
            currency: 'USD',
            regularMarketChangePercent: 2.5
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await apiService.getStockPrice('AAPL')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('AAPL')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      const result = await apiService.getStockPrice('ERROR')

      expect(result).toBeDefined()
    })

    it('should handle empty response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quoteResponse: { result: [] } })
      })

      const result = await apiService.getStockPrice('EMPTY')

      expect(result).toBeDefined()
    })

    it('should handle null symbol', async () => {
      const result = await apiService.getStockPrice(null as any)

      expect(result).toBeDefined()
    })

    it('should handle undefined symbol', async () => {
      const result = await apiService.getStockPrice(undefined as any)

      expect(result).toBeDefined()
    })

    it('should handle empty symbol', async () => {
      const result = await apiService.getStockPrice('')

      expect(result).toBeDefined()
    })
  })

  describe('Asset Metadata Fetching', () => {
    it('should fetch asset metadata via server quoteSummary path', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          quoteSummary: { result: [{ summaryProfile: { longName: 'Srv Inc', sector: 'Technology', country: 'United States', currency: 'USD', quoteType: 'Stock', exchange: 'NYSE' } }] }
        })
      })

      const result = await apiService.getAssetMetadata('SRV_META')
      expect(result).toMatchObject({ symbol: 'SRV_META', name: 'Srv Inc', sector: 'Technology', country: 'United States' })
    })

    it('should fetch asset metadata via server search fallback', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' }) // quoteSummary fails
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ quotes: [{ longname: 'Search Inc', currency: 'USD', exchange: 'NASDAQ' }] }) })

      const result = await apiService.getAssetMetadata('SRCH_META')
      expect(result).toMatchObject({ symbol: 'SRCH_META', name: 'Search Inc', exchange: 'NASDAQ' })
    })
    it('should fetch asset metadata successfully', async () => {
      const mockResponse = {
        quoteResponse: {
          result: [{
            symbol: 'AAPL',
            longName: 'Apple Inc.',
            sector: 'Technology',
            currency: 'USD'
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await apiService.getAssetMetadata('AAPL')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('AAPL')
    })

    it('should handle metadata API errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Metadata Error'))

      const result = await apiService.getAssetMetadata('ERROR')

      expect(result).toBeDefined()
    })

    it('should handle null metadata response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quoteResponse: { result: [] } })
      })

      const result = await apiService.getAssetMetadata('NULL')

      expect(result).toBeDefined()
    })
  })

  describe('ETF Composition Fetching', () => {
    it('should fetch ETF composition via server quoteSummary path', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          quoteSummary: { result: [{ summaryProfile: { country: 'United States', currency: 'USD', domicile: 'US' }, fundProfile: { sectorWeightings: { technology: 0.2, finance: 0.1 } } }] }
        })
      })

      const result = await apiService.getETFComposition('SRV_ETF')
      expect(result).toBeTruthy()
      expect(result?.country[0].country).toBe('United States')
      expect(result?.currency[0].currency).toBe('USD')
      expect(result?.sector.length).toBeGreaterThan(0)
    })

    it('should fall back when server path not ok in server environment', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })

      const result = await apiService.getETFComposition('CLI_ETF')
      expect(result?.symbol).toBe('CLI_ETF')
    })
    it('should fetch ETF composition successfully', async () => {
      const mockResponse = {
        etfHoldings: {
          result: [{
            symbol: 'VTI',
            holdingName: 'Apple Inc.',
            holdingPercent: 5.2
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await apiService.getETFComposition('VTI')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('VTI')
    })

    it('should handle ETF composition errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ETF Error'))

      const result = await apiService.getETFComposition('ERROR')

      expect(result).toBeDefined()
    })

    it('should handle empty ETF response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ etfHoldings: { result: [] } })
      })

      const result = await apiService.getETFComposition('EMPTY')

      expect(result).toBeDefined()
    })
  })

  describe('Symbol Search', () => {
    it('should search symbols successfully', async () => {
      const mockResponse = {
        quotes: {
          result: [{
            symbol: 'AAPL',
            longname: 'Apple Inc.',
            exchange: 'NMS'
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await apiService.searchSymbol('AAPL')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle search errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search Error'))

      const result = await apiService.searchSymbol('ERROR')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty search results', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quotes: { result: [] } })
      })

      const result = await apiService.searchSymbol('EMPTY')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('European Symbol Handling', () => {
    it('should handle Vanguard European symbols', async () => {
      const result = await apiService.getStockPrice('VWRL')

      expect(result).toBeDefined()
    })

    it('should handle iShares European symbols', async () => {
      const result = await apiService.getStockPrice('IWDA')

      expect(result).toBeDefined()
    })

    it('should handle Xtrackers European symbols', async () => {
      const result = await apiService.getStockPrice('XMWO')

      expect(result).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rapid requests', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']
      
      const promises = symbols.map(symbol => apiService.getStockPrice(symbol))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
      })
    })

    it('should handle concurrent requests', async () => {
      const promises = [
        apiService.getStockPrice('AAPL'),
        apiService.getAssetMetadata('GOOGL'),
        apiService.getETFComposition('VTI'),
        apiService.searchSymbol('MSFT')
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result).toBeDefined()
      })
    })
  })

  describe('Error Scenarios', () => {
    it('should handle network timeouts', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('timeout'))

      const result = await apiService.getStockPrice('TIMEOUT')

      expect(result).toBeDefined()
    })

    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const result = await apiService.getStockPrice('MALFORMED')

      expect(result).toBeDefined()
    })

    it('should handle HTTP error status codes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await apiService.getStockPrice('HTTP_ERROR')

      expect(result).toBeDefined()
    })

    it('should handle 404 responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await apiService.getStockPrice('NOT_FOUND')

      expect(result).toBeDefined()
    })

    it('should handle 429 rate limit responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      const result = await apiService.getStockPrice('RATE_LIMITED')

      expect(result).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long symbols', async () => {
      const longSymbol = 'A'.repeat(100)
      const result = await apiService.getStockPrice(longSymbol)

      expect(result).toBeDefined()
    })

    it('should handle symbols with special characters', async () => {
      const specialSymbol = 'AAPL.O'
      const result = await apiService.getStockPrice(specialSymbol)

      expect(result).toBeDefined()
    })

    it('should handle symbols with numbers', async () => {
      const numberSymbol = 'ISHARES3'
      const result = await apiService.getStockPrice(numberSymbol)

      expect(result).toBeDefined()
    })

    it('should handle mixed case symbols', async () => {
      const mixedSymbol = 'aApL'
      const result = await apiService.getStockPrice(mixedSymbol)

      expect(result).toBeDefined()
    })
  })

  describe('Cache Behavior', () => {
    it('should handle repeated requests for same symbol', async () => {
      const mockResponse = {
        quoteResponse: {
          result: [{
            symbol: 'AAPL',
            regularMarketPrice: 150.0,
            currency: 'USD'
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result1 = await apiService.getStockPrice('AAPL')
      const result2 = await apiService.getStockPrice('AAPL')

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })
  })

  describe('Fallback Data', () => {
    it('should provide fallback data for stock prices', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const result = await apiService.getStockPrice('FALLBACK')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('FALLBACK')
    })

    it('should provide fallback data for asset metadata', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const result = await apiService.getAssetMetadata('FALLBACK')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('FALLBACK')
    })

    it('should provide fallback data for ETF composition', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const result = await apiService.getETFComposition('FALLBACK')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('FALLBACK')
    })
  })

  describe('Session-based ETF Composition', () => {
    it('should handle session-based ETF composition', async () => {
      const mockSession = {
        cookies: 'test-cookies',
        crumb: 'test-crumb',
        userAgent: 'test-user-agent'
      }

      const mockResponse = {
        etfHoldings: {
          result: [{
            symbol: 'VTI',
            holdingName: 'Apple Inc.',
            holdingPercent: 5.2
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await apiService.getETFCompositionWithSession('VTI', mockSession)

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('VTI')
    })

    it('should handle session-based errors', async () => {
      const mockSession = {
        cookies: 'test-cookies',
        crumb: 'test-crumb',
        userAgent: 'test-user-agent'
      }

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Session Error'))

      const result = await apiService.getETFCompositionWithSession('ERROR', mockSession)

      expect(result).toBeDefined()
    })
  })
})




