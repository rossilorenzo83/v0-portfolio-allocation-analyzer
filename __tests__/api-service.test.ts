import { apiService } from "../lib/api-service"
import { jest } from "@jest/globals"

// Mock the global fetch function for API service tests
global.fetch = jest.fn((url) => {
  if (url.includes("/api/yahoo/quote/")) {
    const symbol = url.split("/").pop()
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          quoteResponse: {
            result: [
              {
                symbol: symbol.toUpperCase(),
                regularMarketPrice: 100.0,
                currency: "USD",
                regularMarketChangePercent: 1.25,
              },
            ],
          },
        }),
    })
  } else if (url.includes("/api/yahoo/etf/")) {
    const symbol = url.split("/").pop()
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          symbol: symbol.toUpperCase(),
          domicile: "IE",
          withholdingTax: 15,
          country: [
            { country: "United States", weight: 60 },
            { country: "Ireland", weight: 10 },
          ],
          sector: [
            { sector: "Technology", weight: 25 },
            { sector: "Financial Services", weight: 15 },
          ],
          currency: [
            { currency: "USD", weight: 70 },
            { currency: "EUR", weight: 30 },
          ],
        }),
    })
  } else if (url.includes("/api/yahoo/search/")) {
    const query = url.split("/").pop()
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          quotes: [
            {
              symbol: query.toUpperCase(),
              longname: `${query} Company`,
              exchange: "NASDAQ",
              currency: "USD",
              sector: "Technology",
              country: "United States",
              quoteType: "EQUITY",
            },
          ],
        }),
    })
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url}`))
})

describe("APIService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    ;(global.fetch as jest.Mock).mockClear()
  })

  it("should fetch stock price correctly", async () => {
    const symbol = "AAPL"
    const priceData = await apiService.getStockPrice(symbol)

    expect(priceData).toBeDefined()
    expect(priceData?.symbol).toBe(symbol)
    expect(priceData?.price).toBe(100.0)
    expect(priceData?.currency).toBe("USD")
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/yahoo/quote/${symbol}`))
  })

  it("should fetch asset metadata correctly", async () => {
    const symbol = "MSFT"
    const metadata = await apiService.getAssetMetadata(symbol)

    expect(metadata).toBeDefined()
    expect(metadata?.symbol).toBe(symbol)
    expect(metadata?.name).toBe("MSFT Company")
    expect(metadata?.sector).toBe("Technology")
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/yahoo/search/${symbol}`))
  })

  it("should fetch ETF composition correctly", async () => {
    const symbol = "VWRL"
    const composition = await apiService.getETFComposition(symbol)

    expect(composition).toBeDefined()
    expect(composition?.symbol).toBe(symbol)
    expect(composition?.domicile).toBe("IE")
    expect(composition?.country).toEqual(expect.arrayContaining([{ country: "United States", weight: 60 }]))
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/yahoo/etf/${symbol}`))
  })

  it("should search for a symbol correctly", async () => {
    const query = "Google"
    const searchResults = await apiService.searchSymbol(query)

    expect(searchResults).toBeDefined()
    expect(searchResults.length).toBeGreaterThan(0)
    expect(searchResults[0].symbol).toBe("GOOGLE")
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/yahoo/search/${query}`))
  })

  it("should use cache for subsequent calls within TTL", async () => {
    const symbol = "TSLA"
    await apiService.getStockPrice(symbol)
    await apiService.getStockPrice(symbol) // Second call

    expect(global.fetch).toHaveBeenCalledTimes(1) // Should only fetch once due to caching
  })

  it("should resolve European ETF symbols", async () => {
    const symbol = "VWRL" // Common European ETF without suffix
    const priceData = await apiService.getStockPrice(symbol)

    expect(priceData).toBeDefined()
    expect(priceData?.symbol).toBe(symbol)
    // Expect fetch to have been called with a resolved symbol like VWRL.L or VWRL.AS
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/yahoo\/quote\/(VWRL(\.L|\.AS|\.DE|\.MI|\.PA|\.SW)?)$/),
    )
  })

  it("should resolve Swiss stock symbols", async () => {
    const symbol = "NESN" // Nestle
    const metadata = await apiService.getAssetMetadata(symbol)

    expect(metadata).toBeDefined()
    expect(metadata?.symbol).toBe(symbol)
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/yahoo/search/NESN.SW`))
  })
})
