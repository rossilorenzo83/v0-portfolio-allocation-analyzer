# Portfolio Allocation Analyzer - Comprehensive Context Guide

## Overview

The Portfolio Allocation Analyzer is a sophisticated web application designed to help users analyze their investment portfolios, with particular focus on Swiss bank CSV data. It provides detailed breakdowns of asset, currency, country, sector, and domicile allocations, leveraging real-time market data and ETF composition information.

## Core Features

### 1. CSV Data Import & Processing
- **Flexible Input Methods**: Supports both file upload and direct text pasting
- **Multi-language Support**: Handles CSV files from Swiss banks in French, German, and English
- **Smart Column Detection**: Automatically maps CSV headers to standard portfolio fields
- **Robust Parsing**: Handles various CSV formats and delimiters
- **Error Handling**: Comprehensive error reporting for malformed data

### 2. Portfolio Analysis Engine
- **Position Enrichment**: Automatically fetches current prices and metadata for securities
- **Symbol Resolution**: Intelligently resolves European ETF and Swiss stock symbols
- **Tax Optimization**: Considers Swiss tax implications based on asset domicile
- **Performance Tracking**: Calculates unrealized gains/losses and daily changes

### 3. Allocation Analysis
- **Asset Allocation**: Breakdown by asset type (stocks, bonds, ETFs, etc.)
- **Currency Allocation**: True currency exposure analysis
- **Geographic Allocation**: Country-level exposure with ETF composition data
- **Sector Allocation**: Industry sector breakdown
- **Domicile Allocation**: Tax jurisdiction analysis for Swiss investors

### 4. Real-time Data Integration
- **Market Data**: Live stock prices and currency rates
- **ETF Composition**: Detailed holdings and sector/country breakdowns
- **Symbol Search**: Intelligent symbol lookup and resolution
- **Caching System**: Optimized API calls with intelligent caching

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15.2.4 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Components**: Radix UI primitives with custom styling
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with validation

### Backend Services
- **API Routes**: Next.js API routes for Yahoo Finance integration
- **Data Processing**: Custom TypeScript services for portfolio analysis
- **Caching**: Multi-level caching system (memory, API responses)
- **Rate Limiting**: Intelligent API call management

### Key Dependencies
```json
{
  "next": "15.2.4",
  "react": "^19",
  "typescript": "^5.3.3",
  "recharts": "latest",
  "papaparse": "latest",
  "react-hook-form": "latest",
  "@radix-ui/react-*": "latest"
}
```

## Core Components

### 1. Portfolio Parser (`portfolio-parser.ts`)
**Purpose**: Core CSV parsing and portfolio data processing engine

**Key Functions**:
- `parsePortfolioCsv()`: Main parsing function
- `detectColumnMapping()`: Smart header detection
- `enrichPositionsWithAPIData()`: Data enrichment
- `calculateAssetAllocation()`: Allocation calculations

**Features**:
- Multi-language CSV support (French, German, English)
- Automatic symbol resolution
- Tax optimization for Swiss investors
- Comprehensive error handling

### 2. ETF Data Service (`etf-data-service.ts`)
**Purpose**: Manages ETF composition data and market information

**Key Functions**:
- `getEtfData()`: Fetch ETF composition
- `getStockPrice()`: Real-time price data
- `searchSymbol()`: Symbol lookup
- `resolveSymbolAndFetchData()`: Complete data resolution

**Features**:
- Intelligent caching (24h for ETF data, 5min for quotes)
- Rate limiting protection
- Fallback data for unavailable symbols
- European ETF symbol mapping

### 3. API Service (`lib/api-service.ts`)
**Purpose**: Yahoo Finance API integration and data management

**Key Functions**:
- `getStockPrice()`: Stock quote retrieval
- `getAssetMetadata()`: Security metadata
- `getETFComposition()`: ETF holdings data
- `searchSymbol()`: Symbol search

**Features**:
- Symbol resolution for European markets
- Swiss stock symbol mapping
- Comprehensive fallback data
- Rate limiting and caching

### 4. Portfolio Analyzer UI (`portfolio-analyzer.tsx`)
**Purpose**: Main user interface component

**Key Features**:
- File upload and text input handling
- Interactive charts and tables
- Real-time progress tracking
- Error handling and user feedback

## Data Models

### SwissPortfolioData
```typescript
interface SwissPortfolioData {
  accountOverview: {
    totalValue: number
    securitiesValue: number
    cashBalance: number
  }
  positions: PortfolioPosition[]
  assetAllocation: AllocationItem[]
  currencyAllocation: AllocationItem[]
  trueCountryAllocation: AllocationItem[]
  trueSectorAllocation: AllocationItem[]
  domicileAllocation: AllocationItem[]
}
```

### PortfolioPosition
```typescript
interface PortfolioPosition {
  symbol: string
  name: string
  quantity: number
  unitCost: number
  price: number
  currentPrice?: number
  totalValueCHF: number
  currency: string
  category: string
  sector?: string
  geography?: string
  domicile?: string
  withholdingTax?: number
  taxOptimized: boolean
  gainLossCHF: number
  unrealizedGainLoss?: number
  unrealizedGainLossPercent?: number
  positionPercent: number
  dailyChangePercent: number
  isOTC: boolean
  platform?: string
}
```

## API Integration

### Yahoo Finance API
- **Quote Endpoint**: `/api/yahoo/quote/[symbol]`
- **ETF Endpoint**: `/api/yahoo/etf/[symbol]`
- **Search Endpoint**: `/api/yahoo/search/[query]`

### Symbol Resolution
The system includes comprehensive symbol mapping for:
- **European ETFs**: VWRL, VWCE, IWDA, etc.
- **Swiss Stocks**: NESN, NOVN, ROG, etc.
- **International Markets**: Multiple exchange suffixes

## Testing Infrastructure

### Test Coverage
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: Full workflow testing
- **API Tests**: Service layer validation
- **Component Tests**: UI component behavior

### Test Scripts
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:ci           # CI mode
```

### Test Files
- `__tests__/portfolio-parser.test.ts`: Core parsing logic
- `__tests__/api-service.test.ts`: API integration
- `__tests__/portfolio-views.test.ts`: UI components

## Development Tools

### Scripts
- `scripts/analyze-csv-structure.ts`: CSV structure analysis
- `scripts/test-real-csv.ts`: Real CSV testing
- `scripts/test-api-service.ts`: API service testing
- `scripts/test-integration.ts`: End-to-end testing

### Configuration
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Tailwind**: Utility-first CSS framework
- **Jest**: Testing framework

## Deployment

### Docker Support
- **Dockerfile**: Production containerization
- **docker-compose.yml**: Local development setup
- **Multi-stage builds**: Optimized production images

### Environment Variables
```env
YAHOO_FINANCE_API_KEY=your_api_key
NEXT_PUBLIC_YAHOO_FINANCE_API_BASE_URL=/api/yahoo
```

## Key Features for AI Agents

### 1. Data Processing Capabilities
- **CSV Parsing**: Robust handling of various CSV formats
- **Symbol Resolution**: Intelligent mapping of financial symbols
- **Data Enrichment**: Automatic fetching of market data
- **Error Recovery**: Graceful handling of missing or invalid data

### 2. Financial Analysis
- **Portfolio Metrics**: Comprehensive position analysis
- **Allocation Breakdowns**: Multi-dimensional allocation analysis
- **Tax Optimization**: Swiss-specific tax considerations
- **Performance Tracking**: Gain/loss calculations

### 3. API Integration
- **Market Data**: Real-time price and composition data
- **Caching Strategy**: Optimized data retrieval
- **Rate Limiting**: API call management
- **Fallback Systems**: Robust error handling

### 4. User Experience
- **Interactive UI**: Modern, responsive interface
- **Progress Tracking**: Real-time analysis feedback
- **Error Handling**: Comprehensive error reporting
- **Data Visualization**: Charts and tables for insights

## Common Use Cases

### 1. Portfolio Import
1. User uploads CSV from Swiss bank
2. System detects and maps columns
3. Parses positions and calculates values
4. Enriches with market data
5. Generates allocation analysis

### 2. Symbol Resolution
1. System receives symbol (e.g., "VWRL")
2. Checks symbol mapping tables
3. Attempts API lookup
4. Falls back to known data if needed
5. Returns enriched position data

### 3. Allocation Analysis
1. Processes individual positions
2. Calculates asset type breakdown
3. Analyzes geographic exposure
4. Determines sector allocation
5. Considers tax implications

## Error Handling

### CSV Parsing Errors
- Invalid file format detection
- Missing required columns
- Data type validation
- Currency conversion errors

### API Integration Errors
- Network timeouts
- Rate limiting responses
- Invalid symbol errors
- Data format inconsistencies

### User Input Errors
- Empty file uploads
- Invalid CSV content
- Unsupported file formats
- Malformed data structures

## Performance Considerations

### Caching Strategy
- **ETF Data**: 24-hour cache duration
- **Quote Data**: 5-minute cache duration
- **Search Results**: 1-hour cache duration
- **Memory Management**: Automatic cache cleanup

### Rate Limiting
- **API Calls**: 200ms delay between requests
- **Batch Processing**: Intelligent request batching
- **Error Recovery**: Exponential backoff for failures

### Optimization
- **Lazy Loading**: On-demand data fetching
- **Progressive Enhancement**: Graceful degradation
- **Memory Efficiency**: Optimized data structures

This comprehensive context provides a complete understanding of the Portfolio Allocation Analyzer's capabilities, architecture, and implementation details for AI agents working with the codebase.