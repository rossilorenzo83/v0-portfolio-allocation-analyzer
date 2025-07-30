import { parseSwissPortfolioPDF } from "../portfolio-parser"
import { jest } from "@jest/globals" // Import jest to declare the variable

// Mock the API service for this script to avoid actual network calls
// In a real scenario, you might want to fetch real data or use a more sophisticated mock
jest.mock("../lib/api-service", () => ({
  apiService: {
    getStockPrice: jest.fn(async (symbol: string) => {
      console.log(`Mocking getStockPrice for ${symbol}`)
      // Provide realistic mock data for common symbols
      if (symbol === "AAPL")
        return {
          symbol,
          price: 170.0,
          currency: "USD",
          change: 5.0,
          changePercent: 3.0,
          lastUpdated: new Date().toISOString(),
        }
      if (symbol === "MSFT")
        return {
          symbol,
          price: 420.0,
          currency: "USD",
          change: 10.0,
          changePercent: 2.5,
          lastUpdated: new Date().toISOString(),
        }
      if (symbol === "VWRL")
        return {
          symbol,
          price: 90.0,
          currency: "CHF",
          change: 1.0,
          changePercent: 1.1,
          lastUpdated: new Date().toISOString(),
        }
      if (symbol === "NESN")
        return {
          symbol,
          price: 100.0,
          currency: "CHF",
          change: 0.5,
          changePercent: 0.5,
          lastUpdated: new Date().toISOString(),
        }
      if (symbol === "IS3N")
        return {
          symbol,
          price: 35.0,
          currency: "CHF",
          change: 0.2,
          changePercent: 0.6,
          lastUpdated: new Date().toISOString(),
        }
      if (symbol === "VTI")
        return {
          symbol,
          price: 220.0,
          currency: "USD",
          change: 3.0,
          changePercent: 1.4,
          lastUpdated: new Date().toISOString(),
        }
      return {
        symbol,
        price: 100.0,
        currency: "USD",
        change: 0,
        changePercent: 0,
        lastUpdated: new Date().toISOString(),
      } // Default fallback
    }),
    getAssetMetadata: jest.fn(async (symbol: string) => {
      console.log(`Mocking getAssetMetadata for ${symbol}`)
      if (symbol === "AAPL")
        return {
          symbol,
          name: "Apple Inc.",
          sector: "Technology",
          country: "United States",
          currency: "USD",
          type: "Stock",
        }
      if (symbol === "MSFT")
        return {
          symbol,
          name: "Microsoft Corp.",
          sector: "Technology",
          country: "United States",
          currency: "USD",
          type: "Stock",
        }
      if (symbol === "VWRL")
        return {
          symbol,
          name: "Vanguard FTSE All-World",
          sector: "Diversified",
          country: "Global",
          currency: "USD",
          type: "ETF",
        }
      if (symbol === "NESN")
        return {
          symbol,
          name: "Nestlé SA",
          sector: "Consumer Staples",
          country: "Switzerland",
          currency: "CHF",
          type: "Stock",
        }
      if (symbol === "IS3N")
        return {
          symbol,
          name: "iShares Core MSCI World",
          sector: "Diversified",
          country: "Global",
          currency: "USD",
          type: "ETF",
        }
      if (symbol === "VTI")
        return {
          symbol,
          name: "Vanguard Total Stock Market",
          sector: "Diversified",
          country: "United States",
          currency: "USD",
          type: "ETF",
        }
      return {
        symbol,
        name: `${symbol} Company`,
        sector: "Unknown",
        country: "Unknown",
        currency: "USD",
        type: "Unknown",
      }
    }),
    getETFComposition: jest.fn(async (symbol: string) => {
      console.log(`Mocking getETFComposition for ${symbol}`)
      if (symbol === "VWRL") {
        return {
          symbol,
          currency: [
            { currency: "USD", weight: 60 },
            { currency: "EUR", weight: 20 },
            { currency: "JPY", weight: 10 },
            { currency: "GBP", weight: 10 },
          ],
          country: [
            { country: "United States", weight: 55 },
            { country: "Japan", weight: 10 },
            { country: "United Kingdom", weight: 8 },
            { country: "Switzerland", weight: 5 },
            { country: "Other", weight: 22 },
          ],
          sector: [
            { sector: "Technology", weight: 25 },
            { sector: "Financials", weight: 15 },
            { sector: "Healthcare", weight: 12 },
            { sector: "Consumer Discretionary", weight: 10 },
            { sector: "Industrials", weight: 8 },
            { sector: "Other", weight: 30 },
          ],
          holdings: [],
          domicile: "IE",
          withholdingTax: 15,
          lastUpdated: new Date().toISOString(),
        }
      }
      if (symbol === "VTI") {
        return {
          symbol,
          currency: [{ currency: "USD", weight: 100 }],
          country: [{ country: "United States", weight: 100 }],
          sector: [
            { sector: "Technology", weight: 28 },
            { sector: "Financials", weight: 13 },
            { sector: "Healthcare", weight: 14 },
            { sector: "Consumer Discretionary", weight: 12 },
            { sector: "Industrials", weight: 10 },
            { sector: "Other", weight: 23 },
          ],
          holdings: [],
          domicile: "US",
          withholdingTax: 15,
          lastUpdated: new Date().toISOString(),
        }
      }
      return {
        symbol,
        currency: [{ currency: "USD", weight: 100 }],
        country: [{ country: "Unknown", weight: 100 }],
        sector: [{ sector: "Mixed", weight: 100 }],
        holdings: [],
        domicile: "Unknown",
        withholdingTax: 30,
        lastUpdated: new Date().toISOString(),
      }
    }),
  },
}))

async function analyzeCsvStructure(csvText: string) {
  console.log("--- CSV Structure Analysis ---")
  console.log("Input CSV (first 500 chars):\n", csvText.substring(0, 500) + "...")

  const lines = csvText.split(/\r?\n/)
  console.log(`Total lines: ${lines.length}`)

  // Identify potential header rows
  console.log("\n--- Header Row Detection Attempt ---")
  const headerIndicators = [
    "symbole",
    "symbol",
    "ticker",
    "isin",
    "quantité",
    "quantity",
    "qty",
    "prix",
    "price",
    "cours",
    "valeur",
    "devise",
    "currency",
    "montant",
    "total",
    "chf",
    "usd",
    "eur",
    "libellé",
    "libelle",
    "description",
    "nom",
    "name",
    "g&p",
    "gain",
    "loss",
    "p&l",
    "positions %",
    "weight",
    "allocation",
  ]

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i]
    const cells = line.split(/[,;\t|]/) // Try common delimiters
    const lowerCaseCells = cells.map((c) => c.toLowerCase().trim())
    const matchCount = headerIndicators.filter((indicator) =>
      lowerCaseCells.some((cell) => cell.includes(indicator)),
    ).length
    console.log(`Line ${i}: "${line.substring(0, 80)}..." (Matches: ${matchCount})`)
    if (matchCount >= 2) {
      // A heuristic for a header row
      console.log(`  -> Potential Header Row Detected!`)
      console.log(`  Headers: [${cells.map((c) => `"${c.trim()}"`).join(", ")}]`)
      break
    }
  }

  // Analyze data rows (first few after potential header)
  console.log("\n--- Sample Data Rows Analysis ---")
  const startDataRow = 0 // Adjust if a header is consistently found at a specific row
  for (let i = startDataRow; i < Math.min(lines.length, startDataRow + 5); i++) {
    const line = lines[i]
    if (!line.trim()) continue

    console.log(`Line ${i}: "${line.substring(0, 80)}..."`)

    // Try parsing with comma
    const commaSplit = line.split(",")
    if (commaSplit.length > 1) {
      console.log(
        `  Comma split (${commaSplit.length} columns): [${commaSplit
          .slice(0, 5)
          .map((c) => `"${c.trim()}"`)
          .join(", ")}...]`,
      )
    }

    // Try parsing with semicolon
    const semicolonSplit = line.split(";")
    if (semicolonSplit.length > 1) {
      console.log(
        `  Semicolon split (${semicolonSplit.length} columns): [${semicolonSplit
          .slice(0, 5)
          .map((c) => `"${c.trim()}"`)
          .join(", ")}...]`,
      )
    }

    // Try to identify common data types
    const sampleCells = commaSplit.length > semicolonSplit.length ? commaSplit : semicolonSplit
    if (sampleCells.length > 0) {
      console.log("  Inferred data types:")
      sampleCells.slice(0, 5).forEach((cell, idx) => {
        const cleanedCell = cell.replace(/'/g, "").replace(/\s/g, "").replace(/,/g, ".").trim()
        let type = "string"
        if (!isNaN(Number(cleanedCell)) && cleanedCell !== "") {
          type = "number"
        } else if (cleanedCell.match(/^[A-Z]{2,6}$/)) {
          type = "symbol"
        } else if (cleanedCell.match(/^[A-Z]{3}$/)) {
          type = "currency"
        }
        console.log(`    Column ${idx}: "${cell.trim()}" -> ${type}`)
      })
    }
  }

  // Attempt to parse using the main portfolio parser
  console.log("\n--- Attempting Full Parse with portfolio-parser.ts ---")
  try {
    const result = await parseSwissPortfolioPDF(csvText)
    console.log("✅ Parsing successful!")
    console.log(`Found ${result.positions.length} positions.`)
    console.log(`Total Portfolio Value: ${result.accountOverview.totalValue.toFixed(2)} CHF`)
    if (result.positions.length > 0) {
      console.log("\nSample Positions:")
      result.positions.slice(0, 3).forEach((pos, index) => {
        console.log(
          `  ${index + 1}. Symbol: ${pos.symbol}, Name: ${pos.name}, Qty: ${pos.quantity}, Price: ${pos.price} ${pos.currency}, Total CHF: ${pos.totalValueCHF.toFixed(2)}`,
        )
      })
    }
  } catch (error) {
    console.error("❌ Parsing failed:", error instanceof Error ? error.message : String(error))
    console.error("This indicates the parser might need further adjustments for this CSV format.")
  }
  console.log("\n--- End of Analysis ---")
}

// Example usage (replace with your actual CSV content or fetch from a URL)
// For testing, you can paste a small CSV snippet here or fetch a known one.
// const sampleCsv = `Symbole,Nom,Quantité,Prix unitaire,Devise,Valeur totale CHF
// AAPL,Apple Inc.,100,150.00,USD,15000.00
// VWRL,Vanguard FTSE All-World,500,89.96,CHF,44980.00`;
// analyzeCsvStructure(sampleCsv);

// To run with the real CSV from the previous step:
async function runAnalysisOnRealCsv() {
  const csvUrl =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_30072025_09_52-2pA6mub91t5KX9pPZHD5lGMTwk5gD6.csv"
  try {
    console.log(`Fetching CSV from: ${csvUrl}`)
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`)
    }
    const csvText = await response.text()
    console.log("CSV fetched successfully. Starting analysis...")
    await analyzeCsvStructure(csvText)
  } catch (error) {
    console.error("Error during CSV fetch or analysis:", error)
  }
}

runAnalysisOnRealCsv()
