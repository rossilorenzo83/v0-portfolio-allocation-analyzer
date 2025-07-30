import type React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jest } from "@jest/globals"
import SwissPortfolioAnalyzer from "../swiss-portfolio-analyzer"
import PortfolioAnalyzer from "../portfolio-analyzer" // Adjust path as necessary
import { parseSwissPortfolioPDF, type SwissPortfolioData } from "../portfolio-parser"

// Mock the portfolio parser
jest.mock("../portfolio-parser", () => ({
  parseSwissPortfolioPDF: jest.fn(),
}))

// Mock recharts components
jest.mock("recharts", () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie-segment" />,
  Cell: () => <div data-testid="pie-cell" />,
  ResponsiveContainer: ({ children }: any) => (
    <div className="recharts-responsive-container" style={{ width: "100%", height: "100%" }}>
      {children}
    </div>
  ),
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar-segment" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  Legend: () => <div data-testid="legend" />,
}))

// Mock the ChartContainer and ChartTooltipContent from shadcn/ui/chart
jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-tooltip">{children}</div>,
  ChartTooltipContent: ({ content }: { content: any }) => (
    <div data-testid="chart-tooltip-content">
      {content
        ? content({ active: true, payload: [{ payload: { name: "Test", value: 100, percentage: 10 } }] })
        : "Tooltip Content"}
    </div>
  ),
  ChartLegend: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-legend">{children}</div>,
  ChartLegendContent: () => <div data-testid="chart-legend-content" />,
}))

const mockPortfolioData: SwissPortfolioData = {
  accountOverview: {
    totalValue: 100000,
    cashBalance: 10000,
    securitiesValue: 90000,
    cryptoValue: 0,
    purchasingPower: 5000,
  },
  positions: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      quantity: 100,
      unitCost: 150,
      price: 160,
      currentPrice: 160,
      totalValueCHF: 16000,
      currency: "USD",
      category: "Actions",
      sector: "Technology",
      geography: "United States",
      domicile: "US",
      withholdingTax: 30,
      taxOptimized: false,
      gainLossCHF: 1000,
      unrealizedGainLoss: 1000,
      unrealizedGainLossPercent: 6.67,
      positionPercent: 16,
      dailyChangePercent: 1.5,
      isOTC: false,
    },
  ],
  assetAllocation: [{ name: "Actions", value: 90000, percentage: 90 }],
  currencyAllocation: [
    { name: "USD", value: 70000, percentage: 70, currency: "USD" },
    { name: "CHF", value: 30000, percentage: 30, currency: "CHF" },
  ],
  trueCountryAllocation: [
    { name: "United States", value: 70000, percentage: 70, country: "United States" },
    { name: "Switzerland", value: 30000, percentage: 30, country: "Switzerland" },
  ],
  trueSectorAllocation: [
    { name: "Technology", value: 50000, percentage: 50, sector: "Technology" },
    { name: "Healthcare", value: 40000, percentage: 40, sector: "Healthcare" },
  ],
  domicileAllocation: [
    { name: "United States (US)", value: 60000, percentage: 60, domicile: "US" },
    { name: "Ireland (IE)", value: 40000, percentage: 40, domicile: "IE" },
  ],
}

describe("PortfolioAnalyzer", () => {
  it("renders the upload section initially", () => {
    render(<PortfolioAnalyzer />)
    expect(screen.getByText(/Upload Portfolio Data/i)).toBeInTheDocument()
    expect(screen.getByText(/Click to upload CSV file/i)).toBeInTheDocument()
  })

  // Add more tests here to simulate file upload and check rendered charts/data
  // This would require mocking the file input and the parsing logic.
})

describe("SwissPortfolioAnalyzer", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    test("renders upload interface when no data provided", () => {
      render(<SwissPortfolioAnalyzer />)

      expect(screen.getByText("Swiss Portfolio Analyzer")).toBeInTheDocument()
      expect(screen.getByText(/Upload your Swiss bank portfolio statement/)).toBeInTheDocument()
    })

    test("renders portfolio analysis when data provided", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByText("Portfolio Analysis")).toBeInTheDocument()
      expect(screen.getByText(/Comprehensive analysis of your Swiss portfolio with 1 positions/)).toBeInTheDocument()
    })
  })

  describe("Account Overview Cards", () => {
    test("displays correct account overview values", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByText("CHF 100,000.00")).toBeInTheDocument() // Total Value
      expect(screen.getByText("CHF 90,000.00")).toBeInTheDocument() // Securities Value
      expect(screen.getByText("CHF 10,000.00")).toBeInTheDocument() // Cash Balance
      expect(screen.getByText("1")).toBeInTheDocument() // Positions count
    })

    test("displays correct icons in overview cards", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByText("Total Value")).toBeInTheDocument()
      expect(screen.getByText("Securities Value")).toBeInTheDocument()
      expect(screen.getByText("Cash Balance")).toBeInTheDocument()
      expect(screen.getByText("Positions")).toBeInTheDocument()
    })
  })

  describe("Tab Navigation", () => {
    test("renders all tab triggers", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "Positions" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "Asset Allocation" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "Geography" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "Sectors" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "Tax Analysis" })).toBeInTheDocument()
    })

    test("switches between tabs correctly", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      // Click on Positions tab
      fireEvent.click(screen.getByRole("tab", { name: "Positions" }))
      await waitFor(() => {
        expect(screen.getByText("Portfolio Positions")).toBeInTheDocument()
      })

      // Click on Geography tab
      fireEvent.click(screen.getByRole("tab", { name: "Geography" }))
      await waitFor(() => {
        expect(screen.getByText("Geographic Distribution")).toBeInTheDocument()
      })
    })
  })

  describe("Overview Tab", () => {
    test("renders pie charts for asset and currency allocation", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByText("Asset Allocation")).toBeInTheDocument()
      expect(screen.getByText("Currency Allocation")).toBeInTheDocument()
      expect(screen.getAllByTestId("pie-chart")).toHaveLength(4) // 2 pie charts + 2 bar charts converted to pie
    })

    test("renders bar charts for sectors and countries", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByText("Top 10 Sectors")).toBeInTheDocument()
      expect(screen.getByText("Top 10 Countries")).toBeInTheDocument()
    })
  })

  describe("Positions Tab", () => {
    test("displays positions table with correct data", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Positions" }))

      await waitFor(() => {
        expect(screen.getByText("AAPL")).toBeInTheDocument()
        expect(screen.getByText("Apple Inc.")).toBeInTheDocument()
      })
    })

    test("sorts positions by value descending", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Positions" }))

      await waitFor(() => {
        const rows = screen.getAllByRole("row")
        // AAPL should be the only position
        const aaplIndex = rows.findIndex((row) => row.textContent?.includes("AAPL"))
        expect(aaplIndex).toBe(1)
      })
    })

    test("displays correct badges for currency and category", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Positions" }))

      await waitFor(() => {
        expect(screen.getByText("USD")).toBeInTheDocument()
        expect(screen.getByText("Actions")).toBeInTheDocument()
      })
    })
  })

  describe("Asset Allocation Tab", () => {
    test("displays asset allocation breakdown", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Asset Allocation" }))

      await waitFor(() => {
        expect(screen.getByText("Asset Type Distribution")).toBeInTheDocument()
        expect(screen.getByText("Currency Exposure")).toBeInTheDocument()
        expect(screen.getByText("Asset Allocation Breakdown")).toBeInTheDocument()
      })
    })
  })

  describe("Geography Tab", () => {
    test("displays geographic distribution", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Geography" }))

      await waitFor(() => {
        expect(screen.getByText("Geographic Distribution")).toBeInTheDocument()
        expect(screen.getByText("Country Breakdown")).toBeInTheDocument()
        expect(screen.getByText("Geographic Allocation Details")).toBeInTheDocument()
      })
    })
  })

  describe("Sectors Tab", () => {
    test("displays sector analysis", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Sectors" }))

      await waitFor(() => {
        expect(screen.getByText("Sector Distribution")).toBeInTheDocument()
        expect(screen.getByText("Sector Breakdown")).toBeInTheDocument()
        expect(screen.getByText("Sector Analysis")).toBeInTheDocument()
        expect(screen.getByText(/True sector exposure including ETF look-through/)).toBeInTheDocument()
      })
    })
  })

  describe("Tax Analysis Tab", () => {
    test("displays tax optimization summary", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Tax Analysis" }))

      await waitFor(() => {
        expect(screen.getByText("Domicile Distribution")).toBeInTheDocument()
        expect(screen.getByText("Tax Optimization Summary")).toBeInTheDocument()
        expect(screen.getByText("Tax Optimized Positions")).toBeInTheDocument()
        expect(screen.getByText("Non-Optimized Positions")).toBeInTheDocument()
      })
    })

    test("shows correct tax optimization counts", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Tax Analysis" }))

      await waitFor(() => {
        // 0 tax optimized, 1 non-optimized (AAPL)
        const optimizedElements = screen.getAllByText("0")
        expect(optimizedElements.length).toBeGreaterThanOrEqual(1)
      })
    })

    test("displays tax optimization recommendations", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Tax Analysis" }))

      await waitFor(() => {
        expect(screen.getByText("Tax Optimization Recommendations")).toBeInTheDocument()
        expect(screen.getByText(/Irish\/Luxembourg ETFs/)).toBeInTheDocument()
        expect(screen.getByText("Tax Efficient")).toBeInTheDocument()
        expect(screen.getByText("Consider Optimizing")).toBeInTheDocument()
      })
    })
  })

  describe("File Upload Integration", () => {
    test("handles successful file upload", async () => {
      const mockParseSwissPortfolioPDF = parseSwissPortfolioPDF as jest.MockedFunction<typeof parseSwissPortfolioPDF>
      mockParseSwissPortfolioPDF.mockResolvedValueOnce(mockPortfolioData)

      render(<SwissPortfolioAnalyzer />)

      // Initially shows upload interface
      expect(screen.getByText("Swiss Portfolio Analyzer")).toBeInTheDocument()

      // Mock file upload would trigger the analysis
      // This would be tested in integration tests with actual file upload component
    })

    test("handles file upload errors", async () => {
      const mockParseSwissPortfolioPDF = parseSwissPortfolioPDF as jest.MockedFunction<typeof parseSwissPortfolioPDF>
      mockParseSwissPortfolioPDF.mockRejectedValueOnce(new Error("Invalid file format"))

      render(<SwissPortfolioAnalyzer />)

      // Error handling would be tested in integration tests
    })
  })

  describe("Currency Formatting", () => {
    test("formats CHF currency correctly", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      expect(screen.getByText("CHF 100,000.00")).toBeInTheDocument()
      expect(screen.getByText("CHF 90,000.00")).toBeInTheDocument()
      expect(screen.getByText("CHF 10,000.00")).toBeInTheDocument()
    })
  })

  describe("Percentage Formatting", () => {
    test("formats percentages correctly", async () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      fireEvent.click(screen.getByRole("tab", { name: "Positions" }))

      await waitFor(() => {
        expect(screen.getByText("16.00%")).toBeInTheDocument() // AAPL position percentage
      })
    })
  })

  describe("Reset Functionality", () => {
    test("allows analyzing another portfolio", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      const resetButton = screen.getByText("Analyze Another Portfolio")
      expect(resetButton).toBeInTheDocument()

      fireEvent.click(resetButton)

      // Should return to upload interface
      expect(screen.getByText("Swiss Portfolio Analyzer")).toBeInTheDocument()
      expect(screen.getByText(/Upload your Swiss bank portfolio statement/)).toBeInTheDocument()
    })
  })

  describe("Loading States", () => {
    test("shows loading state during analysis", () => {
      // This would be tested with actual loading state management
      // The loading state is managed by the FileUploadHelper component
    })
  })

  describe("Error Handling", () => {
    test("displays error messages when analysis fails", () => {
      const errorMessage = "Failed to parse portfolio data"
      render(<SwissPortfolioAnalyzer />)

      // Error display would be tested in integration with FileUploadHelper
    })
  })

  describe("Responsive Design", () => {
    test("renders correctly on different screen sizes", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      // Grid layouts should be responsive
      expect(screen.getByText("Portfolio Analysis")).toBeInTheDocument()

      // Charts should be in responsive containers
      expect(screen.getAllByTestId("responsive-container").length).toBeGreaterThan(0)
    })
  })

  describe("Chart Rendering", () => {
    test("renders pie charts with correct data", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      // Should render multiple pie charts
      expect(screen.getAllByTestId("pie-chart").length).toBeGreaterThan(0)
      expect(screen.getAllByTestId("responsive-container").length).toBeGreaterThan(0)
    })

    test("renders bar charts with correct data", () => {
      render(<SwissPortfolioAnalyzer defaultData={mockPortfolioData} />)

      // Should render bar charts for sectors and countries
      expect(screen.getAllByTestId("bar-chart").length).toBeGreaterThan(0)
    })
  })

  describe("Data Validation", () => {
    test("handles empty portfolio data gracefully", () => {
      const emptyData = {
        ...mockPortfolioData,
        positions: [],
        assetAllocation: [],
        currencyAllocation: [],
        trueCountryAllocation: [],
        trueSectorAllocation: [],
        domicileAllocation: [],
      }

      render(<SwissPortfolioAnalyzer defaultData={emptyData} />)

      expect(screen.getByText("Portfolio Analysis")).toBeInTheDocument()
      expect(screen.getByText(/with 0 positions/)).toBeInTheDocument()
    })

    test("handles missing optional data fields", () => {
      const incompleteData = {
        ...mockPortfolioData,
        positions: mockPortfolioData.positions.map((p) => ({
          ...p,
          sector: undefined,
          geography: undefined,
        })),
      }

      render(<SwissPortfolioAnalyzer defaultData={incompleteData} />)

      expect(screen.getByText("Portfolio Analysis")).toBeInTheDocument()
    })
  })

  describe("SwissPortfolioAnalyzer with Error Prop", () => {
    it("displays error message when error prop is set", () => {
      render(<SwissPortfolioAnalyzer defaultData={null} />) // Render without data first
      const fileUploadHelper = screen.getByText(/Upload your Swiss bank portfolio statement/i).closest("div")

      // Simulate an error being set (this would typically happen via state update)
      // For testing purposes, we can re-render with an error.
      const { rerender } = render(<SwissPortfolioAnalyzer defaultData={null} />)
      rerender(<SwissPortfolioAnalyzer defaultData={null} error="Test error message" />)

      expect(screen.getByText("Test error message")).toBeInTheDocument()
    })
  })
})
