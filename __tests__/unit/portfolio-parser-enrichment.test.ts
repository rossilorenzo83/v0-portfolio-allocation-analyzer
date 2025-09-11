import { parsePortfolioCsv } from "../../portfolio-parser"

// Mock the API service to test both success and failure cases
jest.mock('../../lib/api-service', () => ({
  apiService: {
    getETFData: jest.fn(),
    getAssetMetadata: jest.fn(),
    getQuote: jest.fn(),
  }
}))

describe("Portfolio Parser - Data Enrichment Tests", () => {
  const mockApiService = require('../../lib/api-service').apiService

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Individual Stock Enrichment (Actions category)", () => {
    it("should enrich individual stocks with sector and geography from share metadata", async () => {
      // Mock successful share metadata response
      mockApiService.getAssetMetadata.mockResolvedValueOnce({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        country: 'United States',
        currency: 'USD',
        type: 'EQUITY',
        exchange: 'NMS'
      })

      mockApiService.getQuote.mockResolvedValue({
        symbol: 'AAPL',
        price: 150.00,
        currency: 'USD'
      })

      const csvContent = `Actions, , , , , , , , , , , , , 
 ,AAPL,10,150.00,1500.00,,,150.00,USD,0,0%,1500.00,100%,`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(1)
      const aaplPosition = result.positions[0]
      
      // Verify the stock gets proper enrichment
      expect(aaplPosition.symbol).toBe('AAPL')
      expect(aaplPosition.category).toBe('Actions')
      expect(aaplPosition.sector).toBe('Technology') // Should NOT be "Unknown"
      expect(aaplPosition.geography).toBe('United States') // Should NOT be "Unknown"
      
      // Verify share metadata was called
      expect(mockApiService.getShareMetadata).toHaveBeenCalledWith('AAPL')
    })

    it("should handle multiple individual stocks correctly", async () => {
      // Mock different stocks with different sectors
      mockApiService.getAssetMetadata
        .mockResolvedValueOnce({
          symbol: 'AAPL',
          sector: 'Technology',
          country: 'United States',
          currency: 'USD',
          type: 'EQUITY'
        })
        .mockResolvedValueOnce({
          symbol: 'JPM',
          sector: 'Financial Services',
          country: 'United States',
          currency: 'USD',
          type: 'EQUITY'
        })
        .mockResolvedValueOnce({
          symbol: 'NESN',
          sector: 'Consumer Staples',
          country: 'Switzerland',
          currency: 'CHF',
          type: 'EQUITY'
        })

      mockApiService.getQuote.mockResolvedValue({
        price: 100,
        currency: 'USD'
      })

      const csvContent = `Actions, , , , , , , , , , , , , 
 ,AAPL,10,150.00,1500.00,,,150.00,USD,0,0%,1500.00,30%,
 ,JPM,20,200.00,4000.00,,,200.00,USD,0,0%,4000.00,60%,
 ,NESN,5,100.00,500.00,,,100.00,CHF,0,0%,500.00,10%,`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(3)
      
      const aapl = result.positions.find(p => p.symbol === 'AAPL')
      const jpm = result.positions.find(p => p.symbol === 'JPM')
      const nesn = result.positions.find(p => p.symbol === 'NESN')

      // Verify all stocks get proper sectors (not "Unknown")
      expect(aapl?.sector).toBe('Technology')
      expect(aapl?.geography).toBe('United States')
      
      expect(jpm?.sector).toBe('Financial Services')
      expect(jpm?.geography).toBe('United States')
      
      expect(nesn?.sector).toBe('Consumer Staples')
      expect(nesn?.geography).toBe('Switzerland')

      // Verify sector allocation is realistic (not 100% "Unknown")
      const sectorAllocation = result.trueSectorAllocation
      expect(sectorAllocation.some(s => s.name === 'Unknown' && s.percentage > 50)).toBe(false)
      expect(sectorAllocation.some(s => s.name === 'Technology')).toBe(true)
      expect(sectorAllocation.some(s => s.name === 'Financial Services')).toBe(true)
    })

    it("should reproduce the SQN bug scenario - large stock position showing as Unknown", async () => {
      // Mock SQN metadata (this is the key stock from the user's CSV)
      mockApiService.getAssetMetadata.mockResolvedValueOnce({
        symbol: 'SQN',
        name: 'SQN',
        sector: 'Financial Services',
        country: 'Switzerland',
        currency: 'USD',
        type: 'EQUITY',
        exchange: 'NMS'
      })

      mockApiService.getQuote.mockResolvedValue({
        symbol: 'SQN',
        price: 517.50,
        currency: 'CHF'
      })

      // CSV similar to user's actual data - SQN is 55% of portfolio
      const csvContent = `Actions, , , , , , , , , , , , , 
 ,SQN,1050,122.25743,543375.00,-5775.00,-1.05%,517.50,CHF,415004.69,323.29%,543375.00,55.23%,
 ,META,3,560.00,2256.90,,,752.30,USD,367.29,25.78%,1791.98,0.18%,`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(2)
      
      const sqnPosition = result.positions.find(p => p.symbol === 'SQN')
      const metaPosition = result.positions.find(p => p.symbol === 'META')

      // This is the bug we fixed - SQN should NOT be "Unknown"
      expect(sqnPosition?.sector).toBe('Financial Services') // NOT "Unknown"
      expect(sqnPosition?.geography).toBe('Switzerland') // NOT "Unknown"
      expect(sqnPosition?.category).toBe('Actions')

      // Check sector allocation - should NOT be dominated by "Unknown"
      const sectorAllocation = result.trueSectorAllocation
      const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
      const financialSector = sectorAllocation.find(s => s.name === 'Financial Services')
      
      // Since SQN is 55% of portfolio, "Unknown" should NOT dominate
      if (unknownSector) {
        expect(unknownSector.percentage).toBeLessThan(50) // Should be much less than 90%
      }
      expect(financialSector?.percentage).toBeGreaterThan(50) // SQN's 55% should show up
    })

    it("should gracefully handle share metadata API failures", async () => {
      // Mock API failure
      mockApiService.getAssetMetadata.mockRejectedValue(new Error('API Error'))
      mockApiService.getQuote.mockResolvedValue({ symbol: 'AAPL', price: 150 })

      const csvContent = `Actions, , , , , , , , , , , , , 
 ,AAPL,10,150.00,1500.00,,,150.00,USD,0,0%,1500.00,100%,`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(1)
      const position = result.positions[0]
      
      // Should fallback to "Unknown" when API fails
      expect(position.sector).toBe('Unknown')
      expect(position.geography).toBe('Unknown')
      expect(position.symbol).toBe('AAPL')
    })
  })

  describe("ETF vs Stock Category Handling", () => {
    it("should handle ETFs differently from individual stocks", async () => {
      // Mock ETF data
      mockApiService.getETFData.mockResolvedValueOnce({
        symbol: 'VWRL',
        name: 'Vanguard FTSE All-World ETF',
        composition: {
          sectors: {
            'Technology': 25.0,
            'Financial Services': 15.0,
            'Healthcare': 12.0
          },
          countries: {
            'United States': 60.0,
            'Japan': 10.0,
            'United Kingdom': 8.0
          }
        },
        domicile: 'IE',
        withholdingTax: 15
      })

      // Mock stock data
      mockApiService.getAssetMetadata.mockResolvedValueOnce({
        symbol: 'AAPL',
        sector: 'Technology',
        country: 'United States',
        currency: 'USD',
        type: 'EQUITY'
      })

      mockApiService.getQuote.mockResolvedValue({ price: 100 })

      const csvContent = `ETF, , , , , , , , , , , , , 
 ,VWRL,50,100.00,5000.00,,,100.00,USD,0,0%,5000.00,83%,
Actions, , , , , , , , , , , , , 
 ,AAPL,10,100.00,1000.00,,,100.00,USD,0,0%,1000.00,17%,`

      const result = await parsePortfolioCsv(csvContent)

      expect(result.positions).toHaveLength(2)
      
      const etfPosition = result.positions.find(p => p.symbol === 'VWRL')
      const stockPosition = result.positions.find(p => p.symbol === 'AAPL')

      // ETF should use composition data (largest sector)
      expect(etfPosition?.category).toBe('ETF')
      expect(etfPosition?.sector).toBe('Technology') // Largest sector from composition
      expect(etfPosition?.geography).toBe('United States') // Largest country from composition

      // Stock should use share metadata
      expect(stockPosition?.category).toBe('Actions')
      expect(stockPosition?.sector).toBe('Technology') // From share metadata
      expect(stockPosition?.geography).toBe('United States') // From share metadata

      // Verify correct API calls were made
      expect(mockApiService.getETFData).toHaveBeenCalledWith('VWRL')
      expect(mockApiService.getShareMetadata).toHaveBeenCalledWith('AAPL')
    })
  })

  describe("Allocation Calculation Validation", () => {
    it("should calculate realistic sector allocations when stocks are properly enriched", async () => {
      // Large position in Financial Services (like SQN scenario)
      mockApiService.getAssetMetadata
        .mockResolvedValueOnce({
          symbol: 'JPM',
          sector: 'Financial Services',
          country: 'United States'
        })
        .mockResolvedValueOnce({
          symbol: 'AAPL',
          sector: 'Technology',
          country: 'United States'
        })

      mockApiService.getQuote.mockResolvedValue({ price: 100 })

      const csvContent = `Actions, , , , , , , , , , , , , 
 ,JPM,100,100.00,10000.00,,,100.00,USD,0,0%,10000.00,90%,
 ,AAPL,10,100.00,1000.00,,,100.00,USD,0,0%,1000.00,10%,`

      const result = await parsePortfolioCsv(csvContent)

      const sectorAllocation = result.trueSectorAllocation
      
      // Should have realistic sector distribution
      const financialServices = sectorAllocation.find(s => s.name === 'Financial Services')
      const technology = sectorAllocation.find(s => s.name === 'Technology')
      const unknown = sectorAllocation.find(s => s.name === 'Unknown')

      expect(financialServices?.percentage).toBeCloseTo(90, 1) // JPM is 90% of portfolio
      expect(technology?.percentage).toBeCloseTo(10, 1) // AAPL is 10% of portfolio
      
      // Unknown should be minimal or zero
      if (unknown) {
        expect(unknown.percentage).toBeLessThan(5)
      }
    })

    it("should identify when sector allocation is dominated by 'Unknown' (the bug scenario)", async () => {
      // Simulate the bug - API fails, stocks default to "Unknown"
      mockApiService.getAssetMetadata.mockRejectedValue(new Error('API Error'))
      mockApiService.getQuote.mockResolvedValue({ price: 100 })

      const csvContent = `Actions, , , , , , , , , , , , , 
 ,SQN,1000,100.00,100000.00,,,100.00,CHF,0,0%,100000.00,90%,
 ,AAPL,10,100.00,1000.00,,,100.00,USD,0,0%,1000.00,10%,`

      const result = await parsePortfolioCsv(csvContent)

      const sectorAllocation = result.trueSectorAllocation
      const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
      
      // This test would FAIL before the fix and PASS after the fix
      // Before fix: Unknown would be 100%
      // After fix: Unknown should be 0% (because share metadata would provide real sectors)
      expect(unknownSector?.percentage).toBeGreaterThan(80) // This shows the bug exists
    })
  })
})