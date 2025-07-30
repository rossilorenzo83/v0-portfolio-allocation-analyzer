import Papa from "papaparse"

interface CSVAnalysis {
  totalRows: number
  columns: string[]
  sampleRows: string[][]
  detectedDelimiter: string
  encoding: string
  possibleCategories: string[]
  numberFormats: string[]
}

function detectDelimiter(csvText: string): string {
  const delimiters = [",", ";", "\t", "|"]
  const firstLine = csvText.split(/\r?\n/).find((line) => line.trim()) || ""

  const counts = delimiters.map((d) => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length,
  }))

  const best = counts.reduce((a, b) => (b.count > a.count ? b : a), { delimiter: ",", count: 0 })
  return best.count === 0 ? "," : best.delimiter
}

function analyzeCSVStructure(csvText: string): CSVAnalysis {
  const delimiter = detectDelimiter(csvText)
  console.log("Detected delimiter:", delimiter)

  const { data } = Papa.parse(csvText, {
    delimiter,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  })

  const rows = data as string[][]
  const header = rows[0] || []
  const sampleRows = rows.slice(1, 6) // First 5 data rows

  // Detect possible categories
  const possibleCategories = new Set<string>()
  rows.forEach((row) => {
    const firstCell = (row[0] || "").toString().trim()
    if (firstCell.match(/^(Actions|ETF|Obligations|Fonds|Equities|Bonds|Funds)/i)) {
      possibleCategories.add(firstCell)
    }
  })

  // Detect number formats
  const numberFormats = new Set<string>()
  rows.slice(1, 10).forEach((row) => {
    row.forEach((cell) => {
      const cellStr = (cell || "").toString().trim()
      if (cellStr.match(/^\d+[',.]?\d*$/)) {
        numberFormats.add(cellStr)
      }
    })
  })

  return {
    totalRows: rows.length,
    columns: header,
    sampleRows,
    detectedDelimiter: delimiter,
    encoding: "UTF-8", // Assumption
    possibleCategories: Array.from(possibleCategories),
    numberFormats: Array.from(numberFormats).slice(0, 10),
  }
}

// Example usage with sample CSV data
const sampleCSV = `Symbole,Quantité,Prix unitaire,Prix,Dev.,Valeur totale CHF,G&P CHF,G&P %,Positions %,Var. quot. %
Actions
AAPL,100,150.00,160.00,USD,16'000.00,1'000.00,6.67,16.00,1.50
MSFT,50,200.00,210.00,USD,10'500.00,500.00,5.00,10.50,0.75
ETF
IWDA,200,75.00,78.00,USD,15'600.00,600.00,4.00,15.60,0.25
VTI,100,180.00,185.00,USD,18'500.00,500.00,2.78,18.50,-0.50`

export function runCSVAnalysis(csvText?: string): CSVAnalysis {
  const textToAnalyze = csvText || sampleCSV
  const analysis = analyzeCSVStructure(textToAnalyze)

  console.log("=== CSV Structure Analysis ===")
  console.log("Total rows:", analysis.totalRows)
  console.log("Detected delimiter:", analysis.detectedDelimiter)
  console.log("Columns:", analysis.columns)
  console.log("Possible categories:", analysis.possibleCategories)
  console.log("Sample number formats:", analysis.numberFormats)
  console.log("Sample rows:")
  analysis.sampleRows.forEach((row, index) => {
    console.log(`Row ${index + 1}:`, row)
  })

  return analysis
}

// Run analysis if called directly
if (require.main === module) {
  runCSVAnalysis()
}
