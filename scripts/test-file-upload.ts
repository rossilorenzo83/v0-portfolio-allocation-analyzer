import { parsePortfolioCsv } from "../portfolio-parser"
import * as fs from "fs"
import * as path from "path"

async function testFileUpload() {
  console.log("--- Testing File Upload (CSV Parsing) ---")

  const testCsvPath = path.join(__dirname, "..", "__tests__", "test-data", "sample-portfolio.csv")

  try {
    const csvContent = fs.readFileSync(testCsvPath, "utf8")
    console.log(`Successfully read CSV from: ${testCsvPath}`)
    console.log("CSV Content Preview (first 200 chars):\n", csvContent.substring(0, 200))

    const portfolioData = parsePortfolioCsv(csvContent)

    console.log("\n--- Parsed Portfolio Data ---")
    console.log("Account Overview:", portfolioData.accountOverview)
    console.log("Number of Positions:", portfolioData.positions.length)
    console.log("Sample Position (first):", portfolioData.positions[0])
    console.log("Asset Allocation:", portfolioData.assetAllocation)
    console.log("Currency Allocation:", portfolioData.currencyAllocation)
    console.log("True Country Allocation:", portfolioData.trueCountryAllocation)
    console.log("True Sector Allocation:", portfolioData.trueSectorAllocation)
    console.log("Domicile Allocation:", portfolioData.domicileAllocation)

    console.log("\n--- File Upload Test Complete ---")
  } catch (error) {
    console.error("Error during file upload test:", error)
  }
}

testFileUpload()
