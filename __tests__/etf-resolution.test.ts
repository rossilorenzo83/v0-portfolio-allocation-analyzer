import { apiService } from '../lib/api-service'
import { resolveSymbolAndFetchData } from '../etf-data-service'

// Mock the fetch function
global.fetch = jest.fn()

describe('ETF Resolution Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear the symbol cache between tests
    ;(apiService as any).symbolCache.clear()
  })

  afterEach(() => {
    // Clear the symbol cache after each test
    ;(apiService as any).symbolCache.clear()
  })

  describe('European ETF Symbol Resolution', () => {
    test('should test VWRL symbol variations', async () => {
      // Test that VWRL gets the correct variations
      const variations = (apiService as any).getSymbolVariations('VWRL')
      expect(variations).toContain('VWRL.L')
      expect(variations).toContain('VWRL.DE')
      expect(variations).toContain('VWRL.AS')
      expect(variations).toContain('VWRL.MI')
    })

    test('should test IWDA symbol variations', async () => {
      // Test that IWDA gets the correct variations
      const variations = (apiService as any).getSymbolVariations('IWDA')
      expect(variations).toContain('IWDA.L')
      expect(variations).toContain('IWDA.AS')
      expect(variations).toContain('IWDA.DE')
      expect(variations).toContain('IWDA.MI')
    })

    test('should test VWCE symbol variations', async () => {
      // Test that VWCE gets the correct variations
      const variations = (apiService as any).getSymbolVariations('VWCE')
      expect(variations).toContain('VWCE.DE')
      expect(variations).toContain('VWCE.L')
      expect(variations).toContain('VWCE.AS')
      expect(variations).toContain('VWCE.MI')
    })

    test('should test IS3N symbol variations', async () => {
      // Test that IS3N gets the correct variations
      const variations = (apiService as any).getSymbolVariations('IS3N')
      expect(variations).toContain('IS3N.SW')
      expect(variations).toContain('IS3N.DE')
      expect(variations).toContain('IS3N.L')
      expect(variations).toContain('IS3N.AS')
    })

    test('should identify European symbols correctly', async () => {
      expect((apiService as any).isEuropeanSymbol('VWRL')).toBe(true)
      expect((apiService as any).isEuropeanSymbol('IWDA')).toBe(true)
      expect((apiService as any).isEuropeanSymbol('VWCE')).toBe(true)
      expect((apiService as any).isEuropeanSymbol('IS3N')).toBe(true)
      expect((apiService as any).isEuropeanSymbol('AAPL')).toBe(false)
      expect((apiService as any).isEuropeanSymbol('MSFT')).toBe(false)
    })
  })

  describe('Swiss Stock Symbol Resolution', () => {
    test('should resolve NESN to NESN.SW', async () => {
      const resolvedSymbol = await apiService.resolveSymbol('NESN')
      expect(resolvedSymbol).toBe('NESN.SW')
    })

    test('should resolve NOVN to NOVN.SW', async () => {
      const resolvedSymbol = await apiService.resolveSymbol('NOVN')
      expect(resolvedSymbol).toBe('NOVN.SW')
    })

    test('should resolve ROG to ROG.SW', async () => {
      const resolvedSymbol = await apiService.resolveSymbol('ROG')
      expect(resolvedSymbol).toBe('ROG.SW')
    })
  })

  describe('US Stock Symbol Resolution', () => {
    test('should return AAPL unchanged (no resolution needed)', async () => {
      const resolvedSymbol = await apiService.resolveSymbol('AAPL')
      expect(resolvedSymbol).toBe('AAPL')
    })

    test('should return MSFT unchanged (no resolution needed)', async () => {
      const resolvedSymbol = await apiService.resolveSymbol('MSFT')
      expect(resolvedSymbol).toBe('MSFT')
    })
  })

  describe('Fallback Behavior', () => {
    test('should return original symbol if all exchanges fail', async () => {
      // Mock all exchanges failing
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Not found'))

      const resolvedSymbol = await apiService.resolveSymbol('VWRL')
      expect(resolvedSymbol).toBe('VWRL')
    })

    test('should handle network errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const resolvedSymbol = await apiService.resolveSymbol('VWRL')
      expect(resolvedSymbol).toBe('VWRL')
    })
  })

  describe('Integration with ETF Data Service', () => {
    test('should handle position with ETF category', async () => {
      const position = {
        symbol: 'VWRL',
        name: 'Vanguard FTSE All-World UCITS ETF',
        currency: 'USD',
        exchange: 'LSE',
        averagePrice: 100,
        category: 'ETF'
      }

      const result = await resolveSymbolAndFetchData(position)
      
      expect(result).toBeDefined()
      expect(result.etfData).toBeDefined()
      expect(result.quoteData).toBeDefined()
    })

    test('should handle position with stock category', async () => {
      const position = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currency: 'USD',
        exchange: 'NASDAQ',
        averagePrice: 150,
        category: 'Stock'
      }

      const result = await resolveSymbolAndFetchData(position)
      
      expect(result).toBeDefined()
      expect(result.etfData).toBeDefined()
      expect(result.quoteData).toBeDefined()
    })
  })

  describe('Symbol Mapping Logic', () => {
    test('should test European ETF mapping configuration', async () => {
      // Test that the mapping configuration is correct
      const vwrlVariations = (apiService as any).getSymbolVariations('VWRL')
      const iwdaVariations = (apiService as any).getSymbolVariations('IWDA')
      
      expect(vwrlVariations).toContain('VWRL.L')
      expect(vwrlVariations).toContain('VWRL.DE')
      expect(iwdaVariations).toContain('IWDA.L')
      expect(iwdaVariations).toContain('IWDA.DE')
    })

    test('should test Swiss stock mapping configuration', async () => {
      // Test that Swiss stocks are mapped correctly
      const nesnVariations = (apiService as any).getSymbolVariations('NESN')
      const novnVariations = (apiService as any).getSymbolVariations('NOVN')
      
      expect(nesnVariations).toContain('NESN.SW')
      expect(novnVariations).toContain('NOVN.SW')
    })
  })
}) 