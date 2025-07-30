import { readFileSync } from "fs"
import { join } from "path"

// Define the structure for a portfolio item
interface PortfolioItem {
  symbol: string
  name: string
  quantity: number
  price: number
  value: number
  currency: string
  type: "Stock" | "ETF" | "Bond" | "Crypto" | "Other"
  sector?: string
  geography?: string
}

/**
 * Parses a CSV string into an array of PortfolioItem objects.
 * Enhanced to be more robust to header variations and missing columns.
 * @param csvText The CSV content as a string.
 * @returns An array of parsed PortfolioItem objects.
 */
function parseCsvToPortfolio(csvText: string): PortfolioItem[] {
  const lines = csvText.split("\n").filter((line) => line.trim())
  if (lines.length === 0) {
    console.warn("CSV is empty or contains only blank lines.")
    return []
  }

  // Normalize headers: trim whitespace, convert to lowercase, remove special characters
  const rawHeaders = lines[0].split(",").map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""),
  )
  console.log(
    "Detected raw headers:",
    lines[0].split(",").map((h) => h.trim()),
  )
  console.log("Normalized headers:", rawHeaders)

  // Define expected header mappings with common variations
  const headerMap: Record<string, string> = {
    symbol: "symbol",
    ticker: "symbol",
    stock: "symbol",
    name: "name",
    description: "name",
    company: "name",
    quantity: "quantity",
    qty: "quantity",
    shares: "quantity",
    price: "price",
    unitprice: "price",
    cost: "price", // Assuming cost per share
    currency: "currency",
    ccy: "currency",
    type: "type",
    assettype: "type",
    category: "type",
    sector: "sector",
    industry: "sector",
    geography: "geography",
    country: "geography",
    region: "geography",
    value: "value", // If 'value' is provided, use it, otherwise calculate
    marketvalue: "value",
  }

  // Create an index map for the actual CSV headers
  const headerIndexMap: Record<string, number> = {}
  rawHeaders.forEach((header, index) => {
    const mappedHeader = headerMap[header]
    if (mappedHeader && headerIndexMap[mappedHeader] === undefined) {
      // Prioritize first occurrence
      headerIndexMap[mappedHeader] = index
    }
  })

  console.log("Header index map:", headerIndexMap)

  const portfolioData: PortfolioItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    if (values.length === 0 || values.every((v) => v === "")) {
      console.warn(`Skipping empty line at row ${i + 1}.`)
      continue
    }

    const item: Partial<PortfolioItem> = {}

    const getVal = (key: string) => {
      const index = headerIndexMap[key]
      return index !== undefined && index < values.length ? values[index] : undefined
    }

    item.symbol = getVal("symbol") || ""
    item.name = getVal("name") || ""
    item.currency = getVal("currency") || "USD" // Default to USD if not found
    item.type = (getVal("type") as PortfolioItem["type"]) || "Stock" // Default to Stock
    item.sector = getVal("sector") || "Unknown"
    item.geography = getVal("geography") || "Unknown"

    // Parse numerical values, handling potential errors
    item.quantity = Number.parseFloat(getVal("quantity") || "0")
    item.price = Number.parseFloat(getVal("price") || "0")
    item.value = Number.parseFloat(getVal("value") || "0") // Use provided value if available

    // If value is not provided or is zero, calculate it from quantity and price
    if (isNaN(item.value) || item.value === 0) {
      item.value = (isNaN(item.quantity) ? 0 : item.quantity) * (isNaN(item.price) ? 0 : item.price)
    }

    // Basic validation for essential fields
    if (!item.symbol && !item.name) {
      console.warn(`Skipping row ${i + 1} due to missing symbol and name: ${lines[i]}`)
      continue
    }
    if (isNaN(item.quantity) || isNaN(item.price) || isNaN(item.value)) {
      console.warn(`Skipping row ${i + 1} due to invalid numerical data: ${lines[i]}`)
      continue
    }

    portfolioData.push(item as PortfolioItem)
    console.log(`Parsed row ${i + 1}:`, item)
  }

  return portfolioData
}

async function analyzeRealCsv() {
  console.log("--- Analyzing Real CSV Structure ---")

  // Path to the sample CSV file
  const sampleCsvPath = join(process.cwd(), "__tests__", "test-data", "sample-portfolio.csv")

  try {
    const csvContent = readFileSync(sampleCsvPath, "utf8")
    console.log("\n--- Raw CSV Content (first 200 chars) ---")
    console.log(csvContent.substring(0, 200) + "...")

    console.log("\n--- Parsing CSV ---")
    const portfolio = parseCsvToPortfolio(csvContent)

    console.log("\n--- Parsed Portfolio Data ---")
    if (portfolio.length > 0) {
      portfolio.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, item)
      })
      const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0)
      console.log(
        `\nTotal Portfolio Value: ${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
      )
    } else {
      console.log("No valid positions found after parsing.")
    }
  } catch (error) {
    console.error("Error analyzing CSV structure:", error)
  }

  console.log("\n--- CSV Structure Analysis Complete ---")
}

analyzeRealCsv()
