import { getQuote, searchSymbol, getEtfHoldings } from "../lib/api-service"

async function testApiService() {
  console.log("--- Testing API Service ---")

  // Test getQuote
  console.log("\nTesting getQuote for AAPL...")
  try {
    const quote = await getQuote("AAPL")
    console.log("AAPL Quote:", quote)
  } catch (error) {
    console.error("Error getting AAPL quote:", error)
  }

  // Test searchSymbol
  console.log("\nTesting searchSymbol for 'Apple'...")
  try {
    const searchResults = await searchSymbol("Apple")
    console.log("Search Results for 'Apple':", searchResults)
  } catch (error) {
    console.error("Error searching for 'Apple':", error)
  }

  // Test getEtfHoldings
  console.log("\nTesting getEtfHoldings for SPY...")
  try {
    const etfHoldings = await getEtfHoldings("SPY")
    console.log("SPY ETF Holdings (first 5):", etfHoldings?.slice(0, 5))
  } catch (error) {
    console.error("Error getting SPY ETF holdings:", error)
  }

  console.log("\n--- API Service Tests Complete ---")
}

testApiService()
