import { safePDFExtraction } from "../lib/pdf-utils"

async function testFileUpload() {
  console.log("📁 Testing File Upload Functionality...")

  // Test 1: Text File Processing
  console.log("\n📝 Test 1: Text File Processing")

  const sampleTextContent = `
Aperçu du compte
Valeur totale du portefeuille CHF 889'528.75
Solde espèces CHF 5'129.55
Valeur des titres CHF 877'853.96

Positions
Actions
AAPL Apple Inc. 100 150.00 USD
MSFT Microsoft Corporation 75 330.00 USD

ETF
VWRL Vanguard FTSE All-World UCITS ETF 500 89.96 CHF
IS3N iShares Core MSCI World UCITS ETF 300 30.50 CHF
`

  // Create a mock text file
  const textFile = new File([sampleTextContent], "portfolio.txt", { type: "text/plain" })

  try {
    const extractedText = await safePDFExtraction(textFile)
    console.log("✅ Text file processed successfully!")
    console.log(`   Extracted ${extractedText.length} characters`)
    console.log(`   Contains portfolio data: ${extractedText.includes("Valeur totale") ? "Yes" : "No"}`)
  } catch (error) {
    console.error("❌ Text file processing failed:", error)
  }

  // Test 2: CSV File Processing
  console.log("\n📊 Test 2: CSV File Processing")

  const sampleCSVContent = `Symbol,Name,Quantity,Price,Currency,Type,Sector,Geography
AAPL,Apple Inc.,100,150.00,USD,Stock,Technology,US
MSFT,Microsoft Corp.,75,330.00,USD,Stock,Technology,US
VWRL,Vanguard FTSE All-World,500,89.96,CHF,ETF,Mixed,Global
IS3N,iShares Core MSCI World,300,30.50,CHF,ETF,Mixed,Global`

  const csvFile = new File([sampleCSVContent], "portfolio.csv", { type: "text/csv" })

  try {
    const extractedText = await safePDFExtraction(csvFile)
    console.log("✅ CSV file processed successfully!")
    console.log(`   Extracted ${extractedText.length} characters`)
    console.log(`   Contains headers: ${extractedText.includes("Symbol,Name") ? "Yes" : "No"}`)
  } catch (error) {
    console.error("❌ CSV file processing failed:", error)
  }

  // Test 3: Error Handling for Unsupported Files
  console.log("\n🛡️ Test 3: Error Handling for Unsupported Files")

  const unsupportedFile = new File(["binary data"], "image.jpg", { type: "image/jpeg" })

  try {
    await safePDFExtraction(unsupportedFile)
    console.log("❌ Should have handled unsupported file type")
  } catch (error) {
    console.log("✅ Unsupported file type handled correctly")
    console.log(`   Error message includes guidance: ${error.message.includes("Copy-Paste") ? "Yes" : "No"}`)
  }

  // Test 4: Large File Handling
  console.log("\n📏 Test 4: Large File Handling")

  const largeContent = "Portfolio Data\n".repeat(10000) // Simulate large file
  const largeFile = new File([largeContent], "large-portfolio.txt", { type: "text/plain" })

  try {
    const startTime = Date.now()
    const extractedText = await safePDFExtraction(largeFile)
    const processingTime = Date.now() - startTime

    console.log("✅ Large file processed successfully!")
    console.log(`   File size: ${(largeContent.length / 1024).toFixed(1)} KB`)
    console.log(`   Processing time: ${processingTime}ms`)
    console.log(`   Extracted ${extractedText.length} characters`)
  } catch (error) {
    console.error("❌ Large file processing failed:", error)
  }

  console.log("\n🎉 File Upload Tests Complete!")
}

// Run the file upload tests
testFileUpload().catch(console.error)
