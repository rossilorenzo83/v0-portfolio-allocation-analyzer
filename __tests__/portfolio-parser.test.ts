import { parsePortfolioCsv } from "../portfolio-parser"
import { readFileSync } from "fs"
import { join } from "path"

// Mock fetch for API calls
global.fetch = jest.fn()

describe("parsePortfolioCsv", () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/yahoo/quote/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 100, changePercent: 1.5 })
        })
      }
      if (url.includes('/api/yahoo/search/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: "Test Asset", sector: "Technology", country: "United States" })
        })
      }
      if (url.includes('/api/yahoo/etf/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            domicile: "IE", 
            withholdingTax: 15,
            country: [{ country: "US", weight: 70 }],
            sector: [{ sector: "Technology", weight: 50 }],
            currency: [{ currency: "USD", weight: 80 }]
          })
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  describe("Swiss Bank Format CSV Parsing", () => {
    it("should correctly parse a complex Swiss bank CSV file", async () => {
      const csvContent = ` ,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %,
Actions, , , , , , , , , , , , , 
 ,TEST7,1050,122.25743,501060.00,7980.00,1.62%,477.20,CHF,372689.69,290.32%,501060.00,54.74%,
 ,Sous-total Actions en CHF, , , ,8576.91,1.59%, , ,370107.22,209.55%,546725.55,59.74%,
ETF, , , , , , , , , , , , , 
 ,ETF6,500,89.962,59910.00,-110.00,-0.18%,119.82,CHF,14929.00,33.19%,59910.00,6.54%,
 ,Sous-total ETF en CHF, , , ,433.09,0.18%, , ,16469.31,7.45%,59910.00,6.54%,
Crypto-monnaies, , , , , , , , , , , , , 
 ,CRYPTO4,1.41446086,2113.96304,3681.70,100.00,2.79%,2602.90,USD,353.44,13.72%,2929.71,0.32%,
 ,Sous-total Crypto-monnaies en CHF, , , ,141.74,2.18%, , ,353.44,13.72%,2929.71,0.32%,
 ,Total, , , ,9142.36,1.07%, , ,386929.97,73.12%,609565.26,66.60%,`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBeGreaterThan(0)
      expect(data.accountOverview.totalValue).toBeCloseTo(609565.26, 2)

      // Test specific positions from the file
      const test7 = data.positions.find(p => p.symbol === "TEST7")
      expect(test7).toBeDefined()
      expect(test7?.category).toBe("Actions")
      expect(test7?.quantity).toBe(1050)
      expect(test7?.price).toBeCloseTo(477.20, 2)
      expect(test7?.currency).toBe("CHF")
      expect(test7?.totalValueCHF).toBeCloseTo(501060.00, 2)

      const etf6 = data.positions.find(p => p.symbol === "ETF6")
      expect(etf6).toBeDefined()
      expect(etf6?.category).toBe("ETF")
      expect(etf6?.quantity).toBe(500)
      expect(etf6?.price).toBeCloseTo(119.82, 2)
      expect(etf6?.currency).toBe("CHF")
      expect(etf6?.totalValueCHF).toBeCloseTo(59910.00, 2)

      const crypto4 = data.positions.find(p => p.symbol === "CRYPTO4")
      expect(crypto4).toBeDefined()
      expect(crypto4?.category).toBe("Crypto-monnaies")
      expect(crypto4?.quantity).toBeCloseTo(1.41446086, 8)
      expect(crypto4?.price).toBeCloseTo(2602.90, 2)
      expect(crypto4?.currency).toBe("USD")
      expect(crypto4?.totalValueCHF).toBeCloseTo(2929.71, 2)
    })

    it("should correctly parse Swiss number formats with apostrophes and commas", async () => {
      const csvContent = ` ,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %,
Actions, , , , , , , , , , , , , 
 ,VOW3,1'000,123.45,123'450.00,0.00,0.00%,123.45,EUR,0.00,0.00%,123'450.00,50.00%,
 ,NESN,500,2'000.00,1'000'000.00,0.00,0.00%,2'000.00,CHF,0.00,0.00%,1'000'000.00,50.00%,
 ,Sous-total Actions en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,1'123'450.00,100.00%,`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const vw = data.positions.find(p => p.symbol === "VOW3")
      expect(vw?.quantity).toBe(1000)
      expect(vw?.price).toBeCloseTo(123.45, 2)
      expect(vw?.currency).toBe("EUR")
      expect(vw?.totalValueCHF).toBeCloseTo(123450.00, 2)
      
      const nestle = data.positions.find(p => p.symbol === "NESN")
      expect(nestle?.quantity).toBe(500)
      expect(nestle?.price).toBeCloseTo(2000.00, 2)
      expect(nestle?.currency).toBe("CHF")
      expect(nestle?.totalValueCHF).toBeCloseTo(1000000.00, 2)
    })

    it("should correctly assign categories based on section headers", async () => {
      const csvContent = ` ,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %,
Actions, , , , , , , , , , , , , 
 ,TEST1,10,170.00,1700.00,0.00,0.00%,170.00,USD,0.00,0.00%,1564.00,10.00%,
 ,Sous-total Actions en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,1564.00,10.00%,
ETF, , , , , , , , , , , , , 
 ,ETF1,5,100.00,500.00,0.00,0.00%,100.00,USD,0.00,0.00%,460.00,3.00%,
 ,Sous-total ETF en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,460.00,3.00%,
Fonds, , , , , , , , , , , , , 
 ,FUND1,100,1200.00,120000.00,0.00,0.00%,1200.00,CHF,0.00,0.00%,120000.00,77.00%,
 ,Sous-total Fonds en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,120000.00,77.00%,
Obligations, , , , , , , , , , , , , 
 ,BOND1,50,100.00,5000.00,0.00,0.00%,100.00,CHF,0.00,0.00%,5000.00,3.20%,
 ,Sous-total Obligations en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,5000.00,3.20%,
Produits structurés, , , , , , , , , , , , , 
 ,STRUCT1,1,10000.00,10000.00,0.00,0.00%,10000.00,CHF,0.00,0.00%,10000.00,6.40%,
 ,Sous-total Produits structurés en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,10000.00,6.40%,
Crypto-monnaies, , , , , , , , , , , , , 
 ,CRYPTO1,0.5,50000.00,25000.00,0.00,0.00%,50000.00,USD,0.00,0.00%,25000.00,16.00%,
 ,Sous-total Crypto-monnaies en CHF, , , ,0.00,0.00%, , ,0.00,0.00%,25000.00,16.00%,
 ,Total, , , ,0.00,0.00%, , ,0.00,0.00%,156024.00,100.00%,`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(6)
      
      const test1 = data.positions.find(p => p.symbol === "TEST1")
      expect(test1?.category).toBe("Actions")
      
      const etf1 = data.positions.find(p => p.symbol === "ETF1")
      expect(etf1?.category).toBe("ETF")
      
      const fund1 = data.positions.find(p => p.symbol === "FUND1")
      expect(fund1?.category).toBe("Fonds")
      
      const bond = data.positions.find(p => p.symbol === "BOND1")
      expect(bond?.category).toBe("Obligations")
      
      const struct = data.positions.find(p => p.symbol === "STRUCT1")
      expect(struct?.category).toBe("Produits structurés")
      
      const crypto1 = data.positions.find(p => p.symbol === "CRYPTO1")
      expect(crypto1?.category).toBe("Crypto-monnaies")
    })

    it("should handle empty categories and subtotals", async () => {
      const csvContent = `Actions
 ,Symbole,Quantité,Coût unitaire,Valeur totale,Dev.,Valeur totale CHF
 ,AAPL,10,170.00,USD,1564.00,1564.00
 ,Sous-total Actions en CHF, , , , , ,1564.00

ETF
 ,Symbole,Quantité,Coût unitaire,Valeur totale,Dev.,Valeur totale CHF
 ,Sous-total ETF en CHF, , , , , ,0.00

 ,Total, , , , , ,1564.00`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(1) // Only AAPL should be parsed
      expect(data.positions[0].symbol).toBe("AAPL")
      expect(data.positions[0].category).toBe("Actions")
      expect(data.accountOverview.totalValue).toBeCloseTo(1564.00, 2)
    })

    it("should correctly parse percentage values and gain/loss data", async () => {
      const csvContent = `Actions
 ,Symbole,Quantité,Coût unitaire,Valeur totale,G&P CHF,G&P %,Valeur totale CHF,Positions %
 ,AAPL,10,170.00,USD,1564.00,1564.00,15.2%,1564.00,0.24%
 ,META,3,560.00,USD,2162.01,295.73,20.76%,1720.42,0.19%`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const apple = data.positions.find(p => p.symbol === "AAPL")
      expect(apple?.gainLossCHF).toBeCloseTo(1564.00, 2)
      expect(apple?.positionPercent).toBeCloseTo(0.24, 2)
      
      const meta = data.positions.find(p => p.symbol === "META")
      expect(meta?.gainLossCHF).toBeCloseTo(295.73, 2)
      expect(meta?.positionPercent).toBeCloseTo(0.19, 2)
    })
  })

  describe("Multi-language Header Detection", () => {
    it("should correctly parse French headers", async () => {
      const csvContent = `Symbole,Libellé,Quantité,Cours,Devise,Coût unitaire,Valeur totale CHF,G&P CHF,Positions %
AAPL,Apple Inc.,10,170.00,USD,170.00,1564.00,1564.00,15.2
VWRL,Vanguard FTSE All-World,5,100.00,USD,100.00,460.00,460.00,4.5`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const apple = data.positions.find(p => p.symbol === "AAPL")
      expect(apple?.quantity).toBe(10)
      expect(apple?.price).toBeCloseTo(170.00, 2)
      expect(apple?.currency).toBe("USD")
      expect(apple?.totalValueCHF).toBeCloseTo(1564.00, 2)
    })

    it("should correctly parse German headers", async () => {
      const csvContent = `Symbol,Bezeichnung,Menge,Kurs,Währung,Einstandspreis,Gesamtwert CHF,Gewinn/Verlust CHF,Position %
NESN,Nestle SA,20,100.00,CHF,100.00,2000.00,2000.00,20.0
CSN,Credit Suisse Bond,10,50.00,CHF,50.00,500.00,500.00,5.0`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const nestle = data.positions.find(p => p.symbol === "NESN")
      expect(nestle?.quantity).toBe(20)
      expect(nestle?.price).toBeCloseTo(100.00, 2)
      expect(nestle?.currency).toBe("CHF")
      expect(nestle?.totalValueCHF).toBeCloseTo(2000.00, 2)
    })

    it("should handle mixed language headers", async () => {
      const csvContent = `Symbol,Libellé,Quantité,Cours,Devise,Valeur totale CHF
MSFT,Microsoft Corp,5,300.00,USD,1380.00
GOOG,Google Inc,2,2500.00,USD,4600.00`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const msft = data.positions.find(p => p.symbol === "MSFT")
      expect(msft?.quantity).toBe(5)
      expect(msft?.price).toBeCloseTo(300.00, 2)
      expect(msft?.totalValueCHF).toBeCloseTo(1380.00, 2)
    })
  })

  describe("Standard CSV Format Parsing", () => {
    it("should correctly parse a standard CSV with English headers", async () => {
      const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
MSFT,Microsoft Corp,5,300.00,USD,1380.00`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const apple = data.positions.find(p => p.symbol === "AAPL")
    expect(apple?.name).toBe("Apple Inc.")
    expect(apple?.quantity).toBe(10)
      expect(apple?.price).toBeCloseTo(170.00, 2)
    expect(apple?.currency).toBe("USD")
      expect(apple?.totalValueCHF).toBeCloseTo(1564.00, 2)
  })

    it("should handle CSVs with different delimiters", async () => {
    const csvContent = `Symbol;Name;Quantity;Price;Currency;Total Value CHF
MSFT;Microsoft Corp;5;300.00;USD;1380.00
NESN;Nestle SA;20;100.00;CHF;2000.00`
      
      const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(2)
    expect(data.positions[0].symbol).toBe("MSFT")
    expect(data.positions[1].symbol).toBe("NESN")
  })

    it("should calculate totalValueCHF if not provided", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
TSLA,Tesla Inc,2,250.00,USD`
      
      const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
      const tesla = data.positions.find(p => p.symbol === "TSLA")
      expect(tesla?.totalValueCHF).toBeCloseTo(2 * 250 * 0.92, 2) // Assuming 0.92 USD/CHF rate
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty CSV content", async () => {
      const csvContent = ""
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions).toEqual([])
      expect(data.accountOverview.totalValue).toBe(0)
    })

    it("should handle CSV with only headers", async () => {
      const csvContent = "Symbol,Name,Quantity,Price,Currency"
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions).toEqual([])
      expect(data.accountOverview.totalValue).toBe(0)
    })

    it("should filter out invalid rows", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
AAPL,Apple Inc.,10,170.00,USD
INVALID,,0,,CHF
MSFT,Microsoft Corp,5,300.00,USD`
      
      const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(2) // Invalid row should be skipped
      expect(data.positions.some(p => p.symbol === "INVALID")).toBeFalsy()
    })

    it("should handle missing optional fields gracefully", async () => {
      const csvContent = `Symbol,Quantity,Price,Currency
AMZN,10,100.00,USD`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(1)
      const amazon = data.positions.find(p => p.symbol === "AMZN")
      expect(amazon?.name).toBe("AMZN") // Name defaults to symbol
      expect(amazon?.category).toBe("Unknown") // Category defaults to Unknown
    })
  })

  describe("Allocation Calculations", () => {
    it("should correctly calculate asset allocation", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,1564.00
VTI,Vanguard Total Stock,5,200.00,USD,ETF,920.00
GOOG,Google,2,2500.00,USD,Actions,4600.00`
      
      const data = await parsePortfolioCsv(csvContent)

    expect(data.assetAllocation).toBeDefined()
    expect(data.assetAllocation.length).toBe(2) // Actions, ETF
      const actions = data.assetAllocation.find(a => a.name === "Actions")
      const etf = data.assetAllocation.find(a => a.name === "ETF")

      expect(actions?.value).toBeCloseTo(1564 + 4600, 2)
      expect(etf?.value).toBeCloseTo(920, 2)
    })

    it("should correctly calculate currency allocation", async () => {
      const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,460.00`
      
      const data = await parsePortfolioCsv(csvContent)

    expect(data.currencyAllocation).toBeDefined()
      const usdAllocation = data.currencyAllocation.find(a => a.name === "USD")
      expect(usdAllocation?.value).toBeCloseTo(1564 + 460, 2)
    })

    it("should correctly calculate domicile allocation", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Domicile,Total Value CHF
SPY,SPDR S&P 500,10,400.00,USD,US,3680.00
IEMG,iShares Core MSCI EM IMI,5,60.00,USD,IE,276.00`
      
      const data = await parsePortfolioCsv(csvContent)

    expect(data.domicileAllocation).toBeDefined()
    expect(data.domicileAllocation.length).toBe(2)
      const usDomicile = data.domicileAllocation.find(a => a.name === "United States (US)")
      const ieDomicile = data.domicileAllocation.find(a => a.name === "Ireland (IE)")

      expect(usDomicile?.value).toBeCloseTo(3680, 2)
      expect(ieDomicile?.value).toBeCloseTo(276, 2)
    })
  })

  describe("Swiss Number Format Parsing", () => {
    it("should correctly parse numbers with apostrophes as thousands separators", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,1'000,170.00,170'000.00
MSFT,500,300.00,150'000.00`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions[0].quantity).toBe(1000)
      expect(data.positions[0].price).toBeCloseTo(170.00, 2)
      expect(data.positions[0].totalValueCHF).toBeCloseTo(170000.00, 2)
      
      expect(data.positions[1].quantity).toBe(500)
      expect(data.positions[1].price).toBeCloseTo(300.00, 2)
      expect(data.positions[1].totalValueCHF).toBeCloseTo(150000.00, 2)
    })

    it("should correctly parse numbers with commas as decimal separators", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
VOW3,1000,123,45,123450.00
NESN,500,2000,00,1000000.00`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions[0].price).toBeCloseTo(123.45, 2)
      expect(data.positions[1].price).toBeCloseTo(2000.00, 2)
    })

    it("should handle mixed Swiss number formats", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,1000,170.50,170500.00
VWRL,500,100.25,50125.00`
      
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions[0].quantity).toBe(1000)
      expect(data.positions[0].price).toBeCloseTo(170.50, 2)
      expect(data.positions[0].totalValueCHF).toBeCloseTo(170500.00, 2)
      
      expect(data.positions[1].quantity).toBe(500)
      expect(data.positions[1].price).toBeCloseTo(100.25, 2)
      expect(data.positions[1].totalValueCHF).toBeCloseTo(50125.00, 2)
    })
  })
})
