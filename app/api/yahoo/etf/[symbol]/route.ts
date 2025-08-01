import { type NextRequest, NextResponse } from "next/server"
import {
  mapSectorName,
  guessDomicile,
  getWithholdingTax,
  estimateCountryAllocation,
  estimateSectorAllocation,
  estimateCurrencyAllocation,
} from "./utils" // Assuming utils file exists for these functions

// Mock data for ETF composition
const mockEtfCompositionData: { [key: string]: any } = {
  VWRL: {
    domicile: "IE",
    withholdingTax: 15, // Example for Irish domicile
    country: [
      { country: "United States", weight: 60 },
      { country: "Japan", weight: 7 },
      { country: "United Kingdom", weight: 4 },
      { country: "China", weight: 3 },
      { country: "Switzerland", weight: 2 },
      { country: "Other", weight: 24 },
    ],
    sector: [
      { sector: "Technology", weight: 25 },
      { sector: "Financials", weight: 15 },
      { sector: "Healthcare", weight: 12 },
      { sector: "Consumer Discretionary", weight: 10 },
      { sector: "Industrials", weight: 8 },
      { sector: "Other", weight: 30 },
    ],
    currency: [
      { currency: "USD", weight: 55 },
      { currency: "EUR", weight: 15 },
      { currency: "JPY", weight: 10 },
      { currency: "GBP", weight: 5 },
      { currency: "CHF", weight: 3 },
      { currency: "Other", weight: 12 },
    ],
  },
  SPY: {
    domicile: "US",
    withholdingTax: 30, // Example for US domicile
    country: [{ country: "United States", weight: 100 }],
    sector: [
      { sector: "Technology", weight: 28 },
      { sector: "Financials", weight: 13 },
      { sector: "Healthcare", weight: 13 },
      { sector: "Consumer Discretionary", weight: 10 },
      { sector: "Communication Services", weight: 9 },
      { sector: "Industrials", weight: 8 },
      { sector: "Consumer Staples", weight: 7 },
      { sector: "Energy", weight: 4 },
      { sector: "Utilities", weight: 3 },
      { sector: "Real Estate", weight: 3 },
      { sector: "Materials", weight: 2 },
    ],
    currency: [{ currency: "USD", weight: 100 }],
  },
  // Add more ETF mock data as needed
}

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const { symbol } = params
  const apiKey = process.env.YAHOO_FINANCE_API_KEY
  const baseUrl = "https://yfapi.net/v6/finance/quote/detail" // Endpoint for detailed quote, which includes fundHoldings for ETFs

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  // First, try to get real data from Yahoo Finance API or web scraping
  // Only fall back to mock data if all real attempts fail

  if (!apiKey) {
    return NextResponse.json({ error: "Yahoo Finance API key not configured." }, { status: 500 })
  }

  try {
    const url = `${baseUrl}?symbols=${symbol}`
    const response = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Yahoo Finance API error for ${symbol}: ${response.status} - ${errorText}`)
      return NextResponse.json({ error: `Failed to fetch ETF holdings for ${symbol}` }, { status: response.status })
    }

    const data = await response.json()
    const etfDataFromApi = data.quoteResponse?.result?.[0]

    if (etfDataFromApi && etfDataFromApi.fundHoldings) {
      return NextResponse.json(etfDataFromApi.fundHoldings)
    } else {
      console.log(`Fetching ETF composition for symbol: ${symbol}`)

      // Try Yahoo Finance ETF holdings API
      const holdingsUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=topHoldings,fundProfile,summaryProfile`

      const responseYahoo = await fetch(holdingsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
        },
      })

      if (!responseYahoo.ok) {
        console.error(`Yahoo Finance ETF API error: ${responseYahoo.status} ${responseYahoo.statusText}`)
        throw new Error(`Yahoo Finance ETF API error: ${responseYahoo.status}`)
      }

      const dataYahoo = await responseYahoo.json()
      console.log(`Raw ETF data for ${symbol}:`, JSON.stringify(dataYahoo, null, 2))

      const resultYahoo = dataYahoo.quoteSummary?.result?.[0]
      if (!resultYahoo) {
        throw new Error("No ETF data found")
      }

      const topHoldings = resultYahoo.topHoldings
      const fundProfile = resultYahoo.fundProfile
      const summaryProfile = resultYahoo.summaryProfile

      // Process sector breakdown
      const sectorWeightings = fundProfile?.sectorWeightings || {}
      const sectors = Object.entries(sectorWeightings)
        .map(([sector, weight]) => ({
          sector: mapSectorName(sector),
          weight: (weight as number) * 100,
        }))
        .filter((s) => s.weight > 0)

      // Process country breakdown (if available)
      const countries = []
      if (summaryProfile?.country) {
        countries.push({ country: summaryProfile.country, weight: 100 })
      }

      // Process currency (estimate based on domicile)
      const domicile = summaryProfile?.domicile || guessDomicile(symbol)
      const currencies = estimateCurrencyAllocation(domicile, symbol)

      const etfComposition = {
        symbol: symbol,
        name: summaryProfile?.longName || `${symbol} ETF`,
        domicile: domicile,
        withholdingTax: getWithholdingTax(domicile),
        expenseRatio: fundProfile?.totalNetAssets ? 0.2 : 0.5, // Estimate
        country: countries.length > 0 ? countries : estimateCountryAllocation(symbol),
        sector: sectors.length > 0 ? sectors : estimateSectorAllocation(symbol),
        currency: currencies,
      }

      console.log(`Processed ETF composition for ${symbol}:`, etfComposition)

      return NextResponse.json(etfComposition, {
        headers: {
          "Cache-Control": "public, max-age=3600", // 1 hour
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  } catch (error) {
    console.error(`Error in ETF holdings route for ${symbol}:`, error)
    
    // If all real attempts fail, fall back to mock data
    const etfData = mockEtfCompositionData[symbol.toUpperCase()]
    if (etfData) {
      console.log(`Using mock data fallback for ${symbol}`)
      return NextResponse.json(etfData)
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
