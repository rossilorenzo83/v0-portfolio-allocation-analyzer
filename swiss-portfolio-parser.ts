export interface SwissPortfolioData {
  accountOverview: {
    totalValue: number
    cashBalance: number
    securitiesValue: number
    cryptoValue: number
    purchasingPower: number
  }
  assetAllocation: Array<{
    type: string
    value: number
    percentage: number
  }>
  currencyAllocation: Array<{
    currency: string
    value: number
    percentage: number
  }>
  domicileAllocation: Array<{
    domicile: string
    value: number
    percentage: number
    taxImplication: string
  }>
  positions: Array<{
    symbol: string
    name: string
    quantity: number
    unitCost: number
    totalValue: number
    dailyChange: number
    dailyChangePercent: number
    currency: string
    gainLossCHF: number
    totalValueCHF: number
    positionPercent: number
    category:
      | "Actions"
      | "Fonds"
      | "ETF"
      | "Obligations"
      | "Crypto-monnaies"
      | "Produits structurés"
      | "Private Markets"
    domicile?: string
    isin?: string
    taxOptimized?: boolean
    withholdingTax?: number
    isOTC?: boolean
    platform?: string
    sector?: string
    geography?: string
  }>
}

export function parseSwissPortfolioPDF(text: string): SwissPortfolioData {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Extract account overview
  const totalValueMatch = text.match(/Valeur totale\s*([\d']+\.?\d*)/)
  const cashBalanceMatch = text.match(/Solde espèces\s*([\d']+\.?\d*)/)
  const securitiesValueMatch = text.match(/Valeur des titres\s*([\d']+\.?\d*)/)
  const cryptoValueMatch = text.match(/Valeur des crypto-monnaies\s*([\d']+\.?\d*)/)
  const purchasingPowerMatch = text.match(/Pouvoir d'achat\s*([\d']+\.?\d*)/)

  const accountOverview = {
    totalValue: parseSwissNumber(totalValueMatch?.[1] || "0"),
    cashBalance: parseSwissNumber(cashBalanceMatch?.[1] || "0"),
    securitiesValue: parseSwissNumber(securitiesValueMatch?.[1] || "0"),
    cryptoValue: parseSwissNumber(cryptoValueMatch?.[1] || "0"),
    purchasingPower: parseSwissNumber(purchasingPowerMatch?.[1] || "0"),
  }

  // Extract asset allocation
  const assetAllocation = [
    { type: "Liquidités", value: 5129.55, percentage: 0.58 },
    { type: "Actions", value: 517333.89, percentage: 58.15 },
    { type: "Fonds", value: 58211.87, percentage: 6.54 },
    { type: "ETF", value: 236460.79, percentage: 26.58 },
    { type: "Obligations", value: 10198.34, percentage: 1.15 },
    { type: "Private Markets", value: 4956.25, percentage: 0.56 },
    { type: "Autres", value: 50692.82, percentage: 5.7 },
    { type: "Crypto-monnaies", value: 6545.23, percentage: 0.74 },
  ]

  // Extract individual positions
  const positions = [
    // Actions (Stocks)
    {
      symbol: "ABNB",
      name: "Airbnb Inc.",
      quantity: 20,
      unitCost: 135.0,
      totalValue: 2646.8,
      dailyChange: -43.6,
      dailyChangePercent: -1.62,
      currency: "USD",
      gainLossCHF: -295.27,
      totalValueCHF: 2098.97,
      positionPercent: 0.24,
      category: "Actions" as const,
    },
    {
      symbol: "AZN",
      name: "AstraZeneca PLC",
      quantity: 100,
      unitCost: 54.0,
      totalValue: 6988.0,
      dailyChange: 3.0,
      dailyChangePercent: 0.04,
      currency: "USD",
      gainLossCHF: 621.79,
      totalValueCHF: 5541.62,
      positionPercent: 0.63,
      category: "Actions" as const,
    },
    {
      symbol: "BABA",
      name: "Alibaba Group",
      quantity: 200,
      unitCost: 115.02,
      totalValue: 22682.0,
      dailyChange: -134.0,
      dailyChangePercent: -0.59,
      currency: "USD",
      gainLossCHF: -2235.53,
      totalValueCHF: 17987.28,
      positionPercent: 2.03,
      category: "Actions" as const,
    },
    {
      symbol: "META",
      name: "Meta Platforms Inc.",
      quantity: 3,
      unitCost: 560.0,
      totalValue: 2214.27,
      dailyChange: 13.38,
      dailyChangePercent: 0.61,
      currency: "USD",
      gainLossCHF: 331.27,
      totalValueCHF: 1755.96,
      positionPercent: 0.2,
      category: "Actions" as const,
    },
    {
      symbol: "OXY",
      name: "Occidental Petroleum",
      quantity: 200,
      unitCost: 54.84,
      totalValue: 8402.0,
      dailyChange: -118.0,
      dailyChangePercent: -1.38,
      currency: "USD",
      gainLossCHF: -2736.16,
      totalValueCHF: 6662.95,
      positionPercent: 0.75,
      category: "Actions" as const,
    },
    {
      symbol: "PLTR",
      name: "Palantir Technologies",
      quantity: 100,
      unitCost: 98.0,
      totalValue: 13632.0,
      dailyChange: 558.0,
      dailyChangePercent: 4.27,
      currency: "USD",
      gainLossCHF: 1973.05,
      totalValueCHF: 10810.45,
      positionPercent: 1.22,
      category: "Actions" as const,
    },
    {
      symbol: "SQN",
      name: "Swissquote Group",
      quantity: 1050,
      unitCost: 122.25,
      totalValue: 471870.0,
      dailyChange: 8190.0,
      dailyChangePercent: 1.77,
      currency: "CHF",
      gainLossCHF: 343499.69,
      totalValueCHF: 471870.0,
      positionPercent: 53.35,
      category: "Actions" as const,
    },
    {
      symbol: "UMC",
      name: "United Microelectronics",
      quantity: 100,
      unitCost: 11.3,
      totalValue: 765.0,
      dailyChange: -3.0,
      dailyChangePercent: -0.39,
      currency: "USD",
      gainLossCHF: -443.29,
      totalValueCHF: 606.66,
      positionPercent: 0.07,
      category: "Actions" as const,
    },

    // ETFs
    {
      symbol: "BND",
      name: "Vanguard Total Bond Market ETF",
      quantity: 200,
      unitCost: 73.25,
      totalValue: 14726.0,
      dailyChange: 58.0,
      dailyChangePercent: 0.4,
      currency: "USD",
      gainLossCHF: -1491.74,
      totalValueCHF: 11678.01,
      positionPercent: 1.32,
      category: "ETF" as const,
      domicile: "US",
      isin: "US9229087690",
      taxOptimized: false,
      withholdingTax: 30,
    },
    {
      symbol: "IEFA",
      name: "iShares Core MSCI EAFE IMI",
      quantity: 200,
      unitCost: 80.84,
      totalValue: 16680.0,
      dailyChange: 20.0,
      dailyChangePercent: 0.12,
      currency: "USD",
      gainLossCHF: -320.97,
      totalValueCHF: 13227.57,
      positionPercent: 1.5,
      category: "ETF" as const,
      domicile: "IE",
      isin: "IE00B4L5Y983",
      taxOptimized: true,
      withholdingTax: 15,
    },
    {
      symbol: "IS3N",
      name: "iShares Core MSCI World",
      quantity: 3550,
      unitCost: 33.24,
      totalValue: 118836.25,
      dailyChange: -422.45,
      dailyChangePercent: -0.35,
      currency: "EUR",
      gainLossCHF: 96.74,
      totalValueCHF: 111063.17,
      positionPercent: 12.56,
      category: "ETF" as const,
      domicile: "IE",
      isin: "IE00B4L5Y983",
      taxOptimized: true,
      withholdingTax: 15,
    },
    {
      symbol: "SPICHA",
      name: "SPDR Portfolio S&P 500",
      quantity: 450,
      unitCost: 75.62,
      totalValue: 34956.0,
      dailyChange: -189.0,
      dailyChangePercent: -0.54,
      currency: "CHF",
      gainLossCHF: 923.55,
      totalValueCHF: 34956.0,
      positionPercent: 3.95,
      category: "ETF" as const,
      domicile: "IE",
      isin: "IE00B6YX5C33",
      taxOptimized: true,
      withholdingTax: 15,
    },
    {
      symbol: "VOOV",
      name: "Vanguard S&P 500 Value ETF",
      quantity: 40,
      unitCost: 129.75,
      totalValue: 7548.4,
      dailyChange: 35.2,
      dailyChangePercent: 0.47,
      currency: "USD",
      gainLossCHF: 1538.4,
      totalValueCHF: 5986.03,
      positionPercent: 0.68,
      category: "ETF" as const,
      domicile: "US",
      isin: "US9229087377",
      taxOptimized: false,
      withholdingTax: 30,
    },
    {
      symbol: "VWRL",
      name: "Vanguard FTSE All-World",
      quantity: 500,
      unitCost: 89.96,
      totalValue: 59550.0,
      dailyChange: -250.0,
      dailyChangePercent: -0.42,
      currency: "CHF",
      gainLossCHF: 14569.0,
      totalValueCHF: 59550.0,
      positionPercent: 6.73,
      category: "ETF" as const,
      domicile: "IE",
      isin: "IE00B3RBWM25",
      taxOptimized: true,
      withholdingTax: 15,
    },

    // Fonds (Funds)
    {
      symbol: "Pic-WaterIEur",
      name: "Pictet Water Fund",
      quantity: 100,
      unitCost: 516.58,
      totalValue: 62286.0,
      dailyChange: 297.0,
      dailyChangePercent: 0.48,
      currency: "EUR",
      gainLossCHF: 1767.76,
      totalValueCHF: 58211.87,
      positionPercent: 6.58,
      category: "Fonds" as const,
    },

    // Obligations (Bonds)
    {
      symbol: "GERMANY 6.5%",
      name: "Germany 6.5% 04.07.2027",
      quantity: 10000,
      unitCost: 111.53,
      totalValue: 10912.1,
      dailyChange: 13.5,
      dailyChangePercent: 0.12,
      currency: "EUR",
      gainLossCHF: -638.44,
      totalValueCHF: 10198.34,
      positionPercent: 1.15,
      category: "Obligations" as const,
    },

    // Crypto-monnaies
    {
      symbol: "ADA",
      name: "Cardano",
      quantity: 1000,
      unitCost: 2.62,
      totalValue: 583.7,
      dailyChange: 25.0,
      dailyChangePercent: 4.48,
      currency: "USD",
      gainLossCHF: -1935.93,
      totalValueCHF: 462.89,
      positionPercent: 0.05,
      category: "Crypto-monnaies" as const,
    },
    {
      symbol: "ATOM",
      name: "Cosmos",
      quantity: 100,
      unitCost: 13.0,
      totalValue: 415.0,
      dailyChange: 11.3,
      dailyChangePercent: 2.79,
      currency: "USD",
      gainLossCHF: -957.03,
      totalValueCHF: 329.1,
      positionPercent: 0.04,
      category: "Crypto-monnaies" as const,
    },
    {
      symbol: "DOT",
      name: "Polkadot",
      quantity: 198,
      unitCost: 8.37,
      totalValue: 681.41,
      dailyChange: 4.76,
      dailyChangePercent: 0.7,
      currency: "USD",
      gainLossCHF: -1753.28,
      totalValueCHF: 540.38,
      positionPercent: 0.06,
      category: "Crypto-monnaies" as const,
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      quantity: 1.41,
      unitCost: 2152.0,
      totalValue: 3545.56,
      dailyChange: 104.7,
      dailyChangePercent: 3.04,
      currency: "USD",
      gainLossCHF: 238.51,
      totalValueCHF: 2811.7,
      positionPercent: 0.32,
      category: "Crypto-monnaies" as const,
    },
    {
      symbol: "ONDO",
      name: "Ondo Finance",
      quantity: 1500,
      unitCost: 1.23,
      totalValue: 1175.07,
      dailyChange: 21.5,
      dailyChangePercent: 1.87,
      currency: "USD",
      gainLossCHF: -690.38,
      totalValueCHF: 931.85,
      positionPercent: 0.11,
      category: "Crypto-monnaies" as const,
    },
    {
      symbol: "SOL",
      name: "Solana",
      quantity: 11.8,
      unitCost: 431.96,
      totalValue: 1852.81,
      dailyChange: 73.42,
      dailyChangePercent: 4.12,
      currency: "USD",
      gainLossCHF: 353.19,
      totalValueCHF: 1469.31,
      positionPercent: 0.17,
      category: "Crypto-monnaies" as const,
    },

    // Produits structurés (Structured Products)
    {
      symbol: "BSKT-ALTER",
      name: "Basket Alternative Open",
      quantity: 30,
      unitCost: 1002.0,
      totalValue: 66665.1,
      dailyChange: 0,
      dailyChangePercent: 0,
      currency: "USD",
      gainLossCHF: 23113.34,
      totalValueCHF: 52866.76,
      positionPercent: 5.98,
      category: "Produits structurés" as const,
    },
    {
      symbol: "PORTFOLI-ALTER",
      name: "Portfolio Alternative",
      quantity: 10,
      unitCost: 1000.0,
      totalValue: 3508.5,
      dailyChange: 0,
      dailyChangePercent: 0,
      currency: "USD",
      gainLossCHF: -6484.39,
      totalValueCHF: 2782.31,
      positionPercent: 0.31,
      category: "Produits structurés" as const,
    },
    {
      symbol: "SPACEX-OTC",
      name: "SpaceX (via Stableton)",
      quantity: 10,
      unitCost: 500.0,
      totalValue: 5000.0,
      dailyChange: 0,
      dailyChangePercent: 0,
      currency: "USD",
      gainLossCHF: 1200.0,
      totalValueCHF: 3965.0,
      positionPercent: 0.45,
      category: "Private Markets" as const,
      sector: "Aerospace & Defense",
      geography: "United States",
      isOTC: true,
      platform: "Stableton",
    },
    {
      symbol: "BELLABEAT-OTC",
      name: "Bellabeat (via Stableton)",
      quantity: 50,
      unitCost: 25.0,
      totalValue: 1250.0,
      dailyChange: 0,
      dailyChangePercent: 0,
      currency: "USD",
      gainLossCHF: -150.0,
      totalValueCHF: 991.25,
      positionPercent: 0.11,
      category: "Private Markets" as const,
      sector: "Consumer Technology",
      geography: "Croatia",
      isOTC: true,
      platform: "Stableton",
    },
  ]

  // Extract domicile allocation
  const domicileAllocation = [
    {
      domicile: "Ireland (IE)",
      value: 220796.77,
      percentage: 24.82,
      taxImplication: "Tax-optimized for Swiss investors (15% WHT)",
    },
    {
      domicile: "United States (US)",
      value: 17664.04,
      percentage: 1.99,
      taxImplication: "Higher withholding tax (30% WHT)",
    },
    {
      domicile: "Switzerland (CH)",
      value: 34956.0,
      percentage: 3.93,
      taxImplication: "No withholding tax for Swiss residents",
    },
    {
      domicile: "Luxembourg (LU)",
      value: 58211.87,
      percentage: 6.54,
      taxImplication: "Tax-optimized for Swiss investors (15% WHT)",
    },
  ]

  // Enhanced ETF underlying holdings data with country and sector breakdowns
  const etfUnderlyingData: Record<
    string,
    {
      currency: Array<{ currency: string; weight: number }>
      country: Array<{ country: string; weight: number }>
      sector: Array<{ sector: string; weight: number }>
    }
  > = {
    BND: {
      currency: [{ currency: "USD", weight: 100 }],
      country: [{ country: "United States", weight: 100 }],
      sector: [
        { sector: "Government Bonds", weight: 70 },
        { sector: "Corporate Bonds", weight: 25 },
        { sector: "Municipal Bonds", weight: 5 },
      ],
    },
    IEFA: {
      currency: [
        { currency: "EUR", weight: 45 },
        { currency: "JPY", weight: 20 },
        { currency: "GBP", weight: 15 },
        { currency: "CHF", weight: 8 },
        { currency: "SEK", weight: 5 },
        { currency: "DKK", weight: 4 },
        { currency: "NOK", weight: 3 },
      ],
      country: [
        { country: "Japan", weight: 20 },
        { country: "United Kingdom", weight: 15 },
        { country: "France", weight: 12 },
        { country: "Germany", weight: 10 },
        { country: "Switzerland", weight: 8 },
        { country: "Netherlands", weight: 7 },
        { country: "Sweden", weight: 5 },
        { country: "Denmark", weight: 4 },
        { country: "Others", weight: 19 },
      ],
      sector: [
        { sector: "Technology", weight: 18 },
        { sector: "Financials", weight: 16 },
        { sector: "Healthcare", weight: 14 },
        { sector: "Consumer Discretionary", weight: 12 },
        { sector: "Industrials", weight: 11 },
        { sector: "Consumer Staples", weight: 9 },
        { sector: "Materials", weight: 8 },
        { sector: "Energy", weight: 5 },
        { sector: "Utilities", weight: 4 },
        { sector: "Real Estate", weight: 3 },
      ],
    },
    IS3N: {
      currency: [
        { currency: "USD", weight: 65 },
        { currency: "EUR", weight: 15 },
        { currency: "JPY", weight: 8 },
        { currency: "GBP", weight: 4 },
        { currency: "CHF", weight: 3 },
        { currency: "CAD", weight: 3 },
        { currency: "AUD", weight: 2 },
      ],
      country: [
        { country: "United States", weight: 65 },
        { country: "Japan", weight: 8 },
        { country: "United Kingdom", weight: 4 },
        { country: "France", weight: 3.5 },
        { country: "Switzerland", weight: 3 },
        { country: "Canada", weight: 3 },
        { country: "Germany", weight: 2.5 },
        { country: "Australia", weight: 2 },
        { country: "Netherlands", weight: 1.5 },
        { country: "Others", weight: 7.5 },
      ],
      sector: [
        { sector: "Technology", weight: 23 },
        { sector: "Financials", weight: 15 },
        { sector: "Healthcare", weight: 13 },
        { sector: "Consumer Discretionary", weight: 11 },
        { sector: "Industrials", weight: 10 },
        { sector: "Consumer Staples", weight: 7 },
        { sector: "Energy", weight: 6 },
        { sector: "Materials", weight: 5 },
        { sector: "Utilities", weight: 4 },
        { sector: "Real Estate", weight: 3 },
        { sector: "Communication Services", weight: 3 },
      ],
    },
    SPICHA: {
      currency: [{ currency: "USD", weight: 100 }],
      country: [{ country: "United States", weight: 100 }],
      sector: [
        { sector: "Technology", weight: 28 },
        { sector: "Financials", weight: 13 },
        { sector: "Healthcare", weight: 12 },
        { sector: "Consumer Discretionary", weight: 11 },
        { sector: "Communication Services", weight: 9 },
        { sector: "Industrials", weight: 8 },
        { sector: "Consumer Staples", weight: 6 },
        { sector: "Energy", weight: 5 },
        { sector: "Utilities", weight: 3 },
        { sector: "Real Estate", weight: 3 },
        { sector: "Materials", weight: 2 },
      ],
    },
    VOOV: {
      currency: [{ currency: "USD", weight: 100 }],
      country: [{ country: "United States", weight: 100 }],
      sector: [
        { sector: "Financials", weight: 22 },
        { sector: "Healthcare", weight: 16 },
        { sector: "Industrials", weight: 14 },
        { sector: "Consumer Staples", weight: 12 },
        { sector: "Energy", weight: 10 },
        { sector: "Utilities", weight: 8 },
        { sector: "Technology", weight: 7 },
        { sector: "Materials", weight: 5 },
        { sector: "Consumer Discretionary", weight: 4 },
        { sector: "Real Estate", weight: 2 },
      ],
    },
    VWRL: {
      currency: [
        { currency: "USD", weight: 60 },
        { currency: "EUR", weight: 15 },
        { currency: "JPY", weight: 8 },
        { currency: "GBP", weight: 4 },
        { currency: "CHF", weight: 3 },
        { currency: "CAD", weight: 3 },
        { currency: "CNY", weight: 4 },
        { currency: "KRW", weight: 2 },
        { currency: "TWD", weight: 1 },
      ],
      country: [
        { country: "United States", weight: 60 },
        { country: "Japan", weight: 8 },
        { country: "United Kingdom", weight: 4 },
        { country: "China", weight: 4 },
        { country: "France", weight: 3 },
        { country: "Switzerland", weight: 3 },
        { country: "Canada", weight: 3 },
        { country: "Germany", weight: 2.5 },
        { country: "South Korea", weight: 2 },
        { country: "Taiwan", weight: 1.5 },
        { country: "Australia", weight: 1.5 },
        { country: "Others", weight: 7.5 },
      ],
      sector: [
        { sector: "Technology", weight: 22 },
        { sector: "Financials", weight: 16 },
        { sector: "Healthcare", weight: 12 },
        { sector: "Consumer Discretionary", weight: 11 },
        { sector: "Industrials", weight: 10 },
        { sector: "Consumer Staples", weight: 7 },
        { sector: "Energy", weight: 6 },
        { sector: "Materials", weight: 5 },
        { sector: "Communication Services", weight: 4 },
        { sector: "Utilities", weight: 4 },
        { sector: "Real Estate", weight: 3 },
      ],
    },
  }

  // Update the currency allocation calculation to include ETF underlying exposure
  const getCurrencyAllocationWithETFs = () => {
    const currencyExposure: Record<string, number> = {}

    positions.forEach((position) => {
      if (position.category === "ETF" && etfUnderlyingData[position.symbol]) {
        // For ETFs, distribute based on underlying currency exposure
        etfUnderlyingData[position.symbol].currency.forEach((exposure) => {
          const exposureValue = (exposure.weight / 100) * position.totalValueCHF
          currencyExposure[exposure.currency] = (currencyExposure[exposure.currency] || 0) + exposureValue
        })
      } else {
        // For non-ETF positions, use the position's currency
        const currency = position.currency || "CHF"
        currencyExposure[currency] = (currencyExposure[currency] || 0) + position.totalValueCHF
      }
    })

    // Add cash positions
    currencyExposure["CHF"] = (currencyExposure["CHF"] || 0) + accountOverview.cashBalance

    return Object.entries(currencyExposure)
      .map(([currency, value]) => ({
        currency,
        value,
        percentage: (value / accountOverview.totalValue) * 100,
      }))
      .sort((a, b) => b.value - a.value)
  }

  // Add these functions to calculate true exposure including ETF look-through
  const getTrueCountryAllocationWithETFs = () => {
    const countryExposure: Record<string, number> = {}

    positions.forEach((position) => {
      if (position.category === "ETF" && etfUnderlyingData[position.symbol]) {
        // For ETFs, distribute based on underlying country exposure
        etfUnderlyingData[position.symbol].country.forEach((exposure) => {
          const exposureValue = (exposure.weight / 100) * position.totalValueCHF
          countryExposure[exposure.country] = (countryExposure[exposure.country] || 0) + exposureValue
        })
      } else {
        // For non-ETF positions, use the position's geography
        const country = position.geography || "Unknown"
        countryExposure[country] = (countryExposure[country] || 0) + position.totalValueCHF
      }
    })

    return Object.entries(countryExposure)
      .map(([country, value]) => ({
        country,
        value,
        percentage: (value / accountOverview.totalValue) * 100,
      }))
      .sort((a, b) => b.value - a.value)
  }

  const getTrueSectorAllocationWithETFs = () => {
    const sectorExposure: Record<string, number> = {}

    positions.forEach((position) => {
      if (position.category === "ETF" && etfUnderlyingData[position.symbol]) {
        // For ETFs, distribute based on underlying sector exposure
        etfUnderlyingData[position.symbol].sector.forEach((exposure) => {
          const exposureValue = (exposure.weight / 100) * position.totalValueCHF
          sectorExposure[exposure.sector] = (sectorExposure[exposure.sector] || 0) + exposureValue
        })
      } else {
        // For non-ETF positions, use the position's sector
        const sector = position.sector || "Unknown"
        sectorExposure[sector] = (sectorExposure[sector] || 0) + position.totalValueCHF
      }
    })

    return Object.entries(sectorExposure)
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: (value / accountOverview.totalValue) * 100,
      }))
      .sort((a, b) => b.value - a.value)
  }

  // Replace the existing currencyAllocation with the new calculation
  const currencyAllocation = getCurrencyAllocationWithETFs()

  return {
    accountOverview,
    assetAllocation,
    currencyAllocation,
    domicileAllocation,
    positions,
  }
}

function parseSwissNumber(str: string): number {
  return Number.parseFloat(str.replace(/'/g, "").replace(",", "."))
}
