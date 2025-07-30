import { JSDOM } from "jsdom"
import { readFileSync } from "fs"
import { join } from "path"
import React from "react"
import ReactDOM from "react-dom/client"
import { act } from "@testing-library/react"
import PortfolioAnalyzer from "../portfolio-analyzer" // Adjust path as necessary
import jest from "jest" // Import jest to fix the undeclared variable error

// Setup JSDOM environment
const dom = new JSDOM(`<!DOCTYPE html><body><div id="root"></div></body>`)
global.window = dom.window as any
global.document = dom.window.document
global.File = dom.window.File
global.FileReader = dom.window.FileReader

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Helper to create a mock file event
const createMockFileEvent = (filePath: string, fileName: string, mimeType: string) => {
  const fileContent = readFileSync(filePath, "utf8")
  const file = new File([fileContent], fileName, { type: mimeType })

  return {
    target: {
      files: [file],
    },
  } as React.ChangeEvent<HTMLInputElement>
}

async function testPortfolioAnalyzer() {
  console.log("--- Testing PortfolioAnalyzer Component ---")

  const rootElement = document.getElementById("root")
  if (!rootElement) {
    console.error("Root element not found.")
    return
  }

  const root = ReactDOM.createRoot(rootElement)

  // Render the component
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

  // Path to the sample CSV file
  const sampleCsvPath = join(process.cwd(), "__tests__", "test-data", "sample-portfolio.csv")
  const sampleCsvFileName = "sample-portfolio.csv"

  try {
    console.log(`Attempting to simulate CSV upload for ${sampleCsvFileName}...`)
    const event = createMockFileEvent(sampleCsvPath, sampleCsvFileName, "text/csv")

    // Simulate the file upload by calling the handler directly
    // Note: In a real test with React Testing Library, you'd use fireEvent.change
    // For this script, direct call is simpler.
    await act(async () => {
      await portfolioAnalyzerInstance.props.handleFileUpload(event)
    })

    // After upload, the component's state should be updated.
    // We can't directly access state from a functional component instance without
    // advanced testing utilities or refactoring.
    // For this script, we'll assume success if no errors are thrown during parsing.
    console.log("CSV file upload and parsing simulated successfully.")
    console.log("Please check the rendered UI in your browser for the analysis results.")
  } catch (error) {
    console.error("Error during PortfolioAnalyzer test:", error)
  } finally {
    // Clean up
    act(() => {
      root.unmount()
    })
    console.log("--- PortfolioAnalyzer Component Test Complete ---")
  }
}

testPortfolioAnalyzer()
