"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { PieChartIcon, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"

interface PortfolioItem {
  symbol: string
  name: string
  quantity: number
  price: number
  value: number
  currency: string
  type: "Stock" | "ETF" | "Bond" | "Crypto" | "Other"
  sector?: string
  geography?: string
}

interface ETFHolding {
  symbol: string
  name: string
  weight: number
  sector: string
  geography: string
}

// Mock ETF data - in a real app, this would come from an API
const mockETFData: Record<string, ETFHolding[]> = {
  VTI: [
    { symbol: "AAPL", name: "Apple Inc.", weight: 7.2, sector: "Technology", geography: "US" },
    { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.8, sector: "Technology", geography: "US" },
    { symbol: "GOOGL", name: "Alphabet Inc.", weight: 4.1, sector: "Technology", geography: "US" },
    { symbol: "AMZN", name: "Amazon.com Inc.", weight: 3.4, sector: "Consumer Discretionary", geography: "US" },
    { symbol: "NVDA", name: "NVIDIA Corp.", weight: 2.9, sector: "Technology", geography: "US" },
  ],
  VXUS: [
    { symbol: "ASML", name: "ASML Holding NV", weight: 1.8, sector: "Technology", geography: "Europe" },
    { symbol: "TSM", name: "Taiwan Semiconductor", weight: 4.2, sector: "Technology", geography: "Asia" },
    { symbol: "NESN", name: "Nestle SA", weight: 1.1, sector: "Consumer Staples", geography: "Europe" },
    { symbol: "BABA", name: "Alibaba Group", weight: 0.8, sector: "Consumer Discretionary", geography: "Asia" },
  ],
}

export default function PortfolioAnalyzer() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

      const portfolioData: PortfolioItem[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        if (values.length < headers.length) continue

        const item: PortfolioItem = {
          symbol: values[headers.indexOf("symbol")] || "",
          name: values[headers.indexOf("name")] || "",
          quantity: Number.parseFloat(values[headers.indexOf("quantity")] || "0"),
          price: Number.parseFloat(values[headers.indexOf("price")] || "0"),
          value: 0,
          currency: values[headers.indexOf("currency")] || "USD",
          type: (values[headers.indexOf("type")] as PortfolioItem["type"]) || "Stock",
          sector: values[headers.indexOf("sector")] || "Unknown",
          geography: values[headers.indexOf("geography")] || "Unknown",
        }

        item.value = item.quantity * item.price
        portfolioData.push(item)
      }

      setPortfolio(portfolioData)
    } catch (err) {
      setError("Error parsing CSV file. Please check the format.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0)

  const getCurrencyBreakdown = () => {
    const breakdown = portfolio.reduce(
      (acc, item) => {
        acc[item.currency] = (acc[item.currency] || 0) + item.value
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(breakdown).map(([currency, value]) => ({
      name: currency,
      value,
      percentage: (value / totalValue) * 100,
    }))
  }

  const getGeographyBreakdown = () => {
    const breakdown = portfolio.reduce(
      (acc, item) => {
        // For ETFs, we'd analyze underlying holdings
        if (item.type === "ETF" && mockETFData[item.symbol]) {
          mockETFData[item.symbol].forEach((holding) => {
            const holdingValue = (holding.weight / 100) * item.value
            acc[holding.geography] = (acc[holding.geography] || 0) + holdingValue
          })
        } else {
          acc[item.geography || "Unknown"] = (acc[item.geography || "Unknown"] || 0) + item.value
        }
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(breakdown).map(([geography, value]) => ({
      name: geography,
      value,
      percentage: (value / totalValue) * 100,
    }))
  }

  const getSectorBreakdown = () => {
    const breakdown = portfolio.reduce(
      (acc, item) => {
        // For ETFs, analyze underlying sector allocation
        if (item.type === "ETF" && mockETFData[item.symbol]) {
          mockETFData[item.symbol].forEach((holding) => {
            const holdingValue = (holding.weight / 100) * item.value
            acc[holding.sector] = (acc[holding.sector] || 0) + holdingValue
          })
        } else {
          acc[item.sector || "Unknown"] = (acc[item.sector || "Unknown"] || 0) + item.value
        }
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(breakdown).map(([sector, value]) => ({
      name: sector,
      value,
      percentage: (value / totalValue) * 100,
    }))
  }

  const getAssetTypeBreakdown = () => {
    const breakdown = portfolio.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + item.value
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(breakdown).map(([type, value]) => ({
      name: type,
      value,
      percentage: (value / totalValue) * 100,
    }))
  }

  const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

  const renderPieChart = (data: any[], title: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 border rounded shadow">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${data.value.toLocaleString()} ({data.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )

  const renderBarChart = (data: any[], title: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 border rounded shadow">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          ${data.value.toLocaleString()} ({data.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Portfolio Analyzer</h1>
      <p className="text-lg text-muted-foreground">
        This component is a placeholder. Please refer to `swiss-portfolio-analyzer.tsx` for the main application logic.
      </p>
    </div>
  )
}
