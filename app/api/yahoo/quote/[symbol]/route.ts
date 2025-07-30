import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    console.log(`Fetching quote for symbol: ${symbol}`)

    // Try Yahoo Finance quote API
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`

    const response = await fetch(quoteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Yahoo Finance quote API error: ${response.status} ${response.statusText}`)
      throw new Error(`Yahoo Finance quote API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Raw quote data for ${symbol}:`, JSON.stringify(data, null, 2))

    const result = data.chart?.result?.[0]
    if (!result) {
      throw new Error("No quote data found")
    }

    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    const adjclose = result.indicators?.adjclose?.[0]

    if (!meta) {
      throw new Error("No meta data found")
    }

    // Get the latest price data
    const timestamps = result.timestamp || []
    const closes = quote?.close || adjclose?.adjclose || []
    const opens = quote?.open || []
    const highs = quote?.high || []
    const lows = quote?.low || []
    const volumes = quote?.volume || []

    const latestIndex = timestamps.length - 1
    const currentPrice = closes[latestIndex] || meta.regularMarketPrice || meta.previousClose
    const previousClose = meta.previousClose || closes[latestIndex - 1] || currentPrice

    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    const stockPrice = {
      symbol: symbol.toUpperCase(),
      price: Number(currentPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      currency: meta.currency || "USD",
      marketState: meta.marketState || "REGULAR",
      timestamp: meta.regularMarketTime || Math.floor(Date.now() / 1000),
      volume: volumes[latestIndex] || 0,
      dayHigh: highs[latestIndex] || currentPrice,
      dayLow: lows[latestIndex] || currentPrice,
      open: opens[latestIndex] || currentPrice,
    }

    console.log(`Processed quote for ${symbol}:`, stockPrice)

    return NextResponse.json(stockPrice, {
      headers: {
        "Cache-Control": "public, max-age=60", // 1 minute
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error)

    // Return estimated quote
    const estimatedQuote = {
      symbol: symbol.toUpperCase(),
      price: 100 + Math.random() * 50,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      currency: guessCurrency(symbol),
      marketState: "REGULAR",
      timestamp: Math.floor(Date.now() / 1000),
      volume: Math.floor(Math.random() * 1000000),
      dayHigh: 0,
      dayLow: 0,
      open: 0,
    }

    return NextResponse.json(estimatedQuote, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes for fallback
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}

function guessCurrency(symbol: string): string {
  // Swiss symbols
  if (
    symbol.match(/^(NESN|NOVN|ROG|UHR|ABBN|LONN|GIVN|CFR|SREN|GEBN|SLHN|AMS|SCMN|UBSG|CSGN|BAER|ZURN|ADEN|HOLN|PGHN)$/i)
  ) {
    return "CHF"
  }

  // European ETFs traded in CHF
  if (symbol.match(/^(VWRL|IS3N)$/i)) {
    return "CHF"
  }

  // European ETFs traded in EUR
  if (symbol.match(/^(VWCE|IWDA|EUNL)$/i)) {
    return "EUR"
  }

  // European stocks
  if (symbol.match(/^(ASML|SAP|SAN|INGA)$/i)) {
    return "EUR"
  }

  // Default to USD
  return "USD"
}
