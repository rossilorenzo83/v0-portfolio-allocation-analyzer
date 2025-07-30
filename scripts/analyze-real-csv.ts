import { parsePortfolioCsv } from "../portfolio-parser"
import * as fs from "fs"

async function analyzeRealCsv(csvFilePath: string) {
  console.log(`--- Analyzing Real CSV: ${csvFilePath} ---`)

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File not found at ${csvFilePath}`)
    return
  }

  try {
    const csvContent = fs.readFileSync(csvFilePath, "utf8")
    console.log("CSV Content Preview (first 500 chars):\n", csvContent.substring(0, 500))

    console("\nStarting portfolio parsing and enrichment...")
    const portfolioData = await parsePortfolioCsv(csvContent)

    console.log("\n--- Parsed and Enriched Portfolio Data ---")
    console.log("Account Overview:", portfolioData.accountOverview)
    console.log("Total Portfolio Value (CHF):", portfolioData.accountOverview.totalValue.toFixed(2))
    console.log("Securities Value (CHF):", portfolioData.accountOverview.securitiesValue.toFixed(2))
    console.log("Cash Balance (CHF):", portfolioData.accountOverview.cashBalance.toFixed(2))

    console.log("\n--- Portfolio Positions ---")
    if (portfolioData.positions.length > 0) {
      portfolioData.positions.forEach((p, index) => {
        console.log(`Position ${index + 1}:`)
        console.log(`  Symbol: ${p.symbol}`)
        console.log(`  Name: ${p.name}`)
        console.log(`  Quantity: ${p.quantity}`)
        console.log(`  Price: ${p.price} ${p.currency}`)
        console.log(`  Current Price: ${p.currentPrice} ${p.currency}`)
        console.log(`  Total Value (CHF): ${p.totalValueCHF.toFixed(2)}`)
        console.log(`  Category: ${p.category}`)
        console.log(`  Sector: ${p.sector}`)
        console.log(`  Country: ${p.geography}`)
        console.log(`  Domicile: ${p.domicile}`)
        console.log(`  Tax Optimized: ${p.taxOptimized}`)
        console.log(`  Gain/Loss (CHF): ${p.gainLossCHF.toFixed(2)}`)
        console.log(`  Unrealized Gain/Loss: ${p.unrealizedGainLoss?.toFixed(2)}`)
        console.log(`  Unrealized Gain/Loss %: ${p.unrealizedGainLossPercent?.toFixed(2)}%`)
        console.log(`  Position %: ${p.positionPercent.toFixed(2)}%`)
        console.log(`  Daily Change %: ${p.dailyChangePercent.toFixed(2)}%`)
        console.log("---")
      })
    } else {
      console.log("No positions found in the parsed data.")
    }

    console.log("\n--- Allocation Breakdowns ---")
    console.log("Asset Allocation:", portfolioData.assetAllocation)
    console.log("Currency Allocation:", portfolioData.currencyAllocation)
    console.log("True Country Allocation:", portfolioData.trueCountryAllocation)
    console.log("True Sector Allocation:", portfolioData.trueSectorAllocation)
    console.log("Domicile Allocation:", portfolioData.domicileAllocation)

    console.log("\n--- Real CSV Analysis Complete ---")
  } catch (error: any) {
    console.error("Error during real CSV analysis:", error.message)
    if (error.stack) {
      console.error(error.stack)
    }
  }
}

// Example usage:
// To run this script, use: `ts-node scripts/analyze-real-csv.ts <path_to_your_csv_file>`
// For example: `ts-node scripts/analyze-real-csv.ts ./__tests__/test-data/sample-portfolio.csv`
const args = process.argv.slice(2)
if (args.length > 0) {
  analyzeRealCsv(args[0])
} else {
  console.log("Usage: ts-node scripts/analyze-real-csv.ts <path_to_csv_file>")
  console.log("Please provide the path to your CSV file as an argument.")
}
