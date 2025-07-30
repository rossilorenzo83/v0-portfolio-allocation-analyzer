// This script is intended to test the overall functionality of the SwissPortfolioAnalyzer component
// by simulating user interactions or directly calling its internal logic if exposed.
// For a full UI component test, you would typically use a testing library like React Testing Library
// and a browser environment (e.g., Jest with JSDOM or Cypress/Playwright for E2E).

// This script will focus on testing the core logic that the component relies on.

import { parsePortfolioCsv } from "../portfolio-parser"
import { resolveSymbolAndFetchData } from "../etf-data-service"
import { calculatePortfolioAnalysis } from "../swiss-portfolio-analyzer" // Assuming this function is exported for testing
import { samplePositions } from "../__tests__/test-data" // Using mock data for consistency

async function runPortfolioAnalyzerLogicTests() {
  console.log("--- Running Portfolio Analyzer Logic Tests ---")

  // Test 1: Simulate CSV upload and parsing
  console.log("\nTest 1: Simulate CSV parsing with sample data")
  const sampleCsvContent = `Symbol,Quantity,Average Price,Currency,Exchange,Name
AAPL,10,150.00,USD,NASDAQ,Apple Inc.
VUSA.L,5,70.00,USD,LSE,Vanguard S&P 500 UCITS ETF
NESN.SW,2,100.00,CHF,SIX,Nestle S.A.`

  try {
    const parsedPositions = parsePortfolioCsv(sampleCsvContent)
    console.log("Parsed positions count:", parsedPositions.positions.length)
    console.assert(parsedPositions.positions.length === 3, "Expected 3 positions from CSV")
    console.assert(parsedPositions.positions[0].symbol === "AAPL", "First symbol should be AAPL")
    console.log("Test 1 Passed: CSV parsing successful.")
  } catch (error: any) {
    console.error("Test 1 Failed: CSV parsing error -", error.message)
  }

  // Test 2: Simulate data fetching and enrichment for parsed positions
  console.log("\nTest 2: Simulate data fetching and enrichment")
  const positionsToEnrich = [
    { symbol: "VUSA.L", quantity: 10, averagePrice: 70.0, currency: "USD" },
    { symbol: "SMH", quantity: 5, averagePrice: 250.0, currency: "USD" },
  ]

  try {
    const enrichedPositions = []
    for (const pos of positionsToEnrich) {
      const { etfData, quoteData } = await resolveSymbolAndFetchData(pos)
      enrichedPositions.push({
        ...pos,
        currentPrice: quoteData?.price || pos.averagePrice,
        etfData: etfData,
      })
    }
    console.log("Enriched positions count:", enrichedPositions.length)
    console.assert(enrichedPositions.length === 2, "Expected 2 enriched positions")
    console.assert(enrichedPositions[0].etfData?.domicile === "IE", "VUSA.L domicile should be IE")
    console.assert(enrichedPositions[1].etfData?.domicile === "US", "SMH domicile should be US")
    console.log("Test 2 Passed: Data fetching and enrichment successful.")
  } catch (error: any) {
    console.error("Test 2 Failed: Data fetching error -", error.message)
  }

  // Test 3: Simulate full analysis calculation with mock data
  console.log("\nTest 3: Simulate full portfolio analysis calculation")
  try {
    const analysisResult = await calculatePortfolioAnalysis(samplePositions)
    console.log("Analysis Result - Total Value:", analysisResult.totalValue.toFixed(2))
    console.log("Analysis Result - Sector Allocation:", analysisResult.sectorAllocation)
    console.log("Analysis Result - Tax Impact:", analysisResult.taxImpact.toFixed(2))
    console.log("Analysis Result - Tax Efficiency Message:", analysisResult.taxEfficiencyMessage)

    console.assert(analysisResult.totalValue > 0, "Total value should be positive")
    console.assert(Object.keys(analysisResult.sectorAllocation).length > 0, "Sector allocation should not be empty")
    console.assert(analysisResult.taxImpact !== undefined, "Tax impact should be calculated")
    console.assert(
      analysisResult.taxEfficiencyMessage.includes("US-domiciled ETFs"),
      "Tax efficiency message should mention US-domiciled ETFs",
    )
    console.log("Test 3 Passed: Portfolio analysis calculation successful.")
  } catch (error: any) {
    console.error("Test 3 Failed: Analysis calculation error -", error.message)
  }

  console.log("\n--- Portfolio Analyzer Logic Tests Complete ---")
}

runPortfolioAnalyzerLogicTests()
