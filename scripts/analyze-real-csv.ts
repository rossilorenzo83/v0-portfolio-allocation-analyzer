// Script to analyze the real CSV file structure
async function analyzeRealCSV() {
  try {
    console.log("🔍 Analyzing real CSV file structure...")

    const csvUrl =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_09072025_09_30-8BYtc8aZsR9VuFmgEixezIFg2JyFVD.csv"

    console.log("📥 Fetching CSV file...")
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log(`📊 CSV file size: ${csvText.length} characters`)

    // Split into lines
    const lines = csvText.split(/\r?\n/)
    console.log(`📋 Total lines: ${lines.length}`)

    // Analyze first 20 lines
    console.log("\n🔍 First 20 lines analysis:")
    lines.slice(0, 20).forEach((line, index) => {
      console.log(`Line ${index + 1}: ${line.substring(0, 100)}${line.length > 100 ? "..." : ""}`)
    })

    // Detect delimiter
    const delimiters = [",", ";", "\t", "|"]
    const firstDataLine =
      lines.find((line) => (line.trim() && line.includes("Symbole")) || line.includes("Symbol")) || lines[0]

    console.log("\n🔧 Delimiter analysis:")
    delimiters.forEach((delimiter) => {
      const count = (firstDataLine.match(new RegExp(`\\${delimiter}`, "g")) || []).length
      console.log(`${delimiter}: ${count} occurrences`)
    })

    // Find header row
    let headerRowIndex = -1
    let headers: string[] = []

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i]
      if (
        line.toLowerCase().includes("symbole") ||
        line.toLowerCase().includes("symbol") ||
        line.toLowerCase().includes("quantité") ||
        line.toLowerCase().includes("quantity")
      ) {
        headerRowIndex = i
        // Try different delimiters
        const semicolonSplit = line.split(";")
        const commaSplit = line.split(",")
        headers = semicolonSplit.length > commaSplit.length ? semicolonSplit : commaSplit
        break
      }
    }

    if (headerRowIndex >= 0) {
      console.log(`\n📋 Header found at line ${headerRowIndex + 1}:`)
      headers.forEach((header, index) => {
        console.log(`Column ${index + 1}: "${header.trim()}"`)
      })
    }

    // Analyze data rows
    console.log("\n📊 Sample data rows:")
    const dataStartIndex = headerRowIndex + 1
    for (let i = dataStartIndex; i < Math.min(dataStartIndex + 10, lines.length); i++) {
      if (lines[i] && lines[i].trim()) {
        const delimiter = headers.length > 0 && lines[i].split(";").length === headers.length ? ";" : ","
        const cells = lines[i].split(delimiter)
        console.log(`\nData row ${i - dataStartIndex + 1}:`)
        cells.forEach((cell, index) => {
          if (index < headers.length) {
            console.log(`  ${headers[index]}: "${cell.trim()}"`)
          }
        })
      }
    }

    // Look for total values
    console.log("\n💰 Looking for total values:")
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes("total") && (line.includes("CHF") || line.match(/\d{3,}/))) {
        console.log(`Line ${index + 1}: ${line}`)
      }
    })

    // Analyze number formats
    console.log("\n🔢 Number format analysis:")
    const numberSamples = []
    lines.slice(headerRowIndex + 1, headerRowIndex + 20).forEach((line) => {
      if (line.trim()) {
        const matches = line.match(/\d+['\s,.]?\d*['\s,.]?\d*/g)
        if (matches) {
          numberSamples.push(...matches.slice(0, 3))
        }
      }
    })

    console.log("Sample numbers found:", numberSamples.slice(0, 10))

    console.log("\n✅ CSV analysis complete!")
  } catch (error) {
    console.error("❌ Error analyzing CSV:", error)
  }
}

// Run the analysis
analyzeRealCSV()
