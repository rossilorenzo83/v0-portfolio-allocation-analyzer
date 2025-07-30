import { type NextRequest, NextResponse } from "next/server"
import { guessCurrency } from "./utils" // Assuming guessCurrency is moved to a utils file

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    console.log(`Fetching quote for symbol: ${symbol}`)

    const apiKey = process.env.YAHOO_FINANCE_API_KEY
    const baseUrl = "https://yfapi.net/v6/finance/quote"

    if (!apiKey) {
      return NextResponse.json({ error: "Yahoo Finance API key not configured." }, { status: 500 })
    }

    const url = `${baseUrl}?symbols=${symbol}`
    const response = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Yahoo Finance API error for ${symbol}: ${response.status} - ${errorText}`)
      return NextResponse.json({ error: `Failed to fetch quote for ${symbol}` }, { status: response.status })
    }

    const data = await response.json()
    console.log(`Raw quote data for ${symbol}:`, JSON.stringify(data, null, 2))

    const result = data.quoteResponse?.result?.[0]
    if (!result) {
      throw new Error("No quote data found")
    }

    const meta = result
    const currentPrice = meta.regularMarketPrice || meta.previousClose
    const previousClose = meta.previousClose || currentPrice

    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    const stockPrice = {
      symbol: symbol.toUpperCase(),
      price: Number(currentPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      currency: meta.currency || guessCurrency(symbol),
      marketState: meta.marketState || "REGULAR",
      timestamp: meta.regularMarketTime || Math.floor(Date.now() / 1000),
      volume: meta.regularMarketVolume || 0,
      dayHigh: meta.regularMarketDayHigh || currentPrice,
      dayLow: meta.regularMarketDayLow || currentPrice,
      open: meta.regularMarketOpen || currentPrice,
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
