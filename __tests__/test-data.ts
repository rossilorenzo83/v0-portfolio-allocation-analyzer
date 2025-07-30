import type { PortfolioPosition } from "../portfolio-parser"

export const mockPositions: PortfolioPosition[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 100,
    unitCost: 150.0,
    price: 150.0,
    currentPrice: 155.0,
    totalValueCHF: 15500 * 0.92, // Assuming 0.92 CHF/USD
    currency: "USD",
    category: "Actions",
    sector: "Technology",
    geography: "United States",
    domicile: "US",
    withholdingTax: 15,
    taxOptimized: true,
    gainLossCHF: (155 - 150) * 100 * 0.92,
    unrealizedGainLoss: (155 - 150) * 100,
    unrealizedGainLossPercent: ((155 - 150) / 150) * 100,
    positionPercent: 0, // Will be calculated dynamically
    dailyChangePercent: 1.5,
    isOTC: false,
  },
  {
    symbol: "VWRL",
    name: "Vanguard FTSE All-World UCITS ETF",
    quantity: 500,
    unitCost: 89.96,
    price: 89.96,
    currentPrice: 91.0,
    totalValueCHF: 500 * 91.0,
    currency: "CHF",
    category: "ETF",
    sector: "Diversified",
    geography: "Global",
    domicile: "IE",
    withholdingTax: 15,
    taxOptimized: false,
    gainLossCHF: (91.0 - 89.96) * 500,
    unrealizedGainLoss: (91.0 - 89.96) * 500,
    unrealizedGainLossPercent: ((91.0 - 89.96) / 89.96) * 100,
    positionPercent: 0, // Will be calculated dynamically
    dailyChangePercent: 1.15,
    isOTC: false,
  },
  {
    symbol: "NESN",
    name: "Nestlé SA",
    quantity: 50,
    unitCost: 105.0,
    price: 105.0,
    currentPrice: 106.5,
    totalValueCHF: 50 * 106.5,
    currency: "CHF",
    category: "Actions",
    sector: "Consumer Staples",
    geography: "Switzerland",
    domicile: "CH",
    withholdingTax: 35,
    taxOptimized: false,
    gainLossCHF: (106.5 - 105.0) * 50,
    unrealizedGainLoss: (106.5 - 105.0) * 50,
    unrealizedGainLossPercent: ((106.5 - 105.0) / 105.0) * 100,
    positionPercent: 0, // Will be calculated dynamically
    dailyChangePercent: 0.8,
    isOTC: false,
  },
  {
    symbol: "TLT",
    name: "iShares 20+ Year Treasury Bond ETF",
    quantity: 20,
    unitCost: 95.0,
    price: 95.0,
    currentPrice: 94.5,
    totalValueCHF: 20 * 94.5 * 0.92, // Assuming 0.92 CHF/USD
    currency: "USD",
    category: "Bonds",
    sector: "Fixed Income",
    geography: "United States",
    domicile: "US",
    withholdingTax: 0, // Bonds typically have different tax treatment
    taxOptimized: true,
    gainLossCHF: (94.5 - 95.0) * 20 * 0.92,
    unrealizedGainLoss: (94.5 - 95.0) * 20,
    unrealizedGainLossPercent: ((94.5 - 95.0) / 95.0) * 100,
    positionPercent: 0, // Will be calculated dynamically
    dailyChangePercent: -0.5,
    isOTC: false,
  },
]

// Calculate total value and position percentages for mock data
const totalMockValue = mockPositions.reduce((sum, p) => sum + p.totalValueCHF, 0)
mockPositions.forEach((p) => {
  p.positionPercent = (p.totalValueCHF / totalMockValue) * 100
})
