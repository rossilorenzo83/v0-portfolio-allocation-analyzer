import { parsePortfolioCsv } from "../portfolio-parser"

describe("CSV Parsing", () => {
  it("should correctly parse a simple CSV with headers", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.50,USD,1568.60
MSFT,Microsoft Corp.,5,300.00,USD,1380.00
NESN,Nestle SA,20,100.00,CHF,2000.00`

    const result = parsePortfolioCsv(csvContent)

    expect(result.positions).toHaveLength(3)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].quantity).toBe(10)
    expect(result.positions[0].price).toBe(170.5)
    expect(result.positions[0].currency).toBe("USD")
    expect(result.positions[0].totalValueCHF).toBeCloseTo(1568.6) // 170.50 * 10 * 0.92 (mock rate)

    expect(result.positions[2].symbol).toBe("NESN")
    expect(result.positions[2].quantity).toBe(20)
    expect(result.positions[2].price).toBe(100.0)
    expect(result.positions[2].currency).toBe("CHF")
    expect(result.positions[2].totalValueCHF).toBeCloseTo(2000.0) // 100.00 * 20 * 1.0 (mock rate)

    expect(result.accountOverview.totalValue).toBeCloseTo(1568.6 + 1380.0 + 2000.0)
  })

  it("should handle CSV with different delimiters (semicolon)", () => {
    const csvContent = `Symbol;Name;Quantity;Price;Currency;Total Value CHF
SMHN;Swatch Group;5;250.00;CHF;1250.00
ROG;Roche Holding;10;300.00;CHF;3000.00`

    const result = parsePortfolioCsv(csvContent)

    expect(result.positions).toHaveLength(2)
    expect(result.positions[0].symbol).toBe("SMHN")
    expect(result.positions[0].quantity).toBe(5)
    expect(result.positions[0].price).toBe(250.0)
    expect(result.positions[0].currency).toBe("CHF")
    expect(result.positions[0].totalValueCHF).toBeCloseTo(1250.0)
  })

  it("should handle CSV with Swiss number formatting (apostrophe and comma decimal)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
UBSG,UBS Group,1'000,20.50,CHF,20'500.00
CSGN,Credit Suisse,500,0,50,CHF,250,00` // 0,50 should be 0.50

    const result = parsePortfolioCsv(csvContent)

    expect(result.positions).toHaveLength(2)
    expect(result.positions[0].symbol).toBe("UBSG")
    expect(result.positions[0].quantity).toBe(1000)
    expect(result.positions[0].price).toBe(20.5)
    expect(result.positions[0].totalValueCHF).toBeCloseTo(20500.0)

    expect(result.positions[1].symbol).toBe("CSGN")
    expect(result.positions[1].quantity).toBe(500)
    expect(result.positions[1].price).toBe(0.5)
    expect(result.positions[1].totalValueCHF).toBeCloseTo(250.0)
  })

  it("should correctly identify headers with variations and case insensitivity", () => {
    const csvContent = `ISIN,Description,QTY,Unit Price,CCY,Total Value
CH0012345678,Swiss Company,100,50.00,CHF,5000.00`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(1)
    expect(result.positions[0].symbol).toBe("CH0012345678")
    expect(result.positions[0].name).toBe("Swiss Company")
    expect(result.positions[0].quantity).toBe(100)
    expect(result.positions[0].price).toBe(50.0)
    expect(result.positions[0].currency).toBe("CHF")
  })

  it("should skip rows with missing essential data (symbol, quantity, price, currency)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.50,USD,1568.60
MSFT,,5,300.00,USD,1380.00
,Nestle SA,20,100.00,CHF,2000.00
GOOG,Google,0,100.00,USD,0
TSLA,Tesla,10,,USD,1000.00`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(1) // Only AAPL should be parsed
    expect(result.positions[0].symbol).toBe("AAPL")
  })

  it("should handle empty CSV content", () => {
    const csvContent = ""
    expect(() => parsePortfolioCsv(csvContent)).toThrow(
      "No valid positions found in CSV file. Please check the file format.",
    )
  })

  it("should handle CSV with only headers", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF`
    expect(() => parsePortfolioCsv(csvContent)).toThrow(
      "No valid positions found in CSV file. Please check the file format.",
    )
  })

  it("should handle CSV with category headers and parse positions correctly", () => {
    const csvContent = `
Actions
Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.50,USD,1568.60
MSFT,Microsoft Corp.,5,300.00,USD,1380.00

ETF
Symbol,Name,Quantity,Price,Currency,Total Value CHF
VT,Vanguard Total World,2,90.00,USD,165.60
`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(4)
    expect(result.positions[0].category).toBe("Actions")
    expect(result.positions[1].category).toBe("Actions")
    expect(result.positions[2].category).toBe("ETF")
    expect(result.positions[3].category).toBe("ETF")
  })

  it("should calculate totalValueCHF if not provided or invalid", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
AAPL,Apple Inc.,10,170.50,USD
NESN,Nestle SA,20,100.00,CHF`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(2)
    expect(result.positions[0].totalValueCHF).toBeCloseTo(10 * 170.5 * 0.92) // USD rate
    expect(result.positions[1].totalValueCHF).toBeCloseTo(20 * 100.0 * 1.0) // CHF rate
  })

  it("should handle CSVs without explicit headers by inferring structure", () => {
    const csvContent = `AAPL,Apple Inc.,10,170.50,USD,1568.60
MSFT,Microsoft Corp.,5,300.00,USD,1380.00
NESN,Nestle SA,20,100.00,CHF,2000.00`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(3)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].quantity).toBe(10)
    expect(result.positions[0].price).toBe(170.5)
    expect(result.positions[0].currency).toBe("USD")
    expect(result.positions[0].totalValueCHF).toBeCloseTo(1568.6)
  })

  it("should handle CSVs with only a few columns and infer", () => {
    const csvContent = `AAPL,10,170.50,USD
NESN,20,100.00,CHF`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].quantity).toBe(10)
    expect(result.positions[0].price).toBe(170.5)
    expect(result.positions[0].currency).toBe("USD")
    expect(result.positions[0].name).toBe("AAPL") // Name inferred from symbol
  })

  it("should correctly parse a CSV with a total row at the end", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.50,USD,1568.60
MSFT,Microsoft Corp.,5,300.00,USD,1380.00
Total,Portfolio,15,470.50,CHF,3000.00` // This total row should be skipped for positions but value extracted

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].symbol).toBe("MSFT")
    expect(result.accountOverview.totalValue).toBeCloseTo(3000.0) // Should pick up the total from the row
  })

  it("should handle empty rows within the CSV", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.50,USD,1568.60

MSFT,Microsoft Corp.,5,300.00,USD,1380.00
`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(2)
  })

  it("should correctly parse a CSV with mixed data types and extra columns", () => {
    const csvContent = `Symbol,Description,Quantity,Unit Price,Currency,Market Value,Gain/Loss,Notes
AAPL,Apple Inc.,10,170.50,USD,1568.60,100.00,Good stock
MSFT,Microsoft Corp.,5,300.00,USD,1380.00,50.00,Tech giant`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions).toHaveLength(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].name).toBe("Apple Inc.")
    expect(result.positions[0].quantity).toBe(10)
    expect(result.positions[0].unitCost).toBe(170.5)
    expect(result.positions[0].currency).toBe("USD")
    expect(result.positions[0].totalValueCHF).toBeCloseTo(1568.6)
    expect(result.positions[0].gainLossCHF).toBe(100.0)
  })
})
