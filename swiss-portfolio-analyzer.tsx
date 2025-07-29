"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { FileText, PieChart, BarChart3, Globe, DollarSign, Building2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { FileUploadHelper } from "./components/file-upload-helper"
import { parseSwissPortfolioPDF, type SwissPortfolioData, type AllocationItem } from "./portfolio-parser"

export default function SwissPortfolioAnalyzer() {
  const [portfolioData, setPortfolioData] = useState<SwissPortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(20)
      console.log("Starting file analysis...")

      const data = await parseSwissPortfolioPDF(file)
      setProgress(100)
      setPortfolioData(data)

      console.log("Analysis complete:", data)
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during analysis")
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }, [])

  const handleTextSubmit = useCallback(async (text: string) => {
    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(20)
      console.log("Starting text analysis...")

      const data = await parseSwissPortfolioPDF(text)
      setProgress(100)
      setPortfolioData(data)

      console.log("Analysis complete:", data)
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during analysis")
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }, [])

  const colors = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
    "#FF7C7C",
    "#8DD1E1",
    "#D084D0",
  ]

  const renderPieChart = (data: AllocationItem[], title: string, icon: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
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
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          CHF {data.value.toLocaleString()} ({data.percentage.toFixed(1)}%)
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

  const renderBarChart = (data: AllocationItem[], title: string, icon: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          CHF {data.value.toLocaleString()} ({data.percentage.toFixed(1)}%)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Swiss Portfolio Analyzer</h1>
          <p className="text-muted-foreground">
            Analyze your Swiss bank portfolio with real-time data and ETF look-through analysis
          </p>
        </div>

        {/* File Upload */}
        <FileUploadHelper
          onFileUpload={handleFileUpload}
          onTextSubmit={handleTextSubmit}
          isLoading={isLoading}
          error={error}
        />

        {/* Loading Progress */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analyzing portfolio...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Analysis Results */}
        {portfolioData && (
          <>
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(portfolioData.accountOverview.totalValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Securities: {formatCurrency(portfolioData.accountOverview.securitiesValue)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total Holdings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{portfolioData.positions.length}</div>
                  <p className="text-xs text-muted-foreground">Active positions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Asset Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{portfolioData.assetAllocation.length}</div>
                  <p className="text-xs text-muted-foreground">Different categories</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Currencies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{portfolioData.currencyAllocation.length}</div>
                  <p className="text-xs text-muted-foreground">Multi-currency exposure</p>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="currency">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Currency
                </TabsTrigger>
                <TabsTrigger value="geography">
                  <Globe className="h-4 w-4 mr-2" />
                  Geography
                </TabsTrigger>
                <TabsTrigger value="sector">
                  <Building2 className="h-4 w-4 mr-2" />
                  Sector
                </TabsTrigger>
                <TabsTrigger value="domicile">
                  <FileText className="h-4 w-4 mr-2" />
                  Domicile
                </TabsTrigger>
                <TabsTrigger value="holdings">Holdings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderPieChart(portfolioData.assetAllocation, "Asset Allocation", <PieChart className="h-5 w-5" />)}
                  {renderPieChart(
                    portfolioData.currencyAllocation,
                    "Currency Distribution",
                    <DollarSign className="h-5 w-5" />,
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderPieChart(
                    portfolioData.trueCountryAllocation,
                    "Geographic Allocation",
                    <Globe className="h-5 w-5" />,
                  )}
                  {renderPieChart(
                    portfolioData.trueSectorAllocation,
                    "Sector Allocation",
                    <Building2 className="h-5 w-5" />,
                  )}
                </div>
              </TabsContent>

              <TabsContent value="currency" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderPieChart(
                    portfolioData.currencyAllocation,
                    "Currency Allocation",
                    <DollarSign className="h-5 w-5" />,
                  )}
                  {renderBarChart(
                    portfolioData.currencyAllocation,
                    "Currency Breakdown",
                    <BarChart3 className="h-5 w-5" />,
                  )}
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ETF Look-Through Analysis:</strong> Currency allocation includes the underlying currency
                    exposure of ETFs for more accurate analysis.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="geography" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderPieChart(
                    portfolioData.trueCountryAllocation,
                    "Geographic Allocation",
                    <Globe className="h-5 w-5" />,
                  )}
                  {renderBarChart(
                    portfolioData.trueCountryAllocation,
                    "Geographic Breakdown",
                    <BarChart3 className="h-5 w-5" />,
                  )}
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ETF Look-Through Analysis:</strong> Geographic allocation analyzes the underlying country
                    exposure of ETFs for true geographic diversification.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="sector" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderPieChart(
                    portfolioData.trueSectorAllocation,
                    "Sector Allocation",
                    <Building2 className="h-5 w-5" />,
                  )}
                  {renderBarChart(
                    portfolioData.trueSectorAllocation,
                    "Sector Breakdown",
                    <BarChart3 className="h-5 w-5" />,
                  )}
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ETF Look-Through Analysis:</strong> Sector allocation includes the underlying sector
                    exposure of ETFs for comprehensive sector analysis.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="domicile" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderPieChart(
                    portfolioData.domicileAllocation,
                    "Domicile Allocation",
                    <FileText className="h-5 w-5" />,
                  )}
                  {renderBarChart(
                    portfolioData.domicileAllocation,
                    "Domicile Breakdown",
                    <BarChart3 className="h-5 w-5" />,
                  )}
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tax Optimization:</strong> Fund domicile affects withholding tax rates. Irish (IE) and
                    Luxembourg (LU) domiciled funds typically offer better tax efficiency for Swiss investors.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="holdings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Holdings</CardTitle>
                    <CardDescription>Detailed view of all your investments with real-time data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {portfolioData.positions.map((position, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{position.symbol}</span>
                              <Badge variant="outline">{position.category}</Badge>
                              {position.taxOptimized && (
                                <Badge variant="secondary" className="text-xs">
                                  Tax Optimized
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{position.name}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Qty: {position.quantity.toLocaleString()}</span>
                              <span>
                                Price: {position.currency} {position.price.toFixed(2)}
                              </span>
                              <span>Sector: {position.sector}</span>
                              <span>Geography: {position.geography}</span>
                              {position.domicile && <span>Domicile: {position.domicile}</span>}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="font-medium">{formatCurrency(position.totalValueCHF)}</div>
                            <div className="text-sm text-muted-foreground">{position.positionPercent.toFixed(1)}%</div>
                            {position.unrealizedGainLoss !== undefined && (
                              <div
                                className={`text-xs ${position.unrealizedGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {position.unrealizedGainLoss >= 0 ? "+" : ""}
                                {formatCurrency(position.unrealizedGainLoss)}
                                {position.unrealizedGainLossPercent !== undefined && (
                                  <span className="ml-1">
                                    ({position.unrealizedGainLossPercent >= 0 ? "+" : ""}
                                    {position.unrealizedGainLossPercent.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
