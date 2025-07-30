import type { SwissPortfolioData } from "../portfolio-parser"

export const mockSwissPortfolioData: SwissPortfolioData = {
  accountOverview: {
    totalValue: 1234567,
    securitiesValue: 1200000,
    cashBalance: 34567,
  },
  positions: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      quantity: 100,
      price: 170.5,
      currency: "USD",
      totalValueCHF: 15000, // Assuming conversion
      category: "Stock",
      domicile: "US",
      positionPercent: 1.2,
      dailyChangePercent: 0.5,
      unitCost: 160,
      gainLossCHF: 1000,
      taxOptimized: true,
      withholdingTax: 15,
      isOTC: false,
    },
    {
      symbol: "NESN",
      name: "Nestle SA",
      quantity: 50,
      price: 100.0,
      currency: "CHF",
      totalValueCHF: 5000,
      category: "Stock",
      domicile: "CH",
      positionPercent: 0.4,
      dailyChangePercent: -0.2,
      unitCost: 100,
      gainLossCHF: 0,
      taxOptimized: false,
      withholdingTax: 0,
      isOTC: false,
    },
    {
      symbol: "VWRL",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 200,
      price: 90.0,
      currency: "USD",
      totalValueCHF: 18000,
      category: "ETF",
      domicile: "IE", // Irish domiciled ETF
      positionPercent: 1.5,
      dailyChangePercent: 0.8,
      unitCost: 85,
      gainLossCHF: 1000,
      taxOptimized: false,
      withholdingTax: 15,
      isOTC: false,
    },
    {
      symbol: "IWDA",
      name: "iShares Core MSCI World UCITS ETF",
      quantity: 150,
      price: 75.0,
      currency: "USD",
      totalValueCHF: 11250,
      category: "ETF",
      domicile: "IE", // Irish domiciled ETF
      positionPercent: 0.9,
      dailyChangePercent: 0.3,
      unitCost: 70,
      gainLossCHF: 750,
      taxOptimized: false,
      withholdingTax: 15,
      isOTC: false,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc. Class A",
      quantity: 20,
      price: 140.0,
      currency: "USD",
      totalValueCHF: 2500,
      category: "Stock",
      domicile: "US",
      positionPercent: 0.2,
      dailyChangePercent: 1.1,
      unitCost: 130,
      gainLossCHF: 200,
      taxOptimized: true,
      withholdingTax: 15,
      isOTC: false,
    },
  ],
  assetAllocation: [
    { name: "Stock", value: 22500, percentage: 50 },
    { name: "ETF", value: 29250, percentage: 50 },
  ],
  currencyAllocation: [
    { name: "CHF", value: 5000, percentage: 9.5 },
    { name: "USD", value: 46750, percentage: 90.5 },
  ],
  trueCountryAllocation: [
    { name: "US", value: 30000, percentage: 57.8 }, // Includes ETF look-through
    { name: "Switzerland", value: 5000, percentage: 9.6 },
    { name: "Japan", value: 2000, percentage: 3.8 }, // From ETF look-through
    { name: "UK", value: 1500, percentage: 2.9 }, // From ETF look-through
    { name: "Germany", value: 1000, percentage: 1.9 }, // From ETF look-through
    { name: "China", value: 500, percentage: 1.0 }, // From ETF look-through
    { name: "Other", value: 12000, percentage: 23.0 }, // Remaining from ETFs
  ],
  trueSectorAllocation: [
    { name: "Technology", value: 20000, percentage: 38.5 }, // Includes ETF look-through
    { name: "Financials", value: 7000, percentage: 13.5 }, // Includes ETF look-through
    { name: "Healthcare", value: 6000, percentage: 11.5 }, // Includes ETF look-through
    { name: "Consumer Staples", value: 5000, percentage: 9.6 },
    { name: "Industrials", value: 2500, percentage: 4.8 }, // From ETF look-through
    { name: "Consumer Discretionary", value: 2000, percentage: 3.8 }, // From ETF look-through
    { name: "Communication Services", value: 1000, percentage: 1.9 }, // From ETF look-through
    { name: "Diversified", value: 8500, percentage: 16.4 }, // Remaining from ETFs
  ],
  domicileAllocation: [
    { name: "US", value: 17500, percentage: 33.7 },
    { name: "IE", value: 29250, percentage: 56.4 },
    { name: "CH", value: 5000, percentage: 9.6 },
  ],
}

export const sampleSwissquoteCsv = `Symbole,Libellé,Quantité,Cours,Devise,Valeur totale CHF,Catégorie,Domicile,Positions %,Var. quot. %
AAPL,Apple Inc.,10,170.00,USD,1564.00,Actions,US,10.50,1.20
NESN.SW,Nestle S.A.,5,100.00,CHF,500.00,Actions,CH,5.00,0.10
VWRL,Vanguard FTSE All-World UCITS ETF,2,95.00,USD,174.80,ETF,IE,1.20,0.50
BTC-USD,Bitcoin,0.01,30000.00,USD,276.00,Crypto-monnaies,Unknown,1.85,-2.50`

export const sampleInvalidCsv = `Header1,Header2
value1,value2
invalid_row`

export const sampleEmptyCsv = ``
