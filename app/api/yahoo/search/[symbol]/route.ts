import { type NextRequest, NextResponse } from "next/server"
import { yahooFinanceService } from "@/lib/yahoo-finance-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  
  console.log(`🔍 Search Route Debug - Symbol: ${symbol}`)
  
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  try {
    console.log(`🔍 Searching for symbol: ${symbol}`)
    
    // Use the sophisticated Yahoo Finance service
    const searchData = await yahooFinanceService.searchSymbol(symbol)
    
    if (searchData) {
      console.log(`✅ Successfully fetched search data for ${symbol}:`, searchData)
      return NextResponse.json(searchData, {
        headers: {
          "Cache-Control": "public, max-age=3600", // 1 hour
        },
      })
    } else {
      console.log(`❌ Failed to fetch search data for ${symbol}, returning mock data`)
      
      // Return mock data as fallback
      const mockData = {
        symbol,
        name: `${symbol} Stock`,
        exchange: "NASDAQ",
        type: "EQUITY",
        currency: "USD",
      }
      
      return NextResponse.json(mockData, {
        headers: {
          "Cache-Control": "public, max-age=60", // 1 minute for mock data
        },
      })
    }
  } catch (error) {
    console.error(`Error in search route for ${symbol}:`, error)
    
    // Return mock data as fallback
    const mockData = {
      symbol,
      name: `${symbol} Stock`,
      exchange: "NASDAQ",
      type: "EQUITY",
      currency: "USD",
    }
    
    return NextResponse.json(mockData, {
      headers: {
        "Cache-Control": "public, max-age=60", // 1 minute for mock data
      },
    })
  }
}
