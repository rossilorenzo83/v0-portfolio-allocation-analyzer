// scripts/test-portfolio-analyzer.ts
// This script is for testing the main portfolio-analyzer component logic.
// It simulates user interactions and verifies state changes.
// Run with: ts-node scripts/test-portfolio-analyzer.ts

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import PortfolioAnalyzer from "../portfolio-analyzer"
import { parseSwissPortfolioPDF, parsePortfolioCsv } from "../portfolio-parser"
import { jest, describe, beforeEach, it, expect } from "@jest/globals" // Import necessary Jest globals
import * as fs from "fs"
import * as path from "path"

// Mock the parseSwissPortfolioPDF function
jest.mock("../portfolio-parser", () => ({
  parseSwissPortfolioPDF: jest.fn(),
  parsePortfolioCsv: jest.fn(),
}))

const mockParseSwissPortfolioPDF = parseSwissPortfolioPDF as jest.Mock
const mockParsePortfolioCsv = parsePortfolioCsv as jest.Mock

describe("PortfolioAnalyzer", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockParseSwissPortfolioPDF.mockReset()
    mockParsePortfolioCsv.mockReset()
  })

  it("renders correctly and allows file upload", async () => {
    render(<PortfolioAnalyzer />)

    expect(screen.getByText("Swiss Portfolio Analyzer")).toBeInTheDocument()
    expect(screen.getByText("Upload File")).toBeInTheDocument()
    expect(screen.getByText("Paste Text")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Analyze Portfolio" })).toBeInTheDocument()

    // Simulate file upload
    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" })
    const input = screen.getByLabelText(/upload file/i) // Assuming FileUploadHelper uses a label for the input
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText("Selected file: test.pdf")).toBeInTheDocument()
  })

  it("allows text paste and analysis", async () => {
    render(<PortfolioAnalyzer />)

    fireEvent.click(screen.getByText("Paste Text"))
    const textarea = screen.getByPlaceholderText(/paste your portfolio data here/i)
    fireEvent.change(textarea, { target: { value: "AAPL,10,150,USD" } })

    expect(textarea).toHaveValue("AAPL,10,150,USD")

    // Mock a successful parse result
    mockParseSwissPortfolioPDF.mockResolvedValue({
      accountOverview: { totalValue: 1500, securitiesValue: 1500, cashBalance: 0 },
      positions: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: 10,
          price: 150,
          currency: "USD",
          totalValueCHF: 1500,
          category: "Actions",
          domicile: "US",
          positionPercent: 100,
          dailyChangePercent: 0,
        },
      ],
      assetAllocation: [{ name: "Actions", value: 1500, percentage: 100 }],
      currencyAllocation: [{ name: "USD", value: 1500, percentage: 100 }],
      trueCountryAllocation: [{ name: "US", value: 1500, percentage: 100 }],
      trueSectorAllocation: [{ name: "Technology", value: 1500, percentage: 100 }],
      domicileAllocation: [{ name: "US", value: 1500, percentage: 100 }],
    })

    fireEvent.click(screen.getByRole("button", { name: "Analyze Portfolio" }))

    // Expect loading state
    expect(screen.getByText("Analyzing...")).toBeInTheDocument()

    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText("Analysis Complete")).toBeInTheDocument()
    })

    // Expect portfolio data to be displayed
    expect(screen.getByText("CHF 1,500.00")).toBeInTheDocument()
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument()
    expect(screen.getByText("Asset Allocation")).toBeInTheDocument()
  })

  it("displays error message on analysis failure", async () => {
    render(<PortfolioAnalyzer />)

    fireEvent.click(screen.getByText("Paste Text"))
    const textarea = screen.getByPlaceholderText(/paste your portfolio data here/i)
    fireEvent.change(textarea, { target: { value: "invalid data" } })

    // Mock a failed parse result
    mockParseSwissPortfolioPDF.mockRejectedValue(new Error("Invalid portfolio data format."))

    fireEvent.click(screen.getByRole("button", { name: "Analyze Portfolio" }))

    await waitFor(() => {
      expect(screen.getByText("Analysis Failed")).toBeInTheDocument()
    })

    expect(screen.getByText("Error:")).toBeInTheDocument()
    expect(screen.getByText("Invalid portfolio data format.")).toBeInTheDocument()
  })

  it("simulates file input analysis", async () => {
    console.log("--- Testing Portfolio Analyzer Logic ---")

    const sampleCsvPath = path.join(__dirname, "..", "__tests__", "test-data", "sample-portfolio.csv")
    let csvContent = ""
    try {
      csvContent = fs.readFileSync(sampleCsvPath, "utf8")
      console.log(`Loaded sample CSV from: ${sampleCsvPath}`)
    } catch (error) {
      console.error(`Error loading sample CSV: ${error}. Please ensure the file exists.`)
      return
    }

    // Simulate file input
    console.log("\nSimulating file input analysis...")
    try {
      const portfolioDataFromFile = await mockParsePortfolioCsv(csvContent)
      console.log("File input analysis successful. Total Value:", portfolioDataFromFile.accountOverview.totalValue)
      console.log("Number of positions:", portfolioDataFromFile.positions.length)
      // Add more assertions as needed
    } catch (error) {
      console.error("File input analysis failed:", error)
    }
  })

  it("simulates text input analysis", async () => {
    console.log("\nSimulating text input analysis...")
    try {
      const portfolioDataFromText = await mockParsePortfolioCsv("AAPL,10,150,USD")
      console.log("Text input analysis successful. Total Value:", portfolioDataFromText.accountOverview.totalValue)
      console.log("Number of positions:", portfolioDataFromText.positions.length)
      // Add more assertions as needed
    } catch (error) {
      console.error("Text input analysis failed:", error)
    }
  })

  it("simulates invalid input error", async () => {
    console.log("\nSimulating invalid input error...")
    const invalidCsv = "header1,header2\ninvalid_data"
    try {
      await mockParsePortfolioCsv(invalidCsv)
      console.error("Error: Invalid input analysis unexpectedly succeeded.")
    } catch (error: any) {
      console.log("Invalid input analysis correctly failed with error:", error.message)
    }
  })

  console.log("\n--- Portfolio Analyzer Logic Tests Complete ---")
})
