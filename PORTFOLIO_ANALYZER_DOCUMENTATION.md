# Portfolio Analyzer - Comprehensive Documentation

## Overview

The Portfolio Analyzer is a sophisticated web application built with Next.js 15, TypeScript, and React 19 that helps users analyze their investment portfolios with a focus on Swiss banking data. The application provides detailed breakdowns of asset allocations, currency exposure, country distributions, sector analysis, and tax optimization insights.

## Core Architecture

### Technology Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI Framework**: Tailwind CSS with Shadcn/ui components
- **Charts**: Recharts for data visualization
- **CSV Processing**: PapaParse for CSV parsing
- **Testing**: Jest with React Testing Library
- **Deployment**: Docker with multi-stage builds

### Project Structure
```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── yahoo/         # Yahoo Finance proxy endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # Shadcn/ui components (50+ components)
│   ├── file-upload-helper.tsx
│   ├── loading-progress.tsx
│   └── theme-provider.tsx
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and services
├── scripts/               # Testing and analysis utilities
├── __tests__/            # Jest test files
├── portfolio-parser.ts    # Core CSV parsing logic
├── etf-data-service.ts   # ETF data enrichment service
└── swiss-portfolio-analyzer.tsx # Main analyzer component
```

## Key Features

### 1. CSV Data Import and Processing

#### Multiple Input Methods
- **File Upload**: Drag-and-drop or click-to-upload CSV files
- **Text Input**: Direct paste of CSV data into textarea
- **Flexible Parsing**: Handles various CSV formats from Swiss banks

#### Smart CSV Parsing
- **Auto-delimiter Detection**: Automatically detects comma, semicolon, or tab delimiters
- **Header Recognition**: Identifies common column headers in multiple languages (EN/FR/DE)
- **Category Mapping**: Maps asset categories across different languages
- **Symbol Resolution**: Cleans and normalizes security symbols (ISIN, ticker symbols)

#### Supported Data Formats
```typescript
interface PortfolioPosition {
  symbol: string              // Security identifier (ISIN, ticker)
  name: string               // Security name
  quantity: number           // Number of shares/units
  unitCost: number          // Average purchase price
  price: number             // Current/last price
  currentPrice?: number     // Real-time price (if available)
  totalValueCHF: number     // Total position value in CHF
  currency: string          // Trading currency
  category: string          // Asset category (Actions, ETF, Bonds, etc.)
  sector?: string           // Industry sector
  geography?: string        // Geographic exposure
  domicile?: string         // Fund domicile (for tax purposes)
  withholdingTax?: number   // Withholding tax rate
  taxOptimized: boolean     // Tax optimization flag
  gainLossCHF: number       // Unrealized gain/loss in CHF
  positionPercent: number   // Portfolio weight percentage
  dailyChangePercent: number // Daily price change
  isOTC: boolean            // Over-the-counter flag
}
```

### 2. Real-time Data Integration

#### Yahoo Finance API Integration
- **Quote Service**: Real-time stock and ETF prices
- **ETF Composition**: Detailed holdings and sector breakdowns
- **Search Functionality**: Symbol lookup and validation
- **Caching System**: Multi-tier caching (24h for ETF data, 5min for quotes)
- **Rate Limiting**: Built-in delays to prevent API throttling

#### European ETF Symbol Resolution
- **Automatic Ticker Mapping**: Converts European ETF symbols to Yahoo Finance compatible tickers
- **Exchange Suffix Handling**: Maps symbols like `VWRL` to `VWRL.L`, `VWRL.DE`, `VWRL.AS`, etc.
- **Swiss Stock Mapping**: Converts Swiss stock symbols (e.g., `NESN` to `NESN.SW`)
- **Fallback Logic**: Tries multiple exchange variations until a working symbol is found

#### Supported European ETF Mappings
```typescript
// Vanguard ETFs
VWRL: ["VWRL.L", "VWRL.AS", "VWRL.DE", "VWRL.MI"]
VWCE: ["VWCE.DE", "VWCE.L", "VWCE.AS", "VWCE.MI"]
VUSA: ["VUSA.L", "VUSA.AS", "VUSA.DE", "VUSA.MI"]

// iShares ETFs
IS3N: ["IS3N.SW", "IS3N.DE", "IS3N.L", "IS3N.AS"]
IWDA: ["IWDA.L", "IWDA.AS", "IWDA.DE", "IWDA.MI"]

// Swiss Stocks
NESN: "NESN.SW"
NOVN: "NOVN.SW"
ROG: "ROG.SW"
```

#### Data Fetching Priority
1. **Real Yahoo Finance API**: Attempts to fetch real-time data from Yahoo Finance API
2. **Web Scraping Fallback**: If API fails, attempts to scrape Yahoo Finance website
3. **Mock Data Last Resort**: Only uses mock data when all real attempts fail

#### Mock Data Fallbacks
- Provides estimated data when API is unavailable
- Maintains application functionality during development
- Includes realistic price fluctuations and market data

### 3. Portfolio Analysis Features

#### Asset Allocation Analysis
- **Category Breakdown**: Actions, ETF, Bonds, Structured Products, Cash
- **Visual Charts**: Interactive pie charts with hover details
- **Tabular View**: Detailed allocation tables with percentages

#### True Currency Exposure
- **ETF Decomposition**: Analyzes underlying currency exposure in ETFs
- **Direct Holdings**: Direct currency exposure from individual stocks
- **Weighted Calculations**: Accurate exposure based on ETF compositions

#### Geographic Distribution
- **Country Allocation**: True country exposure through ETF analysis
- **Regional Grouping**: Automatic grouping by geographic regions
- **Emerging vs Developed**: Classification of market types

#### Sector Analysis
- **Industry Breakdown**: Technology, Healthcare, Finance, etc.
- **ETF Sector Exposure**: Weighted sector allocation from ETF holdings
- **Concentration Risk**: Identification of over-concentrated sectors

#### Tax Optimization for Swiss Investors
- **Domicile Analysis**: Fund domicile impact on Swiss taxation
- **Withholding Tax Calculation**: Automatic tax rate determination
- **Optimization Recommendations**: Flags for tax-efficient alternatives

### 4. User Interface Components

#### Modern UI Design
- **Responsive Layout**: Mobile-first design with breakpoints
- **Dark/Light Theme**: Theme switching with system preference detection
- **Accessibility**: ARIA labels and keyboard navigation support
- **Loading States**: Progress indicators and skeleton loaders

#### Interactive Visualizations
- **Pie Charts**: Asset, currency, country, and sector allocations
- **Data Tables**: Sortable and filterable position tables
- **Tooltips**: Contextual information on hover
- **Color Coding**: Consistent color schemes across charts

#### Input Handling
- **File Upload**: Drag-and-drop with preview
- **Text Input**: Large textarea with validation
- **Error Handling**: User-friendly error messages
- **Progress Tracking**: Real-time processing updates

### 5. Data Enrichment Pipeline

#### Multi-stage Processing
1. **CSV Parsing**: Raw data extraction and validation
2. **Symbol Resolution**: Cleaning and standardization with European ETF mapping
3. **API Enrichment**: Real-time price and metadata fetching
4. **Composition Analysis**: ETF breakdown and weighting
5. **Allocation Calculation**: Portfolio-level aggregations

#### Symbol Resolution Process
1. **European ETF Detection**: Identifies European ETF patterns (VWRL, IWDA, etc.)
2. **Exchange Variation Testing**: Tries multiple exchange suffixes (.L, .DE, .AS, .MI, .SW)
3. **API Validation**: Tests each variation against Yahoo Finance API
4. **Caching**: Stores successful symbol resolutions for future use
5. **Fallback**: Uses original symbol if no variations work

#### Error Handling and Resilience
- **Graceful Degradation**: Continues processing with partial data
- **Retry Logic**: Automatic retries for failed API calls
- **Fallback Data**: Mock data when external services fail
- **User Feedback**: Clear error messages and suggestions

### 6. Testing Infrastructure

#### Comprehensive Test Suite
- **Unit Tests**: Individual function and component testing
- **Integration Tests**: End-to-end workflow testing
- **API Tests**: External service integration testing
- **CSV Parsing Tests**: Various format validation

#### Test Utilities
- **Mock Data**: Realistic test datasets
- **API Mocking**: Simulated external service responses
- **Component Testing**: React component behavior validation

### 7. Development and Deployment

#### Development Tools
- **TypeScript**: Full type safety and IntelliSense
- **ESLint**: Code quality and consistency
- **Prettier**: Automatic code formatting
- **Hot Reload**: Instant development feedback

#### Docker Configuration
- **Multi-stage Builds**: Optimized production images
- **Development Mode**: Hot reload with volume mounting
- **Environment Variables**: Secure API key management
- **Port Configuration**: Flexible port mapping

#### Scripts and Utilities
- `analyze-csv-structure.ts`: CSV format analysis
- `test-real-csv.ts`: Real CSV data testing
- `test-api-service.ts`: API integration testing
- `test-integration.ts`: Full pipeline testing

## API Endpoints

### Yahoo Finance Proxy Routes
- `GET /api/yahoo/quote/[symbol]`: Stock/ETF price quotes
- `GET /api/yahoo/etf/[symbol]`: ETF composition data
- `GET /api/yahoo/search/[query]`: Symbol search functionality

### Data Flow
1. User uploads CSV or pastes data
2. CSV parser extracts positions
3. Symbol resolution converts European ETFs to Yahoo-compatible tickers
4. API enrichment fetches real-time data
5. Allocation calculations performed
6. Results displayed in interactive UI

## Configuration

### Environment Variables
```bash
YAHOO_FINANCE_API_KEY=your_api_key
NEXT_PUBLIC_YAHOO_FINANCE_API_BASE_URL=/api/yahoo
```

### Currency Support
- **Base Currency**: CHF (Swiss Francs)
- **Supported Currencies**: USD, EUR, GBP, JPY, and others
- **Exchange Rates**: Built-in currency conversion

## Swiss Banking Specifics

### Supported Bank Formats
- **Credit Suisse**: CSV export format
- **UBS**: Portfolio statement format
- **PostFinance**: Investment overview format
- **Generic**: Standard CSV with position data

### Tax Considerations
- **Withholding Tax**: Automatic calculation based on domicile
- **US Domiciled Funds**: 15% withholding tax
- **Irish/Luxembourg Funds**: 15% withholding tax
- **Other Domiciles**: 30% withholding tax (default)

### Language Support
- **Multi-language Headers**: French, German, English
- **Category Translation**: Automatic mapping between languages
- **Error Messages**: Localized user feedback

## Performance Optimizations

### Caching Strategy
- **API Responses**: 24-hour cache for ETF data
- **Quote Data**: 5-minute cache for price data
- **Search Results**: 1-hour cache for symbol lookups
- **Symbol Resolution**: Persistent cache for resolved symbols

### Processing Efficiency
- **Batch Processing**: Parallel API calls where possible
- **Rate Limiting**: Prevents API throttling
- **Memory Management**: Efficient data structures

## Security Features

### Data Privacy
- **Client-side Processing**: CSV data never leaves the browser
- **API Proxy**: Secure API key handling
- **No Data Storage**: No persistent storage of user data

### Input Validation
- **CSV Sanitization**: Prevents injection attacks
- **Type Checking**: Runtime type validation
- **Error Boundaries**: Graceful error handling

## Extensibility

### Plugin Architecture
- **Modular Design**: Easy addition of new data sources
- **Service Abstraction**: Pluggable API services
- **Component System**: Reusable UI components

### Customization Options
- **Theme System**: Easy color and layout customization
- **Chart Configuration**: Flexible visualization options
- **Locale Support**: Extensible language support

## Use Cases

### Individual Investors
- Portfolio analysis and rebalancing
- Tax optimization planning
- Performance tracking
- Risk assessment

### Financial Advisors
- Client portfolio review
- Asset allocation recommendations
- Tax-efficient structuring
- Reporting and documentation

### Institutional Users
- Portfolio analytics
- Compliance reporting
- Risk management
- Performance attribution

## Future Enhancements

### Planned Features
- **Historical Analysis**: Performance tracking over time
- **Benchmark Comparison**: Index and peer comparisons
- **Risk Metrics**: VaR, Sharpe ratio, volatility analysis
- **Rebalancing Suggestions**: Automated portfolio optimization
- **Export Functionality**: PDF reports and Excel exports

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Caching**: Redis integration for better performance
- **Database Integration**: Optional data persistence
- **API Rate Limiting**: More sophisticated throttling

This comprehensive documentation provides a complete overview of the Portfolio Analyzer's capabilities, architecture, and usage patterns. The application represents a sophisticated solution for portfolio analysis with particular strengths in Swiss market integration, European ETF handling, and tax optimization.