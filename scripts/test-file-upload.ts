// scripts/test-file-upload.ts
// This script simulates a file upload and calls the portfolio parser.
// It requires a dummy File object implementation for Node.js environment.
// Run with: ts-node scripts/test-file-upload.ts

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

async function testFileUpload() {
  console.log("--- Testing File Upload Simulation ---")

  const dummyPdfPath = path.join(__dirname, "..", "__tests__", "dummy-portfolio.pdf") // Adjust path as needed
  const dummyCsvPath = path.join(__dirname, "..", "__tests__", "dummy-portfolio.csv") // Adjust path as needed

  // Test PDF file
  try {
    console.log(`\nAttempting to read PDF from: ${dummyPdfPath}`)
    const pdfBuffer = fs.readFileSync(dummyPdfPath)
    const pdfFile = new DummyFile([pdfBuffer], "dummy-portfolio.pdf", { type: "application/pdf" })

    console("Parsing dummy PDF file...")
    const pdfData = await parseSwissPortfolioPDF(pdfFile)
    console.log("PDF Parsing Result:", JSON.stringify(pdfData, null, 2))
  } catch (error) {
    console.error("Error parsing dummy PDF:", error)
  }

  // Test CSV file
  try {
    console.log(`\nAttempting to read CSV from: ${dummyCsvPath}`)
    const csvContent = fs.readFileSync(dummyCsvPath, "utf-8")
    const csvFile = new DummyFile([csvContent], "dummy-portfolio.csv", { type: "text/csv" })

    console.log("Parsing dummy CSV file...")
    const csvData = await parseSwissPortfolioPDF(csvFile)
    console.log("CSV Parsing Result:", JSON.stringify(csvData, null, 2))
  } catch (error) {
    console.error("Error parsing dummy CSV:", error)
  }

  console.log("\n--- File Upload Simulation Tests Complete ---")
}

// Ensure the dummy files exist for testing
// You might need to create these files manually or add them to your test data.
// For example:
// echo "Symbol,Name,Quantity,Price,Currency,Total Value CHF,Category,Domicile,Position %,Daily Change %" > __tests__/dummy-portfolio.csv
// echo "AAPL,Apple Inc.,10,170.00,USD,1564.00,Actions,US,10.50,1.20" >> __tests__/dummy-portfolio.csv
// (PDFs are harder to create programmatically, so you'd need a real dummy PDF)

testFileUpload()
