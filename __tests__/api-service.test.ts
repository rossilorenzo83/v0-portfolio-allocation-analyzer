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
        symbol: "AAPL",
        price: 150.0,
        change: 2.0,
        changePercent: 1.35,
        currency: "USD",
        lastUpdated: "2024-01-01T00:00:00.000Z",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockYahooResponse,
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      expect(price).toEqual({
        symbol: "AAPL",
        price: 150.0,
        change: 2.0,
        changePercent: 1.35,
        currency: "USD",
        lastUpdated: expect.any(String),
      })
    })

    test("should handle Yahoo Finance API errors and fallback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      // Should fallback to known prices
      expect(price).not.toBeNull()
      expect(price?.symbol).toBe("AAPL")
      expect(price?.price).toBe(150.0)
    })

    test("should use cache for repeated requests", async () => {
      const mockResponse = {
        symbol: "AAPL",
        price: 150.0,
        change: 2.0,
        changePercent: 1.35,
        currency: "USD",
        lastUpdated: "2024-01-01T00:00:00.000Z",
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

    test("should fallback to web scraping when API fails", async () => {
      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      // Mock successful scraping
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html>
            <body>
              <span data-symbol="AAPL" data-field="regularMarketPrice">155.50</span>
              <script>{"regularMarketChange":{"raw":2.5},"regularMarketChangePercent":{"raw":1.63},"currency":"USD"}</script>
            </body>
          </html>
        `,
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      expect(price).not.toBeNull()
      expect(price?.symbol).toBe("AAPL")
      expect(mockFetch).toHaveBeenCalledTimes(2) // API call + scraping call
    })
  })

  describe("ETF Composition Fetching", () => {
    test("should fetch ETF composition from Yahoo API", async () => {
      const mockETFResponse = {
        symbol: "VWRL",
        domicile: "IE",
        withholdingTax: 15,
        currency: [{ currency: "USD", weight: 65.0 }],
        country: [{ country: "United States", weight: 60.0 }],
        sector: [{ sector: "Technology", weight: 22.0 }],
        holdings: [{ symbol: "AAPL", name: "Apple Inc.", weight: 4.2 }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockETFResponse,
      } as Response)

      const composition = await apiService.getETFComposition("VWRL")

      expect(composition).toBeDefined()
      expect(composition?.symbol).toBe("VWRL")
      expect(composition?.domicile).toBe("IE")
      expect(composition?.withholdingTax).toBe(15)
      expect(composition?.sector.length).toBeGreaterThan(0)
    })

    test("should fallback to known compositions when API fails", async () => {
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

    test("should fallback to web scraping when API fails", async () => {
      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      // Mock successful scraping
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html>
            <body>
              <span>Technology</span><span>25.0%</span>
              <span>Healthcare</span><span>15.0%</span>
              <a>AAPL</a><span>Apple Inc.</span><span>4.5%</span>
            </body>
          </html>
        `,
      } as Response)

      const composition = await apiService.getETFComposition("VWRL")

      expect(composition).toBeDefined()
      expect(composition?.symbol).toBe("VWRL")
      expect(mockFetch).toHaveBeenCalledTimes(2) // API call + scraping call
    })
  })

  describe("Asset Metadata Fetching", () => {
    test("should fetch metadata from Yahoo API", async () => {
      const mockSearchResponse = {
        symbol: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        country: "United States",
        currency: "USD",
        type: "Stock",
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

    test("should fallback to known metadata when API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const metadata = await apiService.getAssetMetadata("AAPL")

      expect(metadata).toBeDefined()
      expect(metadata?.symbol).toBe("AAPL")
      expect(metadata?.name).toBe("Apple Inc.")
      expect(metadata?.sector).toBe("Technology")
    })
  })

  describe("Rate Limiting", () => {
    test("should respect rate limits and queue requests", async () => {
      const mockResponse = {
        symbol: "AAPL",
        price: 150.0,
        change: 2.0,
        changePercent: 1.35,
        currency: "USD",
        lastUpdated: "2024-01-01T00:00:00.000Z",
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
  })

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const price = await apiService.getStockPrice("AAPL")

      // Should fallback to known prices
      expect(price).not.toBeNull()
      expect(price?.symbol).toBe("AAPL")
    })

    test("should handle invalid JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON")
        },
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      // Should fallback to known prices
      expect(price).not.toBeNull()
      expect(price?.symbol).toBe("AAPL")
    })

    test("should handle empty responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const price = await apiService.getStockPrice("AAPL")

      // Should fallback to known prices
      expect(price).not.toBeNull()
      expect(price?.symbol).toBe("AAPL")
    })
  })

  describe("Symbol Resolution", () => {
    test("should resolve Swiss symbols correctly", async () => {
      const mockResponse = {
        symbol: "VWRL",
        price: 89.96,
        change: 0.8,
        changePercent: 0.9,
        currency: "CHF",
        lastUpdated: "2024-01-01T00:00:00.000Z",
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
