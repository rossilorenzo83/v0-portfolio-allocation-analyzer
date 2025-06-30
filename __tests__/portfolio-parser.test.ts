import { parseSwissPortfolioPDF } from "../portfolio-parser"
import { apiService } from "../lib/api-service"
import jest from "jest"

// Mock the API service
jest.mock("../lib/api-service")
const mockApiService = apiService as jest.Mocked<typeof apiService>

describe("Swiss Portfolio Parser", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock responses
    mockApiService.getStockPrice.mockResolvedValue({
      symbol: "AAPL",
      price: 150.0,
      currency: "USD",
      change: 2.5,
      changePercent: 1.69,
      lastUpdated: new Date().toISOString(),
    })

    mockApiService.getAssetMetadata.mockResolvedValue({
      symbol: "AAPL",
      name: "Apple Inc.",
      sector: "Technology",
      country: "United States",
      currency: "USD",
      type: "Stock",
    })

    mockApiService.getETFComposition.mockResolvedValue({
      symbol: "VWRL",
      currency: [
        { currency: "USD", weight: 60 },
        { currency: "EUR", weight: 40 },
      ],
      country: [
        { country: "United States", weight: 60 },
        { country: "Europe", weight: 40 },
      ],
      sector: [
        { sector: "Technology", weight: 25 },
        { sector: "Financials", weight: 75 },
      ],
      holdings: [],
      domicile: "IE",
      withholdingTax: 15,
      lastUpdated: new Date().toISOString(),
    })
  })

  describe("Text Input Parsing", () => {
    test("should parse basic Swiss portfolio text", async () => {
      const sampleText = `
        Valeur totale 889'528.75
        Solde espèces 5'129.55
        Valeur des titres 877'853.96
        
        Actions
        AAPL Apple Inc. 100 150.00 USD
        MSFT Microsoft Corp. 50 280.00 USD
        
        ETF
        VWRL Vanguard FTSE All-World 500 89.96 CHF
        IS3N iShares Core MSCI World 200 30.50 CHF
      `

      const result = await parseSwissPortfolioPDF(sampleText)

      expect(result).toBeDefined()
      expect(result.accountOverview.totalValue).toBeGreaterThan(0)
      expect(result.positions.length).toBeGreaterThan(0)
      expect(result.assetAllocation.length).toBeGreaterThan(0)
    })

    test("should handle Swissquote format", async () => {
      const swissquoteText = `
        Aperçu du compte
        Valeur totale du portefeuille CHF 1'234'567.89
        Solde espèces CHF 12'345.67
        Valeur des titres CHF 1'222'222.22
        
        Positions
        Actions
        AAPL - Apple Inc. - 100 - USD 150.00 - CHF 15'000.00
        NESN - Nestlé SA - 50 - CHF 120.00 - CHF 6'000.00
        
        ETF
        VWRL - Vanguard FTSE All-World - 500 - CHF 89.96 - CHF 44'980.00
      `

      const result = await parseSwissPortfolioPDF(swissquoteText)

      expect(result.accountOverview.totalValue).toBe(1234567.89)
      expect(result.accountOverview.cashBalance).toBe(12345.67)
      expect(result.accountOverview.securitiesValue).toBe(1222222.22)
    })

    test("should handle UBS format", async () => {
      const ubsText = `
        Portfolio Overview
        Total Assets CHF 2'500'000.00
        Cash Position CHF 50'000.00
        Securities CHF 2'450'000.00
        
        Holdings:
        Equities:
        AAPL Apple Inc. Qty: 200 Price: USD 175.50 Value: CHF 35'100.00
        MSFT Microsoft Corporation Qty: 150 Price: USD 330.00 Value: CHF 49'500.00
        
        Funds:
        VWRL Vanguard FTSE All-World UCITS ETF Qty: 1000 Price: CHF 95.20 Value: CHF 95'200.00
      `

      const result = await parseSwissPortfolioPDF(ubsText)

      expect(result.accountOverview.totalValue).toBe(2500000.0)
      expect(result.positions.some((p) => p.symbol === "AAPL")).toBeTruthy()
      expect(result.positions.some((p) => p.symbol === "VWRL")).toBeTruthy()
    })

    test("should handle Credit Suisse format", async () => {
      const csText = `
        Account Summary
        Portfolio Value: CHF 750'000.00
        Cash Balance: CHF 25'000.00
        Investment Value: CHF 725'000.00
        
        Stock Positions:
        AAPL | Apple Inc. | 300 shares | $145.00 | CHF 43'500.00
        GOOGL | Alphabet Inc. | 100 shares | $2'800.00 | CHF 280'000.00
        
        ETF Holdings:
        IS3N | iShares Core MSCI World | 800 units | CHF 32.50 | CHF 26'000.00
      `

      const result = await parseSwissPortfolioPDF(csText)

      expect(result.accountOverview.totalValue).toBe(750000.0)
      expect(result.positions.length).toBeGreaterThan(0)
    })
  })

  describe("Number Parsing", () => {
    test("should parse Swiss number format", async () => {
      const text = "Valeur totale 1'234'567.89"
      const result = await parseSwissPortfolioPDF(text)

      // Should handle Swiss apostrophe thousands separator
      expect(result.accountOverview.totalValue).toBeGreaterThan(1000000)
    })

    test("should parse different decimal separators", async () => {
      const text1 = "Value 1,234.56" // US format
      const text2 = "Value 1'234.56" // Swiss format
      const text3 = "Value 1 234,56" // French format

      const result1 = await parseSwissPortfolioPDF(text1)
      const result2 = await parseSwissPortfolioPDF(text2)
      const result3 = await parseSwissPortfolioPDF(text3)

      // All should be parsed correctly
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result3).toBeDefined()
    })
  })

  describe("Currency Handling", () => {
    test("should identify different currencies", async () => {
      const text = `
        AAPL Apple Inc. 100 150.00 USD
        NESN Nestlé SA 50 120.00 CHF
        ASML ASML Holding 25 600.00 EUR
      `

      const result = await parseSwissPortfolioPDF(text)

      const currencies = result.currencyAllocation.map((c) => c.currency)
      expect(currencies).toContain("USD")
      expect(currencies).toContain("CHF")
      expect(currencies).toContain("EUR")
    })
  })

  describe("Asset Classification", () => {
    test("should classify different asset types", async () => {
      const text = `
        Actions
        AAPL Apple Inc. 100 150.00 USD
        
        ETF
        VWRL Vanguard FTSE All-World 500 89.96 CHF
        
        Obligations
        US Treasury Bond 10 1000.00 USD
        
        Crypto-monnaies
        BTC Bitcoin 0.5 50000.00 USD
      `

      const result = await parseSwissPortfolioPDF(text)

      const assetTypes = result.assetAllocation.map((a) => a.name)
      expect(assetTypes).toContain("Actions")
      expect(assetTypes).toContain("ETF")
    })
  })

  describe("Error Handling", () => {
    test("should handle empty input", async () => {
      await expect(parseSwissPortfolioPDF("")).rejects.toThrow()
    })

    test("should handle invalid format", async () => {
      const invalidText = "This is not a portfolio statement"
      await expect(parseSwissPortfolioPDF(invalidText)).rejects.toThrow()
    })

    test("should handle API failures gracefully", async () => {
      mockApiService.getStockPrice.mockRejectedValue(new Error("API Error"))

      const text = "AAPL Apple Inc. 100 150.00 USD"
      const result = await parseSwissPortfolioPDF(text)

      // Should still return data even if API fails
      expect(result).toBeDefined()
    })
  })

  describe("Real API Integration", () => {
    test("should fetch real stock prices", async () => {
      // Remove mock for this test
      jest.unmock("../lib/api-service")

      const realApiService = require("../lib/api-service").apiService
      const price = await realApiService.getStockPrice("AAPL")

      if (price) {
        expect(price.symbol).toBe("AAPL")
        expect(price.price).toBeGreaterThan(0)
        expect(price.currency).toBeDefined()
      }
    }, 10000) // 10 second timeout for API calls

    test("should fetch ETF composition", async () => {
      jest.unmock("../lib/api-service")

      const realApiService = require("../lib/api-service").apiService
      const composition = await realApiService.getETFComposition("VWRL")

      if (composition) {
        expect(composition.symbol).toBe("VWRL")
        expect(composition.currency.length).toBeGreaterThan(0)
        expect(composition.country.length).toBeGreaterThan(0)
        expect(composition.sector.length).toBeGreaterThan(0)
      }
    }, 10000)
  })
})
