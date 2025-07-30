// scripts/test-real-csv.ts
// This script fetches a real CSV from a URL and analyzes its structure
// using the portfolio-parser.ts logic.
// Run with: ts-node scripts/test-real-csv.ts <CSV_URL>

import { parseSwissPortfolioPDF } from "../portfolio-parser"

async function testRealCsv(csvUrl: string) {
  console.log(`--- Testing Real CSV from URL: ${csvUrl} ---`)

  try {
    console.log("Fetching CSV content...")
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvContent = await response.text()
    console.log(`Fetched CSV content length: ${csvContent.length} characters.`)
    console.log("First 500 characters of CSV:\n", csvContent.substring(0, 500))

    console.log("\nStarting portfolio parsing...")
    const portfolioData = await parseSwissPortfolioPDF(csvContent)

    console.log("\n--- Analysis Results ---")
    console.log("Account Overview:", portfolioData.accountOverview)
    console.log("Number of Positions:", portfolioData.positions.length)
    console.log("Asset Allocation:", portfolioData.assetAllocation)
    console.log("Currency Allocation:", portfolioData.currencyAllocation)
    console.log("True Country Allocation:", portfolioData.trueCountryAllocation)
    console.log("True Sector Allocation:", portfolioData.trueSectorAllocation)
    console.log("Domicile Allocation:", portfolioData.domicileAllocation)

    if (portfolioData.positions.length > 0) {
      console.log("\nSample Positions (first 5):")
      portfolioData.positions.slice(0, 5).forEach((p, i) => {
        console.log(
          `  ${i + 1}. Symbol: ${p.symbol}, Name: ${p.name}, Quantity: ${p.quantity}, Price: ${p.price}, Total CHF: ${p.totalValueCHF}`,
        )
      })
    } else {
      console.warn("No positions were parsed from the CSV.")
    }

    console.log("\n--- Analysis Complete ---")
  } catch (error) {
    console.error("Error during real CSV analysis:", error)
    process.exit(1)
  }
}

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error("Usage: ts-node scripts/test-real-csv.ts <CSV_URL>")
  process.exit(1)
}

testRealCsv(args[0])
