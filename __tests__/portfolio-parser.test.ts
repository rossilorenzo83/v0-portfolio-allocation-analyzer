import { parsePortfolioCsv } from "../portfolio-parser" // Corrected import
import { readFileSync } from "fs"
import { join } from "path"

describe("parsePortfolioCsv", () => {
  it("should correctly parse a standard Swissquote CSV format", () => {
    const csvContent = readFileSync(join(__dirname, "mock-swissquote.csv"), "utf-8")
    const data = parsePortfolioCsv(csvContent)

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

  it("should handle CSVs with different delimiters (e.g., semicolon)", () => {
    const csvContent = `Symbol;Name;Quantity;Price;Currency;Total Value CHF
MSFT;Microsoft Corp;5;300.00;USD;1500.00
NESN;Nestle SA;20;100.00;CHF;2000.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(2)
    expect(data.positions[0].symbol).toBe("MSFT")
    expect(data.positions[1].symbol).toBe("NESN")
  })

  it("should correctly parse numbers with Swiss formatting (apostrophe and comma decimal)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
VOW3,Volkswagen AG,1'000,123,45,EUR,123'450.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    const vw = data.positions.find((p) => p.symbol === "VOW3")
    expect(vw?.quantity).toBe(1000)
    expect(vw?.price).toBe(123.45)
    expect(vw?.currency).toBe("EUR")
  })

  it("should infer headers if not explicitly found but common terms exist", () => {
    const csvContent = `Some Random Header,Another Field,Ticker,Number of Shares,Unit Price,Currency Type,Total Value
junk,data,GOOG,5,1500.00,USD,7500.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    expect(data.positions[0].symbol).toBe("GOOG")
    expect(data.positions[0].quantity).toBe(5)
    expect(data.positions[0].price).toBe(1500)
  })

  it("should calculate totalValueCHF if not provided in CSV", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
TSLA,Tesla Inc,2,250.00,USD`
    const data = parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    const tesla = data.positions.find((p) => p.symbol === "TSLA")
    expect(tesla?.totalValueCHF).toBeCloseTo(2 * 250 * 0.92) // 500 USD * 0.92 USD/CHF
  })

  it("should handle missing optional fields gracefully", () => {
    const csvContent = `Symbol,Quantity,Price,Currency
AMZN,10,100.00,USD`
    const data = parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(1)
    const amazon = data.positions.find((p) => p.symbol === "AMZN")
    expect(amazon?.name).toBe("AMZN") // Name defaults to symbol
    expect(amazon?.category).toBe("Unknown") // Category defaults to Unknown
  })

  it("should filter out rows with invalid or missing required data", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency
AAPL,Apple Inc.,10,170.00,USD
INVALID,,0,,CHF
MSFT,Microsoft Corp,5,300.00,USD`
    const data = parsePortfolioCsv(csvContent)

    expect(data).toBeDefined()
    expect(data.positions.length).toBe(2) // Invalid row should be skipped
    expect(data.positions.some((p) => p.symbol === "INVALID")).toBeFalsy()
  })

  it("should return empty data for empty CSV content", () => {
    const csvContent = ""
    const data = parsePortfolioCsv(csvContent)

    expect(data.positions).toEqual([])
    expect(data.accountOverview.totalValue).toBe(0)
  })

  it("should return empty data for CSV with only headers and no data", () => {
    const csvContent = "Symbol,Name,Quantity,Price,Currency"
    const data = parsePortfolioCsv(csvContent)

    expect(data.positions).toEqual([])
    expect(data.accountOverview.totalValue).toBe(0)
  })

  it("should correctly calculate asset allocation", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,1564.00
VTI,Vanguard Total Stock,5,200.00,USD,ETF,920.00
GOOG,Google,2,2500.00,USD,Actions,4600.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data.assetAllocation).toBeDefined()
    expect(data.assetAllocation.length).toBe(2) // Actions, ETF
    const actions = data.assetAllocation.find((a) => a.name === "Actions")
    const etf = data.assetAllocation.find((a) => a.name === "ETF")

    expect(actions?.value).toBeCloseTo(1564 + 4600)
    expect(etf?.value).toBeCloseTo(920)
  })

  it("should correctly calculate currency allocation (mocked ETF look-through)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,ETF,460.00` // VWRL is an ETF, mock composition has USD/EUR/CHF
    const data = parsePortfolioCsv(csvContent)

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

  it("should correctly calculate true country allocation (mocked ETF look-through)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Geography,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,United States,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,ETF,Unknown,460.00` // VWRL is an ETF, mock composition has US/CH/JP
    const data = parsePortfolioCsv(csvContent)

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

  it("should correctly calculate true sector allocation (mocked ETF look-through)", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Category,Sector,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,Actions,Technology,1564.00
VWRL,Vanguard FTSE All-World,5,100.00,USD,ETF,Unknown,460.00` // VWRL is an ETF, mock composition has Tech/Fin/Health
    const data = parsePortfolioCsv(csvContent)

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

  it("should correctly calculate domicile allocation", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Domicile,Total Value CHF
SPY,SPDR S&P 500,10,400.00,USD,US,3680.00
IEMG,iShares Core MSCI EM IMI,5,60.00,IE,IE,276.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data.domicileAllocation).toBeDefined()
    expect(data.domicileAllocation.length).toBe(2)
    const usDomicile = data.domicileAllocation.find((a) => a.name === "United States (US)")
    const ieDomicile = data.domicileAllocation.find((a) => a.name === "Ireland (IE)")

    expect(usDomicile?.value).toBeCloseTo(3680)
    expect(ieDomicile?.value).toBeCloseTo(276)
  })

  it("should correctly identify categories from headers", () => {
    const csvContent = `Symbole,Libellé,Quantité,Cours,Devise,Catégorie,Valeur totale CHF
NESN,Nestle SA,20,100.00,CHF,Actions,2000.00
CSN,Credit Suisse Bond,10,50.00,CHF,Obligations,500.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data.positions[0].category).toBe("Actions")
    expect(data.positions[1].category).toBe("Bonds")
  })

  it("should handle various header casings and synonyms", () => {
    const csvContent = `SYMBOL,NAME,QTY,PRICE,CCY,TOTAL
TSLA,Tesla,1,100,USD,92`
    const data = parsePortfolioCsv(csvContent)
    expect(data.positions[0].symbol).toBe("TSLA")
    expect(data.positions[0].quantity).toBe(1)
    expect(data.positions[0].price).toBe(100)
    expect(data.positions[0].currency).toBe("USD")
  })

  it("should correctly parse a CSV with a total row at the end", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
MSFT,Microsoft Corp,5,300.00,USD,1380.00
Total Portfolio Value,,,2944.00`
    const data = parsePortfolioCsv(csvContent)

    expect(data.positions.length).toBe(2)
    expect(data.accountOverview.totalValue).toBeCloseTo(2944.0)
  })

  it("should prioritize explicit total value over calculated if present and larger", () => {
    const csvContent = `Symbol,Name,Quantity,Price,Currency,Total Value CHF
AAPL,Apple Inc.,10,170.00,USD,1564.00
Total Portfolio Value,,,5000.00` // Explicit total is much higher
    const data = parsePortfolioCsv(csvContent)

    expect(data.positions.length).toBe(1)
    expect(data.accountOverview.totalValue).toBeCloseTo(5000.0)
  })
})
