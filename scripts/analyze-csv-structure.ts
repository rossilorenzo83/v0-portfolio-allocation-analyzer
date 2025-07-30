import { readFileSync } from "fs"
import { parsePortfolioCsv } from "../portfolio-parser" // Corrected import

async function analyzeCsvStructure(filePath: string) {
  try {
    const csvContent = readFileSync(filePath, "utf-8")
    console.log(`Analyzing CSV file: ${filePath}`)

    // Attempt to parse the CSV using the main parser
    const portfolioData = parsePortfolioCsv(csvContent)

    console.log("\n--- CSV Structure Analysis Report ---")
    console.log("Parsing successful!")
    console.log(`Total Portfolio Value: CHF ${portfolioData.accountOverview.totalValue.toFixed(2)}`)
    console.log(`Number of Positions Found: ${portfolioData.positions.length}`)

    if (portfolioData.positions.length > 0) {
      console.log("\nSample Positions:")
      portfolioData.positions.slice(0, 5).forEach((p, index) => {
        console.log(
          `  ${index + 1}. Symbol: ${p.symbol}, Name: ${p.name}, Quantity: ${p.quantity}, Value: ${p.totalValueCHF.toFixed(2)} CHF`,
        )
      })
    } else {
      console.log("No positions were successfully parsed.")
    }

    console.log("\n--- Detailed Parsing Logs (from portfolio-parser.ts) ---")
    // The parsePortfolioCsv function already logs detailed steps internally.
    // You can review the console output from the parser for more details.
  } catch (error: any) {
    console.error(`\nError analyzing CSV structure: ${error.message}`)
    console.error("Please ensure the file path is correct and the CSV format is as expected.")
    console.error("If the error persists, consider manually inspecting the CSV file for anomalies.")
  }
}

// Example usage: ts-node scripts/analyze-csv-structure.ts <path_to_your_csv_file.csv>
const args = process.argv.slice(2)
if (args.length < 1) {
  console.log("Usage: ts-node scripts/analyze-csv-structure.ts <path_to_your_csv_file.csv>")
  process.exit(1)
}

analyzeCsvStructure(args[0])
