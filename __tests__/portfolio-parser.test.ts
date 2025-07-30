import { parseSwissPortfolioPDF, parsePortfolioCsv } from "../portfolio-parser"
import { jest } from "@jest/globals"

// Mock pdf-utils to avoid actual PDF parsing in tests
jest.mock("../lib/pdf-utils", () => ({
  safePDFExtraction: jest.fn((file: File) => {
    if (file.name.endsWith(".pdf")) {
      // Return a simplified text representation for PDF tests
      return Promise.resolve(`
        Account Overview
        Total value CHF 10'000.00
        Securities value CHF 9'000.00
        Cash balance CHF 1'000.00

        Positions
        AAPL Apple Inc. 10 150.00 USD 1500.00 Actions US 15.00% 1.20%
        VWRL Vanguard FTSE All-World UCITS ETF 5 100.00 USD 500.00 ETF IE 5.00% 0.50%
      `)
    }
    return Promise.resolve("")
  }),
  loadPdf: jest.fn(() => Promise.resolve({})), // Mock loadPdf
  getPdfText: jest.fn(() => Promise.resolve("")), // Mock getPdfText
}))

// Mock api-service to avoid actual API calls in tests
jest.mock("../lib/api-service", () => ({
  apiService: {
    getStockPrice: jest.fn((symbol: string) => {
      const prices: { [key: string]: { price: number; changePercent: number } } = {
        AAPL: { price: 150.0, changePercent: 1.2 },
        VWRL: { price: 100.0, changePercent: 0.5 },
        "NESN.SW": { price: 100.0, changePercent: 0.1 },
      }
      return Promise.resolve(prices[symbol] || { price: 0, changePercent: 0 })
    }),
    getAssetMetadata: jest.fn((symbol: string) => {
      const metadata: { [key: string]: { name: string; sector: string; country: string } } = {
        AAPL: { name: "Apple Inc.", sector: "Technology", country: "United States" },
        VWRL: { name: "Vanguard FTSE All-World UCITS ETF", sector: "Diversified", country: "Ireland" },
        "NESN.SW": { name: "Nestle S.A.", sector: "Consumer Staples", country: "Switzerland" },
      }
      return Promise.resolve(metadata[symbol] || { name: symbol, sector: "Unknown", country: "Unknown" })
    }),
    getETFComposition: jest.fn((symbol: string) => {
      const compositions: { [key: string]: any } = {
        VWRL: {
          domicile: "IE",
          withholdingTax: 15,
          country: [
            { country: "United States", weight: 60 },
            { country: "Switzerland", weight: 5 },
          ],
          sector: [
            { sector: "Technology", weight: 20 },
            { sector: "Consumer Staples", weight: 10 },
          ],
          currency: [
            { currency: "USD", weight: 70 },
            { currency: "EUR", weight: 15 },
          ],
        },
      }
      return Promise.resolve(compositions[symbol] || null)
    }),
    searchSymbol: jest.fn(() => Promise.resolve([])),
  },
}))

// Dummy File class for Node.js environment
class DummyFile extends Blob {
  name: string
  lastModified: number

  constructor(chunks: BlobPart[], name: string, options?: BlobPropertyBag) {
    super(chunks, options)
    this.name = name
    this.lastModified = Date.now()
  }
}

describe("parsePortfolioCsv", () => {
  it("should parse a valid CSV string and return portfolio data", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
AAPL,Apple Inc.,10,150.00,USD,1350.00,Actions,US,15.00,1.20
NESN.SW,Nestle S.A.,5,100.00,CHF,500.00,Actions,CH,5.00,0.10`

    const result = parsePortfolioCsv(csvContent)

    expect(result).toBeDefined()
    expect(result.positions.length).toBe(2)
    expect(result.accountOverview.totalValue).toBeCloseTo(1850.0) // 1350 + 500
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].name).toBe("Apple Inc.")
    expect(result.positions[0].quantity).toBe(10)
    expect(result.positions[0].price).toBe(150.0)
    expect(result.positions[0].currency).toBe("USD")
    expect(result.positions[0].totalValueCHF).toBe(1350.0)
    expect(result.positions[0].category).toBe("Actions")
    expect(result.positions[0].positionPercent).toBe(15.0)
    expect(result.positions[0].dailyChangePercent).toBe(1.2)

    expect(result.positions[1].symbol).toBe("NESN.SW")
    expect(result.positions[1].name).toBe("Nestle S.A.")
    expect(result.positions[1].quantity).toBe(5)
    expect(result.positions[1].price).toBe(100.0)
    expect(result.positions[1].currency).toBe("CHF")
    expect(result.positions[1].totalValueCHF).toBe(500.0)
    expect(result.positions[1].category).toBe("Actions")
    expect(result.positions[1].positionPercent).toBe(5.0)
    expect(result.positions[1].dailyChangePercent).toBe(0.1)
  })

  it("should handle CSV with different delimiters (semicolon)", () => {
    const csvContent = `Symbol;Name;Quantity;Price;Currency;Total Value CHF;Category;Domicile;Position %;Daily Change %
AAPL;Apple Inc.;10;150.00;USD;1350.00;Actions;US;15.00;1.20`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].symbol).toBe("AAPL")
  })

  it("should throw error for CSV with no valid positions", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
INVALID,Invalid Stock,0,0,USD` // Invalid quantity/price
    expect(() => parsePortfolioCsv(csvContent)).toThrow("No valid positions found in the CSV file.")
  })

  it("should handle missing optional columns gracefully", () => {
    const csvContent = `Symbol,Quantity,Price,Currency
AAPL,10,150.00,USD`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].name).toBe("AAPL") // Name defaults to symbol
    expect(result.positions[0].totalValueCHF).toBeCloseTo(10 * 150 * 0.92) // Calculated total value
  })

  it("should correctly parse Swiss number formats", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
TEST,Test Stock,1'234.56,7.89,EUR,9'739.00`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].quantity).toBe(1234.56)
    expect(result.positions[0].price).toBe(7.89)
    expect(result.positions[0].totalValueCHF).toBe(9739.0)
  })
})

describe("parseSwissPortfolioPDF", () => {
  it("should parse a PDF file (mocked) and return portfolio data", async () => {
    const mockPdfFile = new DummyFile(["dummy pdf content"], "portfolio.pdf", { type: "application/pdf" })
    const result = await parseSwissPortfolioPDF(mockPdfFile)

    expect(result).toBeDefined()
    expect(result.accountOverview.totalValue).toBe(10000)
    expect(result.accountOverview.securitiesValue).toBe(9000)
    expect(result.accountOverview.cashBalance).toBe(1000)
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].symbol).toBe("VWRL")
  })

  it("should parse a CSV file (mocked) via PDF entry point", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
AAPL,Apple Inc.,10,150.00,USD,1350.00,Actions,US,15.00,1.20`
    const mockCsvFile = new DummyFile([csvContent], "portfolio.csv", { type: "text/csv" })
    const result = await parseSwissPortfolioPDF(mockCsvFile)

    expect(result).toBeDefined()
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].symbol).toBe("AAPL")
  })

  it("should throw error if no positions found in PDF", async () => {
    // Mock safePDFExtraction to return empty content
    require("../lib/pdf-utils").safePDFExtraction.mockResolvedValueOnce("Some header but no positions")
    const mockPdfFile = new DummyFile(["empty content"], "empty.pdf", { type: "application/pdf" })

    await expect(parseSwissPortfolioPDF(mockPdfFile)).rejects.toThrow("No portfolio positions found.")
  })

  it("should handle text input that looks like CSV", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
AAPL,Apple Inc.,10,150.00,USD,1350.00,Actions,US,15.00,1.20`
    const result = await parseSwissPortfolioPDF(csvContent)

    expect(result).toBeDefined()
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].symbol).toBe("AAPL")
  })

  it("should calculate asset allocation correctly", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
AAPL,Apple Inc.,10,100.00,USD,1000.00,Actions,US,10.00,1.00
VWRL,Vanguard ETF,5,200.00,USD,1000.00,ETF,IE,10.00,0.50
GLD,Gold Trust,1,500.00,USD,500.00,Commodities,US,5.00,0.20`
    const result = parsePortfolioCsv(csvContent)

    expect(result.assetAllocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Actions", value: 1000, percentage: 40 }),
        expect.objectContaining({ name: "ETF", value: 1000, percentage: 40 }),
        expect.objectContaining({ name: "Commodities", value: 500, percentage: 20 }),
      ]),
    )
  })

  it("should calculate currency allocation correctly", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
AAPL,Apple Inc.,10,100.00,USD,1000.00,Actions,US,10.00,1.00
NESN.SW,Nestle S.A.,5,200.00,CHF,1000.00,Actions,CH,10.00,0.50`
    const result = parsePortfolioCsv(csvContent)

    expect(result.currencyAllocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "USD", value: 1000, percentage: 50 }),
        expect.objectContaining({ name: "CHF", value: 1000, percentage: 50 }),
      ]),
    )
  })

  it("should calculate true country allocation with ETF look-through", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
VWRL,Vanguard FTSE All-World UCITS ETF,10,100.00,USD,1000.00,ETF,IE,10.00,1.00`
    const result = parsePortfolioCsv(csvContent)

    // Based on mock ETF composition for VWRL: 60% US, 5% CH
    expect(result.trueCountryAllocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "US", value: 700, percentage: 70 }), // 70% of 1000
        expect.objectContaining({ name: "CH", value: 100, percentage: 10 }), // 10% of 1000
      ]),
    )
  })

  it("should calculate true sector allocation with ETF look-through", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
VWRL,Vanguard FTSE All-World UCITS ETF,10,100.00,USD,1000.00,ETF,IE,10.00,1.00`
    const result = parsePortfolioCsv(csvContent)

    // Based on mock ETF composition for VWRL: 50% Technology, 20% Financials
    expect(result.trueSectorAllocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Technology", value: 500, percentage: 50 }), // 50% of 1000
        expect.objectContaining({ name: "Financials", value: 200, percentage: 20 }), // 20% of 1000
      ]),
    )
  })

  it("should calculate domicile allocation correctly", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %
AAPL,Apple Inc.,10,100.00,USD,1000.00,Actions,US,10.00,1.00
NESN.SW,Nestle S.A.,5,200.00,CHF,1000.00,Actions,CH,10.00,0.50
VWRL,Vanguard ETF,5,200.00,USD,1000.00,ETF,IE,10.00,0.50`
    const result = parsePortfolioCsv(csvContent)

    expect(result.domicileAllocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "United States (US)", value: 1000, percentage: 33.33 }),
        expect.objectContaining({ name: "Switzerland (CH)", value: 1000, percentage: 33.33 }),
        expect.objectContaining({ name: "Ireland (IE)", value: 1000, percentage: 33.33 }),
      ]),
    )
  })
})
