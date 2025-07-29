// Analyze the provided CSV file structure
async function analyzeCsvStructure() {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Positions_775614_08072025_10_59-3uIndJzrWFR29SdmvEW2b3RPE5CQU0.csv",
    )
    const csvText = await response.text()

    console.log("CSV Content (first 1000 chars):")
    console.log(csvText.substring(0, 1000))

    console.log("\nCSV Lines:")
    const lines = csvText.split("\n").slice(0, 10)
    lines.forEach((line, index) => {
      console.log(`Line ${index}: ${line}`)
    })

    // Detect delimiter
    const firstLine = lines[0]
    const delimiters = [",", ";", "\t"]
    const counts = delimiters.map((d) => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length,
    }))

    console.log("\nDelimiter analysis:", counts)

    return csvText
  } catch (error) {
    console.error("Error fetching CSV:", error)
    return null
  }
}

analyzeCsvStructure()
