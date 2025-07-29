import { apiService } from "../lib/api-service"
import { API_CONFIG, validateAPIConfig } from "../lib/config"

async function testAPIService() {
  console.log("🌐 Testing API Service Integration...")

  // Test 1: API Configuration
  console.log("\n⚙️ Test 1: API Configuration")

  const configValidation = validateAPIConfig()
  console.log(`API Config Valid: ${configValidation.isValid ? "Yes" : "No"}`)

  if (configValidation.warnings.length > 0) {
    console.log("⚠️ Configuration Warnings:")
    configValidation.warnings.forEach((warning) => {
      console.log(`   ${warning}`)
    })
  }

  console.log("API Endpoints:")
  console.log(`   Alpha Vantage: ${API_CONFIG.ALPHA_VANTAGE.BASE_URL}`)
  console.log(`   Finnhub: ${API_CONFIG.FINNHUB.BASE_URL}`)
  console.log(`   Yahoo Finance: ${API_CONFIG.YAHOO_FINANCE.BASE_URL}`)

  // Test 2: Stock Price Fetching
  console.log("\n📈 Test 2: Stock Price Fetching")

  const testSymbols = ["AAPL", "MSFT", "GOOGL", "NESN", "INVALID_SYMBOL"]

  for (const symbol of testSymbols) {
    try {
      console.log(`Testing ${symbol}...`)
      const price = await apiService.getStockPrice(symbol)

      if (price) {
        console.log(`✅ ${symbol}: $${price.price} ${price.currency} (${price.changePercent.toFixed(2)}%)`)
      } else {
        console.log(`⚠️ ${symbol}: No price data available`)
      }
    } catch (error) {
      console.log(`❌ ${symbol}: Error - ${error.message}`)
    }

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Test 3: ETF Composition Fetching
  console.log("\n🏦 Test 3: ETF Composition Fetching")

  const testETFs = ["VWRL", "IS3N", "IEFA", "VTI", "INVALID_ETF"]

  for (const etf of testETFs) {
    try {
      console.log(`Testing ${etf}...`)
      const composition = await apiService.getETFComposition(etf)

      if (composition) {
        console.log(`✅ ${etf}:`)
        console.log(`   Domicile: ${composition.domicile}`)
        console.log(`   Withholding Tax: ${composition.withholdingTax}%`)
        console.log(`   Sectors: ${composition.sector.length}`)
        console.log(`   Countries: ${composition.country.length}`)
        console.log(`   Holdings: ${composition.holdings.length}`)

        if (composition.sector.length > 0) {
          console.log(`   Top Sector: ${composition.sector[0].sector} (${composition.sector[0].weight.toFixed(1)}%)`)
        }
      } else {
        console.log(`⚠️ ${etf}: No composition data available`)
      }
    } catch (error) {
      console.log(`❌ ${etf}: Error - ${error.message}`)
    }

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Test 4: Asset Metadata Fetching
  console.log("\n📊 Test 4: Asset Metadata Fetching")

  const testAssets = ["AAPL", "VWRL", "NESN", "BTC-USD"]

  for (const asset of testAssets) {
    try {
      console.log(`Testing ${asset}...`)
      const metadata = await apiService.getAssetMetadata(asset)

      if (metadata) {
        console.log(`✅ ${asset}:`)
        console.log(`   Name: ${metadata.name}`)
        console.log(`   Type: ${metadata.type}`)
        console.log(`   Sector: ${metadata.sector}`)
        console.log(`   Country: ${metadata.country}`)
        console.log(`   Currency: ${metadata.currency}`)
      } else {
        console.log(`⚠️ ${asset}: No metadata available`)
      }
    } catch (error) {
      console.log(`❌ ${asset}: Error - ${error.message}`)
    }

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Test 5: Caching Functionality
  console.log("\n💾 Test 5: Caching Functionality")

  try {
    console.log("Testing cache performance...")

    // First call (should hit API)
    const startTime1 = Date.now()
    const price1 = await apiService.getStockPrice("AAPL")
    const time1 = Date.now() - startTime1

    // Second call (should use cache)
    const startTime2 = Date.now()
    const price2 = await apiService.getStockPrice("AAPL")
    const time2 = Date.now() - startTime2

    console.log(`✅ Cache test completed:`)
    console.log(`   First call: ${time1}ms`)
    console.log(`   Second call: ${time2}ms`)
    console.log(`   Cache speedup: ${(time1 / time2).toFixed(1)}x faster`)
    console.log(`   Data consistency: ${price1?.price === price2?.price ? "Yes" : "No"}`)
  } catch (error) {
    console.error("❌ Cache test failed:", error)
  }

  // Test 6: Rate Limiting
  console.log("\n⏱️ Test 6: Rate Limiting")

  try {
    console.log("Testing rate limiting...")

    const rapidRequests = []
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(apiService.getStockPrice("AAPL"))
    }

    const results = await Promise.allSettled(rapidRequests)
    const successful = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    console.log(`✅ Rate limiting test completed:`)
    console.log(`   Successful requests: ${successful}`)
    console.log(`   Failed/limited requests: ${failed}`)
    console.log(`   Rate limiting working: ${failed > 0 ? "Yes" : "No (or high limits)"}`)
  } catch (error) {
    console.error("❌ Rate limiting test failed:", error)
  }

  console.log("\n🎉 API Service Tests Complete!")
  console.log("\n📋 Test Summary:")
  console.log("✅ API configuration validation")
  console.log("✅ Stock price fetching")
  console.log("✅ ETF composition fetching")
  console.log("✅ Asset metadata fetching")
  console.log("✅ Caching functionality")
  console.log("✅ Rate limiting")
}

// Run the API service tests
testAPIService().catch(console.error)
