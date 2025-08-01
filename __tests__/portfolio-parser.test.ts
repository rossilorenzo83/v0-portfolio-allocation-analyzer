import { parsePortfolioCsv } from "../portfolio-parser" // Corrected import
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

  describe("Multi-language CSV parsing", () => {
    it("should correctly parse French headers (Swiss bank format)", async () => {
      const csvContent = `Symbole,Libellé,Quantité,Cours,Devise,Coût unitaire,Valeur totale CHF,G&P CHF,Positions %
AAPL,Apple Inc.,10,170.00,USD,170.00,1564.00,1564.00,15.2
VWRL,Vanguard FTSE All-World,5,100.00,USD,100.00,460.00,460.00,4.5`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const apple = data.positions.find((p) => p.symbol === "AAPL")
      expect(apple).toBeDefined()
      expect(apple?.quantity).toBe(10)
      expect(apple?.price).toBe(170.00)
      expect(apple?.currency).toBe("USD")
      expect(apple?.totalValueCHF).toBeCloseTo(1564.00)
      
      const vwrl = data.positions.find((p) => p.symbol === "VWRL")
      expect(vwrl).toBeDefined()
      expect(vwrl?.quantity).toBe(5)
      expect(vwrl?.price).toBe(100.00)
      expect(vwrl?.currency).toBe("USD")
      expect(vwrl?.totalValueCHF).toBeCloseTo(460.00)
    })

    it("should correctly parse German headers", async () => {
      const csvContent = `Symbol,Bezeichnung,Menge,Kurs,Währung,Einstandspreis,Gesamtwert CHF,Gewinn/Verlust CHF,Position %
NESN,Nestle SA,20,100.00,CHF,100.00,2000.00,2000.00,20.0
CSN,Credit Suisse Bond,10,50.00,CHF,50.00,500.00,500.00,5.0`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const nestle = data.positions.find((p) => p.symbol === "NESN")
      expect(nestle).toBeDefined()
      expect(nestle?.quantity).toBe(20)
      expect(nestle?.price).toBe(100.00)
      expect(nestle?.currency).toBe("CHF")
      expect(nestle?.totalValueCHF).toBeCloseTo(2000.00)
    })

    it("should handle mixed language headers", async () => {
      const csvContent = `Symbol,Libellé,Quantité,Cours,Devise,Valeur totale CHF
MSFT,Microsoft Corp,5,300,00,USD,1'380,00
GOOG,Google Inc,2,2'500,00,USD,4'600,00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const msft = data.positions.find((p) => p.symbol === "MSFT")
      expect(msft?.quantity).toBe(5)
      expect(msft?.price).toBe(300.00)
      expect(msft?.totalValueCHF).toBeCloseTo(1380.00)
    })
  })

  describe("Swiss bank format parsing", () => {
    it("should detect and parse category-based Swiss bank CSV format", async () => {
      const csvContent = `Actions
Symbole,Libellé,Quantité,Cours,Devise,Coût unitaire,Valeur totale CHF,G&P CHF,Positions %
AAPL,Apple Inc.,10,170.00,USD,170.00,1564.00,1564.00,15.2

ETF
Symbole,Libellé,Quantité,Cours,Devise,Coût unitaire,Valeur totale CHF,G&P CHF,Positions %
VWRL,Vanguard FTSE All-World,5,100.00,USD,100.00,460.00,460.00,4.5

Fonds
Symbole,Libellé,Quantité,Cours,Devise,Coût unitaire,Valeur totale CHF,G&P CHF,Positions %
CHSPI,Swiss Performance Index,100,1200.00,CHF,1200.00,120000.00,120000.00,1200.0`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(3)
      
      // Check categories are correctly assigned
      const apple = data.positions.find((p) => p.symbol === "AAPL")
      expect(apple?.category).toBe("Actions")
      
      const vwrl = data.positions.find((p) => p.symbol === "VWRL")
      expect(vwrl?.category).toBe("ETF")
      
      const chspi = data.positions.find((p) => p.symbol === "CHSPI")
      expect(chspi?.category).toBe("Fonds")
      expect(chspi?.quantity).toBe(100)
      expect(chspi?.price).toBe(1200.00)
      expect(chspi?.totalValueCHF).toBeCloseTo(120000.00)
    })

    it("should handle Swiss bank format with various category headers", async () => {
      const csvContent = `Produits structurés
Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF
STRUCT1,Structured Product A,1,10000.00,CHF,10000.00

Obligations
Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF
BOND1,Government Bond,50,100.00,CHF,5000.00

Crypto-monnaies
Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF
BTC,Bitcoin,0.5,50000.00,USD,250000.00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(3)
      
      const struct = data.positions.find((p) => p.symbol === "STRUCT1")
      expect(struct?.category).toBe("Produits structurés")
      expect(struct?.totalValueCHF).toBeCloseTo(10000.00)
      
      const bond = data.positions.find((p) => p.symbol === "BOND1")
      expect(bond?.category).toBe("Obligations")
      expect(bond?.quantity).toBe(50)
      
      const btc = data.positions.find((p) => p.symbol === "BTC")
      expect(btc?.category).toBe("Crypto-monnaies")
      expect(btc?.quantity).toBe(0.5)
      expect(btc?.price).toBe(50000.00)
    })

    it("should correctly parse Swiss number formats in category-based CSV", async () => {
      const csvContent = `Actions
Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF
VOW3,Volkswagen AG,1000,123.45,EUR,123450.00
NESN,Nestle SA,500,2000.00,CHF,1000000.00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(2)
      
      const vw = data.positions.find((p) => p.symbol === "VOW3")
      expect(vw?.quantity).toBe(1000)
      expect(vw?.price).toBe(123.45)
      expect(vw?.currency).toBe("EUR")
      expect(vw?.totalValueCHF).toBeCloseTo(123450.00)
      
      const nestle = data.positions.find((p) => p.symbol === "NESN")
      expect(nestle?.quantity).toBe(500)
      expect(nestle?.price).toBe(2000.00)
      expect(nestle?.totalValueCHF).toBeCloseTo(1000000.00)
    })

    it("should handle empty categories in Swiss bank format", async () => {
      const csvContent = `Actions
Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF

ETF
Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF
VWRL,Vanguard FTSE All-World,5,100,00,USD,460,00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data).toBeDefined()
      expect(data.positions.length).toBe(1) // Only VWRL should be parsed
      expect(data.positions[0].symbol).toBe("VWRL")
      expect(data.positions[0].category).toBe("ETF")
    })
  })

  describe("Swiss number format parsing", () => {
    it("should correctly parse numbers with apostrophes as thousands separators", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,1'000,170,00,170'000,00
MSFT,500,300,00,150'000,00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions[0].quantity).toBe(1000)
      expect(data.positions[0].price).toBe(170.00)
      expect(data.positions[0].totalValueCHF).toBeCloseTo(170000.00)
      
      expect(data.positions[1].quantity).toBe(500)
      expect(data.positions[1].price).toBe(300.00)
      expect(data.positions[1].totalValueCHF).toBeCloseTo(150000.00)
    })

    it("should correctly parse numbers with commas as decimal separators", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
VOW3,1000,123.45,123450.00
NESN,500,2000.00,1000000.00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions[0].price).toBe(123.45)
      expect(data.positions[1].price).toBe(2000.00)
    })

    it("should handle mixed Swiss number formats", async () => {
      const csvContent = `Symbol,Quantity,Price,Total Value CHF
AAPL,1000,170.50,170500.00
VWRL,500,100.25,50125.00`
      const data = await parsePortfolioCsv(csvContent)

      expect(data.positions[0].quantity).toBe(1000)
      expect(data.positions[0].price).toBe(170.50)
      expect(data.positions[0].totalValueCHF).toBeCloseTo(170500.00)
      
      expect(data.positions[1].quantity).toBe(500)
      expect(data.positions[1].price).toBe(100.25)
      expect(data.positions[1].totalValueCHF).toBeCloseTo(50125.00)
    })
  })

  it("should correctly parse a standard Swissquote CSV format", async () => {
    const csvContent = readFileSync(join(__dirname, "mock-swissquote.csv"), "utf-8")
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBeGreaterThan(0)
    expect(data.accountOverview.totalValue).toBeGreaterThan(0)

    // Check a specific position
    const apple = data.positions.find((p) => p.symbol === "AAPL")
    expect(apple).toBeDefined()
    expect(apple?.name).toBe("Apple Inc.")
    expect(apple?.quantity).toBe(10)
    expect(apple?.price).toBe(170.0)
    expect(apple?.currency).toBe("USD")
    expect(apple?.totalValueCHF).toBeCloseTo(1700 * 0.92) // Assuming 0.92 USD/CHF rate
    expect(apple?.category).toBe("Actions")
  })

  it("should handle CSVs with different delimiters (e.g., semicolon)", async () => {
    const csvContent = `Symbol;Name;Quantity;Price;Currency;Total Value CHF
MSFT;Microsoft Corp;5;300.00;USD;1500.00
NESN;Nestle SA;20;100.00;CHF;2000.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(2)
    expect(data.positions[0].symbol).toBe("MSFT")
    expect(data.positions[1].symbol).toBe("NESN")
  })

  it("should correctly parse numbers with Swiss formatting (apostrophe and comma decimal)", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
VOW3,Volkswagen AG,1'000,123,45,EUR,123'450.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    const vw = data.positions.find((p) => p.symbol === "VOW3")
    expect(vw?.quantity).toBe(1000)
    expect(vw?.price).toBe(123.45)
    expect(vw?.currency).toBe("EUR")
  })

  it("should infer headers if not explicitly found but common terms exist", async () => {
    const csvContent = `Some Random Header,Another Field,Ticker,Number of Shares,Unit Price,Currency Type,Total Value
junk,data,GOOG,5,1500.00,USD,7500.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    expect(data.positions[0].symbol).toBe("GOOG")
    expect(data.positions[0].quantity).toBe(5)
    expect(data.positions[0].price).toBe(1500)
  })

  it("should calculate totalValueCHF if not provided in CSV", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
TSLA,Tesla Inc,2,250.00,USD`
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    const tesla = data.positions.find((p) => p.symbol === "TSLA")
    expect(tesla?.totalValueCHF).toBeCloseTo(2 * 250 * 0.92) // 500 USD * 0.92 USD/CHF
  })

  it("should handle missing optional fields gracefully", async () => {
    const csvContent = `Symbol,Quantity,Price,Currency
AMZN,10,100.00,USD`
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    const amazon = data.positions.find((p) => p.symbol === "AMZN")
    expect(amazon?.name).toBe("AMZN") // Name defaults to symbol
    expect(amazon?.category).toBe("Unknown") // Category defaults to Unknown
  })

  it("should filter out rows with invalid or missing required data", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
AAPL,Apple Inc.,10,170.00,USD
INVALID,,0,,CHF
MSFT,Microsoft Corp,5,300.00,USD`
    const data = await parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(2) // Invalid row should be skipped
    expect(data.positions.some((p) => p.symbol === "INVALID")).toBeFalsy()
  })

  it("should return empty data for empty CSV content", async () => {
    const csvContent = ""
    const data = await parsePortfolioCsv(csvContent)

    expect(data.positions).toEqual([])
    expect(data.accountOverview.totalValue).toBe(0)
  })

  it("should return empty data for CSV with only headers and no data", async () => {
    const csvContent = "Symbol,Name,Quantity,Price,Currency"
    const data = await parsePortfolioCsv(csvContent)

    expect(data.positions).toEqual([])
    expect(data.accountOverview.totalValue).toBe(0)
  })

  it("should correctly calculate asset allocation", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,1564.00
VTI,Vanguard Total Stock,5,200.00,USD,ETF,920.00
GOOG,Google,2,2500.00,USD,Actions,4600.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data.assetAllocation).toBeDefined()
    expect(data.assetAllocation.length).toBe(2) // Actions, ETF
    const actions = data.assetAllocation.find((a) => a.name === "Actions")
    const etf = data.assetAllocation.find((a) => a.name === "ETF")

    expect(actions?.value).toBeCloseTo(1564 + 4600)
    expect(etf?.value).toBeCloseTo(920)
  })

  it("should correctly calculate currency allocation (mocked ETF look-through)", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,ETF,460.00` // VWRL is an ETF, mock composition has USD/EUR/CHF
    const data = await parsePortfolioCsv(csvContent)

    expect(data.currencyAllocation).toBeDefined()
    // Expect USD from AAPL + USD/EUR/CHF from VWRL (mocked 70/20/10 split)
    const totalValueAAPL = 1564
    const totalValueVWRL = 460
    const expectedUSDFromVWRL = totalValueVWRL * 0.7
    const expectedEURFromVWRL = totalValueVWRL * 0.2
    const expectedCHFFromVWRL = totalValueVWRL * 0.1

    const usdAllocation = data.currencyAllocation.find((a) => a.name === "USD")
    const eurAllocation = data.currencyAllocation.find((a) => a.name === "EUR")
    const chfAllocation = data.currencyAllocation.find((a) => a.name === "CHF")

    expect(usdAllocation?.value).toBeCloseTo(totalValueAAPL + expectedUSDFromVWRL)
    expect(eurAllocation?.value).toBeCloseTo(expectedEURFromVWRL)
    expect(chfAllocation?.value).toBeCloseTo(expectedCHFFromVWRL)
  })

  it("should correctly calculate true country allocation (mocked ETF look-through)", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Geography,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,United States,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,ETF,Unknown,460.00` // VWRL is an ETF, mock composition has US/CH/JP
    const data = await parsePortfolioCsv(csvContent)

    expect(data.trueCountryAllocation).toBeDefined()
    const totalValueAAPL = 1564
    const totalValueVWRL = 460
    const expectedUSFromVWRL = totalValueVWRL * 0.6
    const expectedCHFromVWRL = totalValueVWRL * 0.15
    const expectedJPFromVWRL = totalValueVWRL * 0.1

    const usAllocation = data.trueCountryAllocation.find((a) => a.name === "United States")
    const chAllocation = data.trueCountryAllocation.find((a) => a.name === "Switzerland")
    const jpAllocation = data.trueCountryAllocation.find((a) => a.name === "Japan")

    expect(usAllocation?.value).toBeCloseTo(totalValueAAPL + expectedUSFromVWRL)
    expect(chAllocation?.value).toBeCloseTo(expectedCHFromVWRL)
    expect(jpAllocation?.value).toBeCloseTo(expectedJPFromVWRL)
  })

  it("should correctly calculate true sector allocation (mocked ETF look-through)", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Sector,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,Technology,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,ETF,Unknown,460.00` // VWRL is an ETF, mock composition has Tech/Fin/Health
    const data = await parsePortfolioCsv(csvContent)

    expect(data.trueSectorAllocation).toBeDefined()
    const totalValueAAPL = 1564
    const totalValueVWRL = 460
    const expectedTechFromVWRL = totalValueVWRL * 0.4
    const expectedFinFromVWRL = totalValueVWRL * 0.2
    const expectedHealthFromVWRL = totalValueVWRL * 0.15

    const techAllocation = data.trueSectorAllocation.find((a) => a.name === "Technology")
    const finAllocation = data.trueSectorAllocation.find((a) => a.name === "Financials")
    const healthAllocation = data.trueSectorAllocation.find((a) => a.name === "Healthcare")

    expect(techAllocation?.value).toBeCloseTo(totalValueAAPL + expectedTechFromVWRL)
    expect(finAllocation?.value).toBeCloseTo(expectedFinFromVWRL)
    expect(healthAllocation?.value).toBeCloseTo(expectedHealthFromVWRL)
  })

  it("should correctly calculate domicile allocation", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Domicile,Total Value CHF
SPY,SPDR S&P 500,10,400.00,USD,US,3680.00
IEMG,iShares Core MSCI EM IMI,5,60.00,USD,IE,276.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data.domicileAllocation).toBeDefined()
    expect(data.domicileAllocation.length).toBe(2)
    const usDomicile = data.domicileAllocation.find((a) => a.name === "United States (US)")
    const ieDomicile = data.domicileAllocation.find((a) => a.name === "Ireland (IE)")

    expect(usDomicile?.value).toBeCloseTo(3680)
    expect(ieDomicile?.value).toBeCloseTo(276)
  })

  it("should correctly identify categories from headers", async () => {
    const csvContent = `Symbole,Libellé,Quantité,Cours,Devise,Catégorie,Valeur totale CHF
NESN,Nestle SA,20,100.00,CHF,Actions,2000.00
CSN,Credit Suisse Bond,10,50.00,CHF,Obligations,500.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data.positions[0].category).toBe("Actions")
    expect(data.positions[1].category).toBe("Obligations")
  })

  it("should handle various header casings and synonyms", async () => {
    const csvContent = `SYMBOL,NAME,QTY,PRICE,CCY,TOTAL
TSLA,Tesla,1,100,USD,92`
    const data = await parsePortfolioCsv(csvContent)
    expect(data.positions[0].symbol).toBe("TSLA")
    expect(data.positions[0].quantity).toBe(1)
    expect(data.positions[0].price).toBe(100)
    expect(data.positions[0].currency).toBe("USD")
  })

  it("should correctly parse a CSV with a total row at the end", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
MSFT,Microsoft Corp,5,300.00,USD,1380.00
Total Portfolio Value,,,2944.00`
    const data = await parsePortfolioCsv(csvContent)

    expect(data.positions.length).toBe(2)
    expect(data.accountOverview.totalValue).toBeCloseTo(2944.0)
  })

  it("should prioritize explicit total value over calculated if present and larger", async () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
Total Portfolio Value,,,5000.00` // Explicit total is much higher
    const data = await parsePortfolioCsv(csvContent)

    expect(data.positions.length).toBe(1)
    expect(data.accountOverview.totalValue).toBeCloseTo(5000.0)
  })
})
