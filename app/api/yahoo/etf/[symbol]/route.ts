import { type NextRequest, NextResponse } from "next/server"
import {
  mapSectorName,
  guessDomicile,
  getWithholdingTax,
  estimateCountryAllocation,
  estimateSectorAllocation,
  estimateCurrencyAllocation,
} from "./utils" // Assuming utils file exists for these functions

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const { symbol } = params
  const apiKey = process.env.YAHOO_FINANCE_API_KEY
  const baseUrl = "https://yfapi.net/v6/finance/quote/detail" // Endpoint for detailed quote, which includes fundHoldings for ETFs

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
    const etfData = data.quoteResponse?.result?.[0]

    if (etfData && etfData.fundHoldings) {
      return NextResponse.json(etfData.fundHoldings)
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
