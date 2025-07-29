import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { parseSwissPortfolioPDF } from "../portfolio-parser"
import { FileUploadHelper } from "../components/file-upload-helper"
import { SwissPortfolioAnalyzer } from "../swiss-portfolio-analyzer"
import jest from "jest"

// Mock API service
jest.mock("../lib/api-service", () => ({
  apiService: {
    getStockPrice: jest.fn().mockResolvedValue({ price: 150.0, changePercent: 2.5 }),
    getAssetMetadata: jest.fn().mockResolvedValue({
      name: "Apple Inc.",
      sector: "Technology",
      country: "United States",
    }),
    getETFComposition: jest.fn().mockResolvedValue({
      domicile: "IE",
      withholdingTax: 15,
      currency: [
        { currency: "USD", weight: 60 },
        { currency: "EUR", weight: 40 },
      ],
      country: [
        { country: "United States", weight: 50 },
        { country: "Europe", weight: 50 },
      ],
      sector: [
        { sector: "Technology", weight: 30 },
        { sector: "Healthcare", weight: 20 },
      ],
    }),
  },
}))

describe("Portfolio Views Test Suite", () => {
  // Test data samples
  const sampleSwissquoteText = `Aperçu du compte
Valeur totale du portefeuille CHF 889'528.75
Solde espèces CHF 5'129.55
Valeur des titres CHF 877'853.96

Positions

Actions
AAPL Apple Inc. 100 150.00 USD 15'000.00
MSFT Microsoft Corporation 75 330.00 USD 24'750.00
NESN Nestlé SA 200 120.00 CHF 24'000.00

ETF
VWRL Vanguard FTSE All-World UCITS ETF 500 89.96 CHF 44'980.00
IS3N iShares Core MSCI World UCITS ETF 300 30.50 CHF 9'150.00

Obligations
US Treasury Bond 10 1000.00 USD 10'000.00`

  const sampleSwissquoteCSV = `,Symbole,Quantité,Coût unitaire,Valeur totale,Variation journalière,Var. quot. %,Prix,Dev.,G&P CHF,G&P %,Valeur totale CHF,Positions %
Actions,,,,,,,,,,,
,AAPL,100,145.50,15000.00,250.00,1.67%,150.00,USD,450.00,3.09%,15000.00,1.64%
,MSFT,75,320.00,24750.00,375.00,1.54%,330.00,USD,750.00,3.13%,24750.00,2.70%
,NESN,200,115.00,24000.00,1000.00,4.35%,120.00,CHF,1000.00,4.35%,24000.00,2.62%
ETF,,,,,,,,,,,
,VWRL,500,85.00,44980.00,2249.00,5.26%,89.96,CHF,2480.00,5.84%,44980.00,4.91%
,IS3N,300,28.50,9150.00,600.00,7.02%,30.50,CHF,600.00,7.02%,9150.00,1.00%
Obligations,,,,,,,,,,,
,US Treasury,10,950.00,10000.00,500.00,5.26%,1000.00,USD,500.00,5.26%,10000.00,1.09%`

  describe("1. File Upload Helper Tests", () => {
    test("should render all three tabs correctly", () => {
      const mockProps = {
        onFileUpload: jest.fn(),
        onTextSubmit: jest.fn(),
        isLoading: false,
        error: null,
      }

      render(<FileUploadHelper {...mockProps} />)

      expect(screen.getByText("📝 Paste Text (Recommended)")).toBeInTheDocument()
      expect(screen.getByText("📄 File Upload")).toBeInTheDocument()
      expect(screen.getByText("🧪 Try Sample")).toBeInTheDocument()
    })

    test("should handle text input correctly", async () => {
      const mockOnTextSubmit = jest.fn()
      const mockProps = {
        onFileUpload: jest.fn(),
        onTextSubmit: mockOnTextSubmit,
        isLoading: false,
        error: null,
      }

      render(<FileUploadHelper {...mockProps} />)

      const textarea = screen.getByPlaceholderText("Paste your portfolio statement text here...")
      const submitButton = screen.getByText("Analyze Portfolio")

      fireEvent.change(textarea, { target: { value: sampleSwissquoteText } })
      fireEvent.click(submitButton)

      expect(mockOnTextSubmit).toHaveBeenCalledWith(sampleSwissquoteText)
    })

    test("should handle sample data submission", async () => {
      const mockOnTextSubmit = jest.fn()
      const mockProps = {
        onFileUpload: jest.fn(),
        onTextSubmit: mockOnTextSubmit,
        isLoading: false,
        error: null,
      }

      render(<FileUploadHelper {...mockProps} />)

      // Switch to sample tab
      fireEvent.click(screen.getByText("🧪 Try Sample"))

      const sampleButton = screen.getByText("Analyze Sample Portfolio")
      fireEvent.click(sampleButton)

      expect(mockOnTextSubmit).toHaveBeenCalled()
    })

    test("should handle file upload", async () => {
      const mockOnFileUpload = jest.fn()
      const mockProps = {
        onFileUpload: mockOnFileUpload,
        onTextSubmit: jest.fn(),
        isLoading: false,
        error: null,
      }

      render(<FileUploadHelper {...mockProps} />)

      // Switch to file upload tab
      fireEvent.click(screen.getByText("📄 File Upload"))

      const fileInput = screen.getByLabelText(/click to upload file/i)
      const file = new File([sampleSwissquoteCSV], "test.csv", { type: "text/csv" })

      fireEvent.change(fileInput, { target: { files: [file] } })

      expect(mockOnFileUpload).toHaveBeenCalledWith(file)
    })

    test("should show loading state correctly", () => {
      const mockProps = {
        onFileUpload: jest.fn(),
        onTextSubmit: jest.fn(),
        isLoading: true,
        error: null,
      }

      render(<FileUploadHelper {...mockProps} />)

      expect(screen.getByText("Analyzing...")).toBeInTheDocument()
    })

    test("should display error messages", () => {
      const mockProps = {
        onFileUpload: jest.fn(),
        onTextSubmit: jest.fn(),
        isLoading: false,
        error: "Test error message",
      }

      render(<FileUploadHelper {...mockProps} />)

      expect(screen.getByText("Error: Test error message")).toBeInTheDocument()
    })

    test("should show copy instructions when requested", () => {
      const mockProps = {
        onFileUpload: jest.fn(),
        onTextSubmit: jest.fn(),
        isLoading: false,
        error: null,
      }

      render(<FileUploadHelper {...mockProps} />)

      const howToCopyButton = screen.getByText("How to Copy")
      fireEvent.click(howToCopyButton)

      expect(screen.getByText("📋 How to copy text from your PDF:")).toBeInTheDocument()
    })
  })

  describe("2. Portfolio Parser Tests", () => {
    test("should parse Swissquote text format correctly", async () => {
      const result = await parseSwissPortfolioPDF(sampleSwissquoteText)

      expect(result.positions).toHaveLength(6)
      expect(result.positions[0].symbol).toBe("AAPL")
      expect(result.positions[0].name).toBe("Apple Inc.")
      expect(result.positions[0].quantity).toBe(100)
      expect(result.positions[0].currency).toBe("USD")
      expect(result.positions[0].category).toBe("Actions")
    })

    test("should parse Swissquote CSV format correctly", async () => {
      const result = await parseSwissPortfolioPDF(sampleSwissquoteCSV)

      expect(result.positions).toHaveLength(6)
      expect(result.positions[0].symbol).toBe("AAPL")
      expect(result.positions[0].quantity).toBe(100)
      expect(result.positions[0].totalValueCHF).toBe(15000)
    })

    test("should calculate asset allocation correctly", async () => {
      const result = await parseSwissPortfolioPDF(sampleSwissquoteText)

      const actionsAllocation = result.assetAllocation.find((a) => a.name === "Actions")
      const etfAllocation = result.assetAllocation.find((a) => a.name === "ETF")
      const bondsAllocation = result.assetAllocation.find((a) => a.name === "Bonds")

      expect(actionsAllocation).toBeDefined()
      expect(etfAllocation).toBeDefined()
      expect(bondsAllocation).toBeDefined()

      expect(actionsAllocation!.percentage).toBeGreaterThan(0)
      expect(etfAllocation!.percentage).toBeGreaterThan(0)
      expect(bondsAllocation!.percentage).toBeGreaterThan(0)
    })

    test("should calculate currency allocation with ETF look-through", async () => {
      const result = await parseSwissPortfolioPDF(sampleSwissquoteText)

      expect(result.currencyAllocation).toHaveLength(2) // USD and CHF

      const usdAllocation = result.currencyAllocation.find((c) => c.name === "USD")
      const chfAllocation = result.currencyAllocation.find((c) => c.name === "CHF")

      expect(usdAllocation).toBeDefined()
      expect(chfAllocation).toBeDefined()
    })

    test("should handle Swiss number format correctly", async () => {
      const textWithSwissNumbers = `Aperçu du compte
Valeur totale du portefeuille CHF 1'234'567.89
Solde espèces CHF 12'345.67

Actions
AAPL Apple Inc. 1'000 150.50 USD 150'500.00`

      const result = await parseSwissPortfolioPDF(textWithSwissNumbers)

      expect(result.accountOverview.totalValue).toBe(1234567.89)
      expect(result.accountOverview.cashBalance).toBe(12345.67)
      expect(result.positions[0].quantity).toBe(1000)
    })

    test("should handle empty or invalid input gracefully", async () => {
      await expect(parseSwissPortfolioPDF("")).rejects.toThrow("Insufficient text content")
      await expect(parseSwissPortfolioPDF("invalid data")).rejects.toThrow("No portfolio positions found")
    })

    test("should enrich positions with API data", async () => {
      const result = await parseSwissPortfolioPDF(sampleSwissquoteText)

      const applePosition = result.positions.find((p) => p.symbol === "AAPL")
      expect(applePosition).toBeDefined()
      expect(applePosition!.name).toBe("Apple Inc.")
      expect(applePosition!.sector).toBe("Technology")
      expect(applePosition!.geography).toBe("United States")
    })
  })

  describe("3. Swiss Portfolio Analyzer Component Tests", () => {
    test("should render initial state correctly", () => {
      render(<SwissPortfolioAnalyzer />)

      expect(screen.getByText("Swiss Portfolio Analyzer")).toBeInTheDocument()
      expect(screen.getByText("Upload Portfolio Data")).toBeInTheDocument()
    })

    test("should handle successful portfolio analysis", async () => {
      render(<SwissPortfolioAnalyzer />)

      // Simulate text input
      const textarea = screen.getByPlaceholderText("Paste your portfolio statement text here...")
      fireEvent.change(textarea, { target: { value: sampleSwissquoteText } })

      const analyzeButton = screen.getByText("Analyze Portfolio")
      fireEvent.click(analyzeButton)

      // Wait for analysis to complete
      await waitFor(
        () => {
          expect(screen.getByText("Portfolio Summary")).toBeInTheDocument()
        },
        { timeout: 10000 },
      )

      // Check if pie charts are rendered
      expect(screen.getByText("Asset Allocation")).toBeInTheDocument()
      expect(screen.getByText("Currency Distribution")).toBeInTheDocument()
      expect(screen.getByText("Geographic Allocation")).toBeInTheDocument()
    })

    test("should display portfolio positions correctly", async () => {
      render(<SwissPortfolioAnalyzer />)

      // Simulate successful analysis
      const textarea = screen.getByPlaceholderText("Paste your portfolio statement text here...")
      fireEvent.change(textarea, { target: { value: sampleSwissquoteText } })

      const analyzeButton = screen.getByText("Analyze Portfolio")
      fireEvent.click(analyzeButton)

      await waitFor(
        () => {
          expect(screen.getByText("AAPL")).toBeInTheDocument()
          expect(screen.getByText("MSFT")).toBeInTheDocument()
          expect(screen.getByText("VWRL")).toBeInTheDocument()
        },
        { timeout: 10000 },
      )
    })

    test("should handle analysis errors gracefully", async () => {
      render(<SwissPortfolioAnalyzer />)

      // Simulate invalid input
      const textarea = screen.getByPlaceholderText("Paste your portfolio statement text here...")
      fireEvent.change(textarea, { target: { value: "invalid data" } })

      const analyzeButton = screen.getByText("Analyze Portfolio")
      fireEvent.click(analyzeButton)

      await waitFor(
        () => {
          expect(screen.getByText(/Error:/)).toBeInTheDocument()
        },
        { timeout: 5000 },
      )
    })

    test("should switch between analysis tabs correctly", async () => {
      render(<SwissPortfolioAnalyzer />)

      // First analyze portfolio
      const textarea = screen.getByPlaceholderText("Paste your portfolio statement text here...")
      fireEvent.change(textarea, { target: { value: sampleSwissquoteText } })

      const analyzeButton = screen.getByText("Analyze Portfolio")
      fireEvent.click(analyzeButton)

      await waitFor(
        () => {
          expect(screen.getByText("Portfolio Summary")).toBeInTheDocument()
        },
        { timeout: 10000 },
      )

      // Test tab switching
      const currencyTab = screen.getByText("Currency")
      fireEvent.click(currencyTab)
      expect(screen.getByText("Currency Allocation")).toBeInTheDocument()

      const geographyTab = screen.getByText("Geography")
      fireEvent.click(geographyTab)
      expect(screen.getByText("Geographic Allocation")).toBeInTheDocument()

      const sectorTab = screen.getByText("Sector")
      fireEvent.click(sectorTab)
      expect(screen.getByText("Sector Allocation")).toBeInTheDocument()
    })

    test("should display loading state during analysis", async () => {
      render(<SwissPortfolioAnalyzer />)

      const textarea = screen.getByPlaceholderText("Paste your portfolio statement text here...")
      fireEvent.change(textarea, { target: { value: sampleSwissquoteText } })

      const analyzeButton = screen.getByText("Analyze Portfolio")
      fireEvent.click(analyzeButton)

      // Should show loading state immediately
      expect(screen.getByText("Analyzing...")).toBeInTheDocument()
    })
  })

  describe("4. Real CSV File Tests", () => {
    test("should handle the provided Swissquote CSV file", async () => {
      // Fetch the actual CSV file
      const response = await fetch(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_08072025_10_59-3uIndJzrWFR29SdmvEW2b3RPE5CQU0.csv",
      )
      const csvContent = await response.text()

      expect(csvContent).toBeTruthy()
      expect(csvContent.length).toBeGreaterThan(100)

      // Test parsing
      const result = await parseSwissPortfolioPDF(csvContent)

      expect(result.positions.length).toBeGreaterThan(0)
      expect(result.assetAllocation.length).toBeGreaterThan(0)
      expect(result.currencyAllocation.length).toBeGreaterThan(0)
    })

    test("should detect CSV delimiter correctly", async () => {
      const response = await fetch(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_08072025_10_59-3uIndJzrWFR29SdmvEW2b3RPE5CQU0.csv",
      )
      const csvContent = await response.text()

      const firstLine = csvContent.split("\n")[0]

      // Should detect comma as delimiter
      const commaCount = (firstLine.match(/,/g) || []).length
      const semicolonCount = (firstLine.match(/;/g) || []).length

      expect(commaCount).toBeGreaterThan(semicolonCount)
    })
  })

  describe("5. Edge Cases and Error Handling", () => {
    test("should handle mixed currency portfolios", async () => {
      const mixedCurrencyText = `Actions
AAPL Apple Inc. 100 150.00 USD
NESN Nestlé SA 200 120.00 CHF
ASML ASML Holding 50 600.00 EUR`

      const result = await parseSwissPortfolioPDF(mixedCurrencyText)

      expect(result.currencyAllocation.length).toBe(3)
      expect(result.currencyAllocation.map((c) => c.name)).toContain("USD")
      expect(result.currencyAllocation.map((c) => c.name)).toContain("CHF")
      expect(result.currencyAllocation.map((c) => c.name)).toContain("EUR")
    })

    test("should handle positions without total values", async () => {
      const simpleText = `Actions
AAPL 100 150.00 USD
MSFT 75 330.00 USD`

      const result = await parseSwissPortfolioPDF(simpleText)

      expect(result.positions.length).toBe(2)
      expect(result.positions[0].totalValueCHF).toBeGreaterThan(0)
    })

    test("should handle malformed CSV data", async () => {
      const malformedCSV = `,Symbole,Quantité
Actions,,,
,AAPL,invalid_quantity
,MSFT,75`

      const result = await parseSwissPortfolioPDF(malformedCSV)

      // Should skip invalid rows and only parse valid ones
      expect(result.positions.length).toBe(1)
      expect(result.positions[0].symbol).toBe("MSFT")
    })

    test("should handle API failures gracefully", async () => {
      // Mock API failure
      const { apiService } = require("../lib/api-service")
      apiService.getStockPrice.mockRejectedValueOnce(new Error("API Error"))

      const result = await parseSwissPortfolioPDF(sampleSwissquoteText)

      // Should still return results with fallback data
      expect(result.positions.length).toBeGreaterThan(0)
    })
  })
})
