import { safePDFExtraction } from "./lib/pdf-utils"
import { apiService } from "./lib/api-service"
import Papa from "papaparse"

export interface SwissPortfolioData {
  accountOverview: {
    totalValue: number
    cashBalance: number
    securitiesValue: number
    cryptoValue: number
    purchasingPower: number
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

const CATEGORY_ALIASES: Record<string, string> = {
  // French → canonical
  Actions: "Actions",
  "Produits structurés": "Structured Products",
  Fonds: "Funds",
  ETF: "ETF",
  Obligations: "Bonds",
  "Crypto-monnaies": "Cryptocurrencies",
  // English → canonical
  Equities: "Actions",
  "Structured products": "Structured Products",
  Funds: "Funds",
  Bonds: "Bonds",
  Cryptocurrencies: "Cryptocurrencies",
}

/**
 * Parses a Swiss portfolio PDF or text file with real API integration.
 */
async function parseSwissPortfolioPDF(input: File | string): Promise<SwissPortfolioData> {
  let text: string

  if (input instanceof File) {
    console.log(`Processing file: ${input.name} (${input.type}, ${input.size} bytes)`)

    try {
      if (input.type === "text/csv" || input.name.endsWith(".csv")) {
        text = await input.text()
        console.log("CSV file detected, parsing...")
        return parseSQCSV(text)
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
        "File processing failed. Please try the copy-paste method:\n\n" +
          "1. Open your PDF file\n" +
          "2. Select all text (Ctrl+A or Cmd+A)\n" +
          "3. Copy the text (Ctrl+C or Cmd+C)\n" +
          "4. Use the 'Paste Text' tab\n" +
          "5. Paste and analyze\n\n" +
          "Error details: " +
          (extractionError instanceof Error ? extractionError.message : String(extractionError)),
      )
    }
  } else {
    text = input
    console.log("Text input processed, length:", text.length)

    // Check if the text input is CSV format
    if (looksLikeSQPortfolioCSV(text)) {
      console.log("CSV format detected in text input")
      return parseSQCSV(text)
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

    // Try parsing as simple text format
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

function looksLikeSQPortfolioCSV(text: string): boolean {
  const lines = text.split("\n").slice(0, 10) // Check first 10 lines
  return lines.some(
    (line) =>
      line.includes("Symbole,Quantité") || // French
      line.includes("Symbol,Quantity") || // English
      line.includes("Symbole;Quantité") || // French with semicolon
      line.includes("Symbol;Quantity") || // English with semicolon
      line.includes("Symbole,Quantit") || // Handle encoding issues
      (line.includes("Symbole") && line.includes("Quantit")), // Flexible matching
  )
}

function detectCSVDelimiter(csvText: string): string {
  const delimiters = [",", ";", "\t", "|"]
  const firstLine = csvText.split(/\r?\n/).find((line) => line.trim()) || ""
  const counts = delimiters.map((d) => ({ d, c: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length }))
  const best = counts.reduce((a, b) => (b.c > a.c ? b : a), { d: ",", c: 0 })
  console.log("Delimiter detection:", counts, "chosen:", best.d)
  return best.c === 0 ? "," : best.d
}

async function parseSQCSV(csv: string): Promise<SwissPortfolioData> {
  const delimiter = detectCSVDelimiter(csv)
  const { data } = Papa.parse(csv, {
    delimiter,
    skipEmptyLines: "greedy",
    dynamicTyping: false, // Keep as strings for better parsing control
  })

  console.log("CSV parsing started with", data.length, "rows")
  console.log("Header row:", data[0])

  const header = data[0] as string[]
  const positions: PortfolioPosition[] = []
  let currentCategory = ""

  // Map column indices based on the actual CSV structure
  const symbolIndex = header.findIndex((h) => h.includes("Symbole") || h.includes("Symbol"))
  const quantityIndex = header.findIndex((h) => h.includes("Quantit") || h.includes("Quantity"))
  const unitCostIndex = header.findIndex((h) => h.includes("unitaire") || h.includes("Cost"))
  const priceIndex = header.findIndex((h) => h.includes("Prix") || h.includes("Price"))
  const currencyIndex = header.findIndex((h) => h.includes("Dev") || h.includes("Currency"))
  const totalCHFIndex = header.findIndex((h) => h.includes("totale CHF") || h.includes("Total CHF"))
  const gainLossIndex = header.findIndex((h) => h.includes("G&P CHF") || h.includes("Gain"))
  const gainLossPercentIndex = header.findIndex((h) => h.includes("G&P %") || h.includes("Gain %"))
  const positionPercentIndex = header.findIndex((h) => h.includes("Positions %") || h.includes("Position %"))
  const dailyChangeIndex = header.findIndex((h) => h.includes("quot. %") || h.includes("Daily %"))

  console.log("Column mapping:", {
    symbol: symbolIndex,
    quantity: quantityIndex,
    unitCost: unitCostIndex,
    price: priceIndex,
    currency: currencyIndex,
    totalCHF: totalCHFIndex,
    gainLoss: gainLossIndex,
    positionPercent: positionPercentIndex,
  })

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[]

    if (!row || row.length < header.length) continue

    const first = (row[0] || "").toString().trim()
    const symbol = symbolIndex >= 0 ? (row[symbolIndex] || "").toString().trim() : ""

    // 1. Category detection
    if (CATEGORY_ALIASES[first] || first.match(/^(Actions|ETF|Obligations|Fonds)/i)) {
      currentCategory = CATEGORY_ALIASES[first] || first
      console.log(`Found category: ${currentCategory}`)
      continue
    }

    // 2. Skip summary/total rows
    if (
      symbol === "Total" ||
      symbol.startsWith("Sous-total") ||
      symbol.startsWith("Subtotal") ||
      symbol.toLowerCase().includes("total") ||
      !symbol ||
      symbol.length < 2
    ) {
      console.log(`Skipping summary/empty row: ${symbol}`)
      continue
    }

    // 3. Extract position data
    const quantityStr = quantityIndex >= 0 ? row[quantityIndex] : ""
    const unitCostStr = unitCostIndex >= 0 ? row[unitCostIndex] : ""
    const priceStr = priceIndex >= 0 ? row[priceIndex] : ""
    const currencyStr = currencyIndex >= 0 ? row[currencyIndex] : "CHF"
    const totalCHFStr = totalCHFIndex >= 0 ? row[totalCHFIndex] : ""
    const gainLossStr = gainLossIndex >= 0 ? row[gainLossIndex] : ""
    const gainLossPercentStr = gainLossPercentIndex >= 0 ? row[gainLossPercentIndex] : ""
    const positionPercentStr = positionPercentIndex >= 0 ? row[positionPercentIndex] : ""
    const dailyChangeStr = dailyChangeIndex >= 0 ? row[dailyChangeIndex] : ""

    // Parse numbers with Swiss formatting
    const quantity = parseSwissNumber(quantityStr)
    const unitCost = parseSwissNumber(unitCostStr)
    const price = parseSwissNumber(priceStr) || unitCost
    const totalCHF = parseSwissNumber(totalCHFStr)

    // Skip if missing essential data
    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
      console.log(`Skipping invalid position: ${symbol} (qty: ${quantity}, price: ${price})`)
      continue
    }

    console.log(`Processing position: ${symbol} - ${quantity} @ ${price} ${currencyStr}`)

    positions.push({
      symbol: symbol,
      name: symbol, // Will be enriched with API data
      quantity: quantity,
      unitCost: unitCost || price,
      price: price,
      totalValueCHF: totalCHF || quantity * price * (currencyStr === "CHF" ? 1 : 0.92),
      currency: currencyStr.trim(),
      category: currentCategory || "Unknown",
      gainLossCHF: parseSwissNumber(gainLossStr),
      positionPercent: parseSwissNumber(positionPercentStr.replace("%", "")),
      dailyChangePercent: parseSwissNumber(dailyChangeStr.replace("%", "")),
      taxOptimized: false,
      isOTC: false,
    })
  }

  console.log(`Parsed ${positions.length} positions from CSV`)

  if (positions.length === 0) {
    throw new Error("No valid positions found in CSV file. Please check the file format.")
  }

  const total = positions.reduce((s, p) => s + p.totalValueCHF, 0)

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
      totalValue: total,
      cashBalance: 0,
      securitiesValue: total,
      cryptoValue: 0,
      purchasingPower: 0,
    },
    positions: enrichedPositions,
    assetAllocation: calculateAssetAllocation(enrichedPositions, total),
    currencyAllocation: await calculateTrueCurrencyAllocation(enrichedPositions, total),
    trueCountryAllocation: await calculateTrueCountryAllocation(enrichedPositions, total),
    trueSectorAllocation: await calculateTrueSectorAllocation(enrichedPositions, total),
    domicileAllocation: calculateDomicileAllocation(enrichedPositions, total),
  }
}

function parseSwissNumber(str: string): number {
  if (!str) return 0
  // Handle Swiss number format: 1'234'567.89 and encoding issues
  const cleaned = str
    .toString()
    .replace(/'/g, "") // Remove apostrophes
    .replace(/,/g, ".") // Replace comma with dot
    .replace(/[^\d.-]/g, "") // Remove non-numeric characters except dots and minus

  const parsed = Number.parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function parseAccountOverview(text: string) {
  const overview = {
    totalValue: 0,
    cashBalance: 0,
    securitiesValue: 0,
    cryptoValue: 0,
    purchasingPower: 0,
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
      // Get real-time price
      const priceData = await apiService.getStockPrice(parsed.symbol)

      // Get asset metadata
      const metadata = await apiService.getAssetMetadata(parsed.symbol)

      // Get ETF composition if applicable
      let etfComposition = null
      if (parsed.category === "ETF") {
        etfComposition = await apiService.getETFComposition(parsed.symbol)
      }

      const currentPrice = priceData?.price || parsed.price
      const totalValueCHF = parsed.totalValue || parsed.quantity * currentPrice * (parsed.currency === "CHF" ? 1 : 0.92) // Rough CHF conversion

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
        domicile: etfComposition?.domicile || (metadata?.country === "United States" ? "US" : "Unknown"),
        withholdingTax: etfComposition?.withholdingTax || (metadata?.country === "United States" ? 30 : 15),
        taxOptimized: etfComposition?.domicile === "IE" || etfComposition?.domicile === "LU",
        gainLossCHF: totalValueCHF - parsed.quantity * parsed.price * 0.92,
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
        totalValueCHF: parsed.totalValue || parsed.quantity * parsed.price * 0.92,
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
    if (position.category === "ETF") {
      // Get ETF composition for true currency exposure
      try {
        const composition = await apiService.getETFComposition(position.symbol)
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
    if (position.category === "ETF") {
      // Get ETF composition for true country exposure
      try {
        const composition = await apiService.getETFComposition(position.symbol)
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
    if (position.category === "ETF") {
      // Get ETF composition for true sector exposure
      try {
        const composition = await apiService.getETFComposition(position.symbol)
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

export { parseSwissPortfolioPDF }
