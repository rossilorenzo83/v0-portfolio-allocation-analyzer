// Portfolio-specific types
// Consolidates portfolio data structures from portfolio-parser.ts and related files

export interface Position {
  symbol: string
  quantity: number
  marketValue: number
  currency: string
  name?: string
  sector?: string
  country?: string
  type?: string
  exchange?: string
}

export interface AllocationData {
  category: string
  value: number
  percentage: number
  color?: string
}

export interface PortfolioAllocation {
  assetAllocation: AllocationData[]
  currencyAllocation: AllocationData[]
  countryAllocation: AllocationData[]
  sectorAllocation: AllocationData[]
}

export interface PortfolioSummary {
  totalValue: number
  totalPositions: number
  currency: string
  lastUpdated: string
}

export interface SwissPortfolioData {
  positions: Position[]
  allocation: PortfolioAllocation
  summary: PortfolioSummary
  metadata?: {
    source: string
    parseDate: string
    originalColumns: string[]
  }
}

export interface CSVParseResult {
  success: boolean
  data?: SwissPortfolioData
  errors?: string[]
  warnings?: string[]
}