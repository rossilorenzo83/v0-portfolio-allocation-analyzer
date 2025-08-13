/* @jest-environment node */

import { jest } from '@jest/globals'

describe('YahooFinanceService - server paths (node env)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn()
  })

  function makeMockPage() {
    const cookies = jest.fn().mockResolvedValue([
      { name: 'A1', value: 'v1' },
      { name: 'GUC', value: 'v2' },
    ])

    return {
      goto: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue(null),
      click: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      context: () => ({ cookies }),
      evaluate: jest.fn().mockImplementation(async (_fn: any) => {
        // Used both for user agent and crumb extraction
        return 'Mocked-UA-Or-Crumb'
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }
  }

  function mockPlaywrightWithPage(mockPage: any) {
    jest.doMock('playwright', () => ({
      chromium: {
        launch: jest.fn().mockResolvedValue({
          newPage: jest.fn().mockResolvedValue(mockPage),
          close: jest.fn().mockResolvedValue(undefined),
        }),
      },
    }), { virtual: true })
  }

  it('getQuote uses server path with session and returns parsed quote', async () => {
    const mockPage = makeMockPage()
    mockPlaywrightWithPage(mockPage)

    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 123.45, previousClose: 120, currency: 'USD' } }] } }),
    })

    const { yahooFinanceService } = await import('../../lib/yahoo-finance-service')
    const quote = await yahooFinanceService.getQuote('SRV_Q')
    expect(quote).toMatchObject({ symbol: 'SRV_Q', price: 123.45, currency: 'USD' })
    await yahooFinanceService.close()
  })

  it('searchSymbol uses server path and maps fields correctly', async () => {
    const mockPage = makeMockPage()
    mockPlaywrightWithPage(mockPage)

    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ quotes: [{ symbol: 'MSFT', longname: 'Microsoft', exchange: 'NASDAQ', quoteType: 'EQUITY', currency: 'USD' }] }),
    })

    const { yahooFinanceService } = await import('../../lib/yahoo-finance-service')
    const result = await yahooFinanceService.searchSymbol('Microsoft')
    expect(result).toEqual({ symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ', type: 'EQUITY', currency: 'USD' })
    await yahooFinanceService.close()
  })

  it('searchSymbol returns null on non-ok response', async () => {
    const mockPage = makeMockPage()
    mockPlaywrightWithPage(mockPage)

    ;(global as any).fetch.mockResolvedValue({ ok: false, status: 500 })

    const { yahooFinanceService } = await import('../../lib/yahoo-finance-service')
    const result = await yahooFinanceService.searchSymbol('BAD')
    expect(result).toBeNull()
    await yahooFinanceService.close()
  })

  it('getETFComposition converts api-service result to expected shape', async () => {
    const mockPage = makeMockPage()
    mockPlaywrightWithPage(mockPage)

    jest.doMock('../../lib/api-service', () => ({
      apiService: {
        getETFCompositionWithSession: jest.fn().mockResolvedValue({
          symbol: 'VWCE',
          domicile: 'IE',
          withholdingTax: 15,
          country: [{ country: 'United States', weight: 60 }],
          sector: [{ sector: 'Technology', weight: 25 }],
          currency: [{ currency: 'USD', weight: 100 }],
        }),
      },
    }))

    const { yahooFinanceService } = await import('../../lib/yahoo-finance-service')
    const etf = await yahooFinanceService.getETFComposition('VWCE')
    expect(etf).toEqual({
      symbol: 'VWCE',
      name: 'VWCE ETF',
      domicile: 'IE',
      withholdingTax: 15,
      expenseRatio: 0.2,
      country: [{ country: 'United States', weight: 60 }],
      sector: [{ sector: 'Technology', weight: 25 }],
      currency: [{ currency: 'USD', weight: 100 }],
    })
    await yahooFinanceService.close()
  })
})


