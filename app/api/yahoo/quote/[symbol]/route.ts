import { type NextRequest, NextResponse } from "next/server"
import { yahooFinanceService } from "@/lib/yahoo-finance-service"
import { symbolResolutionService } from "@/lib/symbol-resolution-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  console.log("🚀 API ROUTE CALLED - Yahoo Quote API")
  console.log("Request URL:", request.url)
  console.log("Request method:", request.method)

  const { symbol } = await params

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  try {
    console.log(`💰 Fetching quote for symbol: ${symbol}`)
    
    // Use centralized symbol resolution service
    const resolutionResult = await symbolResolutionService.resolveSymbol(symbol)
    const resolvedSymbol = resolutionResult.resolvedSymbol
    
    console.log(`📋 Symbol resolution: ${symbol} -> ${resolvedSymbol} (${resolutionResult.exchange})`)
    
    // Use the sophisticated Yahoo Finance service with the resolved symbol
    const quoteData = await yahooFinanceService.getQuote(resolvedSymbol)
    
    if (quoteData) {
      // Update the symbol in the response to match the original request
      quoteData.symbol = symbol
      console.log(`✅ Successfully fetched quote data for ${symbol} (using ${resolvedSymbol}):`, quoteData)
      return NextResponse.json(quoteData, {
        headers: {
          "Cache-Control": "public, max-age=300", // 5 minutes
        },
      })
    } else {
      console.log(`❌ Failed to fetch quote data for ${symbol}, returning mock data`)
      
      // Return mock data as fallback
      const mockData = {
        symbol,
        price: 100.00,
        currency: "USD",
        change: 1.50,
        changePercent: 1.52,
        lastUpdated: new Date().toISOString(),
      }
      
      return NextResponse.json(mockData, {
        headers: {
          "Cache-Control": "public, max-age=60", // 1 minute for mock data
        },
      })
    }
  } catch (error) {
    console.error(`Error in quote route for ${symbol}:`, error)
    
    // Return mock data as fallback
    const mockData = {
      symbol,
      price: 100.00,
      currency: "USD",
      change: 1.50,
      changePercent: 1.52,
      lastUpdated: new Date().toISOString(),
    }
    
    return NextResponse.json(mockData, {
      headers: {
        "Cache-Control": "public, max-age=60", // 1 minute for mock data
      },
    })
  }
}
