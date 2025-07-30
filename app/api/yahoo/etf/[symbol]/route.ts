import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    console.log(`Fetching ETF data for symbol: ${symbol}`)

    // Try Yahoo Finance ETF API
    try {
      const etfUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=fundProfile,topHoldings,fundPerformance`
      const response = await fetch(etfUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.quoteSummary?.result?.[0]

        if (result) {
          const fundProfile = result.fundProfile
          const topHoldings = result.topHoldings

          return NextResponse.json({
            symbol: symbol.toUpperCase(),
            name: fundProfile?.fundName || symbol,
            domicile: fundProfile?.legalType?.includes("Ireland")
              ? "IE"
              : fundProfile?.legalType?.includes("Luxembourg")
                ? "LU"
                : "US",
            withholdingTax:
              fundProfile?.legalType?.includes("Ireland") || fundProfile?.legalType?.includes("Luxembourg") ? 15 : 30,
            expenseRatio: fundProfile?.annualReportExpenseRatio || 0,
            country:
              topHoldings?.countryWeighting?.map((c: any) => ({
                country: c.country,
                weight: c.weight,
              })) || [],
            sector:
              topHoldings?.sectorWeightings?.map((s: any) => ({
                sector: s.sector,
                weight: s.weight,
              })) || [],
            currency: [{ currency: "USD", weight: 100 }], // Default
          })
        }
      }
    } catch (apiError) {
      console.warn(`Yahoo ETF API failed for ${symbol}:`, apiError)
    }

    // Fallback with basic ETF data
    const isIrishETF = symbol.includes("IWDA") || symbol.includes("VWCE") || symbol.includes("EUNL")
    const isLuxETF = symbol.includes("LU")

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} ETF`,
      domicile: isIrishETF ? "IE" : isLuxETF ? "LU" : "US",
      withholdingTax: isIrishETF || isLuxETF ? 15 : 30,
      expenseRatio: 0.2,
      country: [
        { country: "United States", weight: 60 },
        { country: "Japan", weight: 10 },
        { country: "United Kingdom", weight: 8 },
        { country: "China", weight: 5 },
        { country: "Other", weight: 17 },
      ],
      sector: [
        { sector: "Technology", weight: 25 },
        { sector: "Healthcare", weight: 15 },
        { sector: "Financial Services", weight: 12 },
        { sector: "Consumer Cyclical", weight: 10 },
        { sector: "Other", weight: 38 },
      ],
      currency: [
        { currency: "USD", weight: 70 },
        { currency: "EUR", weight: 20 },
        { currency: "JPY", weight: 10 },
      ],
    })
  } catch (error) {
    console.error("ETF API error:", error)
    return NextResponse.json({ error: "Failed to fetch ETF data" }, { status: 500 })
  }
}
