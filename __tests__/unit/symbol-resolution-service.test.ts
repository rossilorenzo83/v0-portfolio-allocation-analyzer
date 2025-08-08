import { symbolResolutionService } from '../../lib/symbol-resolution-service'

// Mock fetch globally
global.fetch = jest.fn()

describe('SymbolResolutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear the service cache before each test
    symbolResolutionService.clearCache()
  })

  describe('resolveSymbol', () => {
    it('should resolve a simple symbol without modification', async () => {
      const result = await symbolResolutionService.resolveSymbol('AAPL')
      expect(result.resolvedSymbol).toBe('AAPL')
      expect(result.exchange).toBe('US')
    })

    it('should resolve Swiss market symbols', async () => {
      const result = await symbolResolutionService.resolveSymbol('VWRL.SW')
      expect(result.resolvedSymbol).toBe('VWRL.SW')
    })

    it('should resolve London market symbols', async () => {
      const result = await symbolResolutionService.resolveSymbol('VWRL.L')
      expect(result.resolvedSymbol).toBe('VWRL.L')
    })

    it('should handle symbols with dots', async () => {
      const result = await symbolResolutionService.resolveSymbol('VWRL.L')
      expect(result.resolvedSymbol).toBe('VWRL.L')
    })

    it('should handle empty string', async () => {
      const result = await symbolResolutionService.resolveSymbol('')
      expect(result.resolvedSymbol).toBe('')
    })

    it('should handle undefined input', async () => {
      const result = await symbolResolutionService.resolveSymbol(undefined as any)
      expect(result.resolvedSymbol).toBe(undefined)
    })
  })

  describe('getCachedSymbol', () => {
    it('should return cached symbol when valid', async () => {
      // First call to populate cache
      await symbolResolutionService.resolveSymbol('AAPL')
      
      // Second call should use cache
      const cached = symbolResolutionService.getCachedSymbol('AAPL')
      expect(cached).toBeDefined()
      expect(cached?.resolvedSymbol).toBe('AAPL')
    })

    it('should return null for uncached symbol', () => {
      const cached = symbolResolutionService.getCachedSymbol('UNKNOWN')
      expect(cached).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      // Populate cache
      await symbolResolutionService.resolveSymbol('AAPL')
      expect(symbolResolutionService.getCachedSymbol('AAPL')).toBeDefined()
      
      // Clear cache
      symbolResolutionService.clearCache()
      expect(symbolResolutionService.getCachedSymbol('AAPL')).toBeNull()
    })
  })

  describe('getCacheInfo', () => {
    it('should return cache information', async () => {
      // Populate cache
      await symbolResolutionService.resolveSymbol('AAPL')
      
      const cacheInfo = symbolResolutionService.getCacheInfo()
      expect(cacheInfo).toHaveProperty('AAPL')
      expect(cacheInfo['AAPL']).toContain('AAPL')
    })
  })
})
