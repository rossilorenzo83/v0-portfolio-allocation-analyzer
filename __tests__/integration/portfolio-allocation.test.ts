/**
 * Bug Detection Tests - These tests would have caught the SQN sector allocation bug
 * 
 * This test suite validates that the portfolio parser correctly enriches individual stocks
 * with proper sector and geography data, preventing unrealistic "90%+ Unknown" pie charts.
 */

import { parsePortfolioCsv } from "../../portfolio-parser"

// Mock with realistic share metadata to demonstrate the fix
jest.mock('../../lib/api-service', () => ({
  apiService: {
    getETFData: jest.fn(),
    getAssetMetadata: jest.fn(),
    getQuote: jest.fn(),
  }
}))

describe("Bug Detection: SQN Sector Allocation Issue", () => {
  const mockApiService = require('../../lib/api-service').apiService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful share metadata responses (simulating working API)
    mockApiService.getAssetMetadata.mockImplementation((symbol) => {
      const stockData = {
        'SQN': { symbol: 'SQN', sector: 'Financial Services', country: 'Switzerland', currency: 'CHF', type: 'EQUITY' },
        'AAPL': { symbol: 'AAPL', sector: 'Technology', country: 'United States', currency: 'USD', type: 'EQUITY' },
        'META': { symbol: 'META', sector: 'Communication Services', country: 'United States', currency: 'USD', type: 'EQUITY' },
        'ABNB': { symbol: 'ABNB', sector: 'Consumer Discretionary', country: 'United States', currency: 'USD', type: 'EQUITY' },
        'AZN': { symbol: 'AZN', sector: 'Healthcare', country: 'United Kingdom', currency: 'USD', type: 'EQUITY' },
        'BABA': { symbol: 'BABA', sector: 'Consumer Discretionary', country: 'China', currency: 'USD', type: 'EQUITY' },
        'OXY': { symbol: 'OXY', sector: 'Energy', country: 'United States', currency: 'USD', type: 'EQUITY' },
        'UMC': { symbol: 'UMC', sector: 'Technology', country: 'Taiwan', currency: 'USD', type: 'EQUITY' },
      }
      return Promise.resolve(stockData[symbol] || { symbol, sector: 'Unknown', country: 'Unknown', currency: 'USD', type: 'EQUITY' })
    })

    mockApiService.getQuote.mockResolvedValue({
      price: 100,
      currency: 'USD',
      change: 0,
      changePercent: 0,
      lastUpdated: new Date().toISOString()
    })
  })

  it("REGRESSION TEST: Should prevent 90%+ Unknown sector allocation (the SQN bug)", async () => {
    // Reproduce the user's exact CSV data that caused 90% "Unknown" in pie charts
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

    // Validate parsing worked
    expect(result.positions.length).toBeGreaterThan(5)
    
    const sqnPosition = result.positions.find(p => p.symbol === 'SQN')
    expect(sqnPosition).toBeDefined()
    expect(sqnPosition?.totalValueCHF).toBeGreaterThan(500000) // SQN is the largest position

    // THE CRITICAL TEST: Sector allocation should NOT be dominated by "Unknown"
    const sectorAllocation = result.trueSectorAllocation
    const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
    
    console.log('🔍 Sector Allocation Analysis:')
    sectorAllocation.forEach(sector => {
      console.log(`  ${sector.name}: ${sector.percentage.toFixed(1)}%`)
    })
    
    // This is the key bug detection:
    // Before fix: unknownSector.percentage would be ~90% due to SQN being 55% "Unknown"
    // After fix: unknownSector.percentage should be much lower or 0%
    if (unknownSector) {
      expect(unknownSector.percentage).toBeLessThan(10) // Should not dominate pie chart
      console.log(`✅ Unknown sector is only ${unknownSector.percentage.toFixed(1)}% (good!)`)
    } else {
      console.log('✅ No Unknown sector found (perfect!)')
    }
    
    // Should have diverse, realistic sectors
    const financialServicesPercentage = sectorAllocation.find(s => s.name === 'Financial Services')?.percentage || 0
    expect(financialServicesPercentage).toBeGreaterThan(50) // SQN is 55% of portfolio
    
    const knownSectors = sectorAllocation.filter(s => s.name !== 'Unknown')
    expect(knownSectors.length).toBeGreaterThan(3) // Should have multiple sectors
    
    // Verify individual stock enrichment worked
    expect(sqnPosition?.sector).toBe('Financial Services') // NOT "Unknown"
    expect(sqnPosition?.geography).toBe('Switzerland') // NOT "Unknown"
  })

  it("REGRESSION TEST: Should prevent 90%+ Unknown country allocation", async () => {
    const csvContent = ` ,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %,
Actions, , , , , , , , , , , , , 
 ,SQN,1000,517.50,517500.00,,,517.50,CHF,0,0%,517500.00,70%,
 ,AAPL,100,150.00,15000.00,,,150.00,USD,0,0%,15000.00,20%,
 ,AZN,50,160.00,8000.00,,,160.00,USD,0,0%,8000.00,10%,`

    const result = await parsePortfolioCsv(csvContent)

    const countryAllocation = result.trueCountryAllocation
    const unknownCountry = countryAllocation.find(c => c.name === 'Unknown')
    
    console.log('🌍 Country Allocation Analysis:')
    countryAllocation.forEach(country => {
      console.log(`  ${country.name}: ${country.percentage.toFixed(1)}%`)
    })
    
    // Similar test for geography
    if (unknownCountry) {
      expect(unknownCountry.percentage).toBeLessThan(10)
      console.log(`✅ Unknown country is only ${unknownCountry.percentage.toFixed(1)}% (good!)`)
    } else {
      console.log('✅ No Unknown country found (perfect!)')
    }
    
    // Should have realistic country distribution
    const switzerlandPercentage = countryAllocation.find(c => c.name === 'Switzerland')?.percentage || 0
    expect(switzerlandPercentage).toBeGreaterThan(65) // SQN is ~70% of portfolio
    
    const knownCountries = countryAllocation.filter(c => c.name !== 'Unknown')
    expect(knownCountries.length).toBeGreaterThan(2) // Should have multiple countries
  })

  it("DEMO: What the bug looked like with API failures", async () => {
    // Simulate the bug by making share metadata fail (returning "Unknown")
    mockApiService.getAssetMetadata.mockRejectedValue(new Error('Share metadata API failed'))
    
    const csvContent = ` ,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %,
Actions, , , , , , , , , , , , , 
 ,SQN,1000,517.50,517500.00,,,517.50,CHF,0,0%,517500.00,90%,
 ,AAPL,100,100.00,10000.00,,,100.00,USD,0,0%,10000.00,10%,`

    const result = await parsePortfolioCsv(csvContent)

    const sectorAllocation = result.trueSectorAllocation
    const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
    
    console.log('🚨 BUG SIMULATION - Sector allocation with API failures:')
    sectorAllocation.forEach(sector => {
      console.log(`  ${sector.name}: ${sector.percentage.toFixed(1)}%`)
    })
    
    // This shows what the bug looked like
    if (unknownSector) {
      console.log(`🚨 Unknown sector dominates: ${unknownSector.percentage.toFixed(1)}% (this was the bug!)`)
      expect(unknownSector.percentage).toBeGreaterThan(80) // This demonstrates the bug
    }
    
    // This test PASSES when demonstrating the bug exists
    // The actual fix prevents this from happening in production
  })

  it("Should handle mixed asset types correctly", async () => {
    // Test with both ETFs and stocks to ensure different enrichment paths work
    mockApiService.getETFData.mockResolvedValueOnce({
      symbol: 'VTI',
      composition: {
        sectors: { 'Technology': 30.0, 'Financial Services': 20.0, 'Healthcare': 15.0 },
        countries: { 'United States': 100.0 }
      },
      domicile: 'US'
    })
    
    const csvContent = `ETF, , , , , , , , , , , , , 
 ,VTI,500,200.00,100000.00,,,200.00,USD,0,0%,100000.00,50%,
Actions, , , , , , , , , , , , , 
 ,SQN,1000,100.00,100000.00,,,100.00,CHF,0,0%,100000.00,50%,`

    const result = await parsePortfolioCsv(csvContent)

    expect(result.positions).toHaveLength(2)
    
    const etfPosition = result.positions.find(p => p.symbol === 'VTI')
    const stockPosition = result.positions.find(p => p.symbol === 'SQN')
    
    // ETF should use composition data enrichment
    expect(etfPosition?.category).toBe('ETF')
    expect(etfPosition?.sector).not.toBe('Unknown')
    
    // Stock should use share metadata enrichment  
    expect(stockPosition?.category).toBe('Actions')
    expect(stockPosition?.sector).toBe('Financial Services') // From mocked share metadata
    expect(stockPosition?.geography).toBe('Switzerland') // From mocked share metadata
    
    // Overall allocation should be realistic
    const sectorAllocation = result.trueSectorAllocation
    const unknownSector = sectorAllocation.find(s => s.name === 'Unknown')
    
    if (unknownSector) {
      expect(unknownSector.percentage).toBeLessThan(5) // Should be minimal
    }
  })
})