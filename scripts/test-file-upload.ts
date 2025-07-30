import { readFileSync } from "fs"
import { join } from "path"
import { JSDOM } from "jsdom"
import { PortfolioAnalyzer } from "../portfolio-analyzer" // Assuming PortfolioAnalyzer is exported

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

// Helper to simulate file upload event
const createMockFileEvent = (filePath: string, fileName: string, mimeType: string) => {
  const fileContent = readFileSync(filePath, "utf8")
  const file = new File([fileContent], fileName, { type: mimeType })

  return {
    target: {
      files: [file],
    },
  } as React.ChangeEvent<HTMLInputElement>
}

async function testFileUpload() {
  console.log("--- Testing File Upload ---")

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

  // Path to a dummy CSV file for testing
  const dummyCsvPath = join(process.cwd(), "__tests__", "test-data", "sample-portfolio.csv")
  const dummyCsvFileName = "sample-portfolio.csv"

  try {
    console.log(`Attempting to upload ${dummyCsvFileName}...`)
    const event = createMockFileEvent(dummyCsvPath, dummyCsvFileName, "text/csv")

    // Simulate the file upload
    await act(async () => {
      await portfolioAnalyzerInstance.props.handleFileUpload(event)
    })

    // Check if portfolio data was processed (this would require inspecting the component's state,
    // which is not directly exposed in a functional component without testing utilities like @testing-library/react)
    // For a simple script, we can just log success if no error occurred.
    console.log("File upload simulated successfully. Check the UI for parsed data.")
  } catch (error) {
    console.error("Error during file upload test:", error)
  } finally {
    // Clean up
    act(() => {
      root.unmount()
    })
    console.log("--- File Upload Test Complete ---")
  }
}

// This script is meant to be run in a Node.js environment with JSDOM.
// It's a simplified test and might not fully capture all React state updates.
// For robust testing, use Jest and React Testing Library.
testFileUpload()
