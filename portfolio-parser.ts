import Papa from "papaparse"
import { etfDataService, resolveSymbolAndFetchData } from "./etf-data-service"
import { apiService } from "./lib/api-service"

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
  // ETF composition data for true allocation calculations
  etfComposition?: {
    sectors: { [key: string]: number }
    countries: { [key: string]: number }
    currencies: { [key: string]: number }
  }
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
  domicile: string
  geography?: string
  sector?: string
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
  Anleihen: "Bonds",
}

interface ColumnMapping {
  [key: string]: string // Maps a detected header to a standard Position key
}

const COMMON_HEADERS: { [key: string]: string[] } = {
  symbol: ["symbol", "ticker", "isin", "security id", "asset", "instrument", "symbole"],
  quantity: ["quantity", "shares", "amount", "units", "quantité", "qty", "menge"],
  averagePrice: ["average price", "avg price", "cost basis", "price", "purchase price", "coût unitaire", "prix", "kurs", "einstandspreis"],
  currency: ["currency", "ccy", "devise", "dev", "währung"],
  exchange: ["exchange", "market"],
  name: ["name", "description", "security name", "libellé", "bezeichnung"],
  geography: ["geography", "country", "region", "pays", "région"],
  sector: ["sector", "industry", "secteur", "industrie"],
  totalValue: ["total value", "valeur totale", "montant", "total", "gesamtwert", "valeur totale chf"],
  currentPrice: ["current price", "prix actuel", "cours", "cours actuel"],
  gainLoss: ["gain loss", "gain/loss", "plus value", "perte", "g&p chf", "gewinn/verlust chf"],
  gainLossPercent: ["gain loss %", "gain/loss %", "plus value %", "perte %", "g&p %"],
  positionPercent: ["position %", "positions %", "poids", "poids %", "position %"],
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

// Helper function to detect Swiss bank CSV format
const detectSwissBankFormat = (rows: string[][]): boolean => {
  const categoryIndicators = [
    'actions', 'etf', 'fonds', 'obligations', 
    'produits structurés', 'crypto-monnaies', 'aktien', 'anleihen'
  ]
  
  const headerCombinations = [
    ['symbole', 'quantité', 'valeur totale'],
    ['symbol', 'menge', 'gesamtwert']
  ]
  
  // Check for category headers
  const hasCategoryHeaders = rows.some(row => 
    row && row.length > 0 && 
    categoryIndicators.some(indicator => 
      row[0]?.toLowerCase().includes(indicator)
    )
  )
  
  // Check for Swiss header combinations
  const hasSwissHeaders = headerCombinations.some(combination => 
    rows.some(row => {
      if (!row || row.length === 0) return false
      const rowText = row.join(" ").toLowerCase()
      return combination.every(term => rowText.includes(term))
    })
  )
  
  return hasCategoryHeaders || hasSwissHeaders
}

// Helper function to parse CSV with Papa Parse
const parseCSVData = (csvContent: string): string[][] => {
  const delimiter = detectCSVDelimiter(csvContent)
  
  const { data, errors } = Papa.parse(csvContent, {
    delimiter,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    header: false,
  })

  if (errors.length > 0) {
    // Log errors but continue processing
  }

  return data as string[][]
}

// Helper function to find header row in CSV data
const findHeaderRow = (rows: string[][]): { headerRowIndex: number; headers: string[] } | null => {
  const headerIndicators = [
    "symbole", "symbol", "ticker", "isin", "quantité", "quantity", "qty", "nombre",
    "prix", "price", "cours", "valeur", "devise", "currency", "dev", "ccy",
    "montant", "total", "chf", "usd", "eur", "gbp", "jpy", "cad",
    "libellé", "libelle", "description", "nom", "name"
  ]

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const rowText = row.join(" ").toLowerCase()
    const matchCount = headerIndicators.filter(indicator => rowText.includes(indicator)).length

    // Threshold of 2 matches to identify header row
    if (matchCount >= 2) {
      return {
        headerRowIndex: i,
        headers: row.map(h => h.toString().trim())
      }
    }
  }

  return null
}

// Helper function to create column mapping from headers
const createColumnMapping = (headers: string[]) => {
  return {
    symbol: findColumnIndex(headers, [
      "symbole", "symbol", "ticker", "isin", "code", "instrument", "titre", "security"
    ]),
    name: findColumnIndex(headers, [
      "nom", "name", "description", "libellé", "libelle", "designation", 
      "intitulé", "intitule", "security name", "instrument name"
    ]),
    quantity: findColumnIndex(headers, [
      "quantité", "quantity", "qty", "nombre", "qte", "units", "shares", "parts"
    ]),
    unitCost: findColumnIndex(headers, [
      "prix unitaire", "unit price", "cost", "coût unitaire", "cout unitaire", 
      "prix d'achat", "purchase price", "avg cost"
    ]),
    price: findColumnIndex(headers, [
      "prix", "price", "cours", "valeur", "current price", "market price", 
      "last price", "quote", "cotation"
    ]),
    currency: findColumnIndex(headers, [
      "devise", "currency", "dev", "ccy", "curr", "monnaie", "währung"
    ]),
    category: findColumnIndex(headers, [
      "catégorie", "category", "type", "classe", "asset class", "instrument type"
    ]),
    geography: findColumnIndex(headers, [
      "geography", "country", "region", "pays", "région", "géographie"
    ]),
    sector: findColumnIndex(headers, [
      "sector", "industry", "secteur", "industrie"
    ]),
    domicile: findColumnIndex(headers, [
      "domicile", "domicile country", "fund domicile", "incorporation"
    ]),
    totalCHF: findColumnIndex(headers, [
      "valeur totale chf", "total value chf", "total chf", "montant chf", "valeur chf",
      "market value chf", "value chf", "total", "montant", "valeur totale", 
      "market value", "gesamtwert chf", "valeur totale chf", "total value", "gesamtwert"
    ]),
    gainLoss: findColumnIndex(headers, [
      "g&p chf", "gain loss chf", "plus-value", "résultat", "resultat", 
      "p&l", "pnl", "gain", "loss", "profit", "unrealized"
    ]),
    gainLossPercent: findColumnIndex(headers, [
      "g&p %", "gain loss %", "plus-value %", "résultat %", "resultat %", 
      "p&l %", "pnl %", "gain %", "performance", "rendement"
    ]),
    positionPercent: findColumnIndex(headers, [
      "positions %", "position %", "poids", "weight", "allocation", 
      "% portfolio", "portfolio %", "weight %"
    ]),
    dailyChange: findColumnIndex(headers, [
      "quot. %", "daily %", "variation", "change", "var. quot.", 
      "daily change", "1d %", "jour %"
    ])
  }
}

// Helper function to process CSV rows and extract positions
const processCSVRows = (
  rows: string[][], 
  headerRowIndex: number, 
  columnMap: ReturnType<typeof createColumnMapping>
): { positions: PortfolioPosition[]; totalPortfolioValue: number } => {
  const positions: PortfolioPosition[] = []
  let currentCategory = "Unknown"
  let totalPortfolioValue = 0

  // Process data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const firstCell = row[0]?.toString().trim()
    if (!firstCell) continue

    // Skip total/summary rows
    if (
      firstCell.toLowerCase().includes("total") ||
      firstCell.toLowerCase().includes("sous-total") ||
      firstCell.toLowerCase().includes("subtotal") ||
      firstCell.toLowerCase().includes("somme") ||
      firstCell.toLowerCase().includes("sum") ||
      firstCell.toLowerCase().includes("portfolio") ||
      firstCell.toLowerCase().includes("portefeuille")
    ) {
      // Try to extract total portfolio value
      const totalValue = extractLargestNumberFromRow(row)
      if (totalValue > totalPortfolioValue) {
        totalPortfolioValue = totalValue
      }
      continue
    }

    // Parse position data from row
    const position = parsePositionFromRow(row, columnMap, currentCategory)
    if (position) {
      positions.push(position)
    }
  }

  return { positions, totalPortfolioValue }
}

// Helper function to parse a single position from a CSV row
const parsePositionFromRow = (
  row: string[], 
  columnMap: ReturnType<typeof createColumnMapping>, 
  currentCategory: string
): PortfolioPosition | null => {
  const symbol = columnMap.symbol >= 0 ? cleanSymbol(row[columnMap.symbol]?.toString()) : ""
  
  // Skip if no valid symbol
  if (!symbol || symbol.length < 1) {
    return null
  }

  // Extract fields from row
  const name = columnMap.name >= 0 ? row[columnMap.name]?.toString().trim() : symbol
  const quantityStr = columnMap.quantity >= 0 ? row[columnMap.quantity]?.toString() : ""
  const unitCostStr = columnMap.unitCost >= 0 ? row[columnMap.unitCost]?.toString() : ""
  let priceStr = columnMap.price >= 0 ? row[columnMap.price]?.toString() : ""
  let currencyStr = columnMap.currency >= 0 ? row[columnMap.currency]?.toString().trim() : "CHF"
  let totalCHFStr = columnMap.totalCHF >= 0 ? row[columnMap.totalCHF]?.toString() : ""
  
  // Handle decimal price split across fields
  if (columnMap.price >= 0 && columnMap.currency >= 0 && row.length > columnMap.currency) {
    const nextField = row[columnMap.currency]?.toString().trim()
    if (nextField && /^\d{1,3}$/.test(nextField) && priceStr && /^\d+$/.test(priceStr)) {
      const nextNextField = row.length > columnMap.currency + 1 ? row[columnMap.currency + 1]?.toString().trim() : ""
      if (nextNextField && /^[A-Z]{3}$/.test(nextNextField.toUpperCase())) {
        priceStr = `${priceStr}.${nextField}`
        currencyStr = nextNextField
        totalCHFStr = row.length > columnMap.currency + 2 ? row[columnMap.currency + 2]?.toString() : ""
      }
    }
  }

  const gainLossStr = columnMap.gainLoss >= 0 ? row[columnMap.gainLoss]?.toString() : ""
  const positionPercentStr = columnMap.positionPercent >= 0 ? row[columnMap.positionPercent]?.toString() : ""
  const dailyChangeStr = columnMap.dailyChange >= 0 ? row[columnMap.dailyChange]?.toString() : ""
  const categoryStr = columnMap.category >= 0 ? row[columnMap.category]?.toString().trim() : ""
  const domicileStr = columnMap.domicile >= 0 ? row[columnMap.domicile]?.toString().trim() : ""
  const geographyStr = columnMap.geography >= 0 ? row[columnMap.geography]?.toString().trim() : ""
  const sectorStr = columnMap.sector >= 0 ? row[columnMap.sector]?.toString().trim() : ""

  // Parse numbers
  const quantity = parseSwissNumber(quantityStr)
  const unitCost = parseSwissNumber(unitCostStr)
  const price = parseSwissNumber(priceStr) || unitCost
  const totalCHF = parseSwissNumber(totalCHFStr)
  const gainLoss = parseSwissNumber(gainLossStr)
  const positionPercent = parseSwissNumber(positionPercentStr.replace("%", ""))
  const dailyChange = parseSwissNumber(dailyChangeStr.replace("%", ""))

  // Validate essential data
  if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
    return null
  }

  // Calculate total value
  let calculatedTotal = totalCHF
  if (isNaN(calculatedTotal) || calculatedTotal <= 0) {
    calculatedTotal = quantity * price * getCurrencyRate(currencyStr)
  }

  // Determine category
  let positionCategory = currentCategory || "Unknown"
  if (categoryStr) {
    const categoryMapping: { [key: string]: string } = {
      "actions": "Actions", "stocks": "Actions", "equity": "Actions",
      "obligations": "Bonds", "bonds": "Bonds", "bond": "Bonds",
      "etf": "ETF", "fonds": "Funds", "funds": "Funds",
      "cash": "Cash", "liquidités": "Cash"
    }
    
    const mappedCategory = categoryMapping[categoryStr.toLowerCase()]
    positionCategory = mappedCategory || categoryStr
  }

  return {
    symbol: symbol,
    name: name || symbol,
    quantity: quantity,
    unitCost: unitCost || price,
    price: price,
    totalValueCHF: calculatedTotal,
    currency: currencyStr || "CHF",
    category: positionCategory,
    sector: sectorStr || "Unknown",
    geography: geographyStr || "Unknown",
    domicile: domicileStr || "Unknown",
    withholdingTax: 15,
    taxOptimized: false,
    gainLossCHF: gainLoss || 0,
    unrealizedGainLoss: 0,
    unrealizedGainLossPercent: 0,
    positionPercent: positionPercent || 0,
    dailyChangePercent: dailyChange || 0,
    isOTC: false,
  }
}

export const parsePortfolioCsv = async (csvContent: string): Promise<SwissPortfolioData> => {
  // Handle empty content
  if (!csvContent || csvContent.trim() === "") {
    return createEmptyPortfolioData()
  }

  const rows = parseCSVData(csvContent)
  
  // Check if this is a Swiss bank format CSV
  if (detectSwissBankFormat(rows)) {
    return await parseSwissBankCSV(rows)
  }

  // Find header row
  const headerInfo = findHeaderRow(rows)
  if (!headerInfo) {
    return await parseCSVWithoutHeaders(rows)
  }
  
  const { headerRowIndex, headers } = headerInfo
  
  // Create column mapping and process rows
  const columnMap = createColumnMapping(headers)
  const { positions, totalPortfolioValue } = processCSVRows(rows, headerRowIndex, columnMap)


  if (positions.length === 0) {
    return createEmptyPortfolioData()
  }

  // Calculate total value
  const calculatedTotal = positions.reduce((sum, p) => sum + p.totalValueCHF, 0)
  const finalTotal = totalPortfolioValue > calculatedTotal ? totalPortfolioValue : calculatedTotal


  // Enrich with API data
  const enrichedPositions = await enrichPositionsWithAPIData(
    positions.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      currency: p.currency,
      category: p.category,
      domicile: p.domicile || "Unknown",
      geography: p.geography || "Unknown",
      sector: p.sector || "Unknown",
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

// Helper function to check if a cell is a category header
function isCategoryHeader(cell: string): boolean {
  if (!cell) return false
  const lowerCell = cell.toLowerCase()
  return lowerCell.includes('actions') || 
         lowerCell.includes('etf') ||
         lowerCell.includes('fonds') ||
         lowerCell.includes('obligations') ||
         lowerCell.includes('crypto') ||
         lowerCell.includes('produits structurés') ||
         lowerCell.includes('produits structurs') || // Handle corrupted encoding
         lowerCell.includes('crypto-monnaies')
}

// Helper function to normalize category names
function normalizeCategory(category: string): string {
  const lowerCategory = category.toLowerCase()
  if (lowerCategory.includes('actions')) return 'Actions'
  if (lowerCategory.includes('etf')) return 'ETF'
  if (lowerCategory.includes('fonds')) return 'Funds'
  if (lowerCategory.includes('obligations')) return 'Bonds'
  if (lowerCategory.includes('crypto') || lowerCategory.includes('crypto-monnaies')) return 'Cryptocurrencies'
  if (lowerCategory.includes('produits structurés') || lowerCategory.includes('produits structurs')) return 'Structured Products'
  return category
}

// Helper function to check if a row is a subtotal row
function isSubtotalRow(cell: string): boolean {
  if (!cell) return false
  const lowerCell = cell.toLowerCase()
  return lowerCell.includes('sous-total') || 
         lowerCell.includes('subtotal') || 
         lowerCell.includes('total')
}

// Helper function to check if a row is the grand total row
function isGrandTotalRow(cell: string): boolean {
  if (!cell) return false
  const lowerCell = cell.toLowerCase()
  return lowerCell === 'total' || 
         lowerCell.includes('total général') || 
         lowerCell.includes('grand total')
}

// Helper function to extract grand total data
function extractGrandTotalData(row: string[], columnMapping: any): { amount: number; currency: string } | null {
  // Look for the largest number in the row as the grand total amount
  let largestAmount = 0
  let currency = 'CHF' // Default currency
  
  for (let i = 0; i < row.length; i++) {
    const cell = row[i]?.toString().trim()
    if (!cell) continue
    
    // Try to parse as number
    const amount = parseSwissNumber(cell)
    if (!isNaN(amount) && amount > largestAmount) {
      largestAmount = amount
    }
    
    // Check if this cell looks like a currency code
    if (cell.length === 3 && /^[A-Z]{3}$/.test(cell.toUpperCase())) {
      currency = cell.toUpperCase()
    }
  }
  
  return largestAmount > 0 ? { amount: largestAmount, currency } : null
}

// Helper function to parse a position row
function parsePositionRow(row: string[], columnIndices: any, currentCategory: string, headerRow: string[]): ParsedPosition | null {
  // Check if this row has a valid symbol in the symbol column
  const symbol = cleanSymbol(row[columnIndices.symbol]?.toString())
  if (!symbol || symbol.length === 0) {
    return null
  }
  
  // Parse the position data using the column indices
  const quantity = parseSwissNumber(row[columnIndices.quantity]?.toString())
  const unitCost = parseSwissNumber(row[columnIndices.unitCost]?.toString())
  const totalValue = parseSwissNumber(row[columnIndices.totalValue]?.toString())
  const price = parseSwissNumber(row[columnIndices.price]?.toString())
  const currency = row[columnIndices.currency]?.toString().trim() || 'CHF'
  const totalValueCHF = parseSwissNumber(row[columnIndices.totalValueCHF]?.toString())
  
  // Validate that we have a valid quantity
  if (quantity <= 0) {
    return null
  }
  
  return {
    symbol,
    name: symbol, // Use symbol as name for now
    quantity,
    price: price || unitCost,
    currency,
    category: currentCategory || 'Unknown',
    domicile: 'CH',
    totalValue: totalValueCHF || totalValue
  }
}

async function parseSwissBankCSV(rows: string[][]): Promise<SwissPortfolioData> {
  
  if (!rows || rows.length === 0) {
    return createEmptyPortfolioData()
  }

  // Check if first row is a category header or actual column header
  let headerRowIndex = 0
  let startRowIndex = 1
  
  // If first row looks like a category header, use it as such and find actual headers later
  if (rows[0] && isCategoryHeader(rows[0][0]?.toString())) {
    // For now, we'll use fixed column indices since we know the Swiss bank structure
    headerRowIndex = 0  // We'll still reference row 0 for consistency, but won't use it as headers
    startRowIndex = 0   // Start processing from row 0 to catch the category
  }
  
  const headerRow = rows[headerRowIndex]
  
  // Use fixed column indices based on the actual Swiss bank CSV structure
  const columnIndices = {
    symbol: 1,        // "Symbole" column
    quantity: 2,      // "Quantité" column  
    unitCost: 3,      // "Coût unitaire" column
    totalValue: 4,    // "Valeur totale" column
    dailyChange: 5,   // "Variation journalière" column
    dailyChangePercent: 6, // "Var. quot. %" column
    price: 7,         // "Prix" column
    currency: 8,      // "Dev." column
    gainLossCHF: 9,   // "G&P CHF" column
    gainLossPercent: 10, // "G&P %" column
    totalValueCHF: 11, // "Valeur totale CHF" column
    positionPercent: 12 // "Positions %" column
  }
  
  
  const positions: ParsedPosition[] = []
  let currentCategory = ""
  let totalPortfolioValue = 0
  
  // Process rows starting from appropriate index
  for (let i = startRowIndex; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    
    const firstCell = row[0]?.toString().trim()
    
    // Check if this is a category header
    if (isCategoryHeader(firstCell)) {
      currentCategory = normalizeCategory(firstCell)
      continue
    }
    
    // Check if this is a subtotal row
    if (isSubtotalRow(firstCell)) {
      continue
    }
    
    // Check if this is the grand total row
    if (isGrandTotalRow(firstCell)) {
      // Extract grand total value
      const grandTotalData = extractGrandTotalData(row, {})
      if (grandTotalData) {
        totalPortfolioValue = grandTotalData.amount
      }
      continue
    }
    
    // Try to parse as a position row
    const position = parsePositionRow(row, columnIndices, currentCategory, headerRow)
    if (position) {
      positions.push(position)
    } else {
    }
  }
  
  
  // Enrich positions with API data
  const enrichedPositions = await enrichPositionsWithAPIData(positions)
  
  // Calculate total value if not found in grand total
  if (totalPortfolioValue === 0) {
    totalPortfolioValue = enrichedPositions.reduce((sum, pos) => sum + pos.totalValueCHF, 0)
  }
  
  // Calculate allocations
  const assetAllocation = calculateAssetAllocation(enrichedPositions, totalPortfolioValue)
  const currencyAllocation = calculateTrueCurrencyAllocation(enrichedPositions, totalPortfolioValue)
  const countryAllocation = calculateTrueCountryAllocation(enrichedPositions, totalPortfolioValue)
  const sectorAllocation = calculateTrueSectorAllocation(enrichedPositions, totalPortfolioValue)
  const domicileAllocation = calculateDomicileAllocation(enrichedPositions, totalPortfolioValue)
  
  return {
    accountOverview: {
      totalValue: totalPortfolioValue,
      securitiesValue: totalPortfolioValue,
      cashBalance: 0
    },
    positions: enrichedPositions,
    assetAllocation,
    currencyAllocation,
    trueCountryAllocation: countryAllocation,
    trueSectorAllocation: sectorAllocation,
    domicileAllocation
  }
}

async function parseCSVWithoutHeaders(rows: string[][]): Promise<SwissPortfolioData> {

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
    return createEmptyPortfolioData()
  }


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
      domicile: p.domicile || "Unknown",
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

function createEmptyPortfolioData(): SwissPortfolioData {
  return {
    accountOverview: {
      totalValue: 0,
      cashBalance: 0,
      securitiesValue: 0,
    },
    positions: [],
    assetAllocation: [],
    currencyAllocation: [],
    trueCountryAllocation: [],
    trueSectorAllocation: [],
    domicileAllocation: [],
  }
}

function findColumnIndex(headers: string[], searchTerms: string[]): number {
  for (const term of searchTerms) {
    const index = headers.findIndex((h) => {
      const headerLower = h.toLowerCase().trim()
      const termLower = term.toLowerCase().trim()
      return headerLower.includes(termLower) || termLower.includes(headerLower)
    })
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


  // Handle Swiss number format: 1'234'567.89 and 1'234'567,89
  let cleaned = str.toString().trim()
  
  
  // If it contains both apostrophes and commas, treat comma as decimal separator
  if (cleaned.includes("'") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/'/g, "").replace(",", ".")
  }
  // If it only contains comma and no apostrophes, analyze the pattern
  else if (cleaned.includes(",") && !cleaned.includes("'")) {
    // Check if comma is likely a decimal separator
    // Swiss format: 123,45 (decimal) vs 1,234,567 (thousands)
    const parts = cleaned.split(",")
    if (parts.length === 2) {
      // Single comma with 1-3 digits after it = decimal separator
      const afterComma = parts[1]
      if (afterComma.length <= 3 && /^\d+$/.test(afterComma)) {
        cleaned = cleaned.replace(",", ".")
      } else {
        // Multiple digits after comma, likely thousands separator
        cleaned = cleaned.replace(/,/g, "")
      }
    } else if (parts.length > 2) {
      // Multiple commas = thousands separators
      cleaned = cleaned.replace(/,/g, "")
    } else {
      // Single comma at end or beginning, treat as decimal
      cleaned = cleaned.replace(",", ".")
    }
  }
  // If it only contains apostrophes, treat as thousands separator
  else if (cleaned.includes("'")) {
    cleaned = cleaned.replace(/'/g, "")
  }
  
  // Remove any remaining non-numeric characters except dots and minus
  cleaned = cleaned.replace(/[^\d.-]/g, "")

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


    if (score > maxScore) {
      maxScore = score
      bestDelimiter = delimiter
    }
  }

  return bestDelimiter
}

/**
 * Convert ETF symbols to their proper Yahoo Finance ticker format
 * Many ETFs need exchange suffixes or different ticker formats for Yahoo Finance
 */


// Helper function to enhance symbol with exchange suffix based on currency
const enhanceSymbolWithExchange = (symbol: string, currency: string): string => {
  if (symbol.includes('.')) return symbol
  
  if (currency === 'CHF') return `${symbol}.SW`
  if (currency === 'GBP') return `${symbol}.L`
  // For EUR, we'd need more logic to determine which European exchange
  
  return symbol
}

// Helper function to determine tax optimization for Swiss investors
const calculateTaxOptimization = (domicile: string): { taxOptimized: boolean; withholdingTax: number } => {
  const taxOptimized = domicile === "US" || domicile === "IE" || domicile === "LU"
  const withholdingTax = taxOptimized ? 15 : 30
  return { taxOptimized, withholdingTax }
}

// Helper function to extract sector and geography from ETF composition
const extractSectorAndGeography = (etfData: any, fallbackSector: string, fallbackGeography: string) => {
  let sector = fallbackSector
  let geography = fallbackGeography
  let domicile = "Unknown"
  
  if (etfData?.composition) {
    const sectors = etfData.composition.sectors
    if (Object.keys(sectors).length > 0) {
      const largestSector = Object.entries(sectors).reduce((a, b) => 
        sectors[a[0]] > sectors[b[0]] ? a : b
      )
      sector = largestSector[0]
    }
    
    const countries = etfData.composition.countries
    if (Object.keys(countries).length > 0) {
      const largestCountry = Object.entries(countries).reduce((a, b) => 
        countries[a[0]] > countries[b[0]] ? a : b
      )
      geography = largestCountry[0]
      domicile = etfData.domicile
    }
  }
  
  return { sector, geography, domicile }
}

// Helper function to create enriched position from parsed data and API response
const createEnrichedPosition = (
  parsed: ParsedPosition,
  etfData: any,
  quoteData: any
): PortfolioPosition => {
  const currentPrice = quoteData?.price || parsed.price
  const totalValueCHF = parsed.totalValue || parsed.quantity * currentPrice * getCurrencyRate(parsed.currency)
  
  // Determine domicile and tax optimization
  let domicile = parsed.domicile !== "Unknown" ? parsed.domicile : (etfData?.domicile || "Unknown")
  const { taxOptimized, withholdingTax } = calculateTaxOptimization(domicile)
  
  // Extract sector and geography
  const { sector, geography, domicile: enrichedDomicile } = extractSectorAndGeography(
    etfData, 
    parsed.sector || "Unknown", 
    parsed.geography || "Unknown"
  )
  
  if (enrichedDomicile !== "Unknown") {
    domicile = enrichedDomicile
  }
  
  return {
    symbol: parsed.symbol,
    name: etfData?.name || parsed.name,
    quantity: parsed.quantity,
    unitCost: parsed.price,
    price: parsed.price,
    currentPrice: currentPrice,
    totalValueCHF,
    currency: parsed.currency,
    category: parsed.category,
    sector: sector,
    geography: parsed.geography || geography,
    domicile: domicile,
    withholdingTax: etfData?.composition ? 15 : withholdingTax,
    taxOptimized: taxOptimized,
    gainLossCHF: totalValueCHF - parsed.quantity * parsed.price * getCurrencyRate(parsed.currency),
    unrealizedGainLoss: (currentPrice - parsed.price) * parsed.quantity,
    unrealizedGainLossPercent: ((currentPrice - parsed.price) / parsed.price) * 100,
    positionPercent: 0, // Will be calculated later
    dailyChangePercent: 0, // Not available from current service
    isOTC: false,
    etfComposition: etfData?.composition || undefined,
  }
}

// Helper function to create fallback position when API enrichment fails
const createFallbackPosition = (parsed: ParsedPosition): PortfolioPosition => {
  return {
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
}

// Helper function to process a single position with API enrichment
const enrichSinglePosition = async (parsed: ParsedPosition): Promise<PortfolioPosition> => {
  try {
    // Smart symbol resolution based on CSV currency
    const smartSymbol = enhanceSymbolWithExchange(parsed.symbol, parsed.currency)
    
    const position = {
      symbol: smartSymbol,
      name: parsed.name,
      currency: parsed.currency,
      exchange: "UNKNOWN",
      averagePrice: parsed.price,
      category: parsed.category
    }

    // Add timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout enriching ${parsed.symbol} after 30 seconds`)), 30000)
    })
    
    const { etfData, quoteData } = await Promise.race([
      resolveSymbolAndFetchData(position),
      timeoutPromise
    ])

    const enrichedPosition = createEnrichedPosition(parsed, etfData, quoteData)
    
    // Log missing enrichment data for individual stocks
    if ((enrichedPosition.sector === "Unknown" || enrichedPosition.geography === "Unknown") && 
        parsed.category === "Actions") {
      console.warn(`⚠️ No enrichment data found for individual stock ${parsed.symbol}`)
      console.warn(`  - Sector: ${enrichedPosition.sector}`)
      console.warn(`  - Geography: ${enrichedPosition.geography}`)
      console.warn(`  - ETF data available: ${!!etfData}`)
      console.warn(`  - ETF composition available: ${!!etfData?.composition}`)
      if (etfData?.composition) {
        console.warn(`  - Composition sectors:`, Object.keys(etfData.composition.sectors))
        console.warn(`  - Composition countries:`, Object.keys(etfData.composition.countries))
      }
    }
    
    return enrichedPosition
  } catch (error) {
    console.error(`Error enriching ${parsed.symbol}:`, error)
    
    // Log timeout details
    if (error instanceof Error && error.message.includes('Timeout')) {
      console.error(`❌ TIMEOUT: CSV loading stuck on ${parsed.symbol} - this suggests an API hang`)
      console.error(`   Position category: ${parsed.category}`)
      console.error(`   This often indicates Yahoo Finance session or network issues`)
    }

    return createFallbackPosition(parsed)
  }
}

async function enrichPositionsWithAPIData(parsedPositions: ParsedPosition[]): Promise<PortfolioPosition[]> {
  const enrichedPositions: PortfolioPosition[] = []
  
  // Process positions in batches for controlled parallelism
  const BATCH_SIZE = 3 // Avoid overwhelming the API
  const batches = []
  
  for (let i = 0; i < parsedPositions.length; i += BATCH_SIZE) {
    batches.push(parsedPositions.slice(i, i + BATCH_SIZE))
  }
  
  for (const batch of batches) {
    
    const batchPromises = batch.map(enrichSinglePosition)
    
    // Wait for all positions in this batch to complete
    const batchResults = await Promise.all(batchPromises)
    enrichedPositions.push(...batchResults)
    
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

function calculateTrueCountryAllocation(positions: PortfolioPosition[], totalValue: number): AllocationItem[] {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    // Use ETF composition data for true country exposure (works for both ETFs and individual stocks converted to ETF-like format)
    let hasCountryData = false
    
    if (position.etfComposition) {
        // Try new structure first: country array
        if (position.etfComposition.country && Array.isArray(position.etfComposition.country)) {
          position.etfComposition.country.forEach(({ country, weight }) => {
            const value = (weight / 100) * position.totalValueCHF // weight is in percentage
            const current = allocation.get(country) || 0
            allocation.set(country, current + value)
          })
          hasCountryData = true
        }
        // Try old structure: countries object
        else if (position.etfComposition.countries) {
          Object.entries(position.etfComposition.countries).forEach(([country, weight]) => {
            const value = (weight / 100) * position.totalValueCHF
            const current = allocation.get(country) || 0
            allocation.set(country, current + value)
          })
          hasCountryData = true
        }
      }
    
    if (!hasCountryData) {
      // Fallback to geography if no ETF composition data (for all asset types)
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
    // Use ETF composition data for true sector exposure (works for both ETFs and individual stocks converted to ETF-like format)
    let hasSectorData = false
    
    if (position.etfComposition && position.etfComposition.sectors) {
      const sectors = position.etfComposition.sectors
      Object.entries(sectors).forEach(([sector, weight]) => {
        const value = (weight / 100) * position.totalValueCHF
        const current = allocation.get(sector) || 0
        allocation.set(sector, current + value)
      })
      hasSectorData = true
    }
    
    if (!hasSectorData) {
      // Fallback to position.sector if no ETF composition data (for all asset types)
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
