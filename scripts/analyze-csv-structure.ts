// Script to analyze the CSV structure from the provided URL
async function analyzeCsvStructure() {
  try {
    console.log("Fetching CSV from URL...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_30072025_09_52-2pA6mub91t5KX9pPZHD5lGMTwk5gD6.csv",
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()
    console.log("CSV fetched successfully!")
    console.log("File size:", csvText.length, "characters")
    console.log("\n=== FIRST 2000 CHARACTERS ===")
    console.log(csvText.substring(0, 2000))

    // Split into lines for analysis
    const lines = csvText.split(/\r?\n/)
    console.log("\n=== CSV ANALYSIS ===")
    console.log("Total lines:", lines.length)

    // Analyze first 20 lines
    console.log("\n=== FIRST 20 LINES ===")
    lines.slice(0, 20).forEach((line, index) => {
      console.log(`Line ${index}: "${line}"`)
    })

    // Detect delimiter
    const delimiters = [",", ";", "\t", "|"]
    console.log("\n=== DELIMITER ANALYSIS ===")

    for (const delimiter of delimiters) {
      const firstLineColumns = lines[0]?.split(delimiter).length || 0
      const secondLineColumns = lines[1]?.split(delimiter).length || 0
      const thirdLineColumns = lines[2]?.split(delimiter).length || 0

      console.log(`Delimiter '${delimiter}':`)
      console.log(`  Line 0: ${firstLineColumns} columns`)
      console.log(`  Line 1: ${secondLineColumns} columns`)
      console.log(`  Line 2: ${thirdLineColumns} columns`)
    }

    // Look for header patterns
    console.log("\n=== HEADER DETECTION ===")
    const headerKeywords = [
      "symbol",
      "symbole",
      "ticker",
      "isin",
      "name",
      "nom",
      "description",
      "libellé",
      "quantity",
      "quantité",
      "qty",
      "nombre",
      "price",
      "prix",
      "cours",
      "valeur",
      "currency",
      "devise",
      "dev",
      "ccy",
      "total",
      "montant",
      "value",
    ]

    lines.slice(0, 10).forEach((line, index) => {
      const lowerLine = line.toLowerCase()
      const matchedKeywords = headerKeywords.filter((keyword) => lowerLine.includes(keyword))

      if (matchedKeywords.length > 0) {
        console.log(`Line ${index} matches keywords:`, matchedKeywords)
        console.log(`Content: "${line}"`)
      }
    })

    // Sample data rows
    console.log("\n=== SAMPLE DATA ROWS ===")
    lines.slice(1, 10).forEach((line, index) => {
      if (line.trim()) {
        console.log(`Data row ${index + 1}: "${line}"`)
      }
    })

    return csvText
  } catch (error) {
    console.error("Error analyzing CSV:", error)
    throw error
  }
}

// Run the analysis
analyzeCsvStructure()
