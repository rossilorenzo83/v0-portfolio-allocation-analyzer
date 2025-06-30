import { safePDFExtraction } from "./lib/pdf-utils"
import { apiService } from "./lib/api-service"

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
  totalValueCHF: number
  currency: string
  category: string
  sector?: string
  geography?: string
  domicile?: string
  withholdingTax?: number
  taxOptimized: boolean
  gainLossCHF: number
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
}

/**
 * Parses a Swiss portfolio PDF or text file with real API integration.
 */
async function parseSwissPortfolioPDF(input: File | string): Promise<SwissPortfolioData> {
  let text: string

  if (input instanceof File) {
    console.log(`Processing file: ${input.name} (${input.type}, ${input.size} bytes)`)

    try {
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
  }

  // Basic text validation
  if (!text || text.trim().length < 10) {
    throw new Error("Insufficient text content found. Please ensure your file contains portfolio data.")
  }

  console.log("Starting real portfolio parsing...")

  // Parse account overview
  const accountOverview = parseAccountOverview(text)
  console.log("Account overview parsed:", accountOverview)

  // Parse positions
  const parsedPositions = parsePositions(text)
  console.log("Parsed positions:", parsedPositions.length)

  if (parsedPositions.length === 0) {
    throw new Error("No portfolio positions found. Please check the file format.")
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

function parseAccountOverview(text: string) {
  const overview = {
    totalValue: 0,
    cashBalance: 0,
    securitiesValue: 0,
    cryptoValue: 0,
    purchasingPower: 0,
  }

  // Swiss number format: 1'234'567.89
  const parseSwissNumber = (str: string): number => {
    return Number.parseFloat(str.replace(/'/g, "").replace(/,/g, ".")) || 0
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
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let currentCategory = "Unknown"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect category headers
    if (line.match(/^(Actions|Equities|Stock|Aktien)/i)) {
      currentCategory = "Actions"
      continue
    } else if (line.match(/^(ETF|Funds|Fonds)/i)) {
      currentCategory = "ETF"
      continue
    } else if (line.match(/^(Obligations|Bonds|Anleihen)/i)) {
      currentCategory = "Obligations"
      continue
    } else if (line.match(/^(Crypto|Bitcoin|BTC)/i)) {
      currentCategory = "Crypto-monnaies"
      continue
    }

    // Try to parse position line
    const position = parsePositionLine(line, currentCategory)
    if (position) {
      positions.push(position)
    }
  }

  return positions
}

function parsePositionLine(line: string, category: string): ParsedPosition | null {
  // Multiple patterns for different bank formats
  const patterns = [
    // Swissquote: AAPL Apple Inc. 100 150.00 USD
    /^([A-Z0-9]{2,6})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})$/,

    // UBS: AAPL Apple Inc. Qty: 200 Price: USD 175.50 Value: CHF 35'100.00
    /^([A-Z0-9]{2,6})\s+(.+?)\s+Qty:\s*(\d+(?:\.\d+)?)\s+Price:\s*([A-Z]{3})\s*(\d+(?:\.\d+)?)/,

    // Credit Suisse: AAPL | Apple Inc. | 300 shares | $145.00 | CHF 43'500.00
    /^([A-Z0-9]{2,6})\s*\|\s*(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s*shares?\s*\|\s*\$?(\d+(?:\.\d+)?)\s*\|/,

    // Generic: Symbol Name Quantity Price Currency
    /^([A-Z0-9]{2,6})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]{3})$/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      const [, symbol, name, quantity, price, currency] = match

      return {
        symbol: symbol.trim(),
        name: name.trim(),
        quantity: Number.parseFloat(quantity),
        price: Number.parseFloat(price),
        currency: currency || "CHF",
        category,
      }
    }
  }

  return null
}

async function enrichPositionsWithAPIData(parsedPositions: ParsedPosition[]): Promise<PortfolioPosition[]> {
  const enrichedPositions: PortfolioPosition[] = []

  for (const parsed of parsedPositions) {
    console.log(`Enriching ${parsed.symbol}...`)

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
    const totalValueCHF = parsed.quantity * currentPrice * (parsed.currency === "CHF" ? 1 : 0.92) // Rough CHF conversion

    const enrichedPosition: PortfolioPosition = {
      symbol: parsed.symbol,
      name: metadata?.name || parsed.name,
      quantity: parsed.quantity,
      unitCost: parsed.price,
      totalValueCHF,
      currency: parsed.currency,
      category: parsed.category,
      sector: metadata?.sector || "Unknown",
      geography: metadata?.country || "Unknown",
      domicile: etfComposition?.domicile || (metadata?.country === "United States" ? "US" : "Unknown"),
      withholdingTax: etfComposition?.withholdingTax || (metadata?.country === "United States" ? 30 : 15),
      taxOptimized: etfComposition?.domicile === "IE" || etfComposition?.domicile === "LU",
      gainLossCHF: totalValueCHF - parsed.quantity * parsed.price * 0.92,
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

async function calculateTrueCurrencyAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF") {
      // Get ETF composition for true currency exposure
      const composition = await apiService.getETFComposition(position.symbol)
      if (composition) {
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

async function calculateTrueCountryAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF") {
      // Get ETF composition for true country exposure
      const composition = await apiService.getETFComposition(position.symbol)
      if (composition) {
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

async function calculateTrueSectorAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF") {
      // Get ETF composition for true sector exposure
      const composition = await apiService.getETFComposition(position.symbol)
      if (composition) {
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

export { parseSwissPortfolioPDF }
