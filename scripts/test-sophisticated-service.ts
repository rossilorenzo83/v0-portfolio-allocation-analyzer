import { yahooFinanceService } from '../lib/yahoo-finance-service'

async function testSophisticatedService() {
  console.log('🧪 Testing Sophisticated Yahoo Finance Service...')
  
  try {
    // Test quote data
    console.log('\n📈 Testing Quote Data...')
    const quoteData = await yahooFinanceService.getQuote('AAPL')
    if (quoteData) {
      console.log('✅ Quote data successful:', quoteData)
    } else {
      console.log('❌ Quote data failed')
    }

    // Test search data
    console.log('\n🔍 Testing Search Data...')
    const searchData = await yahooFinanceService.searchSymbol('AAPL')
    if (searchData) {
      console.log('✅ Search data successful:', searchData)
    } else {
      console.log('❌ Search data failed')
    }

    // Test ETF data
    console.log('\n📊 Testing ETF Data...')
    const etfData = await yahooFinanceService.getETFComposition('VWRL')
    if (etfData) {
      console.log('✅ ETF data successful:', etfData)
    } else {
      console.log('❌ ETF data failed')
    }

    // Test another quote to verify session reuse
    console.log('\n🔄 Testing Session Reuse...')
    const quoteData2 = await yahooFinanceService.getQuote('MSFT')
    if (quoteData2) {
      console.log('✅ Second quote data successful:', quoteData2)
    } else {
      console.log('❌ Second quote data failed')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    // Clean up
    await yahooFinanceService.close()
    console.log('\n🧹 Service closed')
  }
}

testSophisticatedService() 