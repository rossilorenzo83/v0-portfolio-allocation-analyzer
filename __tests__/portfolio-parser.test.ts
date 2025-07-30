import { parsePortfolioCsv } from "../portfolio-parser" // Corrected import

describe("parsePortfolioCsv", () => {
  it("should parse a simple CSV with standard headers", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
MSFT,Microsoft Corp.,5,400.50,USD,1842.30
NESN.SW,Nestle SA,20,105.20,CHF,2104.00`

    const result = parsePortfolioCsv(csvContent)

    expect(result).toBeDefined()
    expect(result.positions.length).toBe(3)
    expect(result.accountOverview.totalValue).toBeCloseTo(5510.3) // Sum of totalValueCHF
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].name).toBe("Apple Inc.")
    expect(result.positions[0].quantity).toBe(10)
    expect(result.positions[0].price).toBe(170.0)
    expect(result.positions[0].currency).toBe("USD")
    expect(result.positions[0].totalValueCHF).toBeCloseTo(1564.0)
    expect(result.positions[2].symbol).toBe("NESN.SW")
    expect(result.positions[2].currency).toBe("CHF")
  })

  it("should handle CSV with different delimiters (semicolon)", () => {
    const csvContent = `Symbol;Name;Quantity;Price;Currency;Total Value CHF
AAPL;Apple Inc.;10;170.00;USD;1564.00
MSFT;Microsoft Corp.;5;400.50;USD;1842.30`

    const result = parsePortfolioCsv(csvContent)

    expect(result).toBeDefined()
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].name).toBe("Microsoft Corp.")
  })

  it("should handle CSV with Swiss number formatting (apostrophe and comma decimal)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
VWRL,Vanguard ETF,100,75.50,USD,6'946.00
SMH,Semiconductor ETF,10,250.75,USD,2'306.90`

    const result = parsePortfolioCsv(csvContent)

    expect(result).toBeDefined()
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].quantity).toBe(100)
    expect(result.positions[0].price).toBe(75.5)
    expect(result.positions[0].totalValueCHF).toBeCloseTo(6946.0)
    expect(result.positions[1].quantity).toBe(10)
    expect(result.positions[1].price).toBe(250.75)
    expect(result.positions[1].totalValueCHF).toBeCloseTo(2306.9)
  })

  it("should correctly identify category headers and assign positions", () => {
    const csvContent = `
Category: Actions
Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
MSFT,Microsoft Corp.,5,400.50,USD,1842.30
Category: ETF
VWRL,Vanguard ETF,100,75.50,USD,6946.00
`
    const result = parsePortfolioCsv(csvContent)

    expect(result.positions.length).toBe(3)
    expect(result.positions[0].category).toBe("Actions")
    expect(result.positions[1].category).toBe("Actions")
    expect(result.positions[2].category).toBe("ETF")
  })

  it("should calculate total value if 'Total Value CHF' column is missing or invalid", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
AAPL,Apple Inc.,10,170.00,USD
MSFT,Microsoft Corp.,5,400.50,USD`

    const result = parsePortfolioCsv(csvContent)

    expect(result.positions.length).toBe(2)
    // Assuming USD rate is 0.92 CHF
    expect(result.positions[0].totalValueCHF).toBeCloseTo(10 * 170.0 * 0.92)
    expect(result.positions[1].totalValueCHF).toBeCloseTo(5 * 400.5 * 0.92)
    expect(result.accountOverview.totalValue).toBeCloseTo(10 * 170.0 * 0.92 + 5 * 400.5 * 0.92)
  })

  it("should handle empty or invalid rows gracefully", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00

,Invalid Row,,,,,
MSFT,Microsoft Corp.,5,400.50,USD,1842.30
`
    const result = parsePortfolioCsv(csvContent)

    expect(result.positions.length).toBe(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].symbol).toBe("MSFT")
  })

  it("should throw error if no valid positions are found", () => {
    const csvContent = `Header1,Header2
Value1,Value2
`
    expect(() => parsePortfolioCsv(csvContent)).toThrow(
      "No valid positions found in CSV file. Please check the file format.",
    )
  })

  it("should handle missing optional columns without error", () => {
    const csvContent = `Symbol,Quantity,Currency
AAPL,10,USD
MSFT,5,USD`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].name).toBe("AAPL") // Name defaults to symbol if not found
    expect(result.positions[0].price).toBeGreaterThan(0) // Price will be unitCost or mock
  })

  it("should correctly parse percentages and daily changes", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF,Position %,Daily Change %
AAPL,Apple Inc.,10,170.00,USD,1564.00,25.50%,1.25%
MSFT,Microsoft Corp.,5,400.50,USD,1842.30,30.00%,-0.80%`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].positionPercent).toBeCloseTo(25.5)
    expect(result.positions[0].dailyChangePercent).toBeCloseTo(1.25)
    expect(result.positions[1].positionPercent).toBeCloseTo(30.0)
    expect(result.positions[1].dailyChangePercent).toBeCloseTo(-0.8)
  })

  it("should handle various header casing and spacing", () => {
    const csvContent = ` SYMBOL , NAME , QUANTITY , PRICE , CURRENCY , TOTAL VALUE CHF 
aapl,Apple Inc.,10,170.00,USD,1564.00`

    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[0].name).toBe("Apple Inc.")
  })

  it("should infer structure if no clear header is found", () => {
    const csvContent = `
Some random text line
Another line of data
AAPL,Apple Inc.,10,170.00,USD,1564.00
MSFT,Microsoft Corp.,5,400.50,USD,1842.30
`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].symbol).toBe("MSFT")
  })

  it("should handle empty CSV content", () => {
    const csvContent = ""
    expect(() => parsePortfolioCsv(csvContent)).toThrow(
      "No valid positions found in CSV file. Please check the file format.",
    )
  })

  it("should handle CSV with only headers and no data", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF`
    expect(() => parsePortfolioCsv(csvContent)).toThrow(
      "No valid positions found in CSV file. Please check the file format.",
    )
  })

  it("should correctly parse a CSV with mixed line endings", () => {
    const csvContent = "Symbol,Name,Quantity\r\nAAPL,Apple,10\nMSFT,Microsoft,5\rGOOG,Google,2"
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(3)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].symbol).toBe("MSFT")
    expect(result.positions[2].symbol).toBe("GOOG")
  })

  it("should correctly parse a CSV with a different currency column name", () => {
    const csvContent = `Symbol,Name,Quantity,Price,CCY,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].currency).toBe("USD")
  })

  it("should correctly parse a CSV with a different quantity column name", () => {
    const csvContent = `Symbol,Name,Shares,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].quantity).toBe(10)
  })

  it("should correctly parse a CSV with a different price column name", () => {
    const csvContent = `Symbol,Name,Quantity,Market Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    expect(result.positions[0].price).toBe(170.0)
  })

  it("should handle a CSV where total value is calculated if not provided", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
AAPL,Apple Inc.,10,170.00,USD`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(1)
    // Assuming default USD to CHF rate of 0.92
    expect(result.positions[0].totalValueCHF).toBeCloseTo(10 * 170.0 * 0.92)
  })

  it("should handle a CSV with a mix of valid and invalid data rows", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
INVALID_SYMBOL,,abc,def,,
MSFT,Microsoft Corp.,5,400.50,USD,1842.30
`
    const result = parsePortfolioCsv(csvContent)
    expect(result.positions.length).toBe(2)
    expect(result.positions[0].symbol).toBe("AAPL")
    expect(result.positions[1].symbol).toBe("MSFT")
  })
})
