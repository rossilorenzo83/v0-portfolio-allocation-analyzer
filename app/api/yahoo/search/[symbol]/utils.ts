// Utility functions for search analysis

export function mapSector(symbol: string): string {
  // Simple sector mapping based on symbol patterns
  const sectorMap: { [key: string]: string } = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOG': 'Communication Services',
    'GOOGL': 'Communication Services',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NVDA': 'Technology',
    'META': 'Communication Services',
    'NFLX': 'Communication Services',
    'NESN': 'Consumer Staples',
    'NOVN': 'Healthcare',
    'ROG': 'Healthcare',
    'VWRL': 'Diversified',
    'IWDA': 'Diversified',
    'SPY': 'Diversified',
    'QQQ': 'Technology',
    'VTI': 'Diversified',
    'VEA': 'Diversified',
    'VWO': 'Diversified',
    'BND': 'Fixed Income',
    'AGG': 'Fixed Income',
    'GLD': 'Commodities',
    'SLV': 'Commodities',
    'USO': 'Energy',
    'XLE': 'Energy',
    'XLF': 'Financials',
    'XLK': 'Technology',
    'XLV': 'Healthcare',
    'XLY': 'Consumer Discretionary',
    'XLP': 'Consumer Staples',
    'XLI': 'Industrials',
    'XLB': 'Materials',
    'XLU': 'Utilities',
    'XLRE': 'Real Estate'
  }
  
  return sectorMap[symbol.toUpperCase()] || 'Unknown'
}

export function mapCountry(symbol: string): string {
  // Simple country mapping based on symbol patterns
  if (symbol.includes('.SW') || symbol.includes('.CH')) {
    return 'Switzerland'
  }
  if (symbol.includes('.L') || symbol.includes('.UK')) {
    return 'United Kingdom'
  }
  if (symbol.includes('.PA') || symbol.includes('.FR')) {
    return 'France'
  }
  if (symbol.includes('.DE') || symbol.includes('.F')) {
    return 'Germany'
  }
  if (symbol.includes('.TO') || symbol.includes('.CA')) {
    return 'Canada'
  }
  if (symbol.includes('.T') || symbol.includes('.JP')) {
    return 'Japan'
  }
  if (symbol.includes('.HK') || symbol.includes('.HK')) {
    return 'Hong Kong'
  }
  if (symbol.includes('.AX') || symbol.includes('.AU')) {
    return 'Australia'
  }
  
  // Default to US for most symbols
  return 'United States'
}

export function mapCurrency(symbol: string): string {
  // Simple currency mapping based on symbol patterns
  if (symbol.includes('.SW') || symbol.includes('.CH')) {
    return 'CHF'
  }
  if (symbol.includes('.L') || symbol.includes('.UK')) {
    return 'GBP'
  }
  if (symbol.includes('.PA') || symbol.includes('.FR')) {
    return 'EUR'
  }
  if (symbol.includes('.DE') || symbol.includes('.F')) {
    return 'EUR'
  }
  if (symbol.includes('.TO') || symbol.includes('.CA')) {
    return 'CAD'
  }
  if (symbol.includes('.T') || symbol.includes('.JP')) {
    return 'JPY'
  }
  if (symbol.includes('.HK') || symbol.includes('.HK')) {
    return 'HKD'
  }
  if (symbol.includes('.AX') || symbol.includes('.AU')) {
    return 'AUD'
  }
  
  // Default to USD for most symbols
  return 'USD'
}

export function mapExchange(symbol: string): string {
  // Simple exchange mapping based on symbol patterns
  if (symbol.includes('.SW') || symbol.includes('.CH')) {
    return 'SWX'
  }
  if (symbol.includes('.L') || symbol.includes('.UK')) {
    return 'LSE'
  }
  if (symbol.includes('.PA') || symbol.includes('.FR')) {
    return 'EPA'
  }
  if (symbol.includes('.DE') || symbol.includes('.F')) {
    return 'ETR'
  }
  if (symbol.includes('.TO') || symbol.includes('.CA')) {
    return 'TSX'
  }
  if (symbol.includes('.T') || symbol.includes('.JP')) {
    return 'TSE'
  }
  if (symbol.includes('.HK') || symbol.includes('.HK')) {
    return 'HKG'
  }
  if (symbol.includes('.AX') || symbol.includes('.AU')) {
    return 'ASX'
  }
  
  // Default to NASDAQ for most US symbols
  return 'NASDAQ'
}

export function isETF(symbol: string): boolean {
  // Simple ETF detection based on symbol patterns
  const etfPatterns = [
    'VWRL', 'IWDA', 'SPY', 'QQQ', 'VTI', 'VEA', 'VWO', 'BND', 'AGG',
    'GLD', 'SLV', 'USO', 'XLE', 'XLF', 'XLK', 'XLV', 'XLY', 'XLP',
    'XLI', 'XLB', 'XLU', 'XLRE', 'VUSA', 'VWCE', 'IS3N', 'EUNL'
  ]
  
  return etfPatterns.some(pattern => symbol.toUpperCase().includes(pattern))
} 