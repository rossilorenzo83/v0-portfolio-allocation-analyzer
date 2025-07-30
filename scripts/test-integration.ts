import { readFileSync } from "fs"
import { join } from "path"
import { JSDOM } from "jsdom"
import { PortfolioAnalyzer } from "../portfolio-analyzer" // Assuming PortfolioAnalyzer is exported
import { parseSwissPortfolioPDF } from "../portfolio-parser" // Assuming parseSwissPortfolioPDF is exported

// Mock the DOM environment for testing file uploads in a browser-like context
const dom = new JSDOM(`<!DOCTYPE html><body><div id="root"></div></body>`)
global.window = dom.window as any
global.document = dom.window.document
global.File = dom.window.File
global.FileReader = dom.window.FileReader

// Mock React and ReactDOM for rendering the component
import React from "react"
import ReactDOM from "react-dom/client"
import { act } from "@testing-library/react"

// Helper to simulate file upload event for CSV
const createMockCsvFileEvent = (filePath: string, fileName: string, mimeType: string) => {
  const fileContent = readFileSync(filePath, "utf8")
  const file = new File([fileContent], fileName, { type: mimeType })

  return {
    target: {
      files: [file],
    },
  } as React.ChangeEvent<HTMLInputElement>
}

// Helper to simulate file upload for PDF (requires a mock for PDF.js)
const createMockPdfFile = (filePath: string, fileName: string, mimeType: string) => {
  const fileContent = readFileSync(filePath) // Read as buffer for PDF
  const file = new File([fileContent], fileName, { type: mimeType })
  return file
}

async function testIntegration() {
  console.log("--- Testing Full Integration ---")

  const rootElement = document.getElementById("root")
  if (!rootElement) {
    console.error("Root element not found.")
    return
  }

  const root = ReactDOM.createRoot(rootElement)

  // Render the PortfolioAnalyzer component
  let portfolioAnalyzerInstance: any
  act(() => {
    root.render(
      React.createElement(PortfolioAnalyzer, {
        ref: (instance: any) => {
          portfolioAnalyzerInstance = instance
        },
      }),
    )
  })

  if (!portfolioAnalyzerInstance) {
    console.error("PortfolioAnalyzer instance not found after rendering.")
    return
  }

  // --- Test CSV Upload and Analysis ---
  console.log("\n--- Testing CSV Upload and Analysis ---")
  const sampleCsvPath = join(process.cwd(), "__tests__", "test-data", "sample-portfolio.csv")
  const sampleCsvFileName = "sample-portfolio.csv"

  try {
    console.log(`Attempting to upload CSV: ${sampleCsvFileName}...`)
    const csvEvent = createMockCsvFileEvent(sampleCsvPath, sampleCsvFileName, "text/csv")

    await act(async () => {
      await portfolioAnalyzerInstance.props.handleFileUpload(csvEvent)
    })

    // In a real test, you'd assert on the state or rendered output.
    // For this script, we'll just log success.
    console.log("CSV file upload and initial parsing simulated successfully.")
    // You might want to add a small delay or check for isLoading to be false
    // to ensure the component has processed the data.
  } catch (error) {
    console.error("Error during CSV integration test:", error)
  }

  // --- Test PDF Upload and Analysis (using SwissPortfolioAnalyzer's parser) ---
  console.log("\n--- Testing PDF Upload and Analysis (via portfolio-parser) ---")
  const samplePdfPath = join(process.cwd(), "__tests__", "test-data", "sample-swiss-portfolio.pdf")
  const samplePdfFileName = "sample-swiss-portfolio.pdf"

  try {
    console.log(`Attempting to parse PDF: ${samplePdfFileName} directly via parser...`)
    const pdfFile = createMockPdfFile(samplePdfPath, samplePdfFileName, "application/pdf")

    // Directly call the PDF parser function
    const parsedPdfData = await parseSwissPortfolioPDF(pdfFile)
    console.log("PDF parsing simulated successfully. Parsed data summary:", {
      totalValue: parsedPdfData.accountOverview.totalValue,
      positionsCount: parsedPdfData.positions.length,
      assetAllocations: parsedPdfData.assetAllocation.map((a) => `${a.name}: ${a.percentage.toFixed(1)}%`),
    })
  } catch (error) {
    console.error("Error during PDF integration test:", error)
  } finally {
    // Clean up
    act(() => {
      root.unmount()
    })
    console.log("\n--- Full Integration Tests Complete ---")
  }
}

testIntegration()
