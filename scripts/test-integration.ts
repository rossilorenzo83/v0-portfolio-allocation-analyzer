// scripts/test-integration.ts
// This script runs an end-to-end integration test for the portfolio analyzer.
// It simulates a file upload and verifies the output.
// Run with: ts-node scripts/test-integration.ts

import { parseSwissPortfolioPDF } from "../portfolio-parser"
import * as fs from "fs"
import * as path from "path"

// Dummy File class for Node.js environment
class DummyFile extends Blob {
  name: string
  lastModified: number

  constructor(chunks: BlobPart[], name: string, options?: BlobPropertyBag) {
    super(chunks, options)
    this.name = name
    this.lastModified = Date.now()
  }
}

async function runIntegrationTest() {
  console.log("--- Running Integration Test ---")

  const testCsvPath = path.join(__dirname, "..", "__tests__", "test-data", "swissquote-sample.csv")

  try {
    console.log(`\nLoading test CSV from: ${testCsvPath}`)
    const csvContent = fs.readFileSync(testCsvPath, "utf-8")
    const csvFile = new DummyFile([csvContent], "swissquote-sample.csv", { type: "text/csv" })

    console.log("Parsing portfolio from CSV...")
    const portfolioData = await parseSwissPortfolioPDF(csvFile)

    console.log("\n--- Integration Test Results ---")
    console.log("Account Overview:", portfolioData.accountOverview)
    console.log("Number of Positions:", portfolioData.positions.length)
    console.log("Asset Allocation:", portfolioData.assetAllocation)
    console.log("Currency Allocation:", portfolioData.currencyAllocation)
    console.log("True Country Allocation:", portfolioData.trueCountryAllocation)
    console.log("True Sector Allocation:", portfolioData.trueSectorAllocation)
    console.log("Domicile Allocation:", portfolioData.domicileAllocation)

    // Basic assertions
    if (portfolioData.positions.length > 0) {
      console.log("✅ Positions parsed successfully.")
    } else {
      console.error("❌ No positions found.")
      process.exit(1)
    }

    if (portfolioData.accountOverview.totalValue > 0) {
      console.log("✅ Total portfolio value detected.")
    } else {
      console.error("❌ Total portfolio value not detected or is zero.")
      process.exit(1)
    }

    console.log("\n--- Integration Test Passed! ---")
  } catch (error) {
    console.error("❌ Integration Test Failed:", error)
    process.exit(1)
  }
}

runIntegrationTest()
