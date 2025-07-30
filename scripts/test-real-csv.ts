import { parsePortfolioCsv } from "../portfolio-parser" // Corrected import

async function testRealCsv(csvUrl: string) {
  console.log(`Fetching CSV from URL: ${csvUrl}`)
  try {
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`)
    }
    const csvContent = await response.text()

    console.log("\n--- CSV Content Preview (first 500 chars) ---")
    console.log(csvContent.substring(0, 500) + "...")

    console.log("\n--- Parsing CSV Content ---")
    const portfolioData = parsePortfolioCsv(csvContent)

    console.log("\n--- Parsing Complete ---")
    console.log("Parsed Positions:", portfolioData.positions.length)
    console.log("Total Portfolio Value (CHF):", portfolioData.accountOverview.totalValue.toFixed(2))
    console.log("Securities Value (CHF):", portfolioData.accountOverview.securitiesValue.toFixed(2))
    console.log("Cash Balance (CHF):", portfolioData.accountOverview.cashBalance.toFixed(2))

    if (portfolioData.positions.length > 0) {
      console.log("\nFirst 5 Parsed Positions:")
      portfolioData.positions.slice(0, 5).forEach((p, index) => {
        console.log(
          `  ${index + 1}. Symbol: ${p.symbol}, Name: ${p.name}, Quantity: ${p.quantity}, Price: ${p.price}, Currency: ${p.currency}, Total Value (CHF): ${p.totalValueCHF.toFixed(2)}`,
        )
      })
    } else {
      console.log("No positions found in the parsed data.")
    }

    console.log("\nAsset Allocation:")
    portfolioData.assetAllocation.forEach((a) => console.log(`  ${a.name}: ${a.percentage.toFixed(2)}%`))

    console.log("\nTrue Country Allocation:")
    portfolioData.trueCountryAllocation.forEach((a) => console.log(`  ${a.name}: ${a.percentage.toFixed(2)}%`))

    console.log("\nTrue Sector Allocation:")
    portfolioData.trueSectorAllocation.forEach((a) => console.log(`  ${a.name}: ${a.percentage.toFixed(2)}%`))

    console.log("\nCurrency Allocation:")
    portfolioData.currencyAllocation.forEach((a) => console.log(`  ${a.name}: ${a.percentage.toFixed(2)}%`))

    console.log("\nDomicile Allocation:")
    portfolioData.domicileAllocation.forEach((a) => console.log(`  ${a.name}: ${a.percentage.toFixed(2)}%`))
  } catch (error: any) {
    console.error(`Error during real CSV test: ${error.message}`)
    console.error("Please ensure the URL is correct and accessible, and the CSV format is valid.")
  }
}

// Example usage: ts-node scripts/test-real-csv.ts "https://example.com/your-portfolio.csv"
// Replace "https://example.com/your-portfolio.csv" with the actual URL of your CSV file.
const args = process.argv.slice(2)
if (args.length < 1) {
  console.log("Usage: ts-node scripts/test-real-csv.ts <CSV_URL>")
  process.exit(1)
}

testRealCsv(args[0])
