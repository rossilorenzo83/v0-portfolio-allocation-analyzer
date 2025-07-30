import { loadPdf, getPdfText } from "./lib/pdf-utils"
import Papa from "papaparse"
import { parse as parseCsv } from "csv-parse/sync"

export interface SwissPortfolioData {
  accountOverview: {
    totalValue: number
    securitiesValue: number
    cashBalance: number
  }
  positions: Position[]
  assetAllocation: AllocationItem[]
  currencyAllocation: AllocationItem[]
  trueCountryAllocation: AllocationItem[]
  trueSectorAllocation: AllocationItem[]
  domicileAllocation: AllocationItem[]
}

export interface Position {
  symbol: string
  name: string
  quantity: number
  price: number
  currency: string
  totalValueCHF: number
  category: string
  domicile: string
  positionPercent: number
  dailyChangePercent: number
}

export interface AllocationItem {
  name: string
  value: number
  percentage: number
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

// Mock ETF data for look-through analysis (replace with real API in production)
const mockEtfHoldings: Record<string, { country: string; sector: string; weight: number }[]> = {
  "Vanguard FTSE All-World UCITS ETF (VWRL)": [
    { country: "US", sector: "Technology", weight: 20 },
    { country: "US", sector: "Financials", weight: 15 },
    { country: "Japan", sector: "Industrials", weight: 5 },
    { country: "UK", sector: "Consumer Staples", weight: 4 },
    { country: "Switzerland", sector: "Healthcare", weight: 3 },
    { country: "China", sector: "Communication Services", weight: 2 },
    { country: "Other", sector: "Diversified", weight: 51 }, // Remaining
  ],
  "iShares Core MSCI World UCITS ETF (IWDA)": [
    { country: "US", sector: "Technology", weight: 25 },
    { country: "US", sector: "Healthcare", weight: 12 },
    { country: "Japan", sector: "Consumer Discretionary", weight: 6 },
    { country: "UK", sector: "Financials", weight: 5 },
    { country: "Germany", sector: "Automotive", weight: 4 },
    { country: "Other", sector: "Diversified", weight: 48 }, // Remaining
  ],
  // Add more mock ETF data as needed
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
      totalCost: 0,
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

  const positions: Position[] = []
  let totalValue = 0
  let totalCost = 0

  for (const record of records) {
    const position: Partial<Position> = {}
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
      const currentPosition = position as Position
      positions.push(currentPosition)
      totalValue += currentPosition.quantity * currentPosition.price
      totalCost += currentPosition.quantity * currentPosition.price // For now, totalCost is same as totalValue
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
    key: keyof Position | "category" | "domicile",
    useEtfLookThrough = false,
  ): AllocationItem[] => {
    const breakdown: Record<string, number> = {}
    data.positions.forEach((p) => {
      if (useEtfLookThrough && p.category === "ETF" && mockEtfHoldings[p.name]) {
        mockEtfHoldings[p.name].forEach((holding) => {
          const holdingValue = (p.totalValueCHF * holding.weight) / 100
          const allocationKey = key === "trueCountryAllocation" ? holding.country : holding.sector
          breakdown[allocationKey] = (breakdown[allocationKey] || 0) + holdingValue
        })
      } else {
        const allocationKey = p[key as keyof Position] as string
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
  data.currencyAllocation = calculateAllocation("currency")
  data.domicileAllocation = calculateAllocation("domicile")
  data.trueCountryAllocation = calculateAllocation("symbol", true) // Use symbol to map to ETF name for look-through
  data.trueSectorAllocation = calculateAllocation("symbol", true) // Use symbol to map to ETF name for look-through

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
  let pdfText: string

  if (typeof input === "string") {
    // Assume it's a URL or base64 string for direct PDF.js loading
    const pdf = await loadPdf(input)
    pdfText = await getPdfText(pdf)
  } else {
    // Assume it's a File object
    const pdf = await loadPdf(input)
    pdfText = await getPdfText(pdf)
  }

  console.log("Extracted PDF Text (first 1000 chars):\n", pdfText.substring(0, 1000))

  const data: SwissPortfolioData = {
    accountOverview: {
      totalValue: 0,
      securitiesValue: 0,
      cashBalance: 0,
    },
    positions: [],
    assetAllocation: [],
    currencyAllocation: [],
    trueCountryAllocation: [],
    trueSectorAllocation: [],
    domicileAllocation: [],
  }

  // --- Parse Account Overview ---
  const totalValueMatch = pdfText.match(/Total value\s+CHF\s+([\d.'’]+)/i)
  if (totalValueMatch) {
    data.accountOverview.totalValue = Number.parseFloat(totalValueMatch[1].replace(/\.|’/g, ""))
  }

  const securitiesValueMatch = pdfText.match(/Securities value\s+CHF\s+([\d.'’]+)/i)
  if (securitiesValueMatch) {
    data.accountOverview.securitiesValue = Number.parseFloat(securitiesValueMatch[1].replace(/\.|’/g, ""))
  }

  const cashBalanceMatch = pdfText.match(/Cash balance\s+CHF\s+([\d.'’]+)/i)
  if (cashBalanceMatch) {
    data.accountOverview.cashBalance = Number.parseFloat(cashBalanceMatch[1].replace(/\.|’/g, ""))
  }

  console.log("Parsed Account Overview:", data.accountOverview)

  // --- Parse Positions ---
  // This is a simplified regex. Real-world PDFs vary greatly.
  // This regex looks for lines starting with a potential symbol, followed by name, quantity, price, value, currency, category, domicile, percent, daily change.
  // It's highly dependent on the exact formatting.
  const positionRegex =
    /([A-Z0-9.]+)\s+([A-Za-z\s\d.,'’/-]+?)\s+([\d.'’]+)\s+([A-Z]{3})\s+([\d.'’]+)\s+([A-Z]{3})\s+([\d.'’]+)\s+([A-Za-z\s]+)\s+([A-Z]{2})\s+([\d.]+)%\s+([-\d.]+)%/g

  let match
  while ((match = positionRegex.exec(pdfText)) !== null) {
    // Basic parsing, needs robust error handling and type conversion
    const [
      ,
      symbol,
      name,
      quantityStr,
      priceCurrency, // This is actually the price value, followed by currency
      priceStr, // This is actually the total value in CHF
      totalValueCurrency, // This is actually the category
      category, // This is actually the domicile
      domicile, // This is actually the position percent
      positionPercentStr, // This is actually the daily change percent
      dailyChangePercentStr,
    ] = match

    // Re-aligning based on common PDF table structures
    const parsedQuantity = Number.parseFloat(quantityStr.replace(/\.|’/g, ""))
    const parsedPrice = Number.parseFloat(priceCurrency.replace(/\.|’/g, "")) // Assuming price is before its currency
    const parsedTotalValueCHF = Number.parseFloat(priceStr.replace(/\.|’/g, ""))
    const parsedPositionPercent = Number.parseFloat(positionPercentStr)
    const parsedDailyChangePercent = Number.parseFloat(dailyChangePercentStr)

    const position: Position = {
      symbol: symbol.trim(),
      name: name.trim(),
      quantity: parsedQuantity,
      price: parsedPrice,
      currency: totalValueCurrency.trim(), // This is the actual currency of the price
      totalValueCHF: parsedTotalValueCHF,
      category: category.trim(),
      domicile: domicile.trim(),
      positionPercent: parsedPositionPercent,
      dailyChangePercent: parsedDailyChangePercent,
    }
    data.positions.push(position)
  }

  console.log("Parsed Positions:", data.positions)

  // --- Calculate Allocations ---
  const calculateAllocation = (
    key: keyof Position | "category" | "domicile",
    useEtfLookThrough = false,
  ): AllocationItem[] => {
    const breakdown: Record<string, number> = {}
    data.positions.forEach((p) => {
      if (useEtfLookThrough && p.category === "ETF" && mockEtfHoldings[p.name]) {
        mockEtfHoldings[p.name].forEach((holding) => {
          const holdingValue = (p.totalValueCHF * holding.weight) / 100
          const allocationKey = key === "trueCountryAllocation" ? holding.country : holding.sector
          breakdown[allocationKey] = (breakdown[allocationKey] || 0) + holdingValue
        })
      } else {
        const allocationKey = p[key as keyof Position] as string
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
  data.currencyAllocation = calculateAllocation("currency")
  data.domicileAllocation = calculateAllocation("domicile")
  data.trueCountryAllocation = calculateAllocation("symbol", true) // Use symbol to map to ETF name for look-through
  data.trueSectorAllocation = calculateAllocation("symbol", true) // Use symbol to map to ETF name for look-through

  console.log("Calculated Asset Allocation:", data.assetAllocation)
  console.log("Calculated Currency Allocation:", data.currencyAllocation)
  console.log("Calculated Domicile Allocation:", data.domicileAllocation)
  console.log("Calculated True Country Allocation:", data.trueCountryAllocation)
  console.log("Calculated True Sector Allocation:", data.trueSectorAllocation)

  if (data.positions.length === 0) {
    throw new Error("No valid positions found in the PDF. Please check the file format.")
  }

  return data
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

  const positions: Position[] = []
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
      price: price,
      currency: currencyStr || "CHF",
      totalValueCHF: calculatedTotal,
      category: currentCategory || "Unknown",
      domicile: "Unknown",
      positionPercent: positionPercent || 0,
      dailyChangePercent: dailyChange || 0,
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

  return {
    accountOverview: {
      totalValue: finalTotal,
      securitiesValue: calculatedTotal,
      cashBalance: 0,
    },
    positions: positions,
    assetAllocation: [],
    currencyAllocation: [],
    trueCountryAllocation: [],
    trueSectorAllocation: [],
    domicileAllocation: [],
  }
}

async function parseCSVWithoutHeaders(rows: string[][]): Promise<SwissPortfolioData> {
  console.log("Attempting to parse CSV without clear headers...")

  const positions: Position[] = []
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
    // Pattern 1: Symbol, Name, Quantity, Price, Currency, Total
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
            price: price,
            currency: currency,
            totalValueCHF: isNaN(totalValue) ? quantity * price * getCurrencyRate(currency) : totalValue,
            category: currentCategory,
            domicile: "Unknown",
            positionPercent: 0,
            dailyChangePercent: 0,
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

  return {
    accountOverview: {
      totalValue: calculatedTotal,
      securitiesValue: calculatedTotal,
      cashBalance: 0,
    },
    positions: positions,
    assetAllocation: [],
    currencyAllocation: [],
    trueCountryAllocation: [],
    trueSectorAllocation: [],
    domicileAllocation: [],
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
