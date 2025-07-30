// Script to analyze the real CSV file structure
async function analyzeRealCSV() {
  try {
    console.log("Fetching CSV file...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_09072025_09_30-8BYtc8aZsR9VuFmgEixezIFg2JyFVD.csv",
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()
    console.log("CSV file fetched successfully")
    console.log("File size:", csvText.length, "characters")

    // Split into lines
    const lines = csvText.split(/\r?\n/)
    console.log("Total lines:", lines.length)

    // Analyze first 20 lines
    console.log("\n=== FIRST 20 LINES ===")
    lines.slice(0, 20).forEach((line, index) => {
      console.log(`Line ${index + 1}: ${line}`)
    })

    // Find header line
    let headerLineIndex = -1
    let headerLine = ""

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i]
      if (
        line.includes("Symbole") ||
        line.includes("Symbol") ||
        line.includes("Quantité") ||
        line.includes("Quantity") ||
        line.includes("Prix") ||
        line.includes("Price")
      ) {
        headerLineIndex = i
        headerLine = line
        break
      }
    }

    if (headerLineIndex >= 0) {
      console.log(`\n=== HEADER FOUND AT LINE ${headerLineIndex + 1} ===`)
      console.log("Header:", headerLine)

      // Detect delimiter
      const delimiters = [",", ";", "\t", "|"]
      const delimiterCounts = delimiters.map((d) => ({
        delimiter: d,
        count: (headerLine.match(new RegExp(`\\${d}`, "g")) || []).length,
      }))

      const bestDelimiter = delimiterCounts.reduce((a, b) => (b.count > a.count ? b : a))
      console.log("Delimiter analysis:", delimiterCounts)
      console.log("Best delimiter:", bestDelimiter.delimiter)

      // Split header by delimiter
      const headers = headerLine.split(bestDelimiter.delimiter).map((h) => h.trim().replace(/"/g, ""))
      console.log("Headers:", headers)

      // Analyze data rows
      console.log("\n=== SAMPLE DATA ROWS ===")
      const dataStartIndex = headerLineIndex + 1
      const sampleRows = lines
        .slice(dataStartIndex, dataStartIndex + 10)
        .filter((line) => line.trim() && !line.startsWith("Total") && !line.startsWith("Sous-total"))

      sampleRows.forEach((row, index) => {
        const cells = row.split(bestDelimiter.delimiter).map((c) => c.trim().replace(/"/g, ""))
        console.log(`Data row ${index + 1}:`, cells)
      })

      // Look for total values
      console.log("\n=== LOOKING FOR TOTALS ===")
      lines.forEach((line, index) => {
        if (
          line.toLowerCase().includes("total") ||
          line.toLowerCase().includes("valeur") ||
          line.toLowerCase().includes("solde")
        ) {
          console.log(`Line ${index + 1}: ${line}`)
        }
      })
    } else {
      console.log("No header line found in first 50 lines")

      // Look for any lines with numbers that might be totals
      console.log("\n=== LOOKING FOR NUMERIC PATTERNS ===")
      lines.slice(0, 50).forEach((line, index) => {
        if (line.match(/\d{3}['\s,]\d{3}/) || line.match(/\d{6,}/)) {
          console.log(`Line ${index + 1}: ${line}`)
        }
      })
    }

    return {
      totalLines: lines.length,
      headerLineIndex,
      headerLine,
      sampleLines: lines.slice(0, 20),
    }
  } catch (error) {
    console.error("Error analyzing CSV:", error)
    throw error
  }
}

// Run the analysis
analyzeRealCSV()
  .then((result) => {
    console.log("\n=== ANALYSIS COMPLETE ===")
    console.log("Result:", result)
  })
  .catch((error) => {
    console.error("Analysis failed:", error)
  })
