import Papa from "papaparse"

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
  console.log("Starting enhanced CSV parsing...")
  console.log("CSV preview (first 1000 chars):", csvContent.substring(0, 1000))

  const delimiter = detectCSVDelimiter(csvContent)

  // Parse with Papa Parse
  const { data, errors } = Papa.parse(csvContent, {
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
    return parseCSVWithoutHeaders(rows)
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
  const enrichedPositions = enrichPositionsWithMockData(
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
    currencyAllocation: calculateTrueCurrencyAllocation(enrichedPositions, calculatedTotal),
    trueCountryAllocation: calculateTrueCountryAllocation(enrichedPositions, calculatedTotal),
    trueSectorAllocation: calculateTrueSectorAllocation(enrichedPositions, calculatedTotal),
    domicileAllocation: calculateDomicileAllocation(enrichedPositions, calculatedTotal),
  }
}

function parseCSVWithoutHeaders(rows: string[][]): SwissPortfolioData {
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
  const enrichedPositions = enrichPositionsWithMockData(
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
    currencyAllocation: calculateTrueCurrencyAllocation(enrichedPositions, calculatedTotal),
    trueCountryAllocation: calculateTrueCountryAllocation(enrichedPositions, calculatedTotal),
    trueSectorAllocation: calculateTrueSectorAllocation(enrichedPositions, calculatedTotal),
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

/**
 * Enriches parsed positions with mock data for price, metadata, and ETF composition.
 * This function simulates external API calls for demonstration purposes.
 */
function enrichPositionsWithMockData(parsedPositions: ParsedPosition[]): PortfolioPosition[] {
  const enrichedPositions: PortfolioPosition[] = []

  for (const parsed of parsedPositions) {
    console.log(`Enriching ${parsed.symbol} with mock data...`)

    // Simulate price fluctuation
    const priceData = { price: parsed.price * (1 + Math.random() * 0.1 - 0.05), changePercent: Math.random() * 4 - 2 }
    // Mock metadata
    const metadata = { name: parsed.name, sector: "Technology", country: "United States" }
    // Mock ETF composition
    const etfComposition =
      parsed.category === "ETF"
        ? {
            domicile: "IE",
            withholdingTax: 15,
            country: [{ country: "US", weight: 70 }],
            sector: [{ sector: "Technology", weight: 50 }],
            currency: [{ currency: "USD", weight: 80 }],
          }
        : null

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

function calculateTrueCurrencyAllocation(positions: PortfolioPosition[], totalValue: number): AllocationItem[] {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF" || position.category === "Funds") {
      // Get ETF composition for true currency exposure
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

function calculateTrueCountryAllocation(positions: PortfolioPosition[], totalValue: number): AllocationItem[] {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF" || position.category === "Funds") {
      // Get ETF composition for true country exposure
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

function calculateTrueSectorAllocation(positions: PortfolioPosition[], totalValue: number): AllocationItem[] {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF" || position.category === "Funds") {
      // Get ETF composition for true sector exposure
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
