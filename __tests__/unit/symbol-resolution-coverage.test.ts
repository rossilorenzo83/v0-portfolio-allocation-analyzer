import { symbolResolutionService } from '../../lib/symbol-resolution-service'

// Mock the dependencies
jest.mock('../../lib/yahoo-finance-service', () => ({
  yahooFinanceService: {
    searchSymbol: jest.fn()
  }
}))

describe('Symbol Resolution Service Coverage', () => {
  const { yahooFinanceService } = require('../../lib/yahoo-finance-service')

  beforeEach(() => {
    jest.clearAllMocks()
    // Clear the cache before each test
    symbolResolutionService.clearCache()
  })

  describe('Symbol Resolution', () => {
    it('should resolve US symbols directly without API call', async () => {
      const result = await symbolResolutionService.resolveSymbol('AAPL')
      
      expect(result).toEqual({
        originalSymbol: 'AAPL',
        resolvedSymbol: 'AAPL',
        exchange: 'US',
        type: 'EQUITY',
        currency: 'USD',
        name: 'AAPL',
        timestamp: expect.any(Number)
      })
      
      // Should not call API for US symbols
      expect(yahooFinanceService.searchSymbol).not.toHaveBeenCalled()
    })

    it('should handle European symbols with API lookup', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue({
        symbol: 'VWRL.L',
        name: 'Vanguard FTSE All-World UCITS ETF',
        exchange: 'LSE',
        type: 'ETF',
        currency: 'GBP'
      })

      const result = await symbolResolutionService.resolveSymbol('VWRL')
      
      expect(result).toEqual({
        originalSymbol: 'VWRL',
        resolvedSymbol: 'VWRL.L',
        exchange: 'LSE',
        type: 'ETF',
        currency: 'GBP',
        name: 'Vanguard FTSE All-World UCITS ETF',
        timestamp: expect.any(Number)
      })
      
      // Should try multiple variations for European symbols
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
    })

    it('should return fallback result when no variations work', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue(null)

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result).toEqual({
        originalSymbol: 'VEUR',
        resolvedSymbol: 'VEUR',
        exchange: 'Unknown',
        type: 'EQUITY',
        currency: 'USD',
        name: 'VEUR',
        timestamp: expect.any(Number)
      })
    })

    it('should handle API errors gracefully', async () => {
      yahooFinanceService.searchSymbol.mockRejectedValue(new Error('API Error'))

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result).toEqual({
        originalSymbol: 'VEUR',
        resolvedSymbol: 'VEUR',
        exchange: 'Unknown',
        type: 'EQUITY',
        currency: 'USD',
        name: 'VEUR',
        timestamp: expect.any(Number)
      })
    })

    it('should use cache for repeated requests', async () => {
      const result1 = await symbolResolutionService.resolveSymbol('MSFT')
      const result2 = await symbolResolutionService.resolveSymbol('MSFT')
      
      expect(result1).toEqual(result2)
      expect(result1.timestamp).toBe(result2.timestamp) // Same cached result
    })

    it('should handle null/undefined input gracefully', async () => {
      const result1 = await symbolResolutionService.resolveSymbol(null as any)
      const result2 = await symbolResolutionService.resolveSymbol(undefined as any)
      
      expect(result1).toEqual({
        originalSymbol: null,
        resolvedSymbol: null,
        exchange: 'US',
        type: 'EQUITY',
        currency: 'USD',
        name: null,
        timestamp: expect.any(Number)
      })
      
      expect(result2).toEqual({
        originalSymbol: undefined,
        resolvedSymbol: undefined,
        exchange: 'US',
        type: 'EQUITY',
        currency: 'USD',
        name: undefined,
        timestamp: expect.any(Number)
      })
    })

    it('should handle empty string input', async () => {
      const result = await symbolResolutionService.resolveSymbol('')
      
      expect(result).toEqual({
        originalSymbol: '',
        resolvedSymbol: '',
        exchange: 'US',
        type: 'EQUITY',
        currency: 'USD',
        name: '',
        timestamp: expect.any(Number)
      })
    })

    it('should detect European symbols correctly', async () => {
      const europeanSymbols = ['VWRL', 'IEUS', 'IS0A', 'XMME', 'SPYY']
      
      for (const symbol of europeanSymbols) {
        yahooFinanceService.searchSymbol.mockResolvedValue(null)
        
        const result = await symbolResolutionService.resolveSymbol(symbol)
        
        expect(result.originalSymbol).toBe(symbol)
        expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
        
        jest.clearAllMocks()
      }
    })

    it('should try multiple exchange variations for European symbols', async () => {
      yahooFinanceService.searchSymbol
        .mockResolvedValueOnce(null) // VWRL
        .mockResolvedValueOnce({ // VWRL.L
          symbol: 'VWRL.L',
          name: 'Vanguard ETF',
          exchange: 'LSE',
          type: 'ETF',
          currency: 'GBP'
        })

      const result = await symbolResolutionService.resolveSymbol('VWRL')
      
      expect(result.resolvedSymbol).toBe('VWRL.L')
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalledTimes(2)
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalledWith('VWRL')
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalledWith('VWRL.L')
    })

    it('should handle symbols with special characters', async () => {
      const specialSymbols = ['BRK-B', '^GSPC', '0700.HK', 'BTC-USD']
      
      for (const symbol of specialSymbols) {
        const result = await symbolResolutionService.resolveSymbol(symbol)
        
        expect(result.originalSymbol).toBe(symbol)
        expect(result.resolvedSymbol).toBe(symbol)
        expect(result.exchange).toBe('US') // Non-European symbols get US exchange
      }
    })

    it('should handle very long symbol names', async () => {
      const longSymbol = 'VERYLONGSYMBOLNAMETHATEXCEEDSNORMALLIMITS'
      
      const result = await symbolResolutionService.resolveSymbol(longSymbol)
      
      expect(result.originalSymbol).toBe(longSymbol)
      expect(result.resolvedSymbol).toBe(longSymbol)
    })

    it('should handle symbols with numbers', async () => {
      const numericSymbols = ['3M', '3333.HK', '0700.HK', 'BRK.B']
      
      for (const symbol of numericSymbols) {
        const result = await symbolResolutionService.resolveSymbol(symbol)
        
        expect(result.originalSymbol).toBe(symbol)
        expect(result.resolvedSymbol).toBe(symbol)
      }
    })

    it('should handle symbols with whitespace', async () => {
      const result = await symbolResolutionService.resolveSymbol('  MSFT  ')
      
      expect(result.originalSymbol).toBe('  MSFT  ')
      expect(result.resolvedSymbol).toBe('  MSFT  ')
    })

    it('should handle international symbols', async () => {
      const internationalSymbols = [
        'ASML.AS',    // Amsterdam
        'SAP.DE',     // Frankfurt
        '7203.T',     // Tokyo
        'RDSA.L',     // London
        'NESN.SW'     // Swiss
      ]
      
      for (const symbol of internationalSymbols) {
        const result = await symbolResolutionService.resolveSymbol(symbol)
        
        expect(result.originalSymbol).toBe(symbol)
        expect(result.resolvedSymbol).toBe(symbol)
        expect(result.exchange).toBe('US') // Non-European pattern gets US
      }
    })

    it('should handle concurrent resolution requests', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
      
      const promises = symbols.map(symbol => symbolResolutionService.resolveSymbol(symbol))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result, index) => {
        expect(result.originalSymbol).toBe(symbols[index])
        expect(result.resolvedSymbol).toBe(symbols[index])
      })
    })
  })

  describe('Cache Management', () => {
    it('should cache results correctly', async () => {
      const symbol = 'TEST'
      const result1 = await symbolResolutionService.resolveSymbol(symbol)
      
      // Get cached result
      const cached = symbolResolutionService.getCachedSymbol(symbol)
      expect(cached).toEqual(result1)
    })

    it('should return null for non-cached symbols', () => {
      const cached = symbolResolutionService.getCachedSymbol('NONEXISTENT')
      expect(cached).toBeNull()
    })

    it('should clear cache correctly', async () => {
      await symbolResolutionService.resolveSymbol('TEST')
      
      let cached = symbolResolutionService.getCachedSymbol('TEST')
      expect(cached).not.toBeNull()
      
      symbolResolutionService.clearCache()
      
      cached = symbolResolutionService.getCachedSymbol('TEST')
      expect(cached).toBeNull()
    })

    it('should provide cache info', async () => {
      await symbolResolutionService.resolveSymbol('AAPL')
      await symbolResolutionService.resolveSymbol('MSFT')
      
      const cacheInfo = symbolResolutionService.getCacheInfo()
      
      expect(cacheInfo).toHaveProperty('AAPL')
      expect(cacheInfo).toHaveProperty('MSFT')
      expect(cacheInfo['AAPL']).toBe('AAPL (US)')
      expect(cacheInfo['MSFT']).toBe('MSFT (US)')
    })

    it('should handle cache expiry (mock time)', async () => {
      const originalNow = Date.now
      let mockTime = 1000000
      Date.now = jest.fn(() => mockTime)

      try {
        await symbolResolutionService.resolveSymbol('EXPIRY_TEST')
        
        // Advance time beyond cache duration (24 hours)
        mockTime += 25 * 60 * 60 * 1000
        
        const cached = symbolResolutionService.getCachedSymbol('EXPIRY_TEST')
        expect(cached).toBeNull() // Should be expired
      } finally {
        Date.now = originalNow
      }
    })
  })

  describe('European Symbol Detection', () => {
    it('should detect Vanguard ETFs as European', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue(null)
      
      const result = await symbolResolutionService.resolveSymbol('VWRL')
      
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
      expect(result.exchange).toBe('Unknown') // Fallback when no variation works
    })

    it('should detect iShares ETFs as European', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue(null)
      
      const result = await symbolResolutionService.resolveSymbol('IEUS')
      
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
    })

    it('should detect numbered iShares ETFs as European', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue(null)
      
      const result = await symbolResolutionService.resolveSymbol('IS0A')
      
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
    })

    it('should detect Xtrackers ETFs as European', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue(null)
      
      const result = await symbolResolutionService.resolveSymbol('XMME')
      
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
    })

    it('should detect SPDR ETFs as European', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue(null)
      
      const result = await symbolResolutionService.resolveSymbol('SPYY')
      
      expect(yahooFinanceService.searchSymbol).toHaveBeenCalled()
    })

    it('should not detect US symbols as European', async () => {
      const usSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'SPY', 'VTI']
      
      for (const symbol of usSymbols) {
        await symbolResolutionService.resolveSymbol(symbol)
        
        // Should not call API for US symbols
        expect(yahooFinanceService.searchSymbol).not.toHaveBeenCalled()
        
        jest.clearAllMocks()
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      yahooFinanceService.searchSymbol.mockRejectedValue(new Error('timeout'))

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result.exchange).toBe('Unknown') // Fallback
    })

    it('should handle rate limiting errors', async () => {
      yahooFinanceService.searchSymbol.mockRejectedValue(new Error('Rate limit exceeded'))

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result.exchange).toBe('Unknown') // Fallback
    })

    it('should handle malformed response data', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue('invalid response format')

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result.exchange).toBe('Unknown') // Fallback
    })

    it('should handle missing symbol in response', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue({
        name: 'Test ETF',
        exchange: 'LSE'
        // Missing symbol field
      })

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result.exchange).toBe('Unknown') // Fallback
    })

    it('should handle symbol mismatch in response', async () => {
      yahooFinanceService.searchSymbol.mockResolvedValue({
        symbol: 'DIFFERENT.L', // Different from requested
        name: 'Test ETF',
        exchange: 'LSE'
      })

      const result = await symbolResolutionService.resolveSymbol('VEUR')
      
      expect(result.exchange).toBe('Unknown') // Fallback when symbol doesn't match
    })
  })
})