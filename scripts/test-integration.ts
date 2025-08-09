// scripts/test-integration.ts
// This script tests the full integration of parsing and data enrichment.
// Run with: ts-node scripts/test-integration.ts

import { parsePortfolioCsv } from "../portfolio-parser"
import * as fs from "fs"
import * as path from "path"

async function testIntegration() {
  console.log("--- Testing Full Integration (CSV Parsing + Data Enrichment) ---")

  const testCsvPath = path.join(__dirname, "..", "__tests__", "test-data", "sample-portfolio.csv")

  try {
    const csvContent = fs.readFileSync(testCsvPath, "utf8")
    console.log(`Successfully read CSV from: ${testCsvPath}`)
    console.log("CSV Content Preview (first 200 chars):\n", csvContent.substring(0, 200))

    console.log("\nStarting portfolio parsing and enrichment...")
    const portfolioData = await parsePortfolioCsv(csvContent)

    console.log("\n--- Enriched Portfolio Data ---")
    console.log("Account Overview:", portfolioData.accountOverview)
    console.log("Number of Positions:", portfolioData.positions.length)
    console.log("Sample Enriched Position (first):", portfolioData.positions[0])
    console.log("Asset Allocation:", portfolioData.assetAllocation)
    console.log("Currency Allocation:", portfolioData.currencyAllocation)
    console.log("True Country Allocation:", portfolioData.trueCountryAllocation)
    console.log("True Sector Allocation:", portfolioData.trueSectorAllocation)
    console.log("Domicile Allocation:", portfolioData.domicileAllocation)

    // Basic assertions
    if (portfolioData.positions.length > 0) {
      console.log("First position symbol:", portfolioData.positions[0].symbol)
      console.log("First position current price:", portfolioData.positions[0].currentPrice)
      console.log("First position sector (should be enriched):", portfolioData.positions[0].sector)
    } else {
      console.warn("No positions found in the parsed data.")
    }

    console.log("\n--- Full Integration Test Complete ---")
  } catch (error) {
    console.error("Error during full integration test:", error)
  }
}

testIntegration()
