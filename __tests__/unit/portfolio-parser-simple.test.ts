import { parsePortfolioCsv, type SwissPortfolioData } from "../../portfolio-parser"

describe("Portfolio Parser - Simplified Unit Tests", () => {
  describe("parsePortfolioCsv", () => {
    it("should parse basic CSV with standard headers", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,10,150.00,1500.00
VWRL,50,100.00,5000.00`

      const result = await parsePortfolioCsv(csvContent)

      expect(result).toBeDefined()
      expect(result.positions).toHaveLength(2)
      expect(result.positions[0].symbol).toBe("AAPL")
      expect(result.positions[0].quantity).toBe(10)
      expect(result.positions[0].price).toBe(150)
      expect(result.positions[0].totalValueCHF).toBe(1500)
      expect(result.positions[1].symbol).toBe("VWRL")
      expect(result.positions[1].quantity).toBe(50)
      expect(result.positions[1].price).toBe(100)
      expect(result.positions[1].totalValueCHF).toBe(5000)
    })

    it("should handle empty CSV content", async () => {
      const csvContent = ""

      const result = await parsePortfolioCsv(csvContent)
      expect(result.positions).toHaveLength(0)
      expect(result.accountOverview.totalValue).toBe(0)
    })

    it("should handle CSV with only headers", async () => {
      const csvContent = "Symbol,Name,Quantity,Price,Currency,Total Value,Category"

      const result = await parsePortfolioCsv(csvContent)
      expect(result.positions).toHaveLength(0)
      expect(result.accountOverview.totalValue).toBe(0)
    })

    it("should parse Swiss number formats", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,1'000,150.00,150'000.00
NESN,2'500,80.00,200'000.00`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(2)
      expect(result.positions[0].quantity).toBe(1000)
      expect(result.positions[0].totalValueCHF).toBe(150000)
      expect(result.positions[1].quantity).toBe(2500)
      expect(result.positions[1].totalValueCHF).toBe(200000)
    })

    it("should calculate total portfolio value correctly", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,10,150.00,1500.00
VWRL,50,100.00,5000.00`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.accountOverview.totalValue).toBe(6500)
      expect(result.accountOverview.securitiesValue).toBe(6500)
      expect(result.accountOverview.cashBalance).toBe(0)
    })

    it("should generate allocation data", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,10,150.00,1500.00
VWRL,50,100.00,5000.00`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.assetAllocation).toBeDefined()
      expect(result.assetAllocation.length).toBeGreaterThan(0)
      expect(result.currencyAllocation).toBeDefined()
      expect(result.currencyAllocation.length).toBeGreaterThan(0)
      expect(result.trueCountryAllocation).toBeDefined()
      expect(result.trueSectorAllocation).toBeDefined()
      expect(result.domicileAllocation).toBeDefined()
    })

    it("should handle missing total value and calculate it", async () => {
      const csvContent = `Symbol,Quantity,Price
AAPL,10,150.00
VWRL,50,100.00`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(2)
      expect(result.positions[0].totalValueCHF).toBe(1500) // 10 * 150
      expect(result.positions[1].totalValueCHF).toBe(5000) // 50 * 100
    })

    it("should handle different delimiters", async () => {
      const csvContent = `Symbol;Quantity;Price;Total Value CHF
AAPL;10;150.00;1500.00
VWRL;50;100.00;5000.00`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(2)
      expect(result.positions[0].symbol).toBe("AAPL")
      expect(result.positions[1].symbol).toBe("VWRL")
    })

    it("should validate required fields", async () => {
      const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value,Category
AAPL,Apple Inc.,10,150.00,USD,1500.00,Actions
VWRL.L,Vanguard ETF,50,100.00,USD`

      const result = await parsePortfolioCsv(csvContent)
      // The function should still parse valid rows and skip invalid ones
      expect(result.positions.length).toBeGreaterThan(0)
      expect(result.positions[0].symbol).toBe("AAPL")
    })

    it("should handle malformed CSV data", async () => {
      const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value,Category
AAPL,Apple Inc.,invalid,150.00,USD,1500.00,Actions`

      const result = await parsePortfolioCsv(csvContent)
      // The function should handle malformed data gracefully
      expect(result.positions).toHaveLength(0)
      expect(result.accountOverview.totalValue).toBe(0)
    })
  })

  describe("Data Structure Validation", () => {
    it("should return valid SwissPortfolioData structure", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,10,150.00,1500.00`

      const result = await parsePortfolioCsv(csvContent)

      // Validate required properties
      expect(result).toHaveProperty("positions")
      expect(result).toHaveProperty("assetAllocation")
      expect(result).toHaveProperty("currencyAllocation")
      expect(result).toHaveProperty("trueCountryAllocation")
      expect(result).toHaveProperty("trueSectorAllocation")
      expect(result).toHaveProperty("domicileAllocation")
      expect(result).toHaveProperty("accountOverview")

      // Validate positions structure
      expect(Array.isArray(result.positions)).toBe(true)
      if (result.positions.length > 0) {
        const position = result.positions[0]
        expect(position).toHaveProperty("symbol")
        expect(position).toHaveProperty("name")
        expect(position).toHaveProperty("quantity")
        expect(position).toHaveProperty("price")
        expect(position).toHaveProperty("currency")
        expect(position).toHaveProperty("totalValueCHF")
        expect(position).toHaveProperty("category")
      }
    })
  })
})
