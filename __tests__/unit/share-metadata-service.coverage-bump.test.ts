import { jest } from '@jest/globals'

describe('share-metadata-service coverage bump', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('returns API metadata and caches it; subsequent call hits cache', async () => {
    const mockJson = { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', country: 'United States', currency: 'USD', type: 'EQUITY', exchange: 'NMS' }

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => mockJson })
    ;(global as any).fetch = fetchMock

    const { shareMetadataService } = await import('../../lib/share-metadata-service')

    const session = { cookies: 'c', crumb: 'r', userAgent: 'ua' }
    const first = await shareMetadataService.getShareMetadataWithSession('AAPL', session as any)
    expect(first).toEqual(mockJson)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const second = await shareMetadataService.getShareMetadataWithSession('AAPL', session as any)
    expect(second).toEqual(mockJson)
    expect(fetchMock).toHaveBeenCalledTimes(1) // served from cache
  })

  it('falls back to inferred metadata when API fails and still caches fallback', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Error' })
    ;(global as any).fetch = fetchMock

    const { shareMetadataService } = await import('../../lib/share-metadata-service')
    const session = { cookies: 'c', crumb: 'r', userAgent: 'ua' }

    const result = await shareMetadataService.getShareMetadataWithSession('TSLA', session as any)
    expect(result).toEqual(
      expect.objectContaining({ symbol: 'TSLA', name: 'TSLA', sector: 'Consumer Discretionary', country: expect.any(String) })
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const again = await shareMetadataService.getShareMetadataWithSession('TSLA', session as any)
    expect(again?.symbol).toBe('TSLA')
    expect(fetchMock).toHaveBeenCalledTimes(1) // cached fallback
  })

  it('respects simple rate limit between calls (sleep branch)', async () => {
    const mockJson = { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', country: 'United States', currency: 'USD', type: 'EQUITY', exchange: 'NMS' }
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => mockJson })
    ;(global as any).fetch = fetchMock

    jest.useFakeTimers()

    const { shareMetadataService } = await import('../../lib/share-metadata-service')
    const session = { cookies: 'c', crumb: 'r', userAgent: 'ua' }

    const promise = shareMetadataService.getShareMetadataWithSession('MSFT', session as any)
    // Advance timers to allow potential sleep to complete
    jest.advanceTimersByTime(250)
    const res = await promise
    expect(res?.symbol).toBe('MSFT')

    jest.useRealTimers()
  })
})


