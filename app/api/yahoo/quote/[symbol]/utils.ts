// Utility functions for quote analysis

export function guessCurrency(symbol: string): string {
  // Simple heuristic to guess currency based on symbol patterns
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