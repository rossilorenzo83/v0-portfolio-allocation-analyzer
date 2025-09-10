// Shared Yahoo Finance API types
// Consolidates duplicate interfaces from lib/yahoo-finance-service.ts, lib/api-service.ts, lib/share-metadata-service.ts

export interface YahooSession {
  cookies: string
  crumb: string
  userAgent: string
}

export interface ETFComposition {
  symbol: string
  name?: string
  currency: Array<{ currency: string; weight: number }>
  country: Array<{ country: string; weight: number }>
  sector: Array<{ sector: string; weight: number }>
  holdings: Array<{ symbol: string; name: string; weight: number }>
  domicile: string
  withholdingTax: number
  expenseRatio?: number
  lastUpdated: string
}

export interface AssetMetadata {
  symbol: string
  name: string
  sector: string
  country: string
  currency: string
  type: string
  exchange?: string
  domicile?: string
}

export interface QuoteData {
  symbol: string
  price: number
  currency: string
  change?: number
  changePercent?: number
  marketCap?: number
}

export interface SearchResult {
  symbol: string
  name: string
  type: string
  exchange?: string
}