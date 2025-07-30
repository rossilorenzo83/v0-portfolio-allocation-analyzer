// scripts/analyze-csv-structure.ts
// This script helps analyze the structure of a CSV file to aid in parsing.
// It attempts to detect headers, infer data types, and provides a sample parse.
// Run with: ts-node scripts/analyze-csv-structure.ts <path_to_csv_file>

import * as fs from "fs"
import Papa from "papaparse"
import { parsePortfolioCsv } from "../portfolio-parser" // Corrected import

interface ColumnInfo {
  name: string
  sampleValues: string[]
  inferredType: string
  uniqueValues: number
}

function inferType(values: string[]): string {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined && v.trim() !== "")
  if (nonNullValues.length === 0) return "unknown"

  const allNumbers = nonNullValues.every((v) => !isNaN(Number(v.replace(/[,']/g, ""))))
  if (allNumbers) return "number"

  const allDates = nonNullValues.every((v) => !isNaN(new Date(v).getTime()))
  if (allDates) return "date"

  return "string"
}

function detectCSVDelimiter(csvText: string): string {
  const delimiters = [",", ";", "\t", "|"]
  const lines = csvText.split(/\r?\n/).slice(0, 10) // Check first 10 lines

  let bestDelimiter = ","
  let maxScore = 0

  for (const delimiter of delimiters) {
    let score = 0
    let consistentColumns = true
    let columnCount = -1

    for (const line of lines) {
      if (!line.trim()) continue

      const columns = line.split(delimiter).length

      if (columnCount === -1) {
        columnCount = columns
      } else if (columnCount !== columns) {
        consistentColumns = false
      }

      if (columns > 1) {
        score += columns
        if (consistentColumns) score += 5
      }
    }

    if (score > maxScore) {
      maxScore = score
      bestDelimiter = delimiter
    }
  }
  return bestDelimiter
}

async function analyzeCsvStructure(filePath: string) {
  console.log(`--- Analyzing CSV Structure: ${filePath} ---`)

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`)
    process.exit(1)
  }

  const csvContent = fs.readFileSync(filePath, "utf-8")
  console.log(`File content loaded. Size: ${csvContent.length} bytes.`)

  const delimiter = detectCSVDelimiter(csvContent)
  console.log(`Detected delimiter: "${delimiter}"`)

  const { data, errors, meta } = Papa.parse(csvContent, {
    delimiter: delimiter,
    skipEmptyLines: true,
    dynamicTyping: false,
    header: false, // Parse without assuming header for initial analysis
  })

  if (errors.length > 0) {
    console.warn("PapaParse warnings:", errors)
  }

  const rows = data as string[][]

  if (rows.length === 0) {
    console.error("No rows found in CSV.")
    return
  }

  console.log(`Total rows parsed: ${rows.length}`)
  console.log(
    `Sample first 5 rows:\n`,
    rows
      .slice(0, 5)
      .map((row) => row.join(delimiter))
      .join("\n"),
  )

  // Attempt to detect header row
  let headerRowIndex = -1
  let headers: string[] = []
  const headerIndicators = [
    "symbol",
    "ticker",
    "isin",
    "quantity",
    "price",
    "value",
    "currency",
    "category",
    "domicile",
    "name",
    "description",
    "total",
    "gain",
    "loss",
  ]

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue
    const lowerCaseRow = row.map((cell) => cell.toLowerCase().trim())
    const matchCount = headerIndicators.filter((indicator) =>
      lowerCaseRow.some((cell) => cell.includes(indicator)),
    ).length

    if (matchCount >= 2) {
      // Require at least 2 indicators to consider it a header
      headerRowIndex = i
      headers = row.map((h) => h.trim())
      console.log(`\nPotential Header Row detected at index ${i}:`, headers)
      break
    }
  }

  if (headerRowIndex === -1) {
    console.warn("\nNo clear header row detected. Analyzing first row as potential header.")
    headers = rows[0].map((h) => h.trim())
    headerRowIndex = 0
  }

  // Analyze columns
  const dataRows = rows.slice(headerRowIndex + 1)
  if (dataRows.length === 0) {
    console.warn("No data rows found after header detection.")
    return
  }

  const columnInfos: ColumnInfo[] = headers.map((header, colIndex) => {
    const columnValues = dataRows.map((row) => row[colIndex])
    const uniqueValues = new Set(columnValues.filter((v) => v !== null && v !== undefined && v.trim() !== "")).size
    return {
      name: header,
      sampleValues: columnValues.slice(0, 5).filter((v) => v !== undefined),
      inferredType: inferType(columnValues),
      uniqueValues: uniqueValues,
    }
  })

  console.log("\n--- Column Analysis ---")
  columnInfos.forEach((col) => {
    console.log(`\nColumn: "${col.name}"`)
    console.log(`  Inferred Type: ${col.inferredType}`)
    console.log(`  Unique Values: ${col.uniqueValues}`)
    console.log(`  Sample Values: [${col.sampleValues.map((s) => `"${s}"`).join(", ")}]`)
  })

  console.log("\n--- Attempting Full Portfolio Parse ---")
  try {
    const parsedPortfolio = parsePortfolioCsv(csvContent) // Use parsePortfolioCsv directly
    console.log("\n✅ Full parse successful!")
    console.log("Parsed Positions Count:", parsedPortfolio.positions.length)
    console.log("Total Portfolio Value:", parsedPortfolio.accountOverview.totalValue)
    if (parsedPortfolio.positions.length > 0) {
      console.log("First parsed position:", parsedPortfolio.positions[0])
    }
  } catch (parseError: any) {
    console.error("\n❌ Full parse failed:", parseError.message)
    console.error("This indicates the current parser might need adjustments for this CSV format.")
  }

  console.log("\n--- CSV Structure Analysis Complete ---")
  console.log("Review the output above to understand your CSV structure and adjust parsing logic if needed.")
}

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error("Usage: ts-node scripts/analyze-csv-structure.ts <path_to_csv_file>")
  process.exit(1)
}

analyzeCsvStructure(args[0])
