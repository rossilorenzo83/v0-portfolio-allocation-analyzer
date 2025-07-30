// This script is for analyzing the structure of a CSV file.
// It's useful for debugging and understanding the layout of an unknown CSV.

async function analyzeCsvStructure(csvUrl: string) {
  try {
    console.log(`Fetching CSV from: ${csvUrl}`)
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()
    console.log("CSV fetched successfully. Size:", csvText.length, "characters.")

    const lines = csvText.split(/\r?\n/)
    console.log("Total lines:", lines.length)

    console.log("\n--- First 10 lines ---")
    lines.slice(0, 10).forEach((line, index) => {
      console.log(`${index + 1}: "${line}"`)
    })

    console.log("\n--- Delimiter Analysis (first 2 lines) ---")
    const delimiters = [",", ";", "\t", "|"]
    for (const delimiter of delimiters) {
      const line1Cols = lines[0]?.split(delimiter).length || 0
      const line2Cols = lines[1]?.split(delimiter).length || 0
      console.log(`Delimiter '${delimiter}': Line 1 has ${line1Cols} columns, Line 2 has ${line2Cols} columns.`)
      if (line1Cols > 1) {
        console.log(
          `  Sample split (Line 1 with '${delimiter}'): [${lines[0]
            ?.split(delimiter)
            .slice(0, 5)
            .map((s) => `"${s.trim()}"`)
            .join(", ")}...]`,
        )
      }
    }

    console.log("\n--- Header Candidate Analysis (first 20 lines) ---")
    const commonHeaderKeywords = [
      "symbole",
      "symbol",
      "ticker",
      "isin",
      "code",
      "instrument",
      "titre",
      "security",
      "quantité",
      "quantity",
      "qty",
      "nombre",
      "qte",
      "units",
      "shares",
      "parts",
      "prix",
      "price",
      "cours",
      "valeur",
      "current price",
      "market price",
      "last price",
      "quote",
      "cotation",
      "devise",
      "currency",
      "dev",
      "ccy",
      "curr",
      "monnaie",
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
      "total",
      "montant",
      "valeur totale",
      "market value",
      "chf",
      "usd",
      "eur",
      "gain",
      "loss",
      "p&l",
      "profit",
      "unrealized",
      "performance",
      "rendement",
      "position",
      "weight",
      "allocation",
    ]

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i]
      const lowerCaseLine = line.toLowerCase()
      const matchedKeywords = commonHeaderKeywords.filter((keyword) => lowerCaseLine.includes(keyword))
      if (matchedKeywords.length > 0) {
        console.log(
          `Line ${i + 1} (potential header): "${line.substring(0, 100)}..." - Matched keywords: [${matchedKeywords.join(", ")}] (${matchedKeywords.length} matches)`,
        )
      }
    }

    console.log("\n--- Sample Data Rows (after potential header) ---")
    // Assuming header is within first 5 lines, show data from line 6 onwards
    const dataStartLine = Math.min(lines.length, 5)
    lines.slice(dataStartLine, dataStartLine + 5).forEach((line, index) => {
      if (line.trim()) {
        console.log(`Data ${index + 1}: "${line}"`)
        // Try splitting with common delimiters to see structure
        console.log(
          `  Split by comma: [${line
            .split(",")
            .slice(0, 5)
            .map((s) => `"${s.trim()}"`)
            .join(", ")}...]`,
        )
        console.log(
          `  Split by semicolon: [${line
            .split(";")
            .slice(0, 5)
            .map((s) => `"${s.trim()}"`)
            .join(", ")}...]`,
        )
      }
    })
  } catch (error) {
    console.error("Error analyzing CSV structure:", error)
  }
}

// Example usage:
// Replace with the actual URL of the CSV you want to analyze
// analyzeCsvStructure("https://example.com/your-file.csv");
// For the user's provided CSV:
analyzeCsvStructure(
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_30072025_09_52-2pA6mub91t5KX9pPZHD5lGMTwk5gD6.csv",
)
