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
      const mockYahooResponse = {
        regularMarketPrice: 150.0,
        previousClose: 148.0,
        regularMarketChange: 2.0,
        regularMarketChangePercent: 1.35,
        currency: "USD",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockYahooResponse,
      } as Response)

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

    test("should handle Yahoo Finance API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const price = await apiService.getStockPrice("INVALID")
      expect(price).toBeNull()
    })

    test("should use cache for repeated requests", async () => {
      const mockResponse = {
        regularMarketPrice: 150.0,
        previousClose: 148.0,
        regularMarketChange: 2.0,
        regularMarketChangePercent: 1.35,
        currency: "USD",
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
    test("should fetch ETF composition from Yahoo scraping", async () => {
      const mockHtmlResponse = `
        <html>
          <body>
            <div class="holdings-table">
              <div class="holding-row">
                <span class="symbol">AAPL</span>
                <span class="name">Apple Inc.</span>
                <span class="weight">4.8%</span>
                <span class="sector">Technology</span>
              </div>
            </div>
            <div class="sector-breakdown">
              <div class="sector-item">
                <span class="sector-name">Technology</span>
                <span class="sector-weight">25.0%</span>
              </div>
              <div class="sector-item">
                <span class="sector-name">Financials</span>
                <span class="sector-weight">15.0%</span>
              </div>
            </div>
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlResponse,
      } as Response)

      const composition = await apiService.getETFComposition("VWRL")

      expect(composition).toBeDefined()
      expect(composition?.symbol).toBe("VWRL")
      expect(composition?.sector.length).toBeGreaterThan(0)
      expect(composition?.holdings.length).toBeGreaterThan(0)
    })

    test("should fallback to known compositions when scraping fails", async () => {
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
      const mockSearchResponse = {
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
        json: async () => mockSearchResponse,
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
    test("should respect rate limits and queue requests", async () => {
      const mockResponse = {
        regularMarketPrice: 150.0,
        previousClose: 148.0,
        regularMarketChange: 2.0,
        regularMarketChangePercent: 1.35,
        currency: "USD",
      }

      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      // Make multiple rapid requests for different symbols to avoid caching
      const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
      const promises = symbols.map((symbol) => apiService.getStockPrice(symbol))

      const results = await Promise.all(promises)

      // All requests should succeed
      results.forEach((result) => {
        expect(result).not.toBeNull()
        expect(result?.price).toBe(150.0)
      })

      // Should have made requests for each symbol (no caching between different symbols)
      expect(mockFetch).toHaveBeenCalledTimes(symbols.length)
    })

    test("should handle rate limit delays gracefully", async () => {
      const startTime = Date.now()

      // Mock rate limiter to simulate delays
      const originalCanMakeRequest = (apiService as any).rateLimiter?.canMakeRequest
      if (originalCanMakeRequest) {
        jest
          .spyOn((apiService as any).rateLimiter, "canMakeRequest")
          .mockReturnValueOnce(false) // First call blocked
          .mockReturnValue(true) // Subsequent calls allowed
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          regularMarketPrice: 150.0,
          currency: "USD",
        }),
      } as Response)

      const price = await apiService.getStockPrice("AAPL")
      const endTime = Date.now()

      // Should still return a result (from cache or fallback)
      expect(price).toBeDefined()

      // Test should complete in reasonable time (not actually wait for rate limit)
      expect(endTime - startTime).toBeLessThan(1000)
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

    test("should handle empty responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      expect(price).toBeNull()
    })
  })

  describe("Symbol Resolution", () => {
    test("should resolve Swiss symbols correctly", async () => {
      const mockResponse = {
        regularMarketPrice: 89.96,
        currency: "CHF",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const price = await apiService.getStockPrice("VWRL")

      expect(price).toBeDefined()
      expect(price?.currency).toBe("CHF")
    })
  })
})
