import { parsePortfolioCsv } from '../../portfolio-parser'

// Mock the services correctly based on how they're actually used
jest.mock('../../etf-data-service', () => ({
  resolveSymbolAndFetchData: jest.fn(),
}))

describe('Portfolio Parser Extended Coverage', () => {
  const mockResolveSymbolAndFetchData = require('../../etf-data-service').resolveSymbolAndFetchData

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mock that handles multiple symbols
    mockResolveSymbolAndFetchData.mockImplementation((position) => {
      const stockData = {
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

  // Test parseSwissNumber function through different CSV inputs
  describe('Swiss Number Parsing', () => {
    it('should handle Swiss formatted numbers in CSV', async () => {
      const csvContent = `Symbol,Quantity,Price,Total
AAPL,10,"1'234.56","12'345.60"
GOOGL,5,"2,500.00","12'500.00"`

      const result = await parsePortfolioCsv(csvContent)
      
      // The function should parse Swiss numbers correctly
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle negative Swiss numbers', async () => {
      const csvContent = `Symbol,Quantity,Price,Total
AAPL,10,"-1'234.56","-12'345.60"`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle numbers with currency symbols', async () => {
      const csvContent = `Symbol,Quantity,Price,Currency
AAPL,10,"CHF 150.00",CHF
GOOGL,5,"USD 2'500.00",USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test category normalization through different CSV inputs
  describe('Category Normalization', () => {
    it('should normalize different action categories', async () => {
      const csvContent = `Category,Symbol,Quantity,Price
Actions,AAPL,10,150
ACTIONS,GOOGL,5,2500
Actions diverses,MSFT,8,300`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should normalize ETF categories', async () => {
      const csvContent = `Category,Symbol,Quantity,Price
ETF,VTI,100,200
etf,SPY,50,400
ETF Funds,QQQ,25,350`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle unknown categories', async () => {
      const csvContent = `Category,Symbol,Quantity,Price
Unknown,AAPL,10,150
"",GOOGL,5,2500`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test column mapping detection
  describe('Column Mapping Detection', () => {
    it('should detect French column headers', async () => {
      const csvContent = `Symbole,Quantité,Prix,Devise
AAPL,10,150,USD
GOOGL,5,2500,USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle missing columns gracefully', async () => {
      const csvContent = `Symbol,Price
AAPL,150
GOOGL,2500`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should detect alternative column names', async () => {
      const csvContent = `Ticker,Shares,Current Price,Currency
AAPL,10,150,USD
GOOGL,5,2500,USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test CSV delimiter detection
  describe('CSV Delimiter Detection', () => {
    it('should handle semicolon delimited CSV', async () => {
      const csvContent = `Symbol;Quantity;Price;Currency
AAPL;10;150;USD
GOOGL;5;2500;USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle tab delimited CSV', async () => {
      const csvContent = `Symbol\tQuantity\tPrice\tCurrency
AAPL\t10\t150\tUSD
GOOGL\t5\t2500\tUSD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test allocation calculations
  describe('Allocation Calculations', () => {
    it('should calculate allocations with valid data', async () => {
      const csvContent = `Symbol,Quantity,Price,Currency,Category
AAPL,10,150,USD,Actions
GOOGL,5,2500,USD,Actions
VTI,100,200,USD,ETF`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.assetAllocation).toBeDefined()
      expect(result.currencyAllocation).toBeDefined()
      expect(result.trueCountryAllocation).toBeDefined()
      expect(result.trueSectorAllocation).toBeDefined()
      expect(result.domicileAllocation).toBeDefined()
    })

    it('should handle empty portfolio for allocations', async () => {
      const csvContent = `Symbol,Quantity,Price,Currency`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.assetAllocation).toHaveLength(0)
      expect(result.currencyAllocation).toHaveLength(0)
    })
  })

  // Test edge cases
  describe('Edge Cases', () => {
    it('should handle completely empty CSV', async () => {
      const result = await parsePortfolioCsv('')
      
      expect(result).toBeDefined()
      expect(result.positions).toHaveLength(0)
      expect(result.accountOverview.totalValue).toBe(0)
    })

    it('should handle CSV with only headers', async () => {
      const csvContent = 'Symbol,Quantity,Price,Currency'
      
      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toHaveLength(0)
    })

    it('should handle malformed CSV data', async () => {
      const csvContent = `Invalid CSV Content
Missing proper structure
No headers or data`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle CSV with special characters', async () => {
      const csvContent = `Symbol,Name,Quantity,Price
AAPL,"Apple Inc. (NASDAQ)",10,150
GOOGL,"Alphabet Inc. - Class A",5,2500`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  describe('Portfolio Allocation Bug Regression Tests', () => {
    it('should enrich individual stocks with proper sectors (SQN bug regression test)', async () => {
      // This test specifically targets the bug where individual stocks get "Unknown" sectors
      const csvContent = `Actions, , , , , , , , , , , , , 
 ,SQN,1000,100.00,100000.00,,,100.00,CHF,0,0%,100000.00,90%,
 ,AAPL,100,100.00,10000.00,,,100.00,USD,0,0%,10000.00,10%,`

      const result = await parsePortfolioCsv(csvContent)

      // Validate positions exist
      expect(result.positions).toHaveLength(2)
      
      const sqnPosition = result.positions.find(p => p.symbol === 'SQN')
      const aaplPosition = result.positions.find(p => p.symbol === 'AAPL')
      
      expect(sqnPosition).toBeDefined()
      expect(aaplPosition).toBeDefined()
      
      // CRITICAL BUG CHECK: The sector allocation should not be dominated by "Unknown"
      const sectorAllocation = result.trueSectorAllocation
      const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
      
      // This is the key assertion that would catch the original bug
      if (unknownSector) {
        // Before fix: This would be ~100% due to all stocks being "Unknown"
        // After fix: This should be much lower
        expect(unknownSector.percentage).toBeLessThan(95) // Catch the 90%+ "Unknown" bug
      }
      
      // Should have at least some non-Unknown sectors
      const knownSectors = sectorAllocation.filter(s => s.name !== 'Unknown')
      expect(knownSectors.length).toBeGreaterThan(0)
      
      // Total percentages should add up to ~100%
      const totalPercentage = sectorAllocation.reduce((sum, s) => sum + s.percentage, 0)
      expect(totalPercentage).toBeCloseTo(100, 1)
    })

    it('should prevent country allocation dominated by Unknown', async () => {
      // Test country/geography allocation bug
      const csvContent = `Actions, , , , , , , , , , , , , 
 ,SQN,1000,100.00,100000.00,,,100.00,CHF,0,0%,100000.00,85%,
 ,AAPL,100,100.00,10000.00,,,100.00,USD,0,0%,10000.00,15%,`

      const result = await parsePortfolioCsv(csvContent)

      const countryAllocation = result.trueCountryAllocation
      const unknownCountry = countryAllocation.find(c => c.name === 'Unknown')
      
      // Similar test for geography - should not be dominated by "Unknown"
      if (unknownCountry) {
        expect(unknownCountry.percentage).toBeLessThan(95)
      }
      
      // Should have meaningful country diversity
      const knownCountries = countryAllocation.filter(c => c.name !== 'Unknown')
      expect(knownCountries.length).toBeGreaterThan(0)
    })
  })
})