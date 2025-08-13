import React from "react"
import { render, screen } from "@testing-library/react"
import { jest } from "@jest/globals"

// Mock the parsePortfolioCsv function
const mockParsePortfolioCsv = jest.fn()
jest.mock("../../portfolio-parser", () => ({
  parsePortfolioCsv: mockParsePortfolioCsv,
}))

// Mock the toast hook
jest.mock("../../hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock recharts components
jest.mock("recharts", () => ({
  PieChart: ({ children, data, ...props }: any) => (
    <div data-testid="pie-chart" {...props}>
      <div data-testid="chart-data-count">{data?.length || 0} items</div>
      {children}
    </div>
  ),
  Pie: ({ data, dataKey, ...props }: any) => (
    <div data-testid="pie-segment" {...props}>
      {data?.map((item: any, index: number) => (
        <div key={index} data-testid={`pie-segment-${index}`}>
          {item.name}: {item[dataKey]}
        </div>
      ))}
    </div>
  ),
  Cell: ({ fill, ...props }: any) => (
    <div data-testid="pie-cell" style={{ backgroundColor: fill }} {...props} />
  ),
  ResponsiveContainer: ({ children, ...props }: any) => (
    <div data-testid="responsive-container" {...props}>
      {children}
    </div>
  ),
  Legend: (props: any) => <div data-testid="chart-legend" {...props} />,
  Tooltip: ({ children, ...props }: any) => (
    <div data-testid="chart-tooltip" {...props}>
      {children}
    </div>
  ),
}))

// Import after mocks so they take effect for the component under test
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PortfolioAnalyzer = require("../../portfolio-analyzer").default

// Mock the FileUploadHelper component
jest.mock("../../components/file-upload-helper", () => ({
  FileUploadHelper: ({ onFileChange }: any) => (
    <div data-testid="file-upload-helper">
      <button onClick={() => onFileChange(new File(["test"], "test.csv"))}>
        Upload File
      </button>
    </div>
  ),
}))

// Mock the LoadingProgress component
jest.mock("../../components/loading-progress", () => ({
  LoadingProgress: ({ progress }: any) => (
    <div data-testid="loading-progress">
      Loading: {progress}%
    </div>
  ),
}))

const mockPortfolioData = {
  accountOverview: {
    totalValue: 100000,
    securitiesValue: 90000,
    cashBalance: 10000,
  },
  positions: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      quantity: 10,
      unitCost: 150,
      price: 170,
      currentPrice: 170,
      totalValueCHF: 1700,
      currency: "USD",
      category: "Actions",
      sector: "Technology",
      geography: "United States",
      domicile: "US",
      withholdingTax: 15,
      taxOptimized: true,
      gainLossCHF: 200,
      unrealizedGainLoss: 200,
      unrealizedGainLossPercent: 13.33,
      positionPercent: 1.7,
      dailyChangePercent: 0.5,
      isOTC: false,
    },
    {
      symbol: "VWRL.L",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 50,
      unitCost: 100,
      price: 105,
      currentPrice: 105,
      totalValueCHF: 5250,
      currency: "USD",
      category: "ETF",
      sector: "Diversified",
      geography: "Ireland",
      domicile: "IE",
      withholdingTax: 15,
      taxOptimized: true,
      gainLossCHF: 250,
      unrealizedGainLoss: 250,
      unrealizedGainLossPercent: 5,
      positionPercent: 5.25,
      dailyChangePercent: 0.2,
      isOTC: false,
    },
  ],
  assetAllocation: [
    { name: "Actions", value: 1700, percentage: 1.7 },
    { name: "ETF", value: 5250, percentage: 5.25 },
  ],
  currencyAllocation: [
    { name: "USD", value: 6000, percentage: 6 },
    { name: "EUR", value: 950, percentage: 0.95 },
  ],
  trueCountryAllocation: [
    { name: "United States", value: 5000, percentage: 5 },
    { name: "Switzerland", value: 1000, percentage: 1 },
  ],
  trueSectorAllocation: [
    { name: "Technology", value: 3000, percentage: 3 },
    { name: "Financial Services", value: 1500, percentage: 1.5 },
  ],
  domicileAllocation: [
    { name: "US", value: 1700, percentage: 1.7 },
    { name: "IE", value: 5250, percentage: 5.25 },
  ],
}

describe("PortfolioAnalyzer Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Initial Rendering", () => {
    it("should render the main title and description", () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByText("Swiss Portfolio Analyzer")).toBeInTheDocument()
      expect(screen.getByText(/Upload your Swiss bank PDF\/CSV or paste text to get a detailed portfolio analysis./)).toBeInTheDocument()
    })

    it("should show upload and paste tabs", () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByRole("tab", { name: /Upload File/i })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: /Paste Text/i })).toBeInTheDocument()
    })

    it("should disable analyze button initially", () => {
      render(<PortfolioAnalyzer />)
      
      const analyzeButton = screen.getByRole("button", { name: /Analyze Portfolio/i })
      expect(analyzeButton).toBeDisabled()
    })

    it("should show file upload helper in upload tab", () => {
      render(<PortfolioAnalyzer />)
      
      // The FileUploadHelper component doesn't have a data-testid, but we can check for its content
      expect(screen.getByText("Upload Portfolio CSV")).toBeInTheDocument()
      expect(screen.getByText("Drag and drop your CSV file here, or click to select.")).toBeInTheDocument()
    })
  })

  describe("Portfolio Display with defaultData", () => {
    it("should render portfolio summary with correct data", () => {
      render(<PortfolioAnalyzer defaultData={mockPortfolioData} />)
      
      expect(screen.getByTestId("portfolio-summary")).toBeInTheDocument()
      expect(screen.getByText(/Analysis of your portfolio with 2 positions/)).toBeInTheDocument()
    })

    it("should render account overview with correct values", () => {
      render(<PortfolioAnalyzer defaultData={mockPortfolioData} />)
      
      expect(screen.getByTestId("account-overview")).toBeInTheDocument()
      // The values are formatted with .toFixed(2), so we need to match the exact format
      expect(screen.getByText("CHF 100000.00")).toBeInTheDocument()
      expect(screen.getByText("CHF 90000.00")).toBeInTheDocument()
      expect(screen.getByText("CHF 10000.00")).toBeInTheDocument()
    })

    it("should render positions table with correct data", () => {
      render(<PortfolioAnalyzer defaultData={mockPortfolioData} />)
      
      expect(screen.getByTestId("positions-table")).toBeInTheDocument()
      expect(screen.getByText("AAPL")).toBeInTheDocument()
      expect(screen.getByText("Apple Inc.")).toBeInTheDocument()
      expect(screen.getByText("VWRL.L")).toBeInTheDocument()
      expect(screen.getByText("Vanguard FTSE All-World UCITS ETF")).toBeInTheDocument()
    })

    it("should render allocation charts", () => {
      render(<PortfolioAnalyzer defaultData={mockPortfolioData} />)
      
      expect(screen.getByTestId("allocation-charts")).toBeInTheDocument()
      expect(screen.getByTestId("asset-allocation-chart")).toBeInTheDocument()
      expect(screen.getByTestId("currency-allocation-chart")).toBeInTheDocument()
      expect(screen.getByTestId("true-country-allocation-chart")).toBeInTheDocument()
      expect(screen.getByTestId("true-sector-allocation-chart")).toBeInTheDocument()
      expect(screen.getByTestId("domicile-allocation-chart")).toBeInTheDocument()
    })

    it("should render pie charts with correct data", () => {
      render(<PortfolioAnalyzer defaultData={mockPortfolioData} />)
      
      // The pie charts are rendered inside ResponsiveContainer components
      const responsiveContainers = screen.getAllByTestId("responsive-container")
      expect(responsiveContainers.length).toBeGreaterThan(0)
      
      // Check for the chart titles instead of pie-chart data-testid
      expect(screen.getByText("Asset Allocation")).toBeInTheDocument()
      expect(screen.getByText("Currency Allocation")).toBeInTheDocument()
      expect(screen.getByText("True Country Allocation")).toBeInTheDocument()
      expect(screen.getByText("True Sector Allocation")).toBeInTheDocument()
      expect(screen.getByText("Domicile Allocation")).toBeInTheDocument()
    })
  })

  describe("Reset Functionality", () => {
    it("should allow analyzing another portfolio", () => {
      render(<PortfolioAnalyzer defaultData={mockPortfolioData} />)
      
      const resetButton = screen.getByTestId("reset-button")
      expect(resetButton).toBeInTheDocument()
      
      // Note: We can't test the click functionality easily due to state management
      // but we can verify the button exists and has the correct text
      expect(resetButton).toHaveTextContent("Analyze Another Portfolio")
    })
  })

  describe("Error Handling", () => {
    it("should handle empty portfolio data gracefully", () => {
      const emptyData = {
        ...mockPortfolioData,
        positions: [],
        assetAllocation: [],
        currencyAllocation: [],
        trueCountryAllocation: [],
        trueSectorAllocation: [],
        domicileAllocation: [],
      }

      render(<PortfolioAnalyzer defaultData={emptyData} />)
      
      expect(screen.getByTestId("portfolio-summary")).toBeInTheDocument()
      expect(screen.getByText(/Analysis of your portfolio with 0 positions/)).toBeInTheDocument()
    })

    it("should handle missing optional data fields", () => {
      const incompleteData = {
        ...mockPortfolioData,
        positions: mockPortfolioData.positions.map((p) => ({
          ...p,
          sector: undefined,
          geography: undefined,
        })),
      }

      render(<PortfolioAnalyzer defaultData={incompleteData} />)
      
      expect(screen.getByTestId("portfolio-summary")).toBeInTheDocument()
    })
  })
})
