// scripts/test-api-service.ts
// This script is for testing the API service functions directly.
// Run with: ts-node scripts/test-api-service.ts

import { apiService } from "../lib/api-service"

async function testApiService() {
  console.log("--- Testing API Service ---")

  // Test getStockPrice
  try {
    console.log("\nTesting getStockPrice (AAPL)...")
    const aaplPrice = await apiService.getStockPrice("AAPL")
    console.log("AAPL Price:", aaplPrice)
  } catch (error) {
    console.error("Error testing getStockPrice (AAPL):", error)
  }

  // Test getAssetMetadata
  try {
    console.log("\nTesting getAssetMetadata (MSFT)...")
    const msftMetadata = await apiService.getAssetMetadata("MSFT")
    console.log("MSFT Metadata:", msftMetadata)
  } catch (error) {
    console.error("Error testing getAssetMetadata (MSFT):", error)
  }

  // Test getETFComposition
  try {
    console.log("\nTesting getETFComposition (SPY - S&P 500 ETF)...")
    const spyComposition = await apiService.getETFComposition("SPY")
    console.log("SPY Composition:", spyComposition)
  } catch (error) {
    console.error("Error testing getETFComposition (SPY):", error)
  }

  // Test searchSymbol
  try {
    console.log("\nTesting searchSymbol (Google)...")
    const googleSearchResults = await apiService.searchSymbol("Google")
    console.log("Google Search Results:", googleSearchResults)
  } catch (error) {
    console.error("Error testing searchSymbol (Google):", error)
  }

  console.log("\n--- API Service Tests Complete ---")
}

testApiService()
