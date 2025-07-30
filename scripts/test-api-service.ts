import { getEtfData, getQuote, searchSymbol } from "../etf-data-service"

async function runApiServiceTests() {
  console.log("--- Running API Service Tests ---")

  // Test 1: Get ETF Data for VUSA.L (IE domiciled, USD currency)
  console.log("\nTesting getEtfData for VUSA.L...")
  const vusaEtf = await getEtfData("VUSA.L")
  if (vusaEtf) {
    console.log("VUSA.L ETF Data:", JSON.stringify(vusaEtf, null, 2))
    console.assert(vusaEtf.symbol === "VUSA.L", "VUSA.L symbol mismatch")
    console.assert(vusaEtf.domicile === "IE", "VUSA.L domicile mismatch")
    console.assert(vusaEtf.currency === "USD", "VUSA.L currency mismatch")
    console.assert(Object.keys(vusaEtf.composition.sectors).length > 0, "VUSA.L sectors empty")
  } else {
    console.error("Failed to get VUSA.L ETF data.")
  }

  // Test 2: Get ETF Data for SMH (US domiciled, USD currency)
  console.log("\nTesting getEtfData for SMH...")
  const smhEtf = await getEtfData("SMH")
  if (smhEtf) {
    console.log("SMH ETF Data:", JSON.stringify(smhEtf, null, 2))
    console.assert(smhEtf.symbol === "SMH", "SMH symbol mismatch")
    console.assert(smhEtf.domicile === "US", "SMH domicile mismatch")
    console.assert(smhEtf.currency === "USD", "SMH currency mismatch")
    console.assert(Object.keys(smhEtf.composition.sectors).length > 0, "SMH sectors empty")
  } else {
    console.error("Failed to get SMH ETF data.")
  }

  // Test 3: Get Quote for VUSA.L
  console.log("\nTesting getQuote for VUSA.L...")
  const vusaQuote = await getQuote("VUSA.L")
  if (vusaQuote) {
    console.log("VUSA.L Quote Data:", JSON.stringify(vusaQuote, null, 2))
    console.assert(vusaQuote.price > 0, "VUSA.L price invalid")
    console.assert(vusaQuote.currency === "USD", "VUSA.L quote currency mismatch")
  } else {
    console.error("Failed to get VUSA.L quote data.")
  }

  // Test 4: Search for a symbol (e.g., "VWRL")
  console.log("\nTesting searchSymbol for VWRL...")
  const vwrlSearchResults = await searchSymbol("VWRL")
  if (vwrlSearchResults.length > 0) {
    console.log("VWRL Search Results:", JSON.stringify(vwrlSearchResults, null, 2))
    console.assert(
      vwrlSearchResults.some((r) => r.symbol === "VWRL.L"),
      "VWRL.L not found in search results",
    )
  } else {
    console.error("No search results found for VWRL.")
  }

  // Test 5: Get ETF Data for a non-existent symbol (should return null or fallback)
  console.log("\nTesting getEtfData for NONEXISTENT...")
  const nonexistentEtf = await getEtfData("NONEXISTENT")
  if (!nonexistentEtf) {
    console.log("Correctly returned null for NONEXISTENT ETF data.")
  } else {
    console.error("Did not return null for NONEXISTENT ETF data.")
  }

  console.log("\n--- API Service Tests Complete ---")
}

runApiServiceTests()
