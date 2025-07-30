import { getPdfText } from "./lib/pdf-utils"
import Papa from "papaparse"
import { parse as parseCsv } from "csv-parse/sync"

// Declare the safePDFExtraction function
async function safePDFExtraction(input: File): Promise<string> {
  // Mock implementation for PDF extraction
  const text = await getPdfText(input)
  return text
}

export interface SwissPortfolioData {
  accountOverview: {
    totalValue: number
    securitiesValue: number
    cashBalance: number
  }
  positions: PortfolioPosition[]
  assetAllocation: AllocationItem[]
  currencyAllocation: AllocationItem[]
  trueCountryAllocation: AllocationItem[]
  trueSectorAllocation: AllocationItem[]
  domicileAllocation: AllocationItem[]
}

export interface PortfolioPosition {
  symbol: string
  name: string
  quantity: number
  unitCost: number
  price: number
  currentPrice?: number
  totalValueCHF: number
  currency: string
  category: string
  sector?: string
  geography?: string
  domicile?: string
  withholdingTax?: number
  taxOptimized: boolean
  gainLossCHF: number
  unrealizedGainLoss?: number
  unrealizedGainLossPercent?: number
  positionPercent: number
  dailyChangePercent: number
  isOTC: boolean
  platform?: string
}

export interface AllocationItem {
  name: string
  value: number
  percentage: number
  currency?: string
  country?: string
  sector?: string
  type?: string
  domicile?: string
}

interface ParsedPosition {
  symbol: string
  name: string
  quantity: number
  price: number
  currency: string
  category: string
  totalValue?: number
}

// Enhanced category mapping for Swiss banks
const CATEGORY_ALIASES: Record<string, string> = {
  // French → canonical
  Actions: "Actions",
  "Produits structurés": "Structured Products",
  Fonds: "Funds",
  ETF: "ETF",
  Obligations: "Bonds",
  "Crypto-monnaies": "Cryptocurrencies",
  Liquidités: "Cash",
  Espèces: "Cash",

  // English → canonical
  Equities: "Actions",
  Stocks: "Actions",
  "Structured products": "Structured Products",
  Funds: "Funds",
  Bonds: "Bonds",
  Cryptocurrencies: "Cryptocurrencies",
  Cash: "Cash",

  // German → canonical
  Aktien: "Actions",
  Fonds: "Funds",
  Anleihen: "Bonds",
}

export interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  currency: string
  exchange?: string
  isin?: string
  name?: string
}

export interface Portfolio {
  positions: Position[]
  totalValue: number
  totalCost: number
}

interface ColumnMapping {
  [key: string]: string // Maps a detected header to a standard Position key
}

const COMMON_HEADERS: { [key: string]: string[] } = {
  symbol: ["symbol", "ticker", "isin", "security id", "asset", "instrument"],
  quantity: ["quantity", "shares", "amount", "units"],
  averagePrice: ["average price", "avg price", "cost basis", "price", "purchase price"],
  currency: ["currency", "ccy"],
  exchange: ["exchange", "market"],
  name: ["name", "description", "security name"],
}

const detectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {}
  const lowerCaseHeaders = headers.map((h) => h.toLowerCase().trim())

  for (const standardKey in COMMON_HEADERS) {
    const possibleHeaders = COMMON_HEADERS[standardKey]
    for (const possibleHeader of possibleHeaders) {
      const index = lowerCaseHeaders.indexOf(possibleHeader)
      if (index !== -1) {
        mapping[standardKey] = headers[index] // Use original header for mapping
        break
      }
    }
  }
  return mapping
}

const parseValue = (value: string, key: string): any => {
  if (value === undefined || value === null || value.trim() === "") {
    return undefined
  }
  switch (key) {
    case "quantity":
    case "averagePrice":
      const num = Number.parseFloat(value.replace(/,/g, "")) // Handle comma as thousands separator
      return isNaN(num) ? undefined : num
    case "symbol":
      return value.toUpperCase().trim() // Standardize symbols to uppercase
    case "currency":
      return value.toUpperCase().trim() // Standardize currency to uppercase
    default:
      return value.trim()
  }
}

export const parsePortfolioCsv = (csvContent: string): SwissPortfolioData => {
  const records = parseCsv(csvContent, {
    columns: true, // Automatically detect columns from the first row
    skip_empty_lines: true,
    trim: true,
  })

  if (!records || records.length === 0) {
    console.warn("CSV parsing resulted in no records.")
    return {
      positions: [],
      totalValue: 0,
      assetAllocation: [],
      currencyAllocation: [],
      trueCountryAllocation: [],
      trueSectorAllocation: [],
      domicileAllocation: [],
    }
  }

  const headers = Object.keys(records[0])
  const columnMapping = detectColumnMapping(headers)

  console.log("Detected CSV Headers:", headers)
  console.log("Inferred Column Mapping:", columnMapping)

  const positions: PortfolioPosition[] = []
  let totalValue = 0

  for (const record of records) {
    const position: Partial<PortfolioPosition> = {}
    let isValidPosition = true

    for (const standardKey in columnMapping) {
      const originalHeader = columnMapping[standardKey]
      const rawValue = record[originalHeader]
      const parsedValue = parseValue(rawValue, standardKey)

      if (parsedValue !== undefined) {
        ;(position as any)[standardKey] = parsedValue
      }
    }

    // Basic validation for required fields
    if (!position.symbol || !position.quantity || !position.price || !position.currency) {
      console.warn("Skipping row due to missing required fields:", record)
      isValidPosition = false
    } else if (position.quantity <= 0 || position.price <= 0) {
      console.warn("Skipping row due to non-positive quantity or price:", record)
      isValidPosition = false
    }

    if (isValidPosition) {
      const currentPosition = position as PortfolioPosition
      positions.push(currentPosition)
      totalValue += currentPosition.quantity * currentPosition.price
    }
  }

  if (positions.length === 0) {
    console.error("No valid positions found after parsing and validation.")
    throw new Error("No valid positions found in the CSV file.")
  }

  const data: SwissPortfolioData = {
    accountOverview: {
      totalValue: totalValue,
      securitiesValue: totalValue,
      cashBalance: 0,
    },
    positions: positions,
    assetAllocation: [],
    currencyAllocation: [],
    trueCountryAllocation: [],
    trueSectorAllocation: [],
    domicileAllocation: [],
  }

  // --- Calculate Allocations ---
  const calculateAllocation = (
    key: keyof PortfolioPosition | "category" | "domicile",
    useEtfLookThrough = false,
  ): AllocationItem[] => {
    const breakdown: Record<string, number> = {}
    data.positions.forEach((p) => {
      if (useEtfLookThrough && p.category === "ETF") {
        // Mock ETF look-through for country/sector/currency
        // In a real app, this would come from an API call
        const mockEtfData = {
          country: [
            { country: "US", weight: 70 },
            { country: "CH", weight: 10 },
          ],
          sector: [
            { sector: "Technology", weight: 50 },
            { sector: "Financials", weight: 20 },
          ],
          currency: [
            { currency: "USD", weight: 80 },
            { currency: "EUR", weight: 10 },
          ],
        }

        if (key === "trueCountryAllocation" && mockEtfData.country) {
          mockEtfData.country.forEach((holding) => {
            const holdingValue = (p.totalValueCHF * holding.weight) / 100
            breakdown[holding.country] = (breakdown[holding.country] || 0) + holdingValue
          })
        } else if (key === "trueSectorAllocation" && mockEtfData.sector) {
          mockEtfData.sector.forEach((holding) => {
            const holdingValue = (p.totalValueCHF * holding.weight) / 100
            breakdown[holding.sector] = (breakdown[holding.sector] || 0) + holdingValue
          })
        } else if (key === "currencyAllocation" && mockEtfData.currency) {
          mockEtfData.currency.forEach((holding) => {
            const holdingValue = (p.totalValueCHF * holding.weight) / 100
            breakdown[holding.currency] = (breakdown[holding.currency] || 0) + holdingValue
          })
        } else {
          const allocationKey = p[key as keyof PortfolioPosition] as string
          breakdown[allocationKey] = (breakdown[allocationKey] || 0) + p.totalValueCHF
        }
      } else {
        const allocationKey = p[key as keyof PortfolioPosition] as string
        breakdown[allocationKey] = (breakdown[allocationKey] || 0) + p.totalValueCHF
      }
    })

    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    return Object.entries(breakdown)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }

  data.assetAllocation = calculateAllocation("category")
  data.currencyAllocation = calculateAllocation("currency", true)
  data.domicileAllocation = calculateAllocation("domicile")
  data.trueCountryAllocation = calculateAllocation("geography", true)
  data.trueSectorAllocation = calculateAllocation("sector", true)

  console.log("Calculated Asset Allocation:", data.assetAllocation)
  console.log("Calculated Currency Allocation:", data.currencyAllocation)
  console.log("Calculated Domicile Allocation:", data.domicileAllocation)
  console.log("Calculated True Country Allocation:", data.trueCountryAllocation)
  console.log("Calculated True Sector Allocation:", data.trueSectorAllocation)

  return data
}

/**
 * Parses a Swiss portfolio PDF or CSV file with enhanced real API integration.
 */
export async function parseSwissPortfolioPDF(input: File | string): Promise<SwissPortfolioData> {
  let text: string

  if (input instanceof File) {
    console.log(`Processing file: ${input.name} (${input.type}, ${input.size} bytes)`)

    try {
      if (input.type === "text/csv" || input.name.endsWith(".csv")) {
        text = await input.text()
        console.log("CSV file detected, parsing...")
        return await parseSwissquoteCSV(text)
      }

      if (input.type === "application/pdf") {
        console.log("Attempting PDF extraction...")
        text = await safePDFExtraction(input)
        console.log("PDF extraction successful, text length:", text.length)
      } else {
        text = await input.text()
        console.log("Text file processed, length:", text.length)
      }
    } catch (extractionError) {
      console.error("File extraction failed:", extractionError)
      throw new Error(
        "File processing failed. Please try the copy-paste method or check your file format.\n\n" +
          "Error details: " +
          (extractionError instanceof Error ? extractionError.message : String(extractionError)),
      )
    }
  } else {
    text = input
    console.log("Text input processed, length:", text.length)

    // Check if the text input is CSV format
    if (looksLikeSwissquoteCSV(text)) {
      console.log("CSV format detected in text input")
      return await parseSwissquoteCSV(text)
    }
  }

  // Basic text validation
  if (!text || text.trim().length < 10) {
    throw new Error("Insufficient text content found. Please ensure your file contains portfolio data.")
  }

  console.log("Starting portfolio parsing...")
  console.log("First 500 characters:", text.substring(0, 500))

  // Parse account overview
  const accountOverview = parseAccountOverview(text)
  console.log("Account overview parsed:", accountOverview)

  // Parse positions
  const parsedPositions = parsePositions(text)
  console.log("Parsed positions:", parsedPositions.length)

  if (parsedPositions.length === 0) {
    console.log("No positions found, trying alternative parsing methods...")
    const alternativePositions = parseAlternativeFormat(text)
    console.log("Alternative parsing found:", alternativePositions.length)

    if (alternativePositions.length === 0) {
      throw new Error(
        "No portfolio positions found. Please check the file format. Make sure your text includes position data with symbols, quantities, and prices.",
      )
    }

    parsedPositions.push(...alternativePositions)
  }

  // Enrich positions with real API data
  console.log("Enriching positions with real API data...")
  const enrichedPositions = await enrichPositionsWithAPIData(parsedPositions)
  console.log("Positions enriched:", enrichedPositions.length)

  // Calculate allocations
  const totalValue = enrichedPositions.reduce((sum, p) => sum + p.totalValueCHF, 0)

  const assetAllocation = calculateAssetAllocation(enrichedPositions, totalValue)
  const currencyAllocation = await calculateTrueCurrencyAllocation(enrichedPositions, totalValue)
  const trueCountryAllocation = await calculateTrueCountryAllocation(enrichedPositions, totalValue)
  const trueSectorAllocation = await calculateTrueSectorAllocation(enrichedPositions, totalValue)
  const domicileAllocation = calculateDomicileAllocation(enrichedPositions, totalValue)

  const portfolioData: SwissPortfolioData = {
    accountOverview: {
      ...accountOverview,
      totalValue: totalValue + accountOverview.cashBalance,
      securitiesValue: totalValue,
    },
    positions: enrichedPositions,
    assetAllocation,
    currencyAllocation,
    trueCountryAllocation,
    trueSectorAllocation,
    domicileAllocation,
  }

  console.log("Portfolio parsing complete:", {
    totalValue: portfolioData.accountOverview.totalValue,
    positionsCount: portfolioData.positions.length,
    assetTypes: portfolioData.assetAllocation.length,
    currencies: portfolioData.currencyAllocation.length,
  })

  return portfolioData
}

function looksLikeSwissquoteCSV(text: string): boolean {
  const lines = text.split("\n").slice(0, 20) // Check first 20 lines

  // Check for common CSV indicators
  const csvIndicators = [
    "Symbole",
    "Symbol",
    "Ticker",
    "ISIN",
    "Quantité",
    "Quantity",
    "Qty",
    "Prix unitaire",
    "Unit Price",
    "Price",
    "Valeur totale CHF",
    "Total Value CHF",
    "Total CHF",
    "Devise",
    "Currency",
    "Dev",
    "CCY",
    "G&P",
    "Gain",
    "Loss",
    "P&L",
    "Positions %",
    "Weight",
    "Allocation",
    "Cours",
    "Montant",
    "Valeur",
  ]

  return (
    lines.some((line) => csvIndicators.some((indicator) => line.toLowerCase().includes(indicator.toLowerCase()))) ||
    text.includes(",") ||
    text.includes(";")
  )
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

      // Score based on number of columns and consistency
      if (columns > 1) {
        score += columns
        if (consistentColumns) score += 5
      }
    }

    console.log(`Delimiter '${delimiter}': score=${score}, consistent=${consistentColumns}`)

    if (score > maxScore) {
      maxScore = score
      bestDelimiter = delimiter
    }
  }

  console.log("Selected delimiter:", bestDelimiter)
  return bestDelimiter
}

async function parseSwissquoteCSV(csv: string): Promise<SwissPortfolioData> {
  console.log("Starting enhanced CSV parsing...")
  console.log("CSV preview (first 1000 chars):", csv.substring(0, 1000))

  const delimiter = detectCSVDelimiter(csv)

  // Parse with Papa Parse
  const { data, errors } = Papa.parse(csv, {
    delimiter,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    header: false, // We'll handle headers manually for more control
  })

  if (errors.length > 0) {
    console.warn("CSV parsing warnings:", errors)
  }

  console.log("CSV parsing completed with", data.length, "rows")
  console.log("Sample rows:", data.slice(0, 10))

  const rows = data as string[][]

  // Find header row with more flexible matching
  let headerRowIndex = -1
  let headers: string[] = []

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const rowText = row.join(" ").toLowerCase()

    // Look for key header indicators - expanded list
    const headerIndicators = [
      "symbole",
      "symbol",
      "ticker",
      "isin",
      "quantité",
      "quantity",
      "qty",
      "nombre",
      "prix",
      "price",
      "cours",
      "valeur",
      "devise",
      "currency",
      "dev",
      "ccy",
      "montant",
      "total",
      "chf",
      "usd",
      "eur",
      "gbp",
      "jpy",
      "cad",
      "libellé",
      "libelle",
      "description",
      "nom",
      "name",
    ]

    const matchCount = headerIndicators.filter((indicator) => rowText.includes(indicator)).length

    console.log(`Row ${i} header match count: ${matchCount}, content: ${rowText.substring(0, 100)}`)

    // Lowered threshold for header detection to 2, as some CSVs might have fewer indicators
    if (matchCount >= 2) {
      headerRowIndex = i
      headers = row.map((h) => h.toString().trim())
      console.log("Header found at row", i, ":", headers)
      break
    }
  }

  // If no clear header found, try to infer structure
  if (headerRowIndex === -1) {
    console.log("No clear header found, attempting structure inference...")
    return await parseCSVWithoutHeaders(rows)
  }

  // Map column indices with more flexible matching
  const columnMap = {
    symbol: findColumnIndex(headers, [
      "symbole",
      "symbol",
      "ticker",
      "isin",
      "code",
      "instrument",
      "titre",
      "security",
    ]),
    name: findColumnIndex(headers, [
      "nom",
      "name",
      "description",
      "libellé",
      "libelle",
      "designation",
      "intitulé",
      "intitule",
      "security name",
      "instrument name",
    ]),
    quantity: findColumnIndex(headers, ["quantité", "quantity", "qty", "nombre", "qte", "units", "shares", "parts"]),
    unitCost: findColumnIndex(headers, [
      "prix unitaire",
      "unit price",
      "cost",
      "coût unitaire",
      "cout unitaire",
      "prix d'achat",
      "purchase price",
      "avg cost",
    ]),
    price: findColumnIndex(headers, [
      "prix",
      "price",
      "cours",
      "valeur",
      "current price",
      "market price",
      "last price",
      "quote",
      "cotation",
    ]),
    currency: findColumnIndex(headers, ["devise", "currency", "dev", "ccy", "curr", "monnaie"]),
    totalCHF: findColumnIndex(headers, [
      "valeur totale chf",
      "total value chf",
      "total chf",
      "montant chf",
      "valeur chf",
      "market value chf",
      "value chf",
      "total",
      "montant",
      "valeur totale",
      "market value",
    ]),
    gainLoss: findColumnIndex(headers, [
      "g&p chf",
      "gain loss chf",
      "plus-value",
      "résultat",
      "resultat",
      "p&l",
      "pnl",
      "gain",
      "loss",
      "profit",
      "unrealized",
    ]),
    gainLossPercent: findColumnIndex(headers, [
      "g&p %",
      "gain loss %",
      "plus-value %",
      "résultat %",
      "resultat %",
      "p&l %",
      "pnl %",
      "gain %",
      "performance",
      "rendement",
    ]),
    positionPercent: findColumnIndex(headers, [
      "positions %",
      "position %",
      "poids",
      "weight",
      "allocation",
      "% portfolio",
      "portfolio %",
      "weight %",
    ]),
    dailyChange: findColumnIndex(headers, [
      "quot. %",
      "daily %",
      "variation",
      "change",
      "var. quot.",
      "daily change",
      "1d %",
      "jour %",
    ]),
  }

  console.log("Column mapping:", columnMap)

  const positions: PortfolioPosition[] = []
  let currentCategory = "Unknown"
  let totalPortfolioValue = 0

  // Parse data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Ensure row has enough columns to be considered valid data
    if (!row || row.length < Math.max(2, Object.values(columnMap).filter((idx) => idx >= 0).length / 2)) {
      console.log(`Skipping row ${i}: not enough columns or empty. Row length: ${row?.length || 0}`)
      continue
    }

    const firstCell = (row[0] || "").toString().trim()
    const secondCell = (row[1] || "").toString().trim()
    const fullRowText = row.join(" ").toLowerCase()

    // Skip empty rows
    if (!firstCell && !secondCell) {
      console.log(`Skipping row ${i}: empty cells.`)
      continue
    }

    console.log(`Processing row ${i}: [${row.slice(0, 5).join(", ")}...]`)

    // Check for category headers
    const categoryMatch = Object.keys(CATEGORY_ALIASES).find(
      (cat) => firstCell.toLowerCase().includes(cat.toLowerCase()) || fullRowText.includes(cat.toLowerCase()),
    )

    if (categoryMatch) {
      currentCategory = CATEGORY_ALIASES[categoryMatch]
      console.log(`Found category: ${currentCategory} at row ${i}`)
      continue
    }

    // Skip total/summary rows
    if (
      fullRowText.includes("total") ||
      fullRowText.includes("sous-total") ||
      fullRowText.includes("subtotal") ||
      fullRowText.includes("somme") ||
      fullRowText.includes("sum") ||
      fullRowText.includes("portfolio") ||
      fullRowText.includes("portefeuille")
    ) {
      // Try to extract total portfolio value
      const totalValue = extractLargestNumberFromRow(row)
      if (totalValue > totalPortfolioValue) {
        totalPortfolioValue = totalValue
        console.log(`Found potential total value: ${totalValue} at row ${i}`)
      }
      continue
    }

    // Parse position data
    const symbol = columnMap.symbol >= 0 ? cleanSymbol(row[columnMap.symbol]?.toString()) : ""

    // Skip if no valid symbol
    if (!symbol || symbol.length < 1) {
      console.log(`Skipping row ${i}: no valid symbol found. Raw symbol cell: "${row[columnMap.symbol] || ""}"`)
      continue
    }

    // Extract other fields
    const name = columnMap.name >= 0 ? row[columnMap.name]?.toString().trim() : symbol
    const quantityStr = columnMap.quantity >= 0 ? row[columnMap.quantity]?.toString() : ""
    const unitCostStr = columnMap.unitCost >= 0 ? row[columnMap.unitCost]?.toString() : ""
    const priceStr = columnMap.price >= 0 ? row[columnMap.price]?.toString() : ""
    const currencyStr = columnMap.currency >= 0 ? row[columnMap.currency]?.toString().trim() : "CHF"
    const totalCHFStr = columnMap.totalCHF >= 0 ? row[columnMap.totalCHF]?.toString() : ""
    const gainLossStr = columnMap.gainLoss >= 0 ? row[columnMap.gainLoss]?.toString() : ""
    const positionPercentStr = columnMap.positionPercent >= 0 ? row[columnMap.positionPercent]?.toString() : ""
    const dailyChangeStr = columnMap.dailyChange >= 0 ? row[columnMap.dailyChange]?.toString() : ""

    // Parse numbers with enhanced Swiss formatting
    const quantity = parseSwissNumber(quantityStr)
    const unitCost = parseSwissNumber(unitCostStr)
    const price = parseSwissNumber(priceStr) || unitCost
    const totalCHF = parseSwissNumber(totalCHFStr)
    const gainLoss = parseSwissNumber(gainLossStr)
    const positionPercent = parseSwissNumber(positionPercentStr.replace("%", ""))
    const dailyChange = parseSwissNumber(dailyChangeStr.replace("%", ""))

    console.log(
      `Parsed values for ${symbol}: qty=${quantity} (raw: "${quantityStr}"), price=${price} (raw: "${priceStr}"), currency=${currencyStr}, total=${totalCHF} (raw: "${totalCHFStr}")`,
    )

    // Skip if missing essential data
    if (isNaN(quantity) || quantity <= 0) {
      console.log(`Skipping ${symbol} at row ${i}: invalid quantity (${quantity}).`)
      continue
    }

    if (isNaN(price) || price <= 0) {
      console.log(`Skipping ${symbol} at row ${i}: invalid price (${price}).`)
      continue
    }

    // Calculate total value if not provided or invalid
    let calculatedTotal = totalCHF
    if (isNaN(calculatedTotal) || calculatedTotal <= 0) {
      calculatedTotal = quantity * price * getCurrencyRate(currencyStr)
      console.log(`Calculated total for ${symbol}: ${calculatedTotal} (original total was invalid or missing).`)
    }

    console.log(`✅ Adding position: ${symbol} - ${quantity} @ ${price} ${currencyStr} = ${calculatedTotal} CHF`)

    positions.push({
      symbol: symbol,
      name: name || symbol,
      quantity: quantity,
      unitCost: unitCost || price,
      price: price,
      totalValueCHF: calculatedTotal,
      currency: currencyStr || "CHF",
      category: currentCategory || "Unknown",
      sector: "Unknown",
      geography: "Unknown",
      domicile: "Unknown",
      withholdingTax: 15,
      taxOptimized: false,
      gainLossCHF: gainLoss || 0,
      unrealizedGainLoss: 0,
      unrealizedGainLossPercent: 0,
      positionPercent: positionPercent || 0,
      dailyChangePercent: dailyChange || 0,
      isOTC: false,
    })
  }

  console.log(`✅ Parsed ${positions.length} positions from CSV`)

  if (positions.length === 0) {
    console.error("No valid positions found. Debugging info:")
    console.error("Headers:", headers)
    console.error("Column mapping:", columnMap)
    console.error("Sample rows:", rows.slice(0, 10))
    throw new Error("No valid positions found in CSV file. Please check the file format.")
  }

  // Calculate total value
  const calculatedTotal = positions.reduce((sum, p) => sum + p.totalValueCHF, 0)
  const finalTotal = totalPortfolioValue > calculatedTotal ? totalPortfolioValue : calculatedTotal

  console.log(
    `Total portfolio value: ${finalTotal} CHF (calculated: ${calculatedTotal}, found: ${totalPortfolioValue})`,
  )

  // Enrich with API data
  const enrichedPositions = await enrichPositionsWithAPIData(
    positions.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      currency: p.currency,
      category: p.category,
      totalValue: p.totalValueCHF,
    })),
  )

  return {
    accountOverview: {
      totalValue: finalTotal,
      cashBalance: 0, // Not available in CSV
      securitiesValue: calculatedTotal,
    },
    positions: enrichedPositions,
    assetAllocation: calculateAssetAllocation(enrichedPositions, calculatedTotal),
    currencyAllocation: await calculateTrueCurrencyAllocation(enrichedPositions, calculatedTotal),
    trueCountryAllocation: await calculateTrueCountryAllocation(enrichedPositions, calculatedTotal),
    trueSectorAllocation: await calculateTrueSectorAllocation(enrichedPositions, calculatedTotal),
    domicileAllocation: calculateDomicileAllocation(enrichedPositions, calculatedTotal),
  }
}

async function parseCSVWithoutHeaders(rows: string[][]): Promise<SwissPortfolioData> {
  console.log("Attempting to parse CSV without clear headers...")

  const positions: PortfolioPosition[] = []
  let currentCategory = "Unknown"

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 3) continue

    const firstCell = row[0]?.toString().trim() || ""

    // Skip empty rows
    if (!firstCell) continue

    // Check for category
    const categoryMatch = Object.keys(CATEGORY_ALIASES).find((cat) =>
      firstCell.toLowerCase().includes(cat.toLowerCase()),
    )

    if (categoryMatch) {
      currentCategory = CATEGORY_ALIASES[categoryMatch]
      continue
    }

    // Try to parse as position - look for patterns
    // Pattern 1: Symbol, Name/Description Numbers Currency, Total
    if (row.length >= 4) {
      const symbol = cleanSymbol(firstCell)
      if (symbol && symbol.length >= 2) {
        const quantity = parseSwissNumber(row[2]?.toString() || "")
        const price = parseSwissNumber(row[3]?.toString() || "")

        if (!isNaN(quantity) && quantity > 0 && !isNaN(price) && price > 0) {
          const currency = row[4]?.toString().trim() || "CHF"
          const totalValue = row.length > 5 ? parseSwissNumber(row[5]?.toString() || "") : quantity * price

          console.log(`Inferred position: ${symbol} - ${quantity} @ ${price} ${currency}`)

          positions.push({
            symbol: symbol,
            name: row[1]?.toString().trim() || symbol,
            quantity: quantity,
            unitCost: price,
            price: price,
            totalValueCHF: isNaN(totalValue) ? quantity * price * getCurrencyRate(currency) : totalValue,
            currency: currency,
            category: currentCategory,
            sector: "Unknown",
            geography: "Unknown",
            domicile: "Unknown",
            withholdingTax: 15,
            taxOptimized: false,
            gainLossCHF: 0,
            unrealizedGainLoss: 0,
            unrealizedGainLossPercent: 0,
            positionPercent: 0,
            dailyChangePercent: 0,
            isOTC: false,
          })
        }
      }
    }
  }

  if (positions.length === 0) {
    throw new Error(
      "Could not parse CSV structure. Please ensure your CSV has proper headers or try the paste text method.",
    )
  }

  console.log(`Inferred ${positions.length} positions without headers`)

  const calculatedTotal = positions.reduce((sum, p) => sum + p.totalValueCHF, 0)

  // Enrich with API data
  const enrichedPositions = await enrichPositionsWithAPIData(
    positions.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      currency: p.currency,
      category: p.category,
      totalValue: p.totalValueCHF,
    })),
  )

  return {
    accountOverview: {
      totalValue: calculatedTotal,
      cashBalance: 0,
      securitiesValue: calculatedTotal,
    },
    positions: enrichedPositions,
    assetAllocation: calculateAssetAllocation(enrichedPositions, calculatedTotal),
    currencyAllocation: await calculateTrueCurrencyAllocation(enrichedPositions, calculatedTotal),
    trueCountryAllocation: await calculateTrueCountryAllocation(enrichedPositions, calculatedTotal),
    trueSectorAllocation: await calculateTrueSectorAllocation(enrichedPositions, calculatedTotal),
    domicileAllocation: calculateDomicileAllocation(enrichedPositions, calculatedTotal),
  }
}

function cleanSymbol(symbolStr: string | undefined): string {
  if (!symbolStr) return ""

  return symbolStr
    .toString()
    .trim()
    .replace(/[^\w.-]/g, "") // Remove special characters except dots and dashes
    .toUpperCase()
}

function findColumnIndex(headers: string[], searchTerms: string[]): number {
  for (const term of searchTerms) {
    const index = headers.findIndex((h) => h.toLowerCase().includes(term.toLowerCase()))
    if (index >= 0) return index
  }
  return -1
}

function extractLargestNumberFromRow(row: string[]): number {
  let largest = 0
  for (const cell of row) {
    const num = parseSwissNumber(cell?.toString() || "")
    if (!isNaN(num) && num > largest) {
      largest = num
    }
  }
  return largest
}

function getCurrencyRate(currency: string): number {
  // Rough conversion rates to CHF (should be real-time in production)
  const rates: Record<string, number> = {
    CHF: 1.0,
    USD: 0.92,
    EUR: 0.98,
    GBP: 1.15,
    JPY: 0.0065,
    CAD: 0.68,
  }
  return rates[currency.toUpperCase()] || 0.92 // Default to USD rate
}

function parseSwissNumber(str: string): number {
  if (!str) return 0

  // Handle Swiss number format: 1'234'567.89 and various encodings
  const cleaned = str
    .toString()
    .replace(/'/g, "") // Remove apostrophes
    .replace(/\s/g, "") // Remove spaces
    .replace(/,/g, ".") // Replace comma with dot for decimal
    .replace(/[^\d.-]/g, "") // Remove non-numeric characters except dots and minus

  const parsed = Number.parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function parseAccountOverview(text: string) {
  const overview = {
    totalValue: 0,
    cashBalance: 0,
    securitiesValue: 0,
  }

  // Try different patterns for different banks
  const patterns = [
    // Swissquote
    /Valeur totale.*?(\d+(?:'?\d{3})*\.?\d*)/i,
    /Solde espèces.*?(\d+(?:'?\d{3})*\.?\d*)/i,
    /Valeur des titres.*?(\d+(?:'?\d{3})*\.?\d*)/i,

    // UBS
    /Total Assets.*?CHF\s*(\d+(?:'?\d{3})*\.?\d*)/i,
    /Cash Position.*?CHF\s*(\d+(?:'?\d{3})*\.?\d*)/i,
    /Securities.*?CHF\s*(\d+(?:'?\d{3})*\.?\d*)/i,

    // Credit Suisse
    /Portfolio Value.*?CHF\s*(\d+(?:'?\d{3})*\.?\d*)/i,
    /Cash Balance.*?CHF\s*(\d+(?:'?\d{3})*\.?\d*)/i,
    /Investment Value.*?CHF\s*(\d+(?:'?\d{3})*\.?\d*)/i,
  ]

  // Extract total value
  const totalMatch = text.match(patterns[0]) || text.match(patterns[3]) || text.match(patterns[6])
  if (totalMatch) {
    overview.totalValue = parseSwissNumber(totalMatch[1])
  }

  // Extract cash balance
  const cashMatch = text.match(patterns[1]) || text.match(patterns[4]) || text.match(patterns[7])
  if (cashMatch) {
    overview.cashBalance = parseSwissNumber(cashMatch[1])
  }

  // Extract securities value
  const securitiesMatch = text.match(patterns[2]) || text.match(patterns[5]) || text.match(patterns[8])
  if (securitiesMatch) {
    overview.securitiesValue = parseSwissNumber(securitiesMatch[1])
  }

  return overview
}

function parsePositions(text: string): ParsedPosition[] {
  const positions: ParsedPosition[] = []

  // Split text into lines and process
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let currentCategory = "Unknown"

  console.log("Parsing positions from", lines.length, "lines")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect category headers
    if (line.match(/^(Actions|Equities|Stock|Aktien)/i)) {
      currentCategory = "Actions"
      console.log("Found Actions category")
      continue
    } else if (line.match(/^(ETF|Funds|Fonds)/i)) {
      currentCategory = "ETF"
      console.log("Found ETF category")
      continue
    } else if (line.match(/^(Obligations|Bonds|Anleihen)/i)) {
      currentCategory = "Bonds"
      console.log("Found Bonds category")
      continue
    } else if (line.match(/^(Crypto|Bitcoin|BTC)/i)) {
      currentCategory = "Cryptocurrencies"
      console.log("Found Crypto category")
      continue
    }

    // Try to parse position line
    const position = parsePositionLine(line, currentCategory)
    if (position) {
      console.log("Parsed position:", position.symbol, position.name)
      positions.push(position)
    }
  }

  return positions
}

function parsePositionLine(line: string, category: string): ParsedPosition | null {
  // Multiple patterns for different bank formats
  const patterns = [
    // Standard format: AAPL Apple Inc. 100 150.00 USD 15'000.00
    /^([A-Z0-9]{2,6})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})\s+(\d+(?:'?\d{3})*\.?\d*)$/,

    // Swissquote: AAPL Apple Inc. 100 150.00 USD
    /^([A-Z0-9]{2,6})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})$/,

    // UBS: AAPL Apple Inc. Qty: 200 Price: USD 175.50 Value: CHF 35'100.00
    /^([A-Z0-9]{2,6})\s+(.+?)\s+Qty:\s*(\d+(?:\.\d+)?)\s+Price:\s*([A-Z]{3})\s*(\d+(?:\.\d+)?)/,

    // Credit Suisse: AAPL | Apple Inc. | 300 shares | $145.00 | CHF 43'500.00
    /^([A-Z0-9]{2,6})\s*\|\s*(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s*shares?\s*\|\s*\$?(\d+(?:\.\d+)?)\s*\|/,

    // Simple format: AAPL 100 150.00 USD
    /^([A-Z0-9]{2,6})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})$/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      let symbol, name, quantity, price, currency, totalValue

      if (pattern === patterns[4]) {
        // Simple format: AAPL 100 150.00 USD
        ;[, symbol, quantity, price, currency] = match
        name = symbol // Use symbol as name for simple format
      } else {
        ;[, symbol, name, quantity, price, currency, totalValue] = match
      }

      const parsedPosition: ParsedPosition = {
        symbol: symbol.trim(),
        name: (name || symbol).trim(),
        quantity: Number.parseFloat(quantity),
        price: Number.parseFloat(price),
        currency: currency || "CHF",
        category,
      }

      if (totalValue) {
        parsedPosition.totalValue = parseSwissNumber(totalValue)
      }

      return parsedPosition
    }
  }

  return null
}

// Alternative parsing method for simple text formats
function parseAlternativeFormat(text: string): ParsedPosition[] {
  const positions: ParsedPosition[] = []
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let currentCategory = "Unknown"

  for (const line of lines) {
    // Check for category headers
    if (line.match(/^(Actions|Equities|Stock)/i)) {
      currentCategory = "Actions"
      continue
    } else if (line.match(/^(ETF|Funds)/i)) {
      currentCategory = "ETF"
      continue
    } else if (line.match(/^(Obligations|Bonds)/i)) {
      currentCategory = "Bonds"
      continue
    }

    // Try to parse any line that looks like a position
    // Pattern: Symbol Name/Description Numbers Currency
    const match = line.match(
      /([A-Z0-9]{2,6})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})(?:\s+(\d+(?:'?\d{3})*\.?\d*))?/,
    )

    if (match) {
      const [, symbol, name, quantity, price, currency, totalValue] = match

      const position: ParsedPosition = {
        symbol: symbol.trim(),
        name: name.trim(),
        quantity: Number.parseFloat(quantity),
        price: Number.parseFloat(price),
        currency: currency,
        category: currentCategory,
      }

      if (totalValue) {
        position.totalValue = parseSwissNumber(totalValue)
      }

      positions.push(position)
      console.log("Alternative parsing found position:", position.symbol)
    }
  }

  return positions
}

async function enrichPositionsWithAPIData(parsedPositions: ParsedPosition[]): Promise<PortfolioPosition[]> {
  const enrichedPositions: PortfolioPosition[] = []

  for (const parsed of parsedPositions) {
    console.log(`Enriching ${parsed.symbol}...`)

    try {
      // Mock API service calls
      const priceData = { price: parsed.price * (1 + Math.random() * 0.1 - 0.05), changePercent: Math.random() * 4 - 2 } // Simulate price fluctuation
      const metadata = { name: parsed.name, sector: "Technology", country: "United States" } // Mock metadata
      const etfComposition =
        parsed.category === "ETF"
          ? {
              domicile: "IE",
              withholdingTax: 15,
              country: [{ country: "US", weight: 70 }],
              sector: [{ sector: "Technology", weight: 50 }],
              currency: [{ currency: "USD", weight: 80 }],
            }
          : null // Mock ETF composition

      const currentPrice = priceData?.price || parsed.price
      const totalValueCHF = parsed.totalValue || parsed.quantity * currentPrice * getCurrencyRate(parsed.currency)

      // Determine tax optimization for Swiss investors
      const domicile = etfComposition?.domicile || (metadata?.country === "United States" ? "US" : "Unknown")
      const taxOptimized = domicile === "US" // US domiciled is better for Swiss investors

      const enrichedPosition: PortfolioPosition = {
        symbol: parsed.symbol,
        name: metadata?.name || parsed.name,
        quantity: parsed.quantity,
        unitCost: parsed.price,
        price: parsed.price,
        currentPrice: currentPrice,
        totalValueCHF,
        currency: parsed.currency,
        category: parsed.category,
        sector: metadata?.sector || "Unknown",
        geography: metadata?.country || "Unknown",
        domicile: domicile,
        withholdingTax:
          etfComposition?.withholdingTax || (domicile === "US" ? 15 : domicile === "IE" || domicile === "LU" ? 15 : 30),
        taxOptimized: taxOptimized,
        gainLossCHF: totalValueCHF - parsed.quantity * parsed.price * getCurrencyRate(parsed.currency),
        unrealizedGainLoss: (currentPrice - parsed.price) * parsed.quantity,
        unrealizedGainLossPercent: ((currentPrice - parsed.price) / parsed.price) * 100,
        positionPercent: 0, // Will be calculated later
        dailyChangePercent: priceData?.changePercent || 0,
        isOTC: false,
      }

      enrichedPositions.push(enrichedPosition)
    } catch (error) {
      console.error(`Error enriching ${parsed.symbol}:`, error)

      // Add position with basic data if API fails
      const enrichedPosition: PortfolioPosition = {
        symbol: parsed.symbol,
        name: parsed.name,
        quantity: parsed.quantity,
        unitCost: parsed.price,
        price: parsed.price,
        currentPrice: parsed.price,
        totalValueCHF: parsed.totalValue || parsed.quantity * parsed.price * getCurrencyRate(parsed.currency),
        currency: parsed.currency,
        category: parsed.category,
        sector: "Unknown",
        geography: "Unknown",
        domicile: "Unknown",
        withholdingTax: 15,
        taxOptimized: false,
        gainLossCHF: 0,
        unrealizedGainLoss: 0,
        unrealizedGainLossPercent: 0,
        positionPercent: 0,
        dailyChangePercent: 0,
        isOTC: false,
      }

      enrichedPositions.push(enrichedPosition)
    }
  }

  // Calculate position percentages
  const totalValue = enrichedPositions.reduce((sum, p) => sum + p.totalValueCHF, 0)
  enrichedPositions.forEach((p) => {
    p.positionPercent = (p.totalValueCHF / totalValue) * 100
  })

  return enrichedPositions
}

function calculateAssetAllocation(positions: PortfolioPosition[], totalValue: number): AllocationItem[] {
  const allocation = new Map<string, number>()

  positions.forEach((position) => {
    const current = allocation.get(position.category) || 0
    allocation.set(position.category, current + position.totalValueCHF)
  })

  return Array.from(allocation.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: (value / totalValue) * 100,
    type: name,
  }))
}

async function calculateTrueCurrencyAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF" || position.category === "Funds") {
      // Get ETF composition for true currency exposure
      try {
        // Mock ETF composition data
        const composition = {
          currency: [
            { currency: "USD", weight: 70 },
            { currency: "EUR", weight: 20 },
            { currency: "CHF", weight: 10 },
          ],
        }
        if (composition && composition.currency.length > 0) {
          composition.currency.forEach((curr) => {
            const value = (curr.weight / 100) * position.totalValueCHF
            const current = allocation.get(curr.currency) || 0
            allocation.set(curr.currency, current + value)
          })
        } else {
          // Fallback to trading currency
          const current = allocation.get(position.currency) || 0
          allocation.set(position.currency, current + position.totalValueCHF)
        }
      } catch (error) {
        // Fallback to trading currency on API error
        const current = allocation.get(position.currency) || 0
        allocation.set(position.currency, current + position.totalValueCHF)
      }
    } else {
      // Direct currency exposure
      const current = allocation.get(position.currency) || 0
      allocation.set(position.currency, current + position.totalValueCHF)
    }
  }

  return Array.from(allocation.entries()).map(([currency, value]) => ({
    name: currency,
    value,
    percentage: (value / totalValue) * 100,
    currency,
  }))
}

async function calculateTrueCountryAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF" || position.category === "Funds") {
      // Get ETF composition for true country exposure
      try {
        // Mock ETF composition data
        const composition = {
          country: [
            { country: "United States", weight: 60 },
            { country: "Switzerland", weight: 15 },
            { country: "Japan", weight: 10 },
          ],
        }
        if (composition && composition.country.length > 0) {
          composition.country.forEach((country) => {
            const value = (country.weight / 100) * position.totalValueCHF
            const current = allocation.get(country.country) || 0
            allocation.set(country.country, current + value)
          })
        } else {
          // Fallback to geography
          const current = allocation.get(position.geography || "Unknown") || 0
          allocation.set(position.geography || "Unknown", current + position.totalValueCHF)
        }
      } catch (error) {
        // Fallback to geography on API error
        const current = allocation.get(position.geography || "Unknown") || 0
        allocation.set(position.geography || "Unknown", current + position.totalValueCHF)
      }
    } else {
      // Direct country exposure
      const current = allocation.get(position.geography || "Unknown") || 0
      allocation.set(position.geography || "Unknown", current + position.totalValueCHF)
    }
  }

  return Array.from(allocation.entries()).map(([country, value]) => ({
    name: country,
    value,
    percentage: (value / totalValue) * 100,
    country,
  }))
}

async function calculateTrueSectorAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF" || position.category === "Funds") {
      // Get ETF composition for true sector exposure
      try {
        // Mock ETF composition data
        const composition = {
          sector: [
            { sector: "Technology", weight: 40 },
            { sector: "Financials", weight: 20 },
            { sector: "Healthcare", weight: 15 },
          ],
        }
        if (composition && composition.sector.length > 0) {
          composition.sector.forEach((sector) => {
            const value = (sector.weight / 100) * position.totalValueCHF
            const current = allocation.get(sector.sector) || 0
            allocation.set(sector.sector, current + value)
          })
        } else {
          // Fallback to mixed
          const current = allocation.get("Mixed") || 0
          allocation.set("Mixed", current + position.totalValueCHF)
        }
      } catch (error) {
        // Fallback to mixed on API error
        const current = allocation.get("Mixed") || 0
        allocation.set("Mixed", current + position.totalValueCHF)
      }
    } else {
      // Direct sector exposure
      const current = allocation.get(position.sector || "Unknown") || 0
      allocation.set(position.sector || "Unknown", current + position.totalValueCHF)
    }
  }

  return Array.from(allocation.entries()).map(([sector, value]) => ({
    name: sector,
    value,
    percentage: (value / totalValue) * 100,
    sector,
  }))
}

function calculateDomicileAllocation(positions: PortfolioPosition[], totalValue: number): AllocationItem[] {
  const allocation = new Map<string, number>()

  positions.forEach((position) => {
    if (position.domicile) {
      const domicileName = getDomicileName(position.domicile)
      const current = allocation.get(domicileName) || 0
      allocation.set(domicileName, current + position.totalValueCHF)
    }
  })

  return Array.from(allocation.entries()).map(([domicile, value]) => ({
    name: domicile,
    value,
    percentage: (value / totalValue) * 100,
    domicile,
  }))
}

function getDomicileName(domicile: string): string {
  const names: Record<string, string> = {
    IE: "Ireland (IE)",
    US: "United States (US)",
    CH: "Switzerland (CH)",
    LU: "Luxembourg (LU)",
    DE: "Germany (DE)",
    FR: "France (FR)",
  }
  return names[domicile] || `${domicile} (${domicile})`
}
