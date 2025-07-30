"use client"
import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { FileUploadHelper } from "@/components/file-upload-helper"
import { parseSwissPortfolioPDF, type SwissPortfolioData, type AllocationItem } from "./portfolio-parser"
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChartIcon,
  BarChart3,
  Globe,
  Building2,
  Info,
} from "lucide-react"

// Color palette for charts
const COLORS = [
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
  "#87D068",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
]

interface SwissPortfolioAnalyzerProps {
  defaultData?: SwissPortfolioData
  error?: string | null
}

export default function SwissPortfolioAnalyzer({ defaultData, error: propError }: SwissPortfolioAnalyzerProps) {
  const [portfolioData, setPortfolioData] = useState<SwissPortfolioData | null>(defaultData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(propError || null)

  const handleFileUpload = useCallback(async (input: File | string) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("Starting portfolio analysis...")
      const data = await parseSwissPortfolioPDF(input)
      console.log("Portfolio analysis complete:", data)
      setPortfolioData(data)
    } catch (err) {
      console.error("Portfolio analysis failed:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const formatCurrency = (amount: number, currency = "CHF") => {
    // Validate currency code and provide fallback
    const validCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency) ? currency : "CHF"

    try {
      return new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency: validCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    } catch (error) {
      // Fallback formatting if currency is still invalid
      return `${validCurrency} ${amount.toLocaleString("de-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-blue-600">Value: {formatCurrency(data.value)}</p>
          <p className="text-green-600">Percentage: {formatPercentage(data.percentage)}</p>
        </div>
      )
    }
    return null
  }

  const renderPieChart = (data: AllocationItem[], title: string) => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${formatPercentage(percentage)}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )

  const renderBarChart = (data: AllocationItem[], title: string) => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={12} />
              <YAxis />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )

  // Calculate tax efficiency for Swiss investors
  const calculateTaxEfficiency = () => {
    if (!portfolioData) return { optimized: 0, nonOptimized: 0, usDomiciled: 0, europeanDomiciled: 0 }

    const usDomiciled = portfolioData.positions.filter((p) => p.domicile === "US")
    const europeanDomiciled = portfolioData.positions.filter((p) => p.domicile === "IE" || p.domicile === "LU")
    const other = portfolioData.positions.filter(
      (p) => p.domicile !== "US" && p.domicile !== "IE" && p.domicile !== "LU",
    )

    return {
      optimized: usDomiciled.length, // US domiciled are more tax efficient for Swiss
      nonOptimized: europeanDomiciled.length + other.length,
      usDomiciled: usDomiciled.length,
      europeanDomiciled: europeanDomiciled.length,
    }
  }

  if (!portfolioData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Swiss Portfolio Analyzer</h1>
          <p className="text-gray-600">
            Upload your Swiss bank portfolio statement to get detailed analysis and insights
          </p>
        </div>

        <FileUploadHelper onFileUpload={handleFileUpload} isLoading={isLoading} error={error} />
      </div>
    )
  }

  const {
    accountOverview,
    positions,
    assetAllocation,
    currencyAllocation,
    trueCountryAllocation,
    trueSectorAllocation,
    domicileAllocation,
  } = portfolioData

  const taxEfficiency = calculateTaxEfficiency()

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Portfolio Analysis</h1>
        <p className="text-gray-600">
          Comprehensive analysis of your Swiss portfolio with {positions.length} positions
        </p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountOverview.totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Securities Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountOverview.securitiesValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountOverview.cashBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
          <TabsTrigger value="tax">Tax Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPieChart(assetAllocation, "Asset Allocation")}
            {renderPieChart(currencyAllocation, "Currency Allocation")}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderBarChart(trueSectorAllocation.slice(0, 10), "Top 10 Sectors")}
            {renderBarChart(trueCountryAllocation.slice(0, 10), "Top 10 Countries")}
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Positions</CardTitle>
              <CardDescription>Detailed view of all positions in your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Value (CHF)</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Domicile</TableHead>
                      <TableHead>% of Portfolio</TableHead>
                      <TableHead>Daily Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions
                      .sort((a, b) => b.totalValueCHF - a.totalValueCHF)
                      .map((position) => (
                        <TableRow key={position.symbol}>
                          <TableCell className="font-medium">{position.symbol}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{position.name}</TableCell>
                          <TableCell>{position.quantity.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(position.price, position.currency)}</TableCell>
                          <TableCell>{formatCurrency(position.totalValueCHF)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{position.currency || "CHF"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{position.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={position.domicile === "US" ? "default" : "outline"}
                              className={position.domicile === "US" ? "bg-green-100 text-green-800" : ""}
                            >
                              {position.domicile || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatPercentage(position.positionPercent)}</TableCell>
                          <TableCell>
                            <div
                              className={`flex items-center gap-1 ${
                                position.dailyChangePercent >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {position.dailyChangePercent >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              {formatPercentage(Math.abs(position.dailyChangePercent))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPieChart(assetAllocation, "Asset Type Distribution")}
            {renderPieChart(currencyAllocation, "Currency Exposure")}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assetAllocation.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(item.value)}</div>
                      <div className="text-sm text-gray-500">{formatPercentage(item.percentage)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPieChart(trueCountryAllocation, "Geographic Distribution")}
            {renderBarChart(trueCountryAllocation.slice(0, 15), "Country Breakdown")}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Geographic Allocation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trueCountryAllocation.slice(0, 10).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(item.value)}</div>
                      <div className="text-xs text-gray-500">{formatPercentage(item.percentage)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPieChart(trueSectorAllocation, "Sector Distribution")}
            {renderBarChart(trueSectorAllocation, "Sector Breakdown")}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sector Analysis</CardTitle>
              <CardDescription>True sector exposure including ETF look-through analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trueSectorAllocation.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                        <span className="text-sm text-gray-500 ml-2">({formatPercentage(item.percentage)})</span>
                      </div>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPieChart(domicileAllocation, "Domicile Distribution")}

            <Card>
              <CardHeader>
                <CardTitle>Tax Efficiency for Swiss Investors</CardTitle>
                <CardDescription>Based on US-Switzerland tax treaty benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-800">US Domiciled (Tax Efficient)</span>
                    <span className="font-bold text-green-600">{taxEfficiency.usDomiciled}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium text-orange-800">European Domiciled</span>
                    <span className="font-bold text-orange-600">{taxEfficiency.europeanDomiciled}</span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-semibold">Withholding Tax Rates</h4>
                    {domicileAllocation.map((item) => (
                      <div key={item.name} className="flex justify-between items-center">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">
                          {item.name.includes("US")
                            ? "15%"
                            : item.name.includes("IE") || item.name.includes("LU")
                              ? "15%"
                              : "30%"}{" "}
                          WHT
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>For Swiss Investors:</strong> US-domiciled ETFs are generally more tax-efficient than European
              ones. The US-Switzerland tax treaty allows only 15% withholding tax on US dividends, and this can be fully
              reclaimed on your Swiss tax return. European ETFs face an additional layer of withholding tax that cannot
              be fully recovered.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Tax Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600 mb-2">Tax Efficient (US Domiciled)</h4>
                    <ul className="text-sm space-y-1">
                      {positions
                        .filter((p) => p.domicile === "US")
                        .slice(0, 5)
                        .map((p) => (
                          <li key={p.symbol} className="flex justify-between">
                            <span>{p.symbol}</span>
                            <span className="text-green-600">15% WHT (reclaimable)</span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-orange-600 mb-2">Consider US Alternatives</h4>
                    <ul className="text-sm space-y-1">
                      {positions
                        .filter(
                          (p) =>
                            (p.domicile === "IE" || p.domicile === "LU") &&
                            (p.category === "ETF" || p.category === "Funds"),
                        )
                        .slice(0, 5)
                        .map((p) => (
                          <li key={p.symbol} className="flex justify-between">
                            <span>{p.symbol}</span>
                            <span className="text-orange-600">15% WHT (partial loss)</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">US ETF Alternatives</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>
                      <strong>VWRL/VWCE → VTI + VXUS:</strong> Total US market + International markets
                    </p>
                    <p>
                      <strong>IWDA → VTI:</strong> US total market exposure
                    </p>
                    <p>
                      <strong>European ETFs → VEA:</strong> Developed markets excluding US
                    </p>
                    <p>
                      <strong>Emerging Markets → VWO:</strong> Emerging markets exposure
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            setPortfolioData(null)
            setError(null)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Analyze Another Portfolio
        </button>
      </div>
    </div>
  )
}
