// Focused tests for etf-data-service with cache isolation per test
// Uses jest.isolateModules to avoid cross-test cache contamination

// Mock external services used inside etf-data-service
jest.mock('../../lib/share-metadata-service', () => ({
  shareMetadataService: {
    getShareMetadataWithSession: jest.fn(),
  },
}))
// Also mock the alias path used by the implementation
jest.mock('@/lib/share-metadata-service', () => ({
  shareMetadataService: {
    getShareMetadataWithSession: jest.fn(),
  },
}))

// Provide a typed helper to build fetch-like responses
function makeResponse(ok: boolean, body: any, init?: Partial<{ status: number; statusText: string }>) {
  return {
    ok,
    status: init?.status ?? (ok ? 200 : 500),
    statusText: init?.statusText ?? (ok ? 'OK' : 'Error'),
    json: async () => body,
  } as unknown as Response
}

// Ensure a clean global.fetch before each test
beforeEach(() => {
  // Removed jest.resetModules() to avoid losing mock instances
  jest.clearAllMocks()
  ;(global as any).fetch = jest.fn()
})

// Prefer the alias version to match implementation imports
const { shareMetadataService } = require('@/lib/share-metadata-service')

describe('etf-data-service (focused, cache-safe)', () => {
  it('getEtfData: fills empty composition fields when API returns minimal object', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/etf-composition/TST1')) {
        return Promise.resolve(makeResponse(true, {
          symbol: 'TST1', name: 'Test ETF', currency: 'USD', exchange: 'TEST', domicile: 'US',
          // composition intentionally missing to trigger default filling
        }))
      }
      return Promise.resolve(makeResponse(false, null, { status: 404, statusText: 'Not Found' }))
    })

    const { getEtfData } = await import('../../etf-data-service')
    const result = await getEtfData('TST1')
    expect(result?.symbol).toBe('TST1')
    expect(result?.composition?.sectors).toBeDefined()
    expect(result?.composition?.countries).toBeDefined()
    expect(result?.composition?.currencies).toBeDefined()
  })

  it('getEtfDataWithFallback: returns real API data when new array structure is present', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/etf-composition/REAL1')) {
        return Promise.resolve(makeResponse(true, {
          symbol: 'REAL1', name: 'Real ETF', currency: 'USD', exchange: 'NYSE', domicile: 'US',
          composition: {
            sector: [{ sector: 'Technology', weight: 25 }],
            country: [{ country: 'United States', weight: 100 }],
            currency: [{ currency: 'USD', weight: 100 }],
          },
        }))
      }
      return Promise.resolve(makeResponse(false, null, { status: 404, statusText: 'Not Found' }))
    })

    const { getEtfDataWithFallback } = await import('../../etf-data-service')
    const result = await getEtfDataWithFallback('REAL1')
    expect(result?.symbol).toBe('REAL1')
  })

  it('getEtfDataWithFallback: uses static fallback for known symbol when API fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((_url: string) => {
      return Promise.resolve(makeResponse(false, null, { status: 500, statusText: 'Server Error' }))
    })

    const { getEtfDataWithFallback } = await import('../../etf-data-service')
    const result = await getEtfDataWithFallback('VWRL') // present in FALLBACK_ETF_DATA
    expect(result?.symbol).toBe('VWRL')
    expect(result?.name).toBe('Vanguard FTSE All-World UCITS ETF')
  })

  it('getQuoteWithFallback: returns API quote when available', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/quote/QAPI1')) {
        return Promise.resolve(makeResponse(true, { price: 123.45, currency: 'USD' }))
      }
      return Promise.resolve(makeResponse(false, null, { status: 404, statusText: 'Not Found' }))
    })

    const { getQuoteWithFallback } = await import('../../etf-data-service')
    const result = await getQuoteWithFallback('QAPI1')
    expect(result?.price).toBe(123.45)
    expect(result?.currency).toBe('USD')
  })

  it('getQuoteWithFallback: uses static fallback for known symbol when API fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((_url: string) => {
      return Promise.resolve(makeResponse(false, null, { status: 500, statusText: 'Server Error' }))
    })

    const { getQuoteWithFallback } = await import('../../etf-data-service')
    const result = await getQuoteWithFallback('VWRL')
    expect(result?.price).toBe(105.2)
    expect(result?.currency).toBe('USD')
  })

  it('searchSymbol: wraps single-object response into array', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/search/SRCH1')) {
        return Promise.resolve(makeResponse(true, {
          symbol: 'SRCH1', name: 'Search One', exchange: 'TEST', currency: 'USD',
        }))
      }
      return Promise.resolve(makeResponse(false, null, { status: 404, statusText: 'Not Found' }))
    })

    const { searchSymbol } = await import('../../etf-data-service')
    const result = await searchSymbol('SRCH1')
    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('SRCH1')
  })

  it('resolveSymbolAndFetchData: ETF path uses search -> resolved symbol -> data + quote', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/search/ETF1')) {
        // The service converts single object to array internally
        return Promise.resolve(makeResponse(true, { symbol: 'ETF1_RES', name: 'ETF One', exchange: 'X', currency: 'USD' }))
      }
      if (url.includes('/api/yahoo/etf-composition/ETF1_RES')) {
        return Promise.resolve(makeResponse(true, {
          symbol: 'ETF1_RES', name: 'ETF One', currency: 'USD', exchange: 'X', domicile: 'US',
          composition: { sectors: { Technology: 0.25 }, countries: { 'United States': 1.0 }, currencies: { USD: 1.0 } },
        }))
      }
      if (url.includes('/api/yahoo/quote/ETF1_RES')) {
        return Promise.resolve(makeResponse(true, { price: 200.5, currency: 'USD' }))
      }
      return Promise.resolve(makeResponse(false, null, { status: 404, statusText: 'Not Found' }))
    })

    const { resolveSymbolAndFetchData } = await import('../../etf-data-service')
    const result = await resolveSymbolAndFetchData({
      symbol: 'ETF1', name: 'ETF One', currency: 'USD', exchange: 'X', averagePrice: 100, category: 'ETF',
    } as any)

    expect(result.etfData?.symbol).toBe('ETF1_RES')
    expect(result.quoteData?.price).toBe(200.5)
  })

  it('resolveSymbolAndFetchData: Shares path uses share metadata conversion + quote', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/quote/AAPL')) {
        return Promise.resolve(makeResponse(true, { price: 150.25, currency: 'USD' }))
      }
      return Promise.resolve(makeResponse(false, null, { status: 404, statusText: 'Not Found' }))
    })

    shareMetadataService.getShareMetadataWithSession.mockResolvedValue({
      symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', country: 'United States', currency: 'USD', type: 'Stock',
    })

    const { resolveSymbolAndFetchData } = await import('../../etf-data-service')
    const result = await resolveSymbolAndFetchData({
      symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD', exchange: 'NASDAQ', averagePrice: 150, category: 'Shares',
    } as any)

    expect(result.etfData?.symbol).toBe('AAPL')
    expect(result.etfData?.composition?.sectors?.Technology).toBe(1)
    expect(result.quoteData?.price).toBe(150.25)
  })

  it('resolveSymbolAndFetchData: final minimal fallback when everything fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((_url: string) => {
      // All API calls fail (search, etf-composition, quote)
      return Promise.resolve(makeResponse(false, null, { status: 500, statusText: 'Server Error' }))
    })

    shareMetadataService.getShareMetadataWithSession.mockRejectedValue(new Error('no session'))

    const { resolveSymbolAndFetchData } = await import('../../etf-data-service')
    const result = await resolveSymbolAndFetchData({
      symbol: 'UNK1', name: 'Unknown Asset', currency: 'USD', exchange: 'X', averagePrice: 99, category: 'ETF',
    } as any)

    expect(result.etfData?.symbol).toBe('UNK1')
    expect(result.etfData?.name).toBe('Unknown Asset')
    expect(result.quoteData?.price).toBe(99)
  })
})
