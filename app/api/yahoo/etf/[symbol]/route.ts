import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    console.log(`Fetching ETF composition for symbol: ${symbol}`)

    // Try Yahoo Finance ETF holdings API
    const holdingsUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=topHoldings,fundProfile,summaryProfile`

    const response = await fetch(holdingsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Yahoo Finance ETF API error: ${response.status} ${response.statusText}`)
      throw new Error(`Yahoo Finance ETF API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Raw ETF data for ${symbol}:`, JSON.stringify(data, null, 2))

    const result = data.quoteSummary?.result?.[0]
    if (!result) {
      throw new Error("No ETF data found")
    }

    const topHoldings = result.topHoldings
    const fundProfile = result.fundProfile
    const summaryProfile = result.summaryProfile

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
  } catch (error) {
    console.error(`Error fetching ETF composition for ${symbol}:`, error)

    // Return estimated composition
    const estimatedComposition = {
      symbol: symbol,
      name: `${symbol} ETF`,
      domicile: guessDomicile(symbol),
      withholdingTax: getWithholdingTax(guessDomicile(symbol)),
      expenseRatio: 0.3,
      country: estimateCountryAllocation(symbol),
      sector: estimateSectorAllocation(symbol),
      currency: estimateCurrencyAllocation(guessDomicile(symbol), symbol),
    }

    return NextResponse.json(estimatedComposition, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes for fallback
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}

function mapSectorName(yahooSector: string): string {
  const sectorMap: Record<string, string> = {
    technology: "Technology",
    "financial-services": "Financial Services",
    healthcare: "Healthcare",
    "consumer-cyclical": "Consumer Discretionary",
    "consumer-defensive": "Consumer Staples",
    industrials: "Industrials",
    "communication-services": "Communication Services",
    energy: "Energy",
    utilities: "Utilities",
    "real-estate": "Real Estate",
    materials: "Materials",
  }

  return sectorMap[yahooSector.toLowerCase()] || yahooSector
}

function guessDomicile(symbol: string): string {
  // Irish ETFs
  if (symbol.match(/^(VWCE|IWDA|EUNL|IS3N|VWRL)$/)) return "IE"

  // Luxembourg ETFs
  if (symbol.includes("LU")) return "LU"

  // US ETFs
  if (symbol.match(/^(VTI|VXUS|VEA|VWO|SPY|QQQ|IVV)$/)) return "US"

  return "US" // Default
}

function getWithholdingTax(domicile: string): number {
  switch (domicile) {
    case "IE":
    case "LU":
      return 15
    case "US":
      return 30
    default:
      return 30
  }
}

function estimateCountryAllocation(symbol: string): Array<{ country: string; weight: number }> {
  // World ETFs
  if (symbol.match(/^(VWCE|VWRL|IWDA)$/)) {
    return [
      { country: "United States", weight: 65 },
      { country: "Japan", weight: 8 },
      { country: "United Kingdom", weight: 4 },
      { country: "China", weight: 4 },
      { country: "Canada", weight: 3 },
      { country: "France", weight: 3 },
      { country: "Switzerland", weight: 3 },
      { country: "Germany", weight: 3 },
      { country: "Other", weight: 7 },
    ]
  }

  // US ETFs
  if (symbol.match(/^(VTI|SPY|QQQ|IVV)$/)) {
    return [{ country: "United States", weight: 100 }]
  }

  // International ETFs
  if (symbol.match(/^(VXUS|VEA)$/)) {
    return [
      { country: "Japan", weight: 20 },
      { country: "United Kingdom", weight: 10 },
      { country: "China", weight: 8 },
      { country: "Canada", weight: 7 },
      { country: "France", weight: 7 },
      { country: "Switzerland", weight: 6 },
      { country: "Germany", weight: 6 },
      { country: "Other", weight: 36 },
    ]
  }

  // Emerging Markets
  if (symbol.match(/^(VWO|EEM)$/)) {
    return [
      { country: "China", weight: 35 },
      { country: "India", weight: 15 },
      { country: "Taiwan", weight: 12 },
      { country: "South Korea", weight: 10 },
      { country: "Brazil", weight: 5 },
      { country: "Other", weight: 23 },
    ]
  }

  // Default world allocation
  return [
    { country: "United States", weight: 60 },
    { country: "Other", weight: 40 },
  ]
}

function estimateSectorAllocation(symbol: string): Array<{ sector: string; weight: number }> {
  // Tech-heavy ETFs
  if (symbol.match(/^(QQQ|XLK)$/)) {
    return [
      { sector: "Technology", weight: 50 },
      { sector: "Communication Services", weight: 20 },
      { sector: "Consumer Discretionary", weight: 15 },
      { sector: "Healthcare", weight: 10 },
      { sector: "Other", weight: 5 },
    ]
  }

  // Broad market ETFs
  return [
    { sector: "Technology", weight: 25 },
    { sector: "Healthcare", weight: 13 },
    { sector: "Financial Services", weight: 12 },
    { sector: "Consumer Discretionary", weight: 10 },
    { sector: "Communication Services", weight: 8 },
    { sector: "Industrials", weight: 8 },
    { sector: "Consumer Staples", weight: 6 },
    { sector: "Energy", weight: 4 },
    { sector: "Utilities", weight: 3 },
    { sector: "Real Estate", weight: 3 },
    { sector: "Materials", weight: 3 },
    { sector: "Other", weight: 5 },
  ]
}

function estimateCurrencyAllocation(domicile: string, symbol: string): Array<{ currency: string; weight: number }> {
  // World ETFs
  if (symbol.match(/^(VWCE|VWRL|IWDA)$/)) {
    return [
      { currency: "USD", weight: 65 },
      { currency: "JPY", weight: 8 },
      { currency: "EUR", weight: 10 },
      { currency: "GBP", weight: 4 },
      { currency: "CHF", weight: 3 },
      { currency: "CAD", weight: 3 },
      { currency: "Other", weight: 7 },
    ]
  }

  // US ETFs
  if (symbol.match(/^(VTI|SPY|QQQ|IVV)$/)) {
    return [{ currency: "USD", weight: 100 }]
  }

  // International ETFs
  if (symbol.match(/^(VXUS|VEA)$/)) {
    return [
      { currency: "JPY", weight: 20 },
      { currency: "EUR", weight: 25 },
      { currency: "GBP", weight: 10 },
      { currency: "CHF", weight: 6 },
      { currency: "CAD", weight: 7 },
      { currency: "Other", weight: 32 },
    ]
  }

  // Default
  return [
    { currency: "USD", weight: 70 },
    { currency: "EUR", weight: 20 },
    { currency: "Other", weight: 10 },
  ]
}
