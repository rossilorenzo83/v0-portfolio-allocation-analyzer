import { apiService } from "../lib/api-service"
import jest from "jest"

// Mock global fetch
global.fetch = jest.fn()

describe("apiService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("getStockPrice fetches data correctly", async () => {
    const mockResponse = { price: 150.0, changePercent: 1.2 }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await apiService.getStockPrice("AAPL")
    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith("/api/yahoo/quote/AAPL")
  })

  it("getAssetMetadata fetches data correctly", async () => {
    const mockResponse = { name: "Apple Inc.", sector: "Technology", country: "United States" }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await apiService.getAssetMetadata("AAPL")
    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith("/api/yahoo/search/AAPL")
  })

  it("getETFComposition fetches data correctly", async () => {
    const mockResponse = {
      domicile: "IE",
      withholdingTax: 15,
      country: [{ country: "US", weight: 60 }],
      sector: [{ sector: "Technology", weight: 25 }],
      currency: [{ currency: "USD", weight: 100 }],
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await apiService.getETFComposition("VWRL")
    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith("/api/yahoo/etf/VWRL")
  })

  it("searchSymbol fetches data correctly", async () => {
    const mockResponse = [{ symbol: "GOOG", name: "Alphabet Inc." }]
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await apiService.searchSymbol("Google")
    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith("/api/yahoo/search/Google")
  })

  it("handles API errors gracefully", async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })

    await expect(apiService.getStockPrice("INVALID")).rejects.toThrow("Failed to fetch stock price for INVALID")
  })
})
