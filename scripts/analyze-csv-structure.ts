// Script to analyze the structure of the uploaded CSV file
async function analyzeSQCSV() {
  console.log("🔍 Analyzing Swissquote CSV Structure...")

  try {
    // Fetch the actual CSV file from the provided URL
    const csvUrl =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_08072025_10_59-3uIndJzrWFR29SdmvEW2b3RPE5CQU0.csv"

    console.log("📥 Fetching CSV file from:", csvUrl)
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log("✅ CSV file fetched successfully")
    console.log("📊 File size:", csvText.length, "characters")

    // Split into lines
    const lines = csvText.split("\n").filter((line) => line.trim())
    console.log("📋 Total lines:", lines.length)

    // Analyze first few lines
    console.log("\n🔍 First 10 lines:")
    lines.slice(0, 10).forEach((line, index) => {
      console.log(`${index + 1}: ${line}`)
    })

    // Detect delimiter
    const firstLine = lines[0] || ""
    const delimiters = [",", ";", "\t", "|"]
    const delimiterCounts = delimiters.map((d) => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length,
    }))

    const bestDelimiter = delimiterCounts.reduce((a, b) => (b.count > a.count ? b : a))
    console.log("\n🔧 Delimiter analysis:", delimiterCounts)
    console.log("✅ Best delimiter:", bestDelimiter.delimiter, "with", bestDelimiter.count, "occurrences")

    // Parse header
    const header = firstLine.split(bestDelimiter.delimiter)
    console.log("\n📋 Header columns:")
    header.forEach((col, index) => {
      console.log(`${index}: "${col.trim()}"`)
    })

    // Analyze column mapping
    console.log("\n🗺️ Column mapping analysis:")
    const symbolIndex = header.findIndex((h) => h.includes("Symbole") || h.includes("Symbol"))
    const quantityIndex = header.findIndex((h) => h.includes("Quantit") || h.includes("Quantity"))
    const unitCostIndex = header.findIndex((h) => h.includes("unitaire") || h.includes("Cost"))
    const priceIndex = header.findIndex((h) => h.includes("Prix") || h.includes("Price"))
    const currencyIndex = header.findIndex((h) => h.includes("Dev") || h.includes("Currency"))
    const totalCHFIndex = header.findIndex((h) => h.includes("totale CHF") || h.includes("Total CHF"))
    const gainLossIndex = header.findIndex((h) => h.includes("G&P CHF") || h.includes("Gain"))
    const positionPercentIndex = header.findIndex((h) => h.includes("Positions %") || h.includes("Position %"))

    console.log("Symbol column:", symbolIndex, symbolIndex >= 0 ? `"${header[symbolIndex]}"` : "NOT FOUND")
    console.log("Quantity column:", quantityIndex, quantityIndex >= 0 ? `"${header[quantityIndex]}"` : "NOT FOUND")
    console.log("Unit cost column:", unitCostIndex, unitCostIndex >= 0 ? `"${header[unitCostIndex]}"` : "NOT FOUND")
    console.log("Price column:", priceIndex, priceIndex >= 0 ? `"${header[priceIndex]}"` : "NOT FOUND")
    console.log("Currency column:", currencyIndex, currencyIndex >= 0 ? `"${header[currencyIndex]}"` : "NOT FOUND")
    console.log("Total CHF column:", totalCHFIndex, totalCHFIndex >= 0 ? `"${header[totalCHFIndex]}"` : "NOT FOUND")
    console.log("Gain/Loss column:", gainLossIndex, gainLossIndex >= 0 ? `"${header[gainLossIndex]}"` : "NOT FOUND")
    console.log(
      "Position % column:",
      positionPercentIndex,
      positionPercentIndex >= 0 ? `"${header[positionPercentIndex]}"` : "NOT FOUND",
    )

    // Analyze data rows
    console.log("\n📊 Sample data rows:")
    const dataRows = lines.slice(1, 6) // Skip header, take next 5 rows
    dataRows.forEach((row, index) => {
      const columns = row.split(bestDelimiter.delimiter)
      console.log(`\nRow ${index + 2}:`)
      columns.forEach((col, colIndex) => {
        if (colIndex < 12) {
          // Show first 12 columns
          console.log(`  [${colIndex}] "${col.trim()}"`)
        }
      })
    })

    // Look for category indicators
    console.log("\n🏷️ Looking for category indicators:")
    const categoryKeywords = ["Actions", "ETF", "Obligations", "Fonds", "Total", "Sous-total"]
    lines.forEach((line, index) => {
      const firstColumn = line.split(bestDelimiter.delimiter)[0]?.trim()
      if (categoryKeywords.some((keyword) => firstColumn?.includes(keyword))) {
        console.log(`Line ${index + 1}: "${firstColumn}" - Potential category/summary row`)
      }
    })

    // Analyze number formats
    console.log("\n🔢 Number format analysis:")
    const sampleNumbers = []
    lines.slice(1, 10).forEach((line) => {
      const columns = line.split(bestDelimiter.delimiter)
      columns.forEach((col) => {
        const trimmed = col.trim()
        if (trimmed.match(/[\d'.,]+/) && trimmed.length > 2) {
          sampleNumbers.push(trimmed)
        }
      })
    })

    console.log("Sample numbers found:", sampleNumbers.slice(0, 10))

    // Test Swiss number parsing
    console.log("\n🧮 Testing Swiss number parsing:")
    const testNumbers = ["1'234.56", "1,234.56", "1234.56", "12.34%", "1'000'000.00"]
    testNumbers.forEach((num) => {
      const parsed = parseSwissNumber(num)
      console.log(`"${num}" -> ${parsed}`)
    })

    console.log("\n✅ CSV analysis complete!")
  } catch (error) {
    console.error("❌ Error analyzing CSV:", error)
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

// Run the analysis
analyzeSQCSV().catch(console.error)
