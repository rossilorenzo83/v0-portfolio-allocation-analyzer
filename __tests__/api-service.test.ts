import { apiService } from "../lib/api-service"
import { jest } from "@jest/globals"

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe("API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear cache between tests
    ;(apiService as any).cache.clear()
  })

  describe("Stock Price Fetching", () => {
    test("should fetch from Yahoo Finance successfully", async () => {
      const mockResponse = {
                symbol: "AAPL",
                regularMarketPrice: 150.0,
                previousClose: 148.0,
                regularMarketChange: 2.0,
                regularMarketChangePercent: 1.35,
                currency: "USD",
        }


      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const price = await apiService.getStockPrice("AAPL")

      expect(price).toEqual({
        symbol: "AAPL",
        price: 150.0,
        currency: "USD",
        change: 2.0,
        changePercent: 1.35,
        lastUpdated: expect.any(String),
      })
    })

    test("should fallback to Alpha Vantage when Yahoo fails", async () => {
      // Yahoo fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      // Alpha Vantage succeeds
      const alphaVantageResponse = {
        "Global Quote": {
          "05. price": "150.00",
          "09. change": "2.00",
          "10. change percent": "1.35%",
          "07. latest trading day": "2024-01-15",
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => alphaVantageResponse,
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      expect(price).toEqual({
        symbol: "AAPL",
        price: 150.0,
        currency: "USD",
        change: 2.0,
        changePercent: 1.35,
        lastUpdated: "2024-01-15",
      })
    })

    test("should use cache for repeated requests", async () => {
      const mockResponse = {
        chart: {
          result: [
            {
              meta: {
                regularMarketPrice: 150.0,
                previousClose: 148.0,
                currency: "USD",
              },
            },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      // First call
      await apiService.getStockPrice("AAPL")

      // Second call should use cache
      const price = await apiService.getStockPrice("AAPL")

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(price?.symbol).toBe("AAPL")
    })
  })

  describe("ETF Composition Fetching", () => {
    test("should fetch ETF composition from Yahoo", async () => {
      const mockResponse = {
              topHoldings: {
                holdings: [
                  {
                    symbol: "AAPL",
                    holdingName: "Apple Inc.",
                    holdingPercent: 0.048,
                    sector: "Technology",
                  },
                ],
              },
              fundProfile: {
                sectorWeightings: {
                  Technology: 0.25,
                  Financials: 0.15,
                },
              },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const composition = await apiService.getETFComposition("VWRL")

      expect(composition).toEqual({
        symbol: "VWRL",
        currency: [{ currency: "USD", weight: 100 }],
        country: [{ country: "Unknown", weight: 100 }],
        sector: [
          { sector: "Technology", weight: 25 },
          { sector: "Financials", weight: 15 },
        ],
        holdings: [
          {
            symbol: "AAPL",
            name: "Apple Inc.",
            weight: 4.8,
            sector: "Technology",
            country: "Unknown",
          },
        ],
        domicile: "IE",
        withholdingTax: 15,
        lastUpdated: expect.any(String),
      })
    })

    test("should fallback to known compositions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const composition = await apiService.getETFComposition("VWRL")

      expect(composition).toBeDefined()
      expect(composition?.symbol).toBe("VWRL")
      expect(composition?.domicile).toBe("IE")
      expect(composition?.withholdingTax).toBe(15)
    })
  })

  describe("Asset Metadata Fetching", () => {
    test("should fetch metadata from Yahoo", async () => {
      const mockResponse = {
        quotes: [
          {
            symbol: "AAPL",
            longname: "Apple Inc.",
            sector: "Technology",
            country: "United States",
            currency: "USD",
            quoteType: "EQUITY",
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const metadata = await apiService.getAssetMetadata("AAPL")

      expect(metadata).toEqual({
        symbol: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        country: "United States",
        currency: "USD",
        type: "Stock",
      })
    })
  })

  describe("Rate Limiting", () => {
    test("should respect rate limits", async () => {
      // Make multiple rapid requests
      const promises = Array(10)
        .fill(0)
        .map(() => apiService.getStockPrice("AAPL"))

      const mockResponse = {
        symbol: "AAPL",
        regularMarketPrice: 150.0,
        previousClose: 148.0,
        regularMarketChange: 2.0,
        regularMarketChangePercent: 1.35,
        currency: "USD",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await Promise.all(promises)

      // Should not exceed rate limits (exact number depends on implementation)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Due to caching
    })
  })

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const price = await apiService.getStockPrice("AAPL")

      expect(price).toBeNull()
    })

    test("should handle invalid JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON")
        },
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      expect(price).toBeNull()
    })
  })
})
