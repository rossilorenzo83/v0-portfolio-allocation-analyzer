// Utility functions for ETF analysis

export function mapSectorName(sector: string): string {
  const sectorMap: { [key: string]: string } = {
    'technology': 'Technology',
    'financials': 'Financials',
    'healthcare': 'Healthcare',
    'consumer_discretionary': 'Consumer Discretionary',
    'industrials': 'Industrials',
    'consumer_staples': 'Consumer Staples',
    'communication_services': 'Communication Services',
    'energy': 'Energy',
    'utilities': 'Utilities',
    'real_estate': 'Real Estate',
    'materials': 'Materials',
    'basic_materials': 'Materials',
    'telecommunications': 'Communication Services',
    'information_technology': 'Technology',
    'consumer_goods': 'Consumer Discretionary',
    'services': 'Consumer Discretionary',
    'other': 'Other'
  }
  
  return sectorMap[sector.toLowerCase()] || sector
}

export function guessDomicile(symbol: string): string {
  // Simple heuristic based on symbol patterns
  if (symbol.includes('.SW') || symbol.includes('.CH')) {
    return 'CH'
  }
  if (symbol.includes('.L') || symbol.includes('.UK')) {
    return 'GB'
  }
  if (symbol.includes('.PA') || symbol.includes('.FR')) {
    return 'FR'
  }
  if (symbol.includes('.DE') || symbol.includes('.F')) {
    return 'DE'
  }
  // Default to US for most ETFs
  return 'US'
}

export function getWithholdingTax(domicile: string): number {
  const taxRates: { [key: string]: number } = {
    'US': 30, // US domiciled ETFs
    'IE': 15, // Irish domiciled ETFs (tax optimized)
    'CH': 0,  // Swiss domiciled ETFs
    'GB': 15, // UK domiciled ETFs
    'FR': 30, // French domiciled ETFs
    'DE': 26.375, // German domiciled ETFs
    'NL': 15, // Dutch domiciled ETFs
    'LU': 15, // Luxembourg domiciled ETFs
  }
  
  return taxRates[domicile] || 30
}

export function estimateCountryAllocation(symbol: string): Array<{ country: string; weight: number }> {
  // Default global allocation for unknown ETFs
  return [
    { country: 'United States', weight: 60 },
    { country: 'Japan', weight: 7 },
    { country: 'United Kingdom', weight: 4 },
    { country: 'China', weight: 3 },
    { country: 'Switzerland', weight: 2 },
    { country: 'Other', weight: 24 }
  ]
}

export function estimateSectorAllocation(symbol: string): Array<{ sector: string; weight: number }> {
  // Default sector allocation for unknown ETFs
  return [
    { sector: 'Technology', weight: 25 },
    { sector: 'Financials', weight: 15 },
    { sector: 'Healthcare', weight: 12 },
    { sector: 'Consumer Discretionary', weight: 10 },
    { sector: 'Industrials', weight: 8 },
    { sector: 'Other', weight: 30 }
  ]
}

export function estimateCurrencyAllocation(domicile: string, symbol: string): Array<{ currency: string; weight: number }> {
  if (domicile === 'US') {
    return [{ currency: 'USD', weight: 100 }]
  }
  if (domicile === 'CH') {
    return [{ currency: 'CHF', weight: 100 }]
  }
  if (domicile === 'GB') {
    return [{ currency: 'GBP', weight: 100 }]
  }
  if (domicile === 'IE') {
    // Irish domiciled ETFs typically have USD underlying
    return [
      { currency: 'USD', weight: 70 },
      { currency: 'EUR', weight: 20 },
      { currency: 'Other', weight: 10 }
    ]
  }
  
  // Default global currency allocation
  return [
    { currency: 'USD', weight: 55 },
    { currency: 'EUR', weight: 15 },
    { currency: 'JPY', weight: 10 },
    { currency: 'GBP', weight: 5 },
    { currency: 'CHF', weight: 3 },
    { currency: 'Other', weight: 12 }
  ]
} 