import { parsePortfolioCsv } from "../portfolio-parser"

async function fetchCsvContent(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.text()
  } catch (error) {
    console.error(`Failed to fetch CSV from ${url}:`, error)
    throw error
  }
}

async function testRealCsvParsing() {
  const csvUrl = "https://raw.githubusercontent.com/vercel/v0-portfolio-analyzer/main/public/sample-portfolio.csv" // Example URL
  console.log(`Fetching CSV from: ${csvUrl}`)

  try {
    const csvContent = await fetchCsvContent(csvUrl)
    console.log("\n--- Fetched CSV Content (first 500 chars) ---")
    console.log(csvContent.substring(0, 500) + "...")

    console.log("\n--- Parsing CSV Content ---")
    const portfolio = parsePortfolioCsv(csvContent)

    console.log("\n--- Parsing Successful! ---")
    console.log("Total Positions:", portfolio.positions.length)
    console.log("Total Portfolio Value:", portfolio.totalValue.toFixed(2))
    console.log("Total Portfolio Cost:", portfolio.totalCost.toFixed(2))

    console.log("\n--- Detailed Positions ---")
    portfolio.positions.forEach((pos, index) => {
      console.log(`Position ${index + 1}:`)
      console.log(`  Symbol: ${pos.symbol}`)
      console.log(`  Quantity: ${pos.quantity}`)
      console.log(`  Average Price: ${pos.averagePrice}`)
      console.log(`  Currency: ${pos.currency}`)
      if (pos.exchange) console.log(`  Exchange: ${pos.exchange}`)
      if (pos.name) console.log(`  Name: ${pos.name}`)
      console.log("---")
    })
  } catch (error: any) {
    console.error("\n--- CSV Parsing Failed ---")
    console.error("Error:", error.message)
  }
}

// Execute the test function
testRealCsvParsing()
