import { apiService } from "../lib/api-service"
import { jest } from "@jest/globals"

// Mock fetch globally
global.fetch = jest.fn()

describe("APIService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getStockPrice", () => {
    it("should fetch stock price successfully", async () => {
      const mockResponse = {
        symbol: "AAPL",
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        currency: "USD",
        marketState: "REGULAR",
        timestamp: Date.now(),
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await apiService.getStockPrice("AAPL")

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith("/api/yahoo/quote/AAPL")
    })

    it("should return fallback data when API fails", async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

      const result = await apiService.getStockPrice("AAPL")

      expect(result).toBeDefined()
      expect(result?.symbol).toBe("AAPL")
      expect(result?.currency).toBe("USD")
      expect(typeof result?.price).toBe("number")
    })
  })

  describe("getAssetMetadata", () => {
    it("should fetch asset metadata successfully", async () => {
      const mockResponse = {
        symbol: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        industry: "Consumer Electronics",
        country: "United States",
        currency: "USD",
        exchange: "NASDAQ",
        quoteType: "EQUITY",
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await apiService.getAssetMetadata("AAPL")

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith("/api/yahoo/search/AAPL")
    })

    it("should return fallback data when API fails", async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

      const result = await apiService.getAssetMetadata("AAPL")

      expect(result).toBeDefined()
      expect(result?.symbol).toBe("AAPL")
      expect(result?.sector).toBe("Technology")
      expect(result?.country).toBe("United States")
    })
  })

  describe("getETFComposition", () => {
    it("should fetch ETF composition successfully", async () => {
      const mockResponse = {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        domicile: "US",
        withholdingTax: 30,
        expenseRatio: 0.03,
        country: [{ country: "United States", weight: 100 }],
        sector: [
          { sector: "Technology", weight: 25 },
          { sector: "Healthcare", weight: 15 },
        ],
        currency: [{ currency: "USD", weight: 100 }],
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await apiService.getETFComposition("VTI")

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith("/api/yahoo/etf/VTI")
    })

    it("should return estimated composition for Irish ETF", async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

      const result = await apiService.getETFComposition("IWDA")

      expect(result).toBeDefined()
      expect(result?.symbol).toBe("IWDA")
      expect(result?.domicile).toBe("IE")
      expect(result?.withholdingTax).toBe(15)
    })
  })
})
