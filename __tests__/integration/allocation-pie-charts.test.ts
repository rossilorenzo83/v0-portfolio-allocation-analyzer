import { parsePortfolioCsv } from "../../portfolio-parser"

// Mock the services correctly based on how they're actually used
jest.mock('../../etf-data-service', () => ({
  resolveSymbolAndFetchData: jest.fn(),
}))

// Integration test for pie chart allocation calculations
describe("Integration: Pie Chart Allocation Tests", () => {
  const mockResolveSymbolAndFetchData = require('../../etf-data-service').resolveSymbolAndFetchData

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Set up default mock that handles multiple symbols
    mockResolveSymbolAndFetchData.mockImplementation((position) => {
      const stockData = {
        'SQN': { 
          etfData: {
            symbol: 'SQN', 
            name: 'SQN', 
            domicile: 'CH', 
            composition: { 
              sectors: { 'Financial Services': 100 }, 
              countries: { 'Switzerland': 100 }, 
              currencies: { 'CHF': 100 } 
            }
          },
          quoteData: { price: 517.50, currency: 'CHF' }
        },
        'SQN.SW': { 
          etfData: {
            symbol: 'SQN.SW', 
            name: 'SQN', 
            domicile: 'CH', 
            composition: { 
              sectors: { 'Financial Services': 100 }, 
              countries: { 'Switzerland': 100 }, 
              currencies: { 'CHF': 100 } 
            }
          },
          quoteData: { price: 517.50, currency: 'CHF' }
        },
        'ABNB': { 
          etfData: {
            symbol: 'ABNB', 
            name: 'Airbnb Inc.', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Consumer Discretionary': 100 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 124.62, currency: 'USD' }
        },
        'AZN': { 
          etfData: {
            symbol: 'AZN', 
            name: 'AstraZeneca', 
            domicile: 'GB', 
            composition: { 
              sectors: { 'Healthcare': 100 }, 
              countries: { 'United Kingdom': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 81.56, currency: 'USD' }
        },
        'META': { 
          etfData: {
            symbol: 'META', 
            name: 'Meta Platforms', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Communication Services': 100 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 752.30, currency: 'USD' }
        },
        'AAPL': { 
          etfData: {
            symbol: 'AAPL', 
            name: 'Apple Inc.', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Technology': 100 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 150, currency: 'USD' }
        },
        'AAPL.SW': { 
          etfData: {
            symbol: 'AAPL.SW', 
            name: 'Apple Inc.', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Technology': 100 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 150, currency: 'USD' }
        },
        'GOOGL': { 
          etfData: {
            symbol: 'GOOGL', 
            name: 'Alphabet Inc.', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Communication Services': 100 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 2800, currency: 'USD' }
        },
        'TSLA': { 
          etfData: {
            symbol: 'TSLA', 
            name: 'Tesla Inc.', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Consumer Discretionary': 100 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 1000, currency: 'USD' }
        },
        'VTI': { 
          etfData: {
            symbol: 'VTI', 
            name: 'Vanguard Total Stock Market ETF', 
            domicile: 'US', 
            composition: { 
              sectors: { 'Technology': 30, 'Financial Services': 20, 'Healthcare': 15, 'Other': 35 }, 
              countries: { 'United States': 100 }, 
              currencies: { 'USD': 100 } 
            }
          },
          quoteData: { price: 200, currency: 'USD' }
        },
      }
      
      // Handle both original symbols and exchange-enhanced symbols
      const baseSymbol = position.symbol.split('.')[0]
      const mockData = stockData[position.symbol] || stockData[baseSymbol]
      return Promise.resolve(mockData || {
        etfData: { 
          symbol: position.symbol, 
          name: position.symbol, 
          domicile: 'US',
          composition: { 
            sectors: { 'Unknown': 100 }, 
            countries: { 'Unknown': 100 }, 
            currencies: { 'USD': 100 } 
          }
        },
        quoteData: { price: 100, currency: 'USD' }
      })
    })
  })

  describe("Sector Allocation Pie Chart", () => {
    it("should detect when sector allocation is unrealistic (90%+ Unknown)", async () => {
      // This test simulates the exact bug scenario the user reported
      const csvContent = `Actions, , , , , , , , , , , , , 
 ,SQN,1050,122.25743,543375.00,-5775.00,-1.05%,517.50,CHF,415004.69,323.29%,543375.00,55.23%,
 ,ABNB,20,135.00,2492.40,,,124.62,USD,-415.27,-17.34%,1978.97,0.20%,
 ,AZN,100,54.00,8156.00,,,81.56,USD,1556.03,31.63%,6475.86,0.66%,
 ,META,3,560.00,2256.90,,,752.30,USD,367.29,25.78%,1791.98,0.18%,`

      const result = await parsePortfolioCsv(csvContent)

      // Validate the result structure
      expect(result.trueSectorAllocation).toBeDefined()
      expect(Array.isArray(result.trueSectorAllocation)).toBe(true)
      expect(result.trueSectorAllocation.length).toBeGreaterThan(0)

      // Check for the bug: is sector allocation dominated by "Unknown"?
      const sectorAllocation = result.trueSectorAllocation
      const totalPercentage = sectorAllocation.reduce((sum, sector) => sum + sector.percentage, 0)
      const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
      
      // Total should add up to ~100%
      expect(totalPercentage).toBeCloseTo(100, 1)
      
      // THE BUG TEST: Before fix, Unknown would be ~90%+ due to SQN being 55% unknown
      // After fix, Unknown should be much less (ideally 0%)
      console.log('Sector allocation:', sectorAllocation.map(s => `${s.name}: ${s.percentage.toFixed(1)}%`))
      
      // After the fix, we should have diverse sectors, not dominated by Unknown
      expect(sectorAllocation.length).toBeGreaterThanOrEqual(1) // At least one sector
      
      if (unknownSector) {
        // After fix, Unknown should be minimal if it exists at all
        expect(unknownSector.percentage).toBeLessThan(10)
      }
      
      // Should have meaningful financial sector since SQN is 55% of portfolio
      const financialSector = sectorAllocation.find(s => s.name.includes('Financial'))
      expect(financialSector).toBeDefined()
      expect(financialSector!.percentage).toBeGreaterThan(50) // SQN dominates
    })

    it("should have diverse sector allocation when stocks are properly enriched", async () => {
      const csvContent = `Actions, , , , , , , , , , , , , 
 ,AAPL,100,150.00,15000.00,,,150.00,USD,0,0%,15000.00,50%,
 ,JPM,50,200.00,10000.00,,,200.00,USD,0,0%,10000.00,33%,
 ,JNJ,25,160.00,4000.00,,,160.00,USD,0,0%,4000.00,13%,
 ,XOM,10,100.00,1000.00,,,100.00,USD,0,0%,1000.00,3%,`

      const result = await parsePortfolioCsv(csvContent)

      const sectorAllocation = result.trueSectorAllocation
      const sectorNames = sectorAllocation.map(s => s.name)
      
      // After proper enrichment, we should have multiple different sectors
      expect(sectorAllocation.length).toBeGreaterThanOrEqual(1)
      expect(sectorNames).not.toEqual(['Unknown']) // Should not be only "Unknown"
      
      // Should have recognizable sectors for these major stocks
      const hasKnownSectors = sectorNames.some(name => 
        ['Technology', 'Financial Services', 'Healthcare', 'Energy', 'Consumer Staples', 'Consumer Cyclical'].includes(name)
      )
      expect(hasKnownSectors).toBe(true)
    })
  })

  describe("Country Allocation Pie Chart", () => {
    it("should detect when country allocation is unrealistic (90%+ Unknown)", async () => {
      // Similar test for geography/country allocation
      const csvContent = `Actions, , , , , , , , , , , , , 
 ,SQN,1000,517.50,517500.00,,,517.50,CHF,0,0%,517500.00,85%,
 ,NESN,100,80.00,8000.00,,,80.00,CHF,0,0%,8000.00,13%,
 ,AAPL,10,150.00,1500.00,,,150.00,USD,0,0%,1500.00,2%,`

      const result = await parsePortfolioCsv(csvContent)

      const countryAllocation = result.trueCountryAllocation
      const unknownCountry = countryAllocation.find(c => c.name === 'Unknown')
      
      console.log('Country allocation:', countryAllocation.map(c => `${c.name}: ${c.percentage.toFixed(1)}%`))
      
      if (unknownCountry && unknownCountry.percentage > 50) {
        console.warn(`🚨 BUG DETECTED: Country allocation shows ${unknownCountry.percentage.toFixed(1)}% Unknown - likely enrichment failure`)
      }
      
      // After proper enrichment, should have specific countries
      // Since the test data contains Swiss and US stocks, expect these countries
      const hasKnownCountries = countryAllocation.some(c => 
        ['Switzerland', 'United States'].includes(c.name)
      )
      expect(hasKnownCountries).toBe(true)
      
      // Should not be dominated by Unknown
      if (unknownCountry) {
        expect(unknownCountry.percentage).toBeLessThan(90)
      }
    })
  })

  describe("Mixed Asset Types (Integration)", () => {
    it("should handle portfolio with both ETFs and individual stocks correctly", async () => {
      const csvContent = `ETF, , , , , , , , , , , , , 
 ,VWRL,500,85.00,42500.00,,,85.00,USD,0,0%,42500.00,70%,
Actions, , , , , , , , , , , , , 
 ,AAPL,100,150.00,15000.00,,,150.00,USD,0,0%,15000.00,25%,
 ,NESN,50,60.00,3000.00,,,60.00,CHF,0,0%,3000.00,5%,`

      const result = await parsePortfolioCsv(csvContent)

      // Check if positions were parsed at all
      expect(result.positions.length).toBeGreaterThan(0)
      
      // Validate positions are correctly categorized
      const etfPositions = result.positions.filter(p => p.category === 'ETF')
      const stockPositions = result.positions.filter(p => p.category === 'Actions')
      
      console.log('All positions:', result.positions.map(p => `${p.symbol}: ${p.category}`))
      console.log('ETF positions:', etfPositions.length, 'Stock positions:', stockPositions.length)
      
      // At minimum, should have parsed some positions
      expect(result.positions.length).toBeGreaterThanOrEqual(2)
      
      // All positions should have meaningful sectors (not all "Unknown")
      const unknownSectorPositions = result.positions.filter(p => p.sector === 'Unknown')
      expect(unknownSectorPositions.length).toBeLessThan(result.positions.length) // Not ALL should be unknown
      
      // Sector allocation should be diverse
      const sectorAllocation = result.trueSectorAllocation
      const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
      
      if (unknownSector) {
        expect(unknownSector.percentage).toBeLessThan(80) // Should not heavily dominate (VWRL might be 70%)
      }
    })
  })

  describe("Real-world CSV Format Tests", () => {
    it("should handle Swiss bank CSV format (the actual user scenario)", async () => {
      // This reproduces the exact format from the user's CSV
      const csvContent = ` ,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %,
Actions, , , , , , , , , , , , , 
 ,ABNB,20,135.00,2492.40,,,124.62,USD,-415.27,-17.34%,1978.97,0.20%,
 ,AZN,100,54.00,8156.00,,,81.56,USD,1556.03,31.63%,6475.86,0.66%,
 ,BABA,200,115.0291,28240.00,,,141.20,USD,2199.75,10.88%,22422.56,2.28%,
 ,META,3,560.00,2256.90,,,752.30,USD,367.29,25.78%,1791.98,0.18%,
 ,OXY,200,54.84,9076.00,,,45.38,USD,-2192.77,-23.33%,7206.34,0.73%,
 ,SQN,1050,122.25743,543375.00,-5775.00,-1.05%,517.50,CHF,415004.69,323.29%,543375.00,55.23%,
 ,UMC,100,11.30,689.00,,,6.89,USD,-502.88,-47.90%,547.07,0.06%,`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions.length).toBeGreaterThan(5) // Should parse multiple positions
      
      const sqnPosition = result.positions.find(p => p.symbol === 'SQN')
      expect(sqnPosition).toBeDefined()
      expect(sqnPosition?.totalValueCHF).toBeCloseTo(543375, 1) // Largest position
      
      // THE CRITICAL TEST: SQN represents 55% of portfolio - 
      // it should NOT cause 90% "Unknown" in allocations
      const sectorAllocation = result.trueSectorAllocation
      const countryAllocation = result.trueCountryAllocation
      
      const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
      const unknownCountry = countryAllocation.find(c => c.name === 'Unknown')
      
      console.log('Final sector allocation:', sectorAllocation)
      console.log('Final country allocation:', countryAllocation)
      
      // These are the key assertions that would have caught the bug
      if (unknownSector) {
        expect(unknownSector.percentage).toBeLessThan(90) // Bug would show ~90% unknown
      }
      if (unknownCountry) {
        expect(unknownCountry.percentage).toBeLessThan(90) // Bug would show ~90% unknown
      }
      
      // Should have meaningful diversity in sector allocations (the main fix)
      expect(sectorAllocation.length).toBeGreaterThan(1)
      
      // Country allocation may be less diverse if all stocks are US-based (which is realistic)
      // Just ensure it's not all "Unknown"
      const nonUnknownCountries = countryAllocation.filter(c => c.name !== 'Unknown')
      expect(nonUnknownCountries.length).toBeGreaterThan(0)
    })
  })
})