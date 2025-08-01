import Papa from "papaparse"
import { etfDataService, resolveSymbolAndFetchData } from "./etf-data-service"

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

export const parsePortfolioCsv = async (csvContent: string): Promise<SwissPortfolioData> => {
  console.log("Starting enhanced CSV parsing...")
  
  // Handle empty content
  if (!csvContent || csvContent.trim() === "") {
    console.log("Empty CSV content, returning empty data structure")
    return createEmptyPortfolioData()
  }
  
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

  // Check if this is a Swiss bank format CSV (with category headers or French/German headers)
  const isSwissBankFormat = rows.some(row => 
    row && row.length > 0 && 
    (row[0]?.toLowerCase().includes('actions') || 
     row[0]?.toLowerCase().includes('etf') ||
     row[0]?.toLowerCase().includes('fonds') ||
     row[0]?.toLowerCase().includes('obligations') ||
     row[0]?.toLowerCase().includes('produits structurés') ||
     row[0]?.toLowerCase().includes('crypto-monnaies') ||
     row[0]?.toLowerCase().includes('aktien') ||
     row[0]?.toLowerCase().includes('anleihen')) ||
    // Also detect French/German headers as Swiss bank format
    rows.some(row => 
      row && row.length > 0 && 
      ((row.join(" ").toLowerCase().includes('symbole') && 
        row.join(" ").toLowerCase().includes('quantité') &&
        row.join(" ").toLowerCase().includes('valeur totale')) ||
       (row.join(" ").toLowerCase().includes('symbol') && 
        row.join(" ").toLowerCase().includes('menge') &&
        row.join(" ").toLowerCase().includes('gesamtwert')))
    )
  )

  if (isSwissBankFormat) {
    console.log("Detected Swiss bank format CSV, using specialized parser")
    return await parseSwissBankCSV(rows)
  }

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
    currency: findColumnIndex(headers, ["devise", "currency", "dev", "ccy", "curr", "monnaie", "währung"]),
    category: findColumnIndex(headers, ["catégorie", "category", "type", "classe", "asset class", "instrument type"]),
    geography: findColumnIndex(headers, ["geography", "country", "region", "pays", "région", "géographie"]),
    sector: findColumnIndex(headers, ["sector", "industry", "secteur", "industrie"]),
    domicile: findColumnIndex(headers, ["domicile", "domicile country", "fund domicile", "incorporation"]),
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
      "gesamtwert chf",
      "valeur totale chf",
      "total value",
      "gesamtwert",
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

  // Process data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const firstCell = row[0]?.toString().trim()
    if (!firstCell) continue

    // Skip total/summary rows (only if the first cell contains these keywords)
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
    let priceStr = columnMap.price >= 0 ? row[columnMap.price]?.toString() : ""
    let currencyStr = columnMap.currency >= 0 ? row[columnMap.currency]?.toString().trim() : "CHF"
    let totalCHFStr = columnMap.totalCHF >= 0 ? row[columnMap.totalCHF]?.toString() : ""
    
    // Handle case where decimal price is split across fields (e.g., "123,45" becomes "123" and "45")
    if (columnMap.price >= 0 && columnMap.currency >= 0 && row.length > columnMap.currency) {
      const nextField = row[columnMap.currency]?.toString().trim()
      // Check if the "currency" field looks like decimal digits (1-3 digits) AND the next field looks like a currency code
      if (nextField && /^\d{1,3}$/.test(nextField) && priceStr && /^\d+$/.test(priceStr)) {
        const nextNextField = row.length > columnMap.currency + 1 ? row[columnMap.currency + 1]?.toString().trim() : ""
        // Only reconstruct if the next field looks like a currency code (3 letters)
        if (nextNextField && /^[A-Z]{3}$/.test(nextNextField.toUpperCase())) {
          // Reconstruct the decimal price
          priceStr = `${priceStr}.${nextField}`
          // Shift currency and total fields
          currencyStr = nextNextField
          totalCHFStr = row.length > columnMap.currency + 2 ? row[columnMap.currency + 2]?.toString() : ""
          console.log(`Reconstructed decimal price: ${priceStr}, currency: ${currencyStr}`)
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

    // Determine category from column data or current category
    let positionCategory = currentCategory || "Unknown"
    if (categoryStr) {
      // Map French/other language categories to standard categories
      const categoryMapping: { [key: string]: string } = {
        "actions": "Actions",
        "stocks": "Actions", 
        "equity": "Actions",
        "obligations": "Bonds",
        "bonds": "Bonds",
        "bond": "Bonds",
        "etf": "ETF",
        "fonds": "Funds",
        "funds": "Funds",
        "cash": "Cash",
        "liquidités": "Cash"
      }
      
      const mappedCategory = categoryMapping[categoryStr.toLowerCase()]
      if (mappedCategory) {
        positionCategory = mappedCategory
      } else {
        positionCategory = categoryStr // Use original if no mapping found
      }
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
    })
  }

  console.log(`✅ Parsed ${positions.length} positions from CSV`)

  if (positions.length === 0) {
    console.log("No valid positions found, returning empty data structure")
    return createEmptyPortfolioData()
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

async function parseSwissBankCSV(rows: string[][]): Promise<SwissPortfolioData> {
  console.log("Parsing Swiss bank format CSV...")
  
  const positions: ParsedPosition[] = []
  let currentCategory = ""
  let totalPortfolioValue = 0
  
  // First pass: identify category headers and their positions
  const categoryPositions: { [key: number]: string } = {}
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row && row.length > 0) {
      const firstCell = row[0]?.toString().trim()
      if (firstCell && (
        firstCell.toLowerCase().includes("actions") || 
        firstCell.toLowerCase().includes("etf") ||
        firstCell.toLowerCase().includes("fonds") ||
        firstCell.toLowerCase().includes("obligations") ||
        firstCell.toLowerCase().includes("crypto") ||
        firstCell.toLowerCase().includes("produits") ||
        firstCell.toLowerCase().includes("aktien") ||
        firstCell.toLowerCase().includes("anleihen") ||
        firstCell.toLowerCase().includes("stocks") ||
        firstCell.toLowerCase().includes("bonds")
      )) {
        categoryPositions[i] = firstCell
        console.log("Found category at row", i, ":", firstCell)
      }
    }
  }
  
  // Find the header row (usually row 1 with "Symbole", "Quantité", etc.)
  let headerRow: string[] = []
  let headerRowIndex = -1
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    if (row && row.length > 0) {
      const rowText = row.join(" ").toLowerCase()
      if ((rowText.includes("symbole") && (rowText.includes("quantité") || rowText.includes("menge"))) ||
          (rowText.includes("symbol") && rowText.includes("menge"))) {
        headerRow = row
        headerRowIndex = i
        console.log("Found header row at index", i, ":", headerRow)
        break
      }
    }
  }
  
  if (headerRowIndex === -1) {
    console.log("No header row found, using fallback parsing")
    return createEmptyPortfolioData()
  }
  
  // Find column indices using more flexible matching
  const symbolIndex = headerRow.findIndex(h => h.toLowerCase().includes("symbole") || h.toLowerCase().includes("symbol"))
  const quantityIndex = headerRow.findIndex(h => h.toLowerCase().includes("quantité") || h.toLowerCase().includes("menge"))
  const costIndex = headerRow.findIndex(h => h.toLowerCase().includes("coût") || h.toLowerCase().includes("prix") || h.toLowerCase().includes("kurs") || h.toLowerCase().includes("einstandspreis") || h.toLowerCase().includes("cours"))
  const totalValueIndex = headerRow.findIndex(h => h.toLowerCase().includes("valeur totale") || h.toLowerCase().includes("gesamtwert"))
  const currencyIndex = headerRow.findIndex(h => h.toLowerCase().includes("dev") || h.toLowerCase().includes("währung"))
  const gainLossIndex = headerRow.findIndex(h => h.toLowerCase().includes("g&p chf") || h.toLowerCase().includes("gewinn/verlust"))
  const positionPercentIndex = headerRow.findIndex(h => h.toLowerCase().includes("positions %") || h.toLowerCase().includes("position %"))
  const categoryIndex = headerRow.findIndex(h => h.toLowerCase().includes("catégorie") || h.toLowerCase().includes("category") || h.toLowerCase().includes("type"))
  
  console.log("Header row:", headerRow)
  console.log("Column indices:", {
    symbol: symbolIndex,
    quantity: quantityIndex,
    cost: costIndex,
    totalValue: totalValueIndex,
    currency: currencyIndex,
    gainLoss: gainLossIndex,
    positionPercent: positionPercentIndex
  })

  // If we couldn't find the expected columns, try to infer them from the data
  if (symbolIndex === -1 || quantityIndex === -1) {
    console.log("Could not find expected columns, attempting to infer from data...")
    
    // Look at the first few data rows to infer column structure
    for (let i = headerRowIndex + 1; i < Math.min(rows.length, headerRowIndex + 5); i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      
      console.log(`Analyzing row ${i} for column inference:`, row)
      
      // Try to find symbol column (usually contains stock symbols like OXY, AAPL, etc.)
      if (symbolIndex === -1) {
        for (let j = 0; j < row.length; j++) {
          const cell = row[j]?.toString().trim()
          if (cell && cell.length >= 2 && cell.length <= 5 && /^[A-Z]+$/.test(cell)) {
            console.log(`Found potential symbol column at index ${j}: "${cell}"`)
            // Don't set symbolIndex yet, just log for debugging
          }
        }
      }
      
      // Try to find quantity column (usually contains whole numbers)
      if (quantityIndex === -1) {
        for (let j = 0; j < row.length; j++) {
          const cell = row[j]?.toString().trim()
          if (cell && /^\d+$/.test(cell) && parseInt(cell) > 0) {
            console.log(`Found potential quantity column at index ${j}: "${cell}"`)
            // Don't set quantityIndex yet, just log for debugging
          }
        }
      }
    }
    
    // Fallback: If we still can't find columns, try common patterns
    // Based on the sample row: [ " ", "OXY", "200", "54.84", "9150.00", "480.00", "5.54%", "45.75", "USD", "-2118.00", "-22.53%", "7281.11", "0.80%", "" ]
    // Pattern: empty, symbol, quantity, price, total_value, ?, ?, ?, currency, ?, ?, ?, ?, empty
    
    if (symbolIndex === -1) {
      // Try to find symbol in common positions (usually index 1 or 2)
      for (let i = headerRowIndex + 1; i < Math.min(rows.length, headerRowIndex + 3); i++) {
        const row = rows[i]
        if (!row || row.length < 3) continue
        
        // Check if first cell is empty and second cell looks like a symbol
        if ((!row[0] || row[0].toString().trim() === "") && 
            row[1] && row[1].toString().trim().length >= 2 && 
            /^[A-Z]+$/.test(row[1].toString().trim())) {
          console.log(`Fallback: Found symbol pattern at index 1: "${row[1]}"`)
          // We'll use this pattern in the processing loop
        }
      }
    }
  }
  
  // Process data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    // Parse position data first to check if this is a valid position row
    let symbol = symbolIndex >= 0 ? cleanSymbol(row[symbolIndex]?.toString()) : ""
    
    // Fallback: If symbol index is -1, try common patterns
    if (!symbol && symbolIndex === -1) {
      // Try index 1 if first cell is empty (common pattern in Swiss bank CSVs)
      if ((!row[0] || row[0].toString().trim() === "") && 
          row[1] && row[1].toString().trim().length >= 2) {
        symbol = cleanSymbol(row[1]?.toString())
        console.log(`Fallback: Using symbol from index 1: "${symbol}"`)
      }
    }
    
    console.log(`Row ${i}:`, row)
    console.log(`Row ${i} symbol: "${symbol}", symbolIndex: ${symbolIndex}`)
    
    // If we have a valid symbol, this is likely a position row regardless of first cell
    if (symbol && symbol.length >= 1) {
      console.log(`Row ${i}: Valid symbol found, processing as position row`)
      // This is a position row, continue with parsing
    } else {
      console.log(`Row ${i}: No valid symbol, checking if category/summary row`)
      // No valid symbol found, check if this is a category or summary row
      const firstCell = row[0]?.toString().trim()
      if (!firstCell) {
        console.log(`Row ${i}: Empty first cell, skipping`)
        continue
      }

      // Check if this is a category header
      if (categoryPositions[i]) {
        currentCategory = categoryPositions[i]
        console.log("Found category:", currentCategory)
        continue
      }

      // Skip if this looks like a category header but wasn't caught in first pass
      if (firstCell.toLowerCase().includes("actions") || 
          firstCell.toLowerCase().includes("etf") ||
          firstCell.toLowerCase().includes("fonds") ||
          firstCell.toLowerCase().includes("obligations") ||
          firstCell.toLowerCase().includes("crypto") ||
          firstCell.toLowerCase().includes("produits") ||
          firstCell.toLowerCase().includes("aktien") ||
          firstCell.toLowerCase().includes("anleihen") ||
          firstCell.toLowerCase().includes("stocks") ||
          firstCell.toLowerCase().includes("bonds")) {
        currentCategory = firstCell
        console.log("Found category:", currentCategory)
        continue
      }

      // Skip total/summary rows
      if (firstCell.toLowerCase().includes("total") ||
          firstCell.toLowerCase().includes("sous-total") ||
          firstCell.toLowerCase().includes("subtotal") ||
          firstCell.toLowerCase().includes("somme") ||
          firstCell.toLowerCase().includes("sum") ||
          firstCell.toLowerCase().includes("portfolio") ||
          firstCell.toLowerCase().includes("portefeuille")) {
        const totalValue = extractLargestNumberFromRow(row)
        if (totalValue > totalPortfolioValue) {
          totalPortfolioValue = totalValue
          console.log(`Found potential total value: ${totalValue} at row ${i}`)
        }
        continue
      }
      
      // If we get here, it's not a valid position row and not a category/summary row
      console.log(`Row ${i}: Not a valid position, category, or summary row, skipping`)
      continue
    }

    // Determine column indices for this row (with fallbacks)
    let actualQuantityIndex = quantityIndex
    let actualCostIndex = costIndex
    let actualTotalValueIndex = totalValueIndex
    let actualCurrencyIndex = currencyIndex
    
    // If we're using fallback symbol detection, adjust other indices
    if (symbolIndex === -1 && symbol === cleanSymbol(row[1]?.toString())) {
      // Pattern: empty, symbol, quantity, price, total_value, ?, ?, ?, currency, ?, ?, ?, ?, empty
      actualQuantityIndex = 2
      actualCostIndex = 3
      actualTotalValueIndex = 4
      actualCurrencyIndex = 8
      console.log(`Using fallback column indices: quantity=${actualQuantityIndex}, cost=${actualCostIndex}, totalValue=${actualTotalValueIndex}, currency=${actualCurrencyIndex}`)
    }

    const name = symbol // Use symbol as name if no name column
    const quantity = actualQuantityIndex >= 0 ? parseSwissNumber(row[actualQuantityIndex]?.toString()) : 0
    const price = actualCostIndex >= 0 ? parseSwissNumber(row[actualCostIndex]?.toString()) : 0
    const currency = actualCurrencyIndex >= 0 ? row[actualCurrencyIndex]?.toString().trim() : "CHF"
    const totalValue = actualTotalValueIndex >= 0 ? parseSwissNumber(row[actualTotalValueIndex]?.toString()) : 0

    console.log(`Row ${i} parsed values:`, {
      symbol,
      quantity,
      price,
      currency,
      totalValue,
      actualQuantityIndex,
      actualCostIndex,
      actualTotalValueIndex,
      actualCurrencyIndex,
      rawQuantity: row[actualQuantityIndex],
      rawPrice: row[actualCostIndex],
      rawTotalValue: row[actualTotalValueIndex],
      rawCurrency: row[actualCurrencyIndex]
    })

    if (quantity <= 0) {
      console.log(`Row ${i}: Quantity <= 0, skipping`)
      continue
    }

    // Determine the category for this position
    // If we have a currentCategory, use it. Otherwise, try to find the category from previous rows
    let positionCategory = currentCategory
    if (!positionCategory || positionCategory === "Unknown") {
      // First, check if there's an explicit category column
      if (categoryIndex >= 0 && row[categoryIndex]) {
        positionCategory = row[categoryIndex].toString().trim()
      } else {
        // Look for the most recent category before this row
        for (let j = i - 1; j >= 0; j--) {
          if (categoryPositions[j]) {
            positionCategory = categoryPositions[j]
            break
          }
        }
      }
    }

    const position: ParsedPosition = {
      symbol,
      name,
      quantity,
      price,
      currency,
      category: positionCategory || "Unknown",
      domicile: "CH",
      totalValue
    }

    console.log("Parsed position:", position)
    positions.push(position)
  }

  console.log(`Parsed ${positions.length} positions with total value: ${totalPortfolioValue}`)

  // Enrich positions with API data
  const enrichedPositions = await enrichPositionsWithAPIData(positions)

  // Calculate allocations
  const totalValue = totalPortfolioValue || enrichedPositions.reduce((sum, p) => sum + p.totalValueCHF, 0)
  
  return {
    accountOverview: {
      totalValue,
      securitiesValue: totalValue,
      cashBalance: 0
    },
    positions: enrichedPositions,
    assetAllocation: calculateAssetAllocation(enrichedPositions, totalValue),
    currencyAllocation: calculateTrueCurrencyAllocation(enrichedPositions, totalValue),
    trueCountryAllocation: calculateTrueCountryAllocation(enrichedPositions, totalValue),
    trueSectorAllocation: calculateTrueSectorAllocation(enrichedPositions, totalValue),
    domicileAllocation: calculateDomicileAllocation(enrichedPositions, totalValue)
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
    console.log("Could not parse CSV structure, returning empty data structure")
    return createEmptyPortfolioData()
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

  console.log(`parseSwissNumber input: "${str}"`)

  // Handle Swiss number format: 1'234'567.89 and 1'234'567,89
  let cleaned = str.toString().trim()
  
  console.log(`parseSwissNumber after trim: "${cleaned}"`)
  
  // If it contains both apostrophes and commas, treat comma as decimal separator
  if (cleaned.includes("'") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/'/g, "").replace(",", ".")
    console.log(`parseSwissNumber after apostrophe+comma handling: "${cleaned}"`)
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
        console.log(`parseSwissNumber after decimal comma handling: "${cleaned}"`)
      } else {
        // Multiple digits after comma, likely thousands separator
        cleaned = cleaned.replace(/,/g, "")
        console.log(`parseSwissNumber after thousands comma handling: "${cleaned}"`)
      }
    } else if (parts.length > 2) {
      // Multiple commas = thousands separators
      cleaned = cleaned.replace(/,/g, "")
      console.log(`parseSwissNumber after multiple commas handling: "${cleaned}"`)
    } else {
      // Single comma at end or beginning, treat as decimal
      cleaned = cleaned.replace(",", ".")
      console.log(`parseSwissNumber after single comma handling: "${cleaned}"`)
    }
  }
  // If it only contains apostrophes, treat as thousands separator
  else if (cleaned.includes("'")) {
    cleaned = cleaned.replace(/'/g, "")
    console.log(`parseSwissNumber after apostrophe handling: "${cleaned}"`)
  }
  
  // Remove any remaining non-numeric characters except dots and minus
  cleaned = cleaned.replace(/[^\d.-]/g, "")
  console.log(`parseSwissNumber after final cleaning: "${cleaned}"`)

  const parsed = Number.parseFloat(cleaned)
  console.log(`parseSwissNumber final result: ${parsed}`)
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
 * Convert ETF symbols to their proper Yahoo Finance ticker format
 * Many ETFs need exchange suffixes or different ticker formats for Yahoo Finance
 */


async function enrichPositionsWithAPIData(parsedPositions: ParsedPosition[]): Promise<PortfolioPosition[]> {
  const enrichedPositions: PortfolioPosition[] = []

  for (const parsed of parsedPositions) {
    console.log(`Enriching ${parsed.symbol}...`)

    try {
      // Use centralized ETF data service for all enrichment
      // This handles symbol resolution, API calls, caching, and fallbacks
      const position = {
        symbol: parsed.symbol,
        name: parsed.name,
        currency: parsed.currency,
        exchange: "UNKNOWN", // Will be resolved by the service
        averagePrice: parsed.price,
        category: parsed.category
      }

      const { etfData, quoteData } = await resolveSymbolAndFetchData(position)
      
      console.log(`Enrichment results for ${parsed.symbol}:`, {
        etfData: etfData ? 'Found' : 'Not found',
        quoteData: quoteData ? 'Found' : 'Not found'
      })

      const currentPrice = quoteData?.price || parsed.price
      const totalValueCHF = parsed.totalValue || parsed.quantity * currentPrice * getCurrencyRate(parsed.currency)

      // Determine tax optimization for Swiss investors
      // Use original domicile from CSV if available, otherwise use enriched data
      const domicile = parsed.domicile !== "Unknown" ? parsed.domicile : (etfData?.domicile || "Unknown")

      // For Swiss investors: US domiciled ETFs are tax-optimized (15% withholding tax)
      // Irish/Luxembourg ETFs are also good (15% withholding tax)
      // Other domiciles have higher withholding taxes
      const taxOptimized = domicile === "US" || domicile === "IE" || domicile === "LU"

      // Extract sector and geography from ETF composition if available
      let sector = parsed.sector || "Unknown"
      let geography = parsed.geography || "Unknown"
      
      if (etfData?.composition && (parsed.category === "ETF" || parsed.category === "Funds")) {
        // For ETFs, use ETF composition data for sector and geography
        const sectors = etfData.composition.sectors
        if (Object.keys(sectors).length > 0) {
          const largestSector = Object.entries(sectors).reduce((a, b) => sectors[a[0]] > sectors[b[0]] ? a : b)
          sector = largestSector[0]
        }
        
        const countries = etfData.composition.countries
        if (Object.keys(countries).length > 0) {
          const largestCountry = Object.entries(countries).reduce((a, b) => countries[a[0]] > countries[b[0]] ? a : b)
          geography = largestCountry[0]
        }
      }

      const enrichedPosition: PortfolioPosition = {
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
        withholdingTax: etfData?.composition ? 15 : (domicile === "US" ? 15 : domicile === "IE" || domicile === "LU" ? 15 : 30),
        taxOptimized: taxOptimized,
        gainLossCHF: totalValueCHF - parsed.quantity * parsed.price * getCurrencyRate(parsed.currency),
        unrealizedGainLoss: (currentPrice - parsed.price) * parsed.quantity,
        unrealizedGainLossPercent: ((currentPrice - parsed.price) / parsed.price) * 100,
        positionPercent: 0, // Will be calculated later
        dailyChangePercent: 0, // Not available from current service, could be enhanced
        isOTC: false,
        // Store ETF composition data for true allocation calculations
        etfComposition: etfData?.composition || undefined,
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
    if (position.category === "ETF" || position.category === "Funds") {
      // Use ETF composition data for true country exposure
      if (position.etfComposition && position.etfComposition.countries) {
        const countries = position.etfComposition.countries
        Object.entries(countries).forEach(([country, weight]) => {
          const value = weight * position.totalValueCHF
          const current = allocation.get(country) || 0
          allocation.set(country, current + value)
        })
      } else {
        // Fallback to geography if no ETF composition data
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
      // Use ETF composition data for true sector exposure
      if (position.etfComposition && position.etfComposition.sectors) {
        const sectors = position.etfComposition.sectors
        Object.entries(sectors).forEach(([sector, weight]) => {
          const value = weight * position.totalValueCHF
          const current = allocation.get(sector) || 0
          allocation.set(sector, current + value)
        })
      } else {
        // Fallback to mixed if no ETF composition data
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
