import { parseSwissPortfolioPDF } from "../portfolio-parser"
import { apiService } from "../lib/api-service"
import { jest } from "@jest/globals"

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
        { sector: "Financial Services", weight: 75 },
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
        AAPL Apple Inc. 100 150.00 USD 15'000.00
        MSFT Microsoft Corp. 50 280.00 USD 14'000.00
        
        ETF
        VWRL Vanguard FTSE All-World 500 89.96 CHF 44'980.00
        IS3N iShares Core MSCI World 200 30.50 CHF 6'100.00
      `

      const result = await parseSwissPortfolioPDF(sampleText)

      expect(result).toBeDefined()
      expect(result.accountOverview.totalValue).toBeCloseTo(889528.75, 2)
      expect(result.accountOverview.cashBalance).toBeCloseTo(5129.55, 2)
      expect(result.accountOverview.securitiesValue).toBeCloseTo(877853.96, 2)
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

      expect(result.accountOverview.totalValue).toBeCloseTo(1234567.89, 2)
      expect(result.accountOverview.cashBalance).toBeCloseTo(12345.67, 2)
      expect(result.accountOverview.securitiesValue).toBeCloseTo(1222222.22, 2)

      // Check that positions were parsed
      const applePosition = result.positions.find((p) => p.symbol === "AAPL")
      expect(applePosition).toBeDefined()
      expect(applePosition?.quantity).toBe(100)
      expect(applePosition?.price).toBeCloseTo(150.0, 2)
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

      expect(result.accountOverview.totalValue).toBeCloseTo(2500000.0, 2)
      expect(result.positions.some((p) => p.symbol === "AAPL")).toBeTruthy()
      expect(result.positions.some((p) => p.symbol === "VWRL")).toBeTruthy()

      const applePosition = result.positions.find((p) => p.symbol === "AAPL")
      expect(applePosition?.quantity).toBe(200)
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

      expect(result.accountOverview.totalValue).toBeCloseTo(750000.0, 2)
      expect(result.positions.length).toBeGreaterThan(0)

      const applePosition = result.positions.find((p) => p.symbol === "AAPL")
      expect(applePosition?.quantity).toBe(300)
    })
  })

  describe("CSV Parsing", () => {
    test("should parse Swissquote CSV format", async () => {
      const csvText = `Symbole,Nom,Quantité,Prix unitaire,Devise,Valeur totale CHF,G&P CHF
AAPL,Apple Inc.,100,150.00,USD,15000.00,1000.00
VWRL,Vanguard FTSE All-World,500,89.96,CHF,44980.00,2000.00
NESN,Nestlé SA,50,120.00,CHF,6000.00,500.00`

      const result = await parseSwissPortfolioPDF(csvText)

      expect(result).toBeDefined()
      expect(result.positions.length).toBe(3)

      const applePosition = result.positions.find((p) => p.symbol === "AAPL")
      expect(applePosition).toBeDefined()
      expect(applePosition?.quantity).toBe(100)
      expect(applePosition?.price).toBeCloseTo(150.0, 2)
      expect(applePosition?.currency).toBe("USD")
      expect(applePosition?.totalValueCHF).toBeCloseTo(15000.0, 2)
    })

    test("should parse CSV with semicolon delimiter", async () => {
      const csvText = `Symbole;Nom;Quantité;Prix unitaire;Devise;Valeur totale CHF
AAPL;Apple Inc.;100;150.00;USD;15000.00
VWRL;Vanguard FTSE All-World;500;89.96;CHF;44980.00`

      const result = await parseSwissPortfolioPDF(csvText)

      expect(result).toBeDefined()
      expect(result.positions.length).toBe(2)
    })

    test("should handle CSV without clear headers", async () => {
      const csvText = `AAPL,Apple Inc.,100,150.00,USD,15000.00
VWRL,Vanguard FTSE All-World,500,89.96,CHF,44980.00`

      const result = await parseSwissPortfolioPDF(csvText)

      expect(result).toBeDefined()
      expect(result.positions.length).toBe(2)
    })
  })

  describe("Number Parsing", () => {
    test("should parse Swiss number format", async () => {
      const text = `
        Valeur totale 1'234'567.89
        AAPL Apple Inc. 100 150.00 USD 15'000.00
      `
      const result = await parseSwissPortfolioPDF(text)

      expect(result.accountOverview.totalValue).toBeCloseTo(1234567.89, 2)
    })

    test("should parse different decimal separators", async () => {
      const text1 = `
        Value 1,234.56
        AAPL Apple Inc. 100 150.00 USD 15'000.00
      `
      const text2 = `
        Value 1'234.56
        AAPL Apple Inc. 100 150.00 USD 15'000.00
      `

      const result1 = await parseSwissPortfolioPDF(text1)
      const result2 = await parseSwissPortfolioPDF(text2)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result1.accountOverview.totalValue).toBeCloseTo(1234.56, 2)
      expect(result2.accountOverview.totalValue).toBeCloseTo(1234.56, 2)
    })
  })

  describe("Currency Handling", () => {
    test("should identify different currencies", async () => {
      const text = `
        Valeur totale 100'000.00
        AAPL Apple Inc. 100 150.00 USD 15'000.00
        NESN Nestlé SA 50 120.00 CHF 6'000.00
        ASML ASML Holding 25 600.00 EUR 15'000.00
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
        Valeur totale 100'000.00
        Actions
        AAPL Apple Inc. 100 150.00 USD 15'000.00
        
        ETF
        VWRL Vanguard FTSE All-World 500 89.96 CHF 44'980.00
        
        Obligations
        US Treasury Bond 10 1000.00 USD 10'000.00
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

      const text = `
        Valeur totale 100'000.00
        AAPL Apple Inc. 100 150.00 USD 15'000.00
      `

      const result = await parseSwissPortfolioPDF(text)

      // Should still return data even if API fails
      expect(result).toBeDefined()
      expect(result.positions.length).toBeGreaterThan(0)
    })

    test("should handle missing price data", async () => {
      mockApiService.getStockPrice.mockResolvedValue(null)

      const text = `
        Valeur totale 100'000.00
        AAPL Apple Inc. 100 150.00 USD 15'000.00
      `

      const result = await parseSwissPortfolioPDF(text)

      expect(result).toBeDefined()
      const position = result.positions.find((p) => p.symbol === "AAPL")
      expect(position).toBeDefined()
      // Should use the price from the statement when API fails
      expect(position?.price).toBeCloseTo(150.0, 2)
    })
  })

  describe("ETF Look-through Analysis", () => {
    test("should perform ETF look-through for currency allocation", async () => {
      const text = `
        Valeur totale 100'000.00
        ETF
        VWRL Vanguard FTSE All-World 1000 89.96 CHF 89'960.00
      `

      const result = await parseSwissPortfolioPDF(text)

      // Should have currency breakdown from ETF composition
      expect(result.currencyAllocation.length).toBeGreaterThan(1)
      expect(result.currencyAllocation.some((c) => c.currency === "USD")).toBeTruthy()
      expect(result.currencyAllocation.some((c) => c.currency === "EUR")).toBeTruthy()
    })

    test("should perform ETF look-through for sector allocation", async () => {
      const text = `
        Valeur totale 100'000.00
        ETF
        VWRL Vanguard FTSE All-World 1000 89.96 CHF 89'960.00
      `

      const result = await parseSwissPortfolioPDF(text)

      // Should have sector breakdown from ETF composition
      expect(result.sectorAllocation.length).toBeGreaterThan(1)
      expect(result.sectorAllocation.some((s) => s.sector === "Technology")).toBeTruthy()
      expect(result.sectorAllocation.some((s) => s.sector === "Financial Services")).toBeTruthy()
    })
  })

  describe("Performance Calculation", () => {
    test("should calculate position performance", async () => {
      // Mock current price different from statement price
      mockApiService.getStockPrice.mockResolvedValue({
        symbol: "AAPL",
        price: 160.0, // Higher than statement price of 150
        currency: "USD",
        change: 10.0,
        changePercent: 6.67,
        lastUpdated: new Date().toISOString(),
      })

      const text = `
        Valeur totale 100'000.00
        AAPL Apple Inc. 100 150.00 USD 15'000.00
      `

      const result = await parseSwissPortfolioPDF(text)

      const position = result.positions.find((p) => p.symbol === "AAPL")
      expect(position).toBeDefined()
      expect(position?.currentPrice).toBe(160.0)
      expect(position?.unrealizedGainLoss).toBeCloseTo(1000.0, 2) // (160-150) * 100
      expect(position?.unrealizedGainLossPercent).toBeCloseTo(6.67, 2)
    })
  })

  describe("Tax Optimization for Swiss Investors", () => {
    test("should correctly identify US domiciled funds as tax optimized", async () => {
      // Mock US ETF
      mockApiService.getETFComposition.mockResolvedValue({
        symbol: "VTI",
        currency: [{ currency: "USD", weight: 100 }],
        country: [{ country: "United States", weight: 100 }],
        sector: [{ sector: "Technology", weight: 30 }],
        holdings: [],
        domicile: "US",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      })

      const text = `
        Valeur totale 100'000.00
        ETF
        VTI Vanguard Total Stock Market 1000 200.00 USD 200'000.00
      `

      const result = await parseSwissPortfolioPDF(text)

      const position = result.positions.find((p) => p.symbol === "VTI")
      expect(position).toBeDefined()
      expect(position?.domicile).toBe("US")
      expect(position?.taxOptimized).toBe(true) // US domiciled is better for Swiss
      expect(position?.withholdingTax).toBe(15)
    })

    test("should correctly identify European domiciled funds as less tax optimized", async () => {
      // Mock European ETF
      mockApiService.getETFComposition.mockResolvedValue({
        symbol: "VWRL",
        currency: [{ currency: "USD", weight: 65 }],
        country: [{ country: "United States", weight: 65 }],
        sector: [{ sector: "Technology", weight: 25 }],
        holdings: [],
        domicile: "IE",
        withholdingTax: 15,
        lastUpdated: new Date().toISOString(),
      })

      const text = `
        Valeur totale 100'000.00
        ETF
        VWRL Vanguard FTSE All-World 1000 89.96 CHF 89'960.00
      `

      const result = await parseSwissPortfolioPDF(text)

      const position = result.positions.find((p) => p.symbol === "VWRL")
      expect(position).toBeDefined()
      expect(position?.domicile).toBe("IE")
      expect(position?.taxOptimized).toBe(false) // European domiciled is less optimal for Swiss
      expect(position?.withholdingTax).toBe(15)
    })
  })

  describe("Symbol Resolution and Caching", () => {
    test("should handle symbol variations for European ETFs", async () => {
      // Test that the system tries different symbol variations
      const text = `
        Valeur totale 100'000.00
        ETF
        VWRL Vanguard FTSE All-World 1000 89.96 CHF 89'960.00
      `

      const result = await parseSwissPortfolioPDF(text)

      expect(result).toBeDefined()
      expect(result.positions.length).toBeGreaterThan(0)

      // Verify that the API service was called (symbol resolution should work)
      expect(mockApiService.getStockPrice).toHaveBeenCalled()
      expect(mockApiService.getAssetMetadata).toHaveBeenCalled()
      expect(mockApiService.getETFComposition).toHaveBeenCalled()
    })
  })

  describe("Enhanced CSV Parsing", () => {
    test("should handle French column headers", async () => {
      const csvText = `Symbole;Libellé;Quantité;Cours;Devise;Montant CHF
AAPL;Apple Inc.;100;150.00;USD;15000.00
VWRL;Vanguard FTSE All-World;500;89.96;CHF;44980.00`

      const result = await parseSwissPortfolioPDF(csvText)

      expect(result).toBeDefined()
      expect(result.positions.length).toBe(2)

      const applePosition = result.positions.find((p) => p.symbol === "AAPL")
      expect(applePosition).toBeDefined()
      expect(applePosition?.name).toBe("Apple Inc.")
    })

    test("should handle mixed case headers", async () => {
      const csvText = `SYMBOLE;NOM;QUANTITE;PRIX;DEVISE;TOTAL_CHF
aapl;Apple Inc.;100;150.00;USD;15000.00
vwrl;Vanguard FTSE All-World;500;89.96;CHF;44980.00`

      const result = await parseSwissPortfolioPDF(csvText)

      expect(result).toBeDefined()
      expect(result.positions.length).toBe(2)

      // Symbols should be normalized to uppercase
      expect(result.positions.some((p) => p.symbol === "AAPL")).toBeTruthy()
      expect(result.positions.some((p) => p.symbol === "VWRL")).toBeTruthy()
    })
  })
})
