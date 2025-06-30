"use client"

import type React from "react"

import { useState, useCallback } from "react"
import {
  Upload,
  FileText,
  PieChartIcon,
  BarChart3,
  DollarSign,
  Building2,
  TrendingUp,
  TrendingDown,
  Globe,
} from "lucide-react"
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
import { parseSwissPortfolioPDF, type SwissPortfolioData } from "./swiss-portfolio-parser"

export default function SwissPortfolioAnalyzer() {
  const [portfolioData, setPortfolioData] = useState<SwissPortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const text = await file.text()

      // Check if this looks like a Swiss portfolio statement
      if (!text.includes("Valeur totale") && !text.includes("Actions") && !text.includes("ETF")) {
        throw new Error("This doesn't appear to be a Swiss portfolio statement. Please upload the correct format.")
      }

      const parsedData = parseSwissPortfolioPDF(text)

      if (parsedData.accountOverview.totalValue === 0) {
        throw new Error("No portfolio data found. Please check the file format.")
      }

      setPortfolioData(parsedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error parsing portfolio file. Please check the format.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // For demonstration, load the sample data immediately
  // const loadSampleData = useCallback(() => {
  //   const sampleText = `
  //   Valeur totale 889'528.75
  //   Solde espèces 5'129.55
  //   Valeur des titres 877'853.96
  //   Valeur des crypto-monnaies 6'545.23
  //   Pouvoir d'achat 45'047.57
  //   `
  //   const parsedData = parseSwissPortfolioPDF(sampleText)
  //   setPortfolioData(parsedData)
  // }, [])

  // Load sample data on component mount
  // React.useEffect(() => {
  //   loadSampleData()
  // }, [loadSampleData])

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
                        <p className="font-medium">{data.name || data.type || data.currency}</p>
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

  if (!portfolioData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Swiss Portfolio Analyzer</h1>
            <p className="text-muted-foreground">
              Upload your Swiss bank portfolio statement to analyze your investments
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Portfolio Statement
              </CardTitle>
              <CardDescription>Upload a PDF or text file from your Swiss bank portfolio statement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="portfolio-upload"
                />
                <label htmlFor="portfolio-upload" className="cursor-pointer">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">Click to upload portfolio file</p>
                  <p className="text-sm text-muted-foreground">Supports PDF and text files</p>
                </label>
              </div>
              {isLoading && (
                <div className="mt-4">
                  <Progress value={50} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">Processing portfolio data...</p>
                </div>
              )}
              {error && (
                <Alert className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Swiss Portfolio Analysis</h1>
          <p className="text-muted-foreground">Comprehensive analysis of your investment portfolio</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">CHF {portfolioData.accountOverview.totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Securities Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                CHF {portfolioData.accountOverview.securitiesValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">CHF {portfolioData.accountOverview.cashBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Purchasing Power</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                CHF {portfolioData.accountOverview.purchasingPower.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">
              <Building2 className="h-4 w-4 mr-2" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="currency">
              <DollarSign className="h-4 w-4 mr-2" />
              Currency
            </TabsTrigger>
            <TabsTrigger value="currency-deep">
              <DollarSign className="h-4 w-4 mr-2" />
              True Currency
            </TabsTrigger>
            <TabsTrigger value="country-deep">
              <Globe className="h-4 w-4 mr-2" />
              True Country
            </TabsTrigger>
            <TabsTrigger value="sector-deep">
              <Building2 className="h-4 w-4 mr-2" />
              True Sector
            </TabsTrigger>
            <TabsTrigger value="domicile">
              <Building2 className="h-4 w-4 mr-2" />
              Domicile
            </TabsTrigger>
            <TabsTrigger value="performance">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.assetAllocation, "Asset Allocation")}
              {renderPieChart(portfolioData.currencyAllocation, "Currency Distribution")}
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.assetAllocation, "Asset Type Distribution")}
              {renderBarChart(portfolioData.assetAllocation, "Asset Allocation Breakdown")}
            </div>
          </TabsContent>

          <TabsContent value="currency" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.currencyAllocation, "Currency Allocation")}
              {renderBarChart(portfolioData.currencyAllocation, "Currency Breakdown")}
            </div>
          </TabsContent>

          <TabsContent value="currency-deep" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.currencyAllocation, "True Currency Exposure (ETF Look-Through)")}
              {renderBarChart(portfolioData.currencyAllocation, "Currency Exposure Breakdown")}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Currency Analysis: Trading vs. Underlying Exposure</CardTitle>
                <CardDescription>
                  Comparison between ETF trading currency and actual underlying currency exposure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    <strong>Important:</strong> This analysis looks through ETFs to show your true currency exposure
                    based on underlying holdings, not just the ETF's trading currency.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">ETF Currency Exposure Breakdown:</h4>
                  {portfolioData.positions
                    .filter((p) => p.category === "ETF")
                    .map((etf, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-medium">{etf.symbol}</span>
                            <span className="text-sm text-muted-foreground ml-2">Trading Currency: {etf.currency}</span>
                          </div>
                          <div className="text-sm font-medium">CHF {etf.totalValueCHF.toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Underlying Currency Exposure:
                          {etf.symbol === "VWRL" && " USD 60%, EUR 15%, JPY 8%, Others 17%"}
                          {etf.symbol === "IS3N" && " USD 65%, EUR 15%, JPY 8%, Others 12%"}
                          {etf.symbol === "IEFA" && " EUR 45%, JPY 20%, GBP 15%, Others 20%"}
                          {etf.symbol === "BND" && " USD 100%"}
                          {etf.symbol === "SPICHA" && " USD 100%"}
                          {etf.symbol === "VOOV" && " USD 100%"}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Key Currency Insights:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">USD Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {portfolioData.currencyAllocation.find((c) => c.currency === "USD")?.percentage.toFixed(1) ||
                            "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mainly through US stocks and ETF underlying holdings
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">EUR Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {portfolioData.currencyAllocation.find((c) => c.currency === "EUR")?.percentage.toFixed(1) ||
                            "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">
                          European markets through ETF underlying holdings
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">CHF Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {portfolioData.currencyAllocation.find((c) => c.currency === "CHF")?.percentage.toFixed(1) ||
                            "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">Swiss stocks, cash, and ETF Swiss holdings</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="country-deep" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.trueCountryAllocation, "True Country Exposure (ETF Look-Through)")}
              {renderBarChart(portfolioData.trueCountryAllocation, "Country Exposure Breakdown")}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Country Analysis: ETF vs. Underlying Exposure</CardTitle>
                <CardDescription>
                  Comparison between ETF domicile/trading location and actual underlying country exposure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    <strong>Important:</strong> This analysis looks through ETFs to show your true country exposure
                    based on underlying holdings, not just where the ETF is domiciled or traded.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">ETF Country Exposure Breakdown:</h4>
                  {portfolioData.positions
                    .filter((p) => p.category === "ETF")
                    .map((etf, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-medium">{etf.symbol}</span>
                            <span className="text-sm text-muted-foreground ml-2">ETF Domicile: {etf.domicile}</span>
                          </div>
                          <div className="text-sm font-medium">CHF {etf.totalValueCHF.toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Underlying Country Exposure:
                          {etf.symbol === "VWRL" && " US 60%, Japan 8%, UK 4%, China 4%, Others 24%"}
                          {etf.symbol === "IS3N" && " US 65%, Japan 8%, UK 4%, France 3.5%, Others 19.5%"}
                          {etf.symbol === "IEFA" && " Japan 20%, UK 15%, France 12%, Germany 10%, Others 43%"}
                          {etf.symbol === "BND" && " US 100%"}
                          {etf.symbol === "SPICHA" && " US 100%"}
                          {etf.symbol === "VOOV" && " US 100%"}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Key Country Insights:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">US Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {portfolioData.trueCountryAllocation
                            .find((c) => c.country === "United States")
                            ?.percentage.toFixed(1) || "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Through US stocks and ETF underlying US holdings
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">European Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {portfolioData.trueCountryAllocation
                            .filter((c) =>
                              [
                                "France",
                                "Germany",
                                "United Kingdom",
                                "Switzerland",
                                "Netherlands",
                                "Sweden",
                                "Denmark",
                              ].includes(c.country),
                            )
                            .reduce((sum, c) => sum + c.percentage, 0)
                            .toFixed(1)}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">Combined European markets exposure</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Swiss Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {portfolioData.trueCountryAllocation
                            .find((c) => c.country === "Switzerland")
                            ?.percentage.toFixed(1) || "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">Swiss stocks and ETF Swiss holdings</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sector-deep" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.trueSectorAllocation, "True Sector Exposure (ETF Look-Through)")}
              {renderBarChart(portfolioData.trueSectorAllocation, "Sector Exposure Breakdown")}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sector Analysis: ETF Look-Through</CardTitle>
                <CardDescription>True sector allocation including ETF underlying sector exposure</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    <strong>Important:</strong> This analysis includes the underlying sector allocation of your ETFs,
                    providing a more accurate picture of your sector exposure.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">ETF Sector Exposure Breakdown:</h4>
                  {portfolioData.positions
                    .filter((p) => p.category === "ETF")
                    .map((etf, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-medium">{etf.symbol}</span>
                            <span className="text-sm text-muted-foreground ml-2">{etf.name}</span>
                          </div>
                          <div className="text-sm font-medium">CHF {etf.totalValueCHF.toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Top Sector Exposures:
                          {etf.symbol === "VWRL" && " Technology 22%, Financials 16%, Healthcare 12%"}
                          {etf.symbol === "IS3N" && " Technology 23%, Financials 15%, Healthcare 13%"}
                          {etf.symbol === "IEFA" && " Technology 18%, Financials 16%, Healthcare 14%"}
                          {etf.symbol === "BND" && " Government Bonds 70%, Corporate Bonds 25%"}
                          {etf.symbol === "SPICHA" && " Technology 28%, Financials 13%, Healthcare 12%"}
                          {etf.symbol === "VOOV" && " Financials 22%, Healthcare 16%, Industrials 14%"}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Sector Concentration Analysis:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Technology Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {portfolioData.trueSectorAllocation
                            .find((s) => s.sector === "Technology")
                            ?.percentage.toFixed(1) || "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">Including tech stocks and ETF tech holdings</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Financials Exposure</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {portfolioData.trueSectorAllocation
                            .find((s) => s.sector === "Financials")
                            ?.percentage.toFixed(1) || "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">Banks, insurance, and financial services</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Private Markets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {portfolioData.trueSectorAllocation
                            .find((s) => s.sector === "Private Markets")
                            ?.percentage.toFixed(1) || "0"}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">
                          OTC investments via platforms like Stableton
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domicile" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPieChart(portfolioData.domicileAllocation, "ETF Domicile Distribution")}
              {renderBarChart(portfolioData.domicileAllocation, "Domicile Breakdown")}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tax Optimization Analysis</CardTitle>
                <CardDescription>ETF domicile impact on Swiss tax efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Ireland-domiciled ETFs</strong> are generally tax-optimized for Swiss investors with 15%
                      withholding tax due to the double taxation treaty.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">Tax-Optimized (IE/LU)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          CHF{" "}
                          {portfolioData.positions
                            .filter((p) => p.category === "ETF" && p.taxOptimized)
                            .reduce((sum, p) => sum + p.totalValueCHF, 0)
                            .toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">15% Withholding Tax</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Higher Tax (US)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          CHF{" "}
                          {portfolioData.positions
                            .filter((p) => p.category === "ETF" && !p.taxOptimized && p.domicile === "US")
                            .reduce((sum, p) => sum + p.totalValueCHF, 0)
                            .toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">30% Withholding Tax</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Swiss Domiciled</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          CHF{" "}
                          {portfolioData.positions
                            .filter((p) => p.category === "ETF" && p.domicile === "CH")
                            .reduce((sum, p) => sum + p.totalValueCHF, 0)
                            .toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">No Withholding Tax</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">ETF Tax Optimization Recommendations:</h4>
                    {portfolioData.positions
                      .filter((p) => p.category === "ETF" && !p.taxOptimized)
                      .map((position, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <div className="font-medium text-red-700">
                              {position.symbol} - {position.name}
                            </div>
                            <div className="text-sm text-red-600">US-domiciled ETF with 30% withholding tax</div>
                          </div>
                          <Badge variant="destructive">Consider IE alternative</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portfolioData.positions
                      .filter((p) => p.gainLossCHF > 0)
                      .sort((a, b) => b.gainLossCHF - a.gainLossCHF)
                      .slice(0, 5)
                      .map((position, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{position.symbol}</div>
                            <div className="text-sm text-muted-foreground">{position.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-green-600">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              +CHF {position.gainLossCHF.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Underperformers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portfolioData.positions
                      .filter((p) => p.gainLossCHF < 0)
                      .sort((a, b) => a.gainLossCHF - b.gainLossCHF)
                      .slice(0, 5)
                      .map((position, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{position.symbol}</div>
                            <div className="text-sm text-muted-foreground">{position.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-red-600">
                              <TrendingDown className="h-4 w-4 mr-1" />
                              CHF {position.gainLossCHF.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Holdings</CardTitle>
                <CardDescription>Complete portfolio breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    "Actions",
                    "ETF",
                    "Fonds",
                    "Obligations",
                    "Private Markets",
                    "Crypto-monnaies",
                    "Produits structurés",
                  ].map((category) => {
                    const categoryPositions = portfolioData.positions.filter((p) => p.category === category)
                    if (categoryPositions.length === 0) return null

                    return (
                      <div key={category} className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {category}
                          {category === "Private Markets" && <Badge variant="secondary">OTC/Secondary Market</Badge>}
                        </h3>
                        {categoryPositions.map((position, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{position.symbol}</span>
                                <Badge variant="outline">{position.category}</Badge>
                                {position.isOTC && <Badge variant="secondary">OTC via {position.platform}</Badge>}
                                {position.category === "ETF" && (
                                  <Badge variant={position.taxOptimized ? "default" : "destructive"}>
                                    {position.taxOptimized ? "Tax-Optimized" : "High WHT"}
                                  </Badge>
                                )}
                                <Badge variant={position.gainLossCHF >= 0 ? "default" : "destructive"}>
                                  {position.gainLossCHF >= 0 ? "+" : ""}
                                  {position.gainLossCHF.toFixed(0)} CHF
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{position.name}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Qty: {position.quantity}</span>
                                <span>
                                  Cost: {position.currency} {position.unitCost}
                                </span>
                                {!position.isOTC && <span>Daily: {position.dailyChangePercent.toFixed(2)}%</span>}
                                {position.sector && <span>Sector: {position.sector}</span>}
                                {position.geography && <span>Geography: {position.geography}</span>}
                                {position.domicile && <span>Domicile: {position.domicile}</span>}
                                {position.withholdingTax && <span>WHT: {position.withholdingTax}%</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">CHF {position.totalValueCHF.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">
                                {position.positionPercent.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
