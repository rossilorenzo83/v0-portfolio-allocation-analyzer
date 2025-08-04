import { yahooFinanceService } from './yahoo-finance-service'

interface SymbolResolutionResult {
  originalSymbol: string
  resolvedSymbol: string
  exchange: string
  type: string
  currency: string
  name: string
  timestamp: number
}

class SymbolResolutionService {
  private symbolCache = new Map<string, SymbolResolutionResult>()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  private isCacheValid(cached: SymbolResolutionResult): boolean {
    return Date.now() - cached.timestamp < this.CACHE_DURATION
  }

  private getSymbolVariations(symbol: string): string[] {
    const variations = [symbol] // Start with original

    // Auto-detect European symbols and add exchange suffixes
    if (this.isEuropeanSymbol(symbol) && !symbol.includes(".")) {
      const exchanges = [".L", ".DE", ".AS", ".MI", ".PA", ".SW"]
      exchanges.forEach((exchange) => {
        variations.push(`${symbol}${exchange}`)
      })
    }

    // Remove duplicates
    return Array.from(new Set(variations))
  }

  private isEuropeanSymbol(symbol: string): boolean {
    const europeanPatterns = [
      /^V[A-Z]{3}$/, // Vanguard ETFs
      /^I[A-Z]{3}$/, // iShares ETFs
      /^IS[0-9][A-Z]$/, // iShares numbered ETFs
      /^X[A-Z]{3}$/, // Xtrackers ETFs
      /^SP[A-Z]{2}$/, // SPDR ETFs
    ]

    return europeanPatterns.some((pattern) => pattern.test(symbol))
  }

  async resolveSymbol(originalSymbol: string): Promise<SymbolResolutionResult> {
    // Check cache first
    const cached = this.symbolCache.get(originalSymbol)
    if (cached && this.isCacheValid(cached)) {
      console.log(`📋 Cache hit for symbol resolution: ${originalSymbol} -> ${cached.resolvedSymbol}`)
      return cached
    }

    console.log(`🔍 Resolving symbol: ${originalSymbol}`)

    // If it's not a European symbol, return as-is
    if (!this.isEuropeanSymbol(originalSymbol)) {
      const result: SymbolResolutionResult = {
        originalSymbol,
        resolvedSymbol: originalSymbol,
        exchange: 'US',
        type: 'EQUITY',
        currency: 'USD',
        name: originalSymbol,
        timestamp: Date.now()
      }
      this.symbolCache.set(originalSymbol, result)
      return result
    }

    // For European symbols, try all variations using the sophisticated service
    const variations = this.getSymbolVariations(originalSymbol)
    console.log(`  🌍 European symbol detected: ${originalSymbol}, trying variations:`, variations)

    for (const variation of variations) {
      try {
        console.log(`  Trying: ${variation}`)
        
        // Use the sophisticated service to search for this variation
        const searchResult = await yahooFinanceService.searchSymbol(variation)
        
        if (searchResult && searchResult.symbol === variation) {
          console.log(`  ✅ Found working symbol: ${variation}`)
          
          const result: SymbolResolutionResult = {
            originalSymbol,
            resolvedSymbol: variation,
            exchange: searchResult.exchange,
            type: searchResult.type,
            currency: searchResult.currency,
            name: searchResult.name,
            timestamp: Date.now()
          }
          
          this.symbolCache.set(originalSymbol, result)
          return result
        }
      } catch (error) {
        console.log(`  ❌ Error with ${variation}:`, error)
        continue
      }
    }

    // If no variation works, return the original symbol
    console.log(`  🔄 No working symbol found, using original: ${originalSymbol}`)
    const result: SymbolResolutionResult = {
      originalSymbol,
      resolvedSymbol: originalSymbol,
      exchange: 'Unknown',
      type: 'EQUITY',
      currency: 'USD',
      name: originalSymbol,
      timestamp: Date.now()
    }
    
    this.symbolCache.set(originalSymbol, result)
    return result
  }

  getCachedSymbol(originalSymbol: string): SymbolResolutionResult | null {
    const cached = this.symbolCache.get(originalSymbol)
    if (cached && this.isCacheValid(cached)) {
      return cached
    }
    return null
  }

  clearCache(): void {
    this.symbolCache.clear()
  }

  // Debug method to show cache contents
  getCacheInfo(): { [key: string]: string } {
    const info: { [key: string]: string } = {}
    this.symbolCache.forEach((value, key) => {
      info[key] = `${value.resolvedSymbol} (${value.exchange})`
    })
    return info
  }
}

export const symbolResolutionService = new SymbolResolutionService()
export type { SymbolResolutionResult } 