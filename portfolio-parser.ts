import { safePDFExtraction } from "./lib/pdf-utils"
import { apiService } from "./lib/api-service"
import Papa from 'papaparse';

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

const CATEGORY_ALIASES: Record<string, string> = {
  // French → canonical
  'Actions': 'Actions',
  'Produits structurés': 'Structured Products',
  'Fonds': 'Funds',
  'ETF': 'ETF',
  'Obligations': 'Bonds',
  'Crypto-monnaies': 'Cryptocurrencies',
  // English → canonical
  'Equities': 'Actions',
  'Structured products': 'Structured Products',
  'Funds': 'Funds',
  'Bonds': 'Bonds',
  'Cryptocurrencies': 'Cryptocurrencies'
};

/**
 * Parses a Swiss portfolio PDF or text file with real API integration.
 */
async function parseSwissPortfolioPDF(input: File | string): Promise<SwissPortfolioData> {
  let text: string

  if (input instanceof File) {
    console.log(`Processing file: ${input.name} (${input.type}, ${input.size} bytes)`)

    try {
      if (input instanceof File && input.type === 'text/csv') {
        return parseSQCSV(await input.text());
      }
      let text = input instanceof File ? await input.text() : input;
      if (looksLikeSQPortfolioCSV(text)) return parseSQCSV(text);

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

//---------------------------------------------------------------//
// 0. Language-agnostic header detection
//---------------------------------------------------------------//
function looksLikeSQPortfolioCSV(text: string): boolean {
  return (
      text.includes('Symbole,Quantité') ||                // French
      text.includes('Symbol,Quantity')                    // English
  );
}

//---------------------------------------------------------------//
// 1. Revised row mapping
//---------------------------------------------------------------//
const FRENCH_COLS = {
  symbol: 1, qty: 2, unitCost: 3, price: 7, ccy: 8,
  pnlCHF: 9, pnlPct:10, totalCHF:11, posPct:12, dailyPct:6
};

const ENGLISH_COLS = {
  symbol: 1, qty: 2, unitCost: 3, price: 7, ccy: 8,
  pnlCHF: 9, pnlPct:10, totalCHF:11, posPct:12, dailyPct:6
};

function detectLanguage(cols: string[]): 'fr' | 'en' {
  return cols.includes('Symbole') ? 'fr' : 'en';
}

function pick<T extends keyof typeof FRENCH_COLS>(
    row: string[], key: T, lang: 'fr' | 'en'
) {
  const map = lang === 'fr' ? FRENCH_COLS : ENGLISH_COLS;
  return row[map[key]];
}

// List of suffixes for common European exchanges
const possibleSuffixes = ["", ".SW", ".DE", ".PA", ".MI", ".AS"];

/**
 * Tries multiple Yahoo Finance symbol variants to find a valid one.
 * @param baseSymbol The symbol as found in your CSV or PDF.
 * @returns The first valid Yahoo Finance symbol (with suffix if needed).
 */
async function resolveYahooSymbol(baseSymbol: string): Promise<string> {
  for (const suffix of possibleSuffixes) {
    const symbol = baseSymbol + suffix;
    try {
      const response = await fetch(`/api/yahoo/quote/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.symbol) {
          return symbol;
        }
      }
    } catch (error) {
      console.error("Can't find symbol:", error);
    }
  }
  // Fallback: return the base symbol if none found
  return baseSymbol;
}

async function parseSQCSV(csv: string): Promise<SwissPortfolioData> {
  const delimiter = detectCSVDelimiter(csv); // <-- NEW
  const { data } = Papa.parse(csv, {
    delimiter,
    skipEmptyLines: 'greedy',
    dynamicTyping: true
  });


  const header = data[0] as string[];
  const lang = detectLanguage(header);
  const positions: PortfolioPosition[] = [];
  let currentCategory = '';

  console.log('Starting CSV parsing...');

  for (const row of data.slice(1)) {
    const first = (row[0] || '').trim();
    const second = (row[1] || '').trim();

    // 1. category lines (row[0] contains category name)
    if (CATEGORY_ALIASES[first]) {
      currentCategory = CATEGORY_ALIASES[first];
      console.log(`Found category: ${currentCategory}`);
      continue;
    }

    // 2. Enhanced filtering for subtotal/total rows
    // Check both row[0] and row[1] for various summary patterns
    if (
        // Total row: row[1] contains "Total"
        second === 'Total' ||
        // Subtotal rows: row[1] starts with subtotal patterns
        second.startsWith('Sous-total') ||
        second.startsWith('Subtotal') ||
        second.startsWith('Sub-total') ||
        // Additional safety checks
        second.toLowerCase().includes('total') ||
        // Check for French/English currency indicators in subtotal lines
        (second.includes('CHF') && second.toLowerCase().includes('total'))
    ) {
      console.log(`Skipping summary row: ${second}`);
      continue;
    }

    // 3. Skip empty rows
    if (!second) {
      console.log('Skipping empty row');
      continue;
    }

    // 4. Additional validation to ensure this is a real position
    const qty = +pick(row, 'qty', lang);
    const unitCost = +pick(row, 'unitCost', lang);
    const totalCHF = +pick(row, 'totalCHF', lang);

    // Skip if missing essential data
    if (isNaN(qty) || isNaN(unitCost) || isNaN(totalCHF) || qty <= 0 || totalCHF <= 0) {
      console.log(`Skipping invalid row: ${second} (qty: ${qty}, unitCost: ${unitCost}, totalCHF: ${totalCHF})`);
      continue;
    }

    // 5. Parse valid position
    console.log(`Processing position: ${second}`);
    positions.push({
      symbol: String(pick(row, 'symbol', lang)).trim(),
      name: String(pick(row, 'symbol', lang)).trim(),
      quantity: qty,
      unitCost: unitCost,
      totalValueCHF: totalCHF,
      currency: String(pick(row, 'ccy', lang)).trim(),
      category: currentCategory || 'Unknown',
      gainLossCHF: +pick(row, 'pnlCHF', lang),
      gainLossPercent: +pick(row, 'pnlPct', lang),
      positionPercent: +pick(row, 'posPct', lang),
      dailyChangePercent: +String(pick(row, 'dailyPct', lang)).replace('%', ''),
      taxOptimized: false,
      isOTC: false
    });
  }

  console.log(`Parsed ${positions.length} positions`);

  const total = positions.reduce((s, p) => s + p.totalValueCHF, 0);
  console.log(`Calculated total: ${total}`);

  positions.forEach(p => p.positionPercent = (p.totalValueCHF / total) * 100);

  return {
    accountOverview: {
      totalValue: total,
      cashBalance: 0,
      securitiesValue: total,
      cryptoValue: 0,
      purchasingPower: 0
    },
    positions,
    assetAllocation: calculateAssetAllocation(positions, total),
    currencyAllocation: await calculateTrueCurrencyAllocation(positions, total),
    trueCountryAllocation: await calculateTrueCountryAllocation(positions, total),
    trueSectorAllocation: await calculateTrueSectorAllocation(positions, total),
    domicileAllocation: calculateDomicileAllocation(positions, total)
  };
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
    .split("\r\n")
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


    // Step 1: Resolve the correct Yahoo Finance symbol
    const resolvedSymbol = await resolveYahooSymbol(parsed.symbol);


    // Get real-time price
    const priceData = await apiService.getStockPrice(resolvedSymbol)

    // Get asset metadata
    const metadata = await apiService.getAssetMetadata(resolvedSymbol)

    // Get ETF composition if applicable
    let etfComposition = null
    if (parsed.category === "ETF") {
      etfComposition = await apiService.getETFComposition(resolvedSymbol)
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

      const resolvedSymbol = await resolveYahooSymbol(position.symbol);

      // Get ETF composition for true currency exposure
      const composition = await apiService.getETFComposition(resolvedSymbol)
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

      const resolvedSymbol = await resolveYahooSymbol(position.symbol);
      // Get ETF composition for true country exposure
      const composition = await apiService.getETFComposition(resolvedSymbol)
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

function detectCSVDelimiter(csvText: string): string {
  // Common delimiters
  const delimiters = [',', ';', '\t', '|'];
  // Get the first non-empty line
  const firstLine = csvText.split(/\r?\n/).find(line => line.trim()) || '';
  // Count each delimiter's occurrences
  const counts = delimiters.map(d => ({ d, c: (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length }));
  // Pick the delimiter with the highest count, default to comma
  const best = counts.reduce((a, b) => (b.c > a.c ? b : a), { d: ',', c: 0 });
  return best.c === 0 ? ',' : best.d;
}



async function calculateTrueSectorAllocation(
  positions: PortfolioPosition[],
  totalValue: number,
): Promise<AllocationItem[]> {
  const allocation = new Map<string, number>()

  for (const position of positions) {
    if (position.category === "ETF") {
      // Get ETF composition for true sector exposure
      const resolvedSymbol = await resolveYahooSymbol(position.symbol);
      const composition = await apiService.getETFComposition(resolvedSymbol)
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
