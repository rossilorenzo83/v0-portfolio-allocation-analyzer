import { getQuote, searchSymbol, getEtfHoldings } from "../lib/api-service"
import jest from "jest"

// Mock the global fetch function
global.fetch = jest.fn()

describe("API Service", () => {
  beforeEach(() => {
    // Reset mocks before each test
    ;(fetch as jest.Mock).mockClear()
  })

  describe("getQuote", () => {
    it("should fetch and return quote data for a given symbol", async () => {
      const mockQuoteData = {
        quoteResponse: {
          result: [
            {
              symbol: "AAPL",
              regularMarketPrice: 150.0,
              regularMarketChange: 1.5,
              regularMarketChangePercent: 1.01,
              currency: "USD",
              marketCap: 2500000000000,
              longName: "Apple Inc.",
            },
          ],
        },
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuoteData),
      })

      const quote = await getQuote("AAPL")
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/yahoo/quote/AAPL"), expect.any(Object))
      expect(quote).toEqual(mockQuoteData.quoteResponse.result[0])
    })

    it("should return null if quote data is not found", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quoteResponse: { result: [] } }),
      })

      const quote = await getQuote("NONEXISTENT")
      expect(quote).toBeNull()
    })

    it("should throw an error if the API call fails", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      await expect(getQuote("AAPL")).rejects.toThrow("Failed to fetch quote for AAPL")
    })
  })

  describe("searchSymbol", () => {
    it("should fetch and return search results for a given query", async () => {
      const mockSearchResults = {
        quotes: [
          { symbol: "AAPL", longname: "Apple Inc.", exchange: "NASDAQ" },
          { symbol: "APLE", longname: "Apple Hospitality REIT, Inc.", exchange: "NYSE" },
        ],
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults),
      })

      const results = await searchSymbol("Apple")
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/yahoo/search/Apple"), expect.any(Object))
      expect(results).toEqual(mockSearchResults.quotes)
    })

    it("should return an empty array if no search results are found", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quotes: [] }),
      })

      const results = await searchSymbol("xyz123")
      expect(results).toEqual([])
    })
  })

  describe("getEtfHoldings", () => {
    it("should fetch and return ETF holdings for a given symbol", async () => {
      const mockEtfHoldings = {
        fundHoldings: {
          holdings: [
            { symbol: "MSFT", holdingName: "Microsoft Corp", holdingPercent: 7.0 },
            { symbol: "AAPL", holdingName: "Apple Inc", holdingPercent: 6.5 },
          ],
        },
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEtfHoldings),
      })

      const holdings = await getEtfHoldings("SPY")
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/yahoo/etf/SPY"), expect.any(Object))
      expect(holdings).toEqual(mockEtfHoldings.fundHoldings.holdings)
    })

    it("should return an empty array if no ETF holdings are found", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ fundHoldings: { holdings: [] } }),
      })

      const holdings = await getEtfHoldings("NONETF")
      expect(holdings).toEqual([])
    })
  })
})
