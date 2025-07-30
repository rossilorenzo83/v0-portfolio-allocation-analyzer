// Test script to analyze and parse the real CSV file
async function testRealCSV() {
  try {
    console.log("🔍 Fetching and analyzing real CSV file...")

    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_30072025_09_52-2pA6mub91t5KX9pPZHD5lGMTwk5gD6.csv",
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()
    console.log("✅ CSV fetched successfully!")
    console.log("File size:", csvText.length, "characters")

    // Analyze structure
    const lines = csvText.split(/\r?\n/)
    console.log("Total lines:", lines.length)

    console.log("\n=== FIRST 10 LINES ===")
    lines.slice(0, 10).forEach((line, index) => {
      console.log(`${index}: "${line}"`)
    })

    // Test delimiter detection
    console.log("\n=== DELIMITER ANALYSIS ===")
    const delimiters = [",", ";", "\t", "|"]

    for (const delimiter of delimiters) {
      const firstLineColumns = lines[0]?.split(delimiter).length || 0
      const secondLineColumns = lines[1]?.split(delimiter).length || 0

      console.log(`'${delimiter}': Line 0=${firstLineColumns} cols, Line 1=${secondLineColumns} cols`)

      if (firstLineColumns > 1) {
        console.log(`  Sample split: [${lines[0]?.split(delimiter).slice(0, 5).join(", ")}...]`)
      }
    }

    // Look for data patterns
    console.log("\n=== DATA PATTERN ANALYSIS ===")
    lines.slice(1, 6).forEach((line, index) => {
      if (line.trim()) {
        console.log(`Data ${index + 1}: "${line}"`)

        // Try different delimiters
        const commaSplit = line.split(",")
        const semicolonSplit = line.split(";")

        console.log(`  Comma split (${commaSplit.length}): [${commaSplit.slice(0, 3).join(", ")}...]`)
        console.log(`  Semicolon split (${semicolonSplit.length}): [${semicolonSplit.slice(0, 3).join(", ")}...]`)
      }
    })

    // Now try to parse it with our parser
    console.log("\n=== TESTING PARSER ===")
    try {
      const { parseSwissPortfolioPDF } = await import("../portfolio-parser")
      const result = await parseSwissPortfolioPDF(csvText)

      console.log("🎉 PARSING SUCCESS!")
      console.log("Positions found:", result.positions.length)
      console.log("Total value:", result.accountOverview.totalValue)

      if (result.positions.length > 0) {
        console.log("\n=== SAMPLE POSITIONS ===")
        result.positions.slice(0, 5).forEach((pos, index) => {
          console.log(`${index + 1}. ${pos.symbol} - ${pos.name} - ${pos.quantity} @ ${pos.price} ${pos.currency}`)
        })
      }
    } catch (parseError) {
      console.error("❌ PARSING FAILED:", parseError)
      console.error("Error details:", parseError instanceof Error ? parseError.message : String(parseError))
    }
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

// Run the test
testRealCSV()
