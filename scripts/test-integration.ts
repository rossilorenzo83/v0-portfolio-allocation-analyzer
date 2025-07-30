import { parsePortfolioCsv } from "../portfolio-parser"
import { resolveSymbolAndFetchData } from "../etf-data-service"
import { calculatePortfolioAnalysis } from "../swiss-portfolio-analyzer" // Assuming this function exists
import { samplePositions } from "../__tests__/test-data" // Using mock data for consistency

async function runIntegrationTests() {
  console.log("--- Running Integration Tests ---")

  // Test 1: CSV Parsing and Data Fetching Integration
  console.log("\nTest 1: CSV Parsing and Data Fetching Integration")
  const csvContent = `Symbol,Quantity,Average Price,Currency,Exchange,Name
VUSA.L,10,70.00,USD,LSE,Vanguard S&P 500 UCITS ETF
SMH,5,250.00,USD,NASDAQ,VanEck Semiconductor ETF
CERN.SW,20,50.00,CHF,SIX,CERN Holdings`

  try {
    const portfolio = parsePortfolioCsv(csvContent)
    console.log("Parsed Portfolio:", portfolio.positions.length, "positions")

    const detailedPositions = []
    for (const pos of portfolio.positions) {
      const { etfData, quoteData } = await resolveSymbolAndFetchData(pos)
      detailedPositions.push({
        ...pos,
        currentPrice: quoteData?.price || pos.averagePrice,
        etfData: etfData,
      })
    }

    console.log("Fetched Detailed Positions:", detailedPositions.length)
    console.assert(detailedPositions.length === 3, "Expected 3 detailed positions")
    console.assert(detailedPositions[0].etfData?.domicile === "IE", "VUSA.L domicile should be IE")
    console.assert(detailedPositions[1].etfData?.domicile === "US", "SMH domicile should be US")
    console.assert(detailedPositions[2].etfData?.domicile === "CH", "CERN.SW domicile should be CH")
    console.assert(detailedPositions[0].currentPrice > 0, "VUSA.L current price should be positive")

    console.log("Test 1 Passed: CSV Parsing and Data Fetching successful.")
  } catch (error: any) {
    console.error("Test 1 Failed:", error.message)
  }

  // Test 2: Full Portfolio Analysis (using mock data for consistency)
  console.log("\nTest 2: Full Portfolio Analysis")
  try {
    const analysisResult = await calculatePortfolioAnalysis(samplePositions)

    console.log("Portfolio Analysis Result:")
    console.log("Total Value:", analysisResult.totalValue)
    console.log("Total Cost:", analysisResult.totalCost)
    console.log("Total Gain/Loss:", analysisResult.totalGainLoss)
    console.log("Sector Allocation:", analysisResult.sectorAllocation)
    console.log("Country Allocation:", analysisResult.countryAllocation)
    console.log("Currency Allocation:", analysisResult.currencyAllocation)
    console.log("Tax Impact:", analysisResult.taxImpact)
    console.log("Tax Efficiency Message:", analysisResult.taxEfficiencyMessage)

    console.assert(analysisResult.totalValue > 0, "Total value should be positive")
    console.assert(Object.keys(analysisResult.sectorAllocation).length > 0, "Sector allocation should not be empty")
    console.assert(Object.keys(analysisResult.countryAllocation).length > 0, "Country allocation should not be empty")
    console.assert(Object.keys(analysisResult.currencyAllocation).length > 0, "Currency allocation should not be empty")
    console.assert(analysisResult.taxImpact !== undefined, "Tax impact should be calculated")
    console.assert(
      analysisResult.taxEfficiencyMessage.includes("US-domiciled ETFs"),
      "Tax efficiency message should mention US-domiciled ETFs",
    )

    console.log("Test 2 Passed: Full Portfolio Analysis successful.")
  } catch (error: any) {
    console.error("Test 2 Failed:", error.message)
  }

  console.log("\n--- Integration Tests Complete ---")
}

runIntegrationTests()
