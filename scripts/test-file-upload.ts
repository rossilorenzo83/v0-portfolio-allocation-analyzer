import { parsePortfolioCsv } from "../portfolio-parser"
import fs from "fs"
import path from "path"

async function runFileUploadTest() {
  console.log("--- Running File Upload Test ---")

  const sampleCsvPath = path.resolve(process.cwd(), "public/sample-portfolio.csv")

  try {
    const csvContent = fs.readFileSync(sampleCsvPath, "utf8")
    console.log("Successfully read sample-portfolio.csv")

    const portfolio = parsePortfolioCsv(csvContent)
    console.log("Successfully parsed CSV content.")
    console.log("Parsed Positions:", portfolio.positions.length)
    console.log("Total Value:", portfolio.totalValue)

    // Basic assertions
    console.assert(portfolio.positions.length > 0, "Expected more than 0 positions.")
    console.assert(portfolio.totalValue > 0, "Expected total value to be greater than 0.")
    console.assert(portfolio.positions[0].symbol === "AAPL", "Expected first symbol to be AAPL.")

    console.log("File Upload Test Passed!")
  } catch (error: any) {
    console.error("File Upload Test Failed:", error.message)
  }
}

runFileUploadTest()
