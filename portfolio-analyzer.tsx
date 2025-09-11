"use client"

import type React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  parsePortfolioCsv, // Corrected import
  type SwissPortfolioData,
  type PortfolioPosition,
  type AllocationItem,
} from "./portfolio-parser"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileUploadHelper } from "@/components/file-upload-helper"
import { LoadingProgress } from "@/components/loading-progress"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#d0ed57",
  "#a4de6c",
  "#8dd1e1",
]

interface PortfolioAnalyzerProps {
  defaultData?: SwissPortfolioData | null
}

export default function PortfolioAnalyzer({ defaultData = null }: PortfolioAnalyzerProps = {}) {
  const [portfolioData, setPortfolioData] = useState<SwissPortfolioData | null>(defaultData)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fileInput, setFileInput] = useState<File | null>(null)
  const [textInput, setTextInput] = useState<string>("")
  const { toast } = useToast()

  const handleFileChange = useCallback((file: File | null) => {
    setFileInput(file)
    setTextInput("") // Clear text input if file is selected
    setPortfolioData(null)
    setError(null)
  }, [])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value)
    setFileInput(null) // Clear file input if text is entered
    setPortfolioData(null)
    setError(null)
  }, [])

  const handleAnalyze = useCallback(async () => {
    setLoading(true)
    setProgress(0)
    setError(null)
    setPortfolioData(null)

    try {
      let data: SwissPortfolioData | null = null
      if (fileInput) {
        toast({
          title: "Processing File",
          description: `Analyzing ${fileInput.name}...`,
        })
        const fileContent = await fileInput.text() // Read file content as text
        console.log("Starting CSV parsing...")
        data = await parsePortfolioCsv(fileContent) // Use parsePortfolioCsv
        console.log("CSV parsing completed, data:", data)
      } else if (textInput) {
        toast({
          title: "Processing Text",
          description: "Analyzing pasted text...",
        })
        console.log("Starting CSV parsing...")
        data = await parsePortfolioCsv(textInput) // Use parsePortfolioCsv
        console.log("CSV parsing completed, data:", data)
      } else {
        throw new Error("Please upload a file or paste text to analyze.")
      }

      // Only set portfolio data after all processing is complete
      if (data && data.positions && data.positions.length > 0) {
        console.log("Setting portfolio data with", data.positions.length, "positions")
        setPortfolioData(data)
        toast({
          title: "Analysis Complete",
          description: `Your portfolio has been successfully analyzed with ${data.positions.length} positions.`,
          variant: "success",
        })
      } else {
        console.log("No valid positions found in data:", data)
        setError("No valid positions found in the uploaded data. Please check your file format.")
        toast({
          title: "Analysis Failed",
          description: "No valid positions found. Please check your file format.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Analysis error:", err)
      setError(err.message || "An unknown error occurred during analysis.")
      toast({
        title: "Analysis Failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }, [fileInput, textInput, toast])

  useEffect(() => {
    // Simulate progress for demonstration
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return prev
          }
          return prev + 10
        })
      }, 200)
      return () => clearInterval(interval)
    }
  }, [loading])

  // Create a separate component for allocation charts to properly use hooks
  const AllocationChart = ({ data, title }: { data: AllocationItem[], title: string }) => {
    // Sort data by percentage (highest first) for consistent ordering
    const sortedData = useMemo(() => 
      [...data].sort((a, b) => b.percentage - a.percentage), 
      [data]
    )

    // State for table sorting
    const [sortConfig, setSortConfig] = useState<{key: keyof AllocationItem, direction: 'asc' | 'desc'} | null>(
      {key: 'percentage', direction: 'desc'} // Default sort by percentage desc
    )

    // Sort table data based on current sort config
    const sortedTableData = useMemo(() => {
      if (!sortConfig) return sortedData
      
      return [...sortedData].sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal)
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
        }
        
        return 0
      })
    }, [sortedData, sortConfig])

    const handleSort = (key: keyof AllocationItem) => {
      setSortConfig(current => ({
        key,
        direction: current?.key === key && current?.direction === 'desc' ? 'asc' : 'desc'
      }))
    }

    const getSortIcon = (key: keyof AllocationItem) => {
      if (!sortConfig || sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-gray-400" />
      }
      return sortConfig.direction === 'desc' 
        ? <ChevronDown className="ml-2 h-4 w-4" />
        : <ChevronUp className="ml-2 h-4 w-4" />
    }

    return (
      <Card className="w-full" data-testid={`${title.toLowerCase().replace(/\s/g, "-")}-chart`}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Breakdown of your portfolio by {title.toLowerCase()}. Legend and data ordered by highest percentage.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <ChartContainer
            config={sortedData.reduce((acc: Record<string, any>, item, idx) => {
              acc[item.name.toLowerCase().replace(/\s/g, "-")] = {
                label: item.name,
                color: COLORS[idx % COLORS.length],
              }
              return acc
            }, {})}
            className="h-[300px] w-full"
            data-testid="responsive-container"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart data-testid="pie-chart">
                <Pie data={sortedData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" labelLine={false}>
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-4 w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Category
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center justify-end">
                      Value (CHF)
                      {getSortIcon('value')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center justify-end">
                      Percentage
                      {getSortIcon('percentage')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTableData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{item.value.toLocaleString('en-CH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{item.percentage.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPositionsTable = (positions: PortfolioPosition[]) => {
    if (!positions || positions.length === 0) {
      return <p className="text-center text-gray-500">No positions found.</p>
    }
    return (
      <Card className="w-full" data-testid="positions-table">
        <CardHeader>
          <CardTitle>Portfolio Positions</CardTitle>
          <CardDescription>Detailed breakdown of all your holdings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Total Value (CHF)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Domicile</TableHead>
                  <TableHead className="text-right">Position %</TableHead>
                  <TableHead className="text-right">Daily Change %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position, index) => (
                  <TableRow key={index}>
                    <TableCell>{position.symbol}</TableCell>
                    <TableCell>{position.name}</TableCell>
                    <TableCell className="text-right">{position.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{position.price.toFixed(2)}</TableCell>
                    <TableCell>{position.currency}</TableCell>
                    <TableCell className="text-right">{position.totalValueCHF.toFixed(2)}</TableCell>
                    <TableCell>{position.category}</TableCell>
                    <TableCell>{position.domicile}</TableCell>
                    <TableCell className="text-right">{position.positionPercent.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{position.dailyChangePercent.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Swiss Portfolio Analyzer</CardTitle>
          <CardDescription>
            Upload your Swiss bank PDF/CSV or paste text to get a detailed portfolio analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4">
              <FileUploadHelper onFileChange={handleFileChange} />
              {fileInput && <p className="text-sm text-gray-600 dark:text-gray-400">Selected file: {fileInput.name}</p>}
            </TabsContent>
            <TabsContent value="paste" className="space-y-4">
              <Textarea
                placeholder="Paste your portfolio data here (e.g., from a PDF or CSV file)"
                rows={10}
                value={textInput}
                onChange={handleTextChange}
                className="w-full"
              />
            </TabsContent>
          </Tabs>

          <Button onClick={handleAnalyze} className="w-full" disabled={loading || (!fileInput && !textInput)}>
            {loading ? "Analyzing..." : "Analyze Portfolio"}
          </Button>

          {loading && <LoadingProgress progress={progress} />}

          {error && (
            <div className="rounded-md bg-red-100 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
              <h3 className="font-semibold">Error:</h3>
              <p>{error}</p>
            </div>
          )}

          {portfolioData && (
            <div className="space-y-8" data-testid="portfolio-analysis">
              <Card data-testid="portfolio-summary">
                <CardHeader>
                  <CardTitle>Portfolio Analysis</CardTitle>
                  <CardDescription>
                    Analysis of your portfolio with {portfolioData.positions.length} positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => {
                      setPortfolioData(null)
                      setFileInput(null)
                      setTextInput("")
                      setError(null)
                    }}
                    variant="outline"
                    data-testid="reset-button"
                  >
                    Analyze Another Portfolio
                  </Button>
                </CardContent>
              </Card>
              <Card data-testid="account-overview">
                <CardHeader>
                  <CardTitle>Account Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Portfolio Value</span>
                    <span className="text-2xl font-bold">
                      CHF {portfolioData.accountOverview.totalValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Securities Value</span>
                    <span className="text-2xl font-bold">
                      CHF {portfolioData.accountOverview.securitiesValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Cash Balance</span>
                    <span className="text-2xl font-bold">
                      CHF {portfolioData.accountOverview.cashBalance.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {renderPositionsTable(portfolioData.positions)}

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2" data-testid="allocation-charts">
                <AllocationChart data={portfolioData.assetAllocation} title="Asset Allocation" />
                <AllocationChart data={portfolioData.currencyAllocation} title="Currency Allocation" />
                <AllocationChart data={portfolioData.trueCountryAllocation} title="True Country Allocation" />
                <AllocationChart data={portfolioData.trueSectorAllocation} title="True Sector Allocation" />
                <AllocationChart data={portfolioData.domicileAllocation} title="Domicile Allocation" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
