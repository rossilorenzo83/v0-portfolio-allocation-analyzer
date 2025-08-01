# Swiss Portfolio Analyzer - Agent Context Documentation

## Overview

The Swiss Portfolio Analyzer is a comprehensive web-based portfolio analysis tool specifically designed for Swiss bank statements. It provides advanced ETF look-through analysis, tax optimization insights, and detailed currency exposure breakdown. The application is built with Next.js 14, React 18, and TypeScript, featuring a modern UI with Tailwind CSS and shadcn/ui components.

## Core Architecture

### Technology Stack
- **Frontend Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict type checking
- **UI Framework**: React 18 with hooks-based architecture
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Charts & Visualization**: Recharts for interactive data visualization
- **Icons**: Lucide React icon library
- **File Processing**: PDF.js for PDF parsing, PapaParse for CSV handling
- **API Integration**: Multiple financial data providers (Yahoo Finance, Finnhub, Alpha Vantage)
- **Testing**: Jest with Testing Library for comprehensive test coverage
- **Deployment**: Docker containerization with development and production configurations

### Project Structure
```
├── app/                           # Next.js App Router directory
│   ├── api/                      # API routes for external data integration
│   │   └── yahoo/               # Yahoo Finance API endpoints
│   ├── globals.css              # Global styles and Tailwind imports
│   ├── layout.tsx               # Root layout component
│   └── page.tsx                 # Main application entry point
├── components/                   # Reusable React components
│   ├── ui/                      # shadcn/ui component library
│   ├── file-upload-helper.tsx   # File upload and text input interface
│   ├── loading-progress.tsx     # Loading states and progress indicators
│   └── theme-provider.tsx       # Theme context provider
├── lib/                         # Utility functions and services
│   ├── api-service.ts           # External API integration service
│   ├── config.ts                # Application configuration
│   ├── pdf-utils.ts             # PDF parsing utilities
│   └── utils.ts                 # Common utility functions
├── __tests__/                   # Test files
├── swiss-portfolio-analyzer.tsx  # Main analyzer component
├── portfolio-parser.ts          # Core portfolio parsing logic
├── etf-data-service.ts          # ETF composition data service
└── docker-compose.yml           # Docker deployment configuration
```

## Core Features & Functionalities

### 1. Portfolio Data Parsing

#### Supported Input Formats
- **PDF Files**: Swiss bank portfolio statements with PDF.js extraction
- **Text Files**: Plain text exports from banking platforms
- **CSV Files**: Structured data exports with automatic delimiter detection
- **Manual Text Input**: Copy-paste functionality with validation

#### Parsing Capabilities
- **Multi-Bank Support**: Patterns for Swissquote, UBS, Credit Suisse, and generic formats
- **Category Detection**: Automatic categorization of assets (Actions, ETF, Fonds, Obligations, Crypto-monnaies, Produits structurés)
- **Currency Recognition**: Multi-currency support (CHF, USD, EUR, etc.)
- **Position Extraction**: Symbol, name, quantity, price, and currency parsing
- **Account Overview**: Total portfolio value, cash balance, securities value extraction

#### Data Validation & Error Handling
- **Format Validation**: Comprehensive input validation with user-friendly error messages
- **Fallback Parsing**: Multiple parsing strategies for different bank formats
- **Data Enrichment**: Real-time API integration for current prices and metadata

### 2. Advanced ETF Analysis

#### Look-Through Analysis
- **Underlying Holdings**: Deep analysis of ETF constituent holdings
- **True Currency Exposure**: Breakdown of actual currency exposure beyond trading currency
- **Geographic Allocation**: Real geographic exposure from ETF underlying assets
- **Sector Breakdown**: True sector allocation from ETF holdings

#### Tax Optimization Features
- **Domicile Analysis**: Ireland vs. US vs. Swiss domiciled ETF identification
- **Withholding Tax Calculation**: 
  - Ireland domiciled: 15% withholding tax (tax-optimized)
  - US domiciled: 30% withholding tax (higher tax burden)
  - Swiss domiciled: 0% withholding tax for Swiss residents
- **Tax Optimization Recommendations**: Automated suggestions for tax-efficient alternatives

#### ETF Data Service
- **Multiple Data Sources**: Integration with ETF databases, Morningstar, Yahoo Finance
- **Comprehensive Database**: Pre-loaded data for popular ETFs with fallback compositions
- **Caching System**: 24-hour cache for ETF composition data
- **Real-time Updates**: Live data fetching with fallback mechanisms

### 3. Portfolio Analysis & Visualization

#### Asset Allocation Analysis
- **Category Breakdown**: Visual distribution across asset classes
- **Interactive Charts**: Pie charts and bar charts with hover details
- **Percentage Calculations**: Precise allocation percentages
- **Value Representation**: Both absolute values and percentage allocations

#### Currency Exposure Analysis
- **Trading vs. Underlying Currency**: Distinction between ETF trading currency and actual exposure
- **Multi-layered Analysis**: True currency exposure through ETF look-through
- **Currency Conversion**: Real-time CHF conversion for unified reporting
- **Risk Assessment**: Currency concentration risk identification

#### Geographic Distribution
- **Country Allocation**: Regional breakdown including ETF underlying holdings
- **Look-through Geography**: True geographic exposure from ETF constituents
- **Risk Diversification**: Geographic concentration analysis
- **Emerging vs. Developed Markets**: Market classification and exposure

#### Sector Analysis
- **Sector Breakdown**: Comprehensive sector allocation
- **ETF Sector Look-through**: True sector exposure from ETF holdings
- **Sector Concentration**: Risk analysis by sector allocation
- **Performance by Sector**: Gain/loss analysis per sector

### 4. Performance Tracking

#### Position-Level Performance
- **Gain/Loss Calculation**: Real-time profit/loss per position
- **Daily Change Tracking**: Current day performance metrics
- **Performance Ranking**: Top performers and underperformers identification
- **Percentage Returns**: Position-level return calculations

#### Portfolio-Level Metrics
- **Total Portfolio Value**: Aggregated portfolio valuation
- **Cash vs. Securities**: Allocation between cash and invested assets
- **Currency Impact**: Performance impact from currency fluctuations
- **Risk Metrics**: Concentration and diversification analysis

### 5. Swiss Banking Integration

#### Bank Format Support
- **Swissquote**: Native support for Swissquote portfolio exports
- **UBS**: UBS portfolio statement parsing
- **Credit Suisse**: Credit Suisse format compatibility
- **Generic Swiss Banks**: Flexible parsing for various Swiss bank formats

#### Swiss-Specific Features
- **CHF Base Currency**: All calculations normalized to Swiss Francs
- **Swiss Tax Considerations**: Withholding tax optimization for Swiss residents
- **Local Market Focus**: Swiss stock market integration
- **Regulatory Compliance**: Swiss financial regulation considerations

### 6. User Interface & Experience

#### Modern Web Interface
- **Responsive Design**: Mobile-first responsive layout
- **Dark/Light Theme**: Theme switching capability
- **Interactive Components**: Hover states, tooltips, and animations
- **Accessibility**: WCAG compliant interface design

#### Data Visualization
- **Multiple Chart Types**: Pie charts, bar charts, and data tables
- **Interactive Elements**: Clickable legends, zoom capabilities
- **Color-Coded Categories**: Consistent color scheme across visualizations
- **Export Capabilities**: Chart and data export functionality

#### User Workflow
- **File Upload Interface**: Drag-and-drop file upload with preview
- **Progress Indicators**: Loading states and progress tracking
- **Error Handling**: User-friendly error messages and recovery suggestions
- **Sample Data**: Example formats and test data for user guidance

### 7. API Integration & Data Sources

#### Financial Data Providers
- **Yahoo Finance**: Primary data source for stock prices and ETF information
- **Finnhub**: Alternative data source for real-time market data
- **Alpha Vantage**: Backup data provider for comprehensive coverage
- **ETF Database**: Specialized ETF composition data

#### Rate Limiting & Caching
- **API Rate Limiting**: Intelligent request throttling to respect API limits
- **Multi-level Caching**: 5-minute cache for prices, 24-hour cache for metadata
- **Fallback Mechanisms**: Graceful degradation when APIs are unavailable
- **Data Freshness**: Automatic cache invalidation and refresh

#### Data Quality & Validation
- **Symbol Resolution**: Automatic symbol mapping across different exchanges
- **Data Validation**: Comprehensive validation of API responses
- **Error Recovery**: Robust error handling with fallback data sources
- **Logging & Monitoring**: Detailed logging for debugging and monitoring

### 8. Testing & Quality Assurance

#### Test Coverage
- **Unit Tests**: Comprehensive unit test coverage for core functions
- **Integration Tests**: API integration testing with mocked responses
- **Parser Tests**: Extensive testing of portfolio parsing logic
- **Component Tests**: React component testing with Testing Library

#### Quality Assurance
- **TypeScript**: Strict type checking for compile-time error prevention
- **ESLint**: Code quality and consistency enforcement
- **Jest Configuration**: Comprehensive test environment setup
- **Continuous Integration**: Automated testing pipeline

### 9. Deployment & DevOps

#### Docker Configuration
- **Multi-stage Builds**: Optimized Docker images for production
- **Development Environment**: Hot-reload development container
- **Production Deployment**: Optimized production container
- **Docker Compose**: Orchestrated multi-service deployment

#### Environment Configuration
- **Development Mode**: Hot-reload with debugging capabilities
- **Production Mode**: Optimized build with performance monitoring
- **Environment Variables**: Secure configuration management
- **API Key Management**: Secure handling of external API credentials

### 10. Security & Privacy

#### Data Handling
- **Client-side Processing**: Portfolio data processed entirely in browser
- **No Data Storage**: No persistent storage of sensitive financial data
- **Secure API Calls**: Encrypted communication with external APIs
- **Privacy First**: No tracking or data collection from user portfolios

#### Security Measures
- **Input Validation**: Comprehensive input sanitization and validation
- **XSS Protection**: Cross-site scripting prevention measures
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Headers**: Security headers for enhanced protection

## Usage Patterns & Workflows

### Typical User Journey
1. **File Upload**: User uploads portfolio statement (PDF/TXT/CSV)
2. **Parsing**: System parses and validates portfolio data
3. **API Enrichment**: Real-time data fetching for current prices and metadata
4. **Analysis**: Comprehensive portfolio analysis with visualizations
5. **Insights**: Tax optimization recommendations and performance insights
6. **Export**: Optional data export for further analysis

### Advanced Use Cases
- **Multi-Bank Portfolio**: Combining statements from multiple Swiss banks
- **ETF Optimization**: Identifying tax-inefficient ETFs and alternatives
- **Currency Risk Analysis**: Understanding true currency exposure
- **Rebalancing Insights**: Portfolio allocation optimization recommendations
- **Performance Tracking**: Historical performance analysis and benchmarking

## Future Roadmap & Extensions

### Planned Features
- **Real-time ETF Data Integration**: Live ETF composition updates
- **PDF Parsing Enhancement**: Advanced PDF.js integration
- **Portfolio Rebalancing**: Automated rebalancing suggestions
- **Risk Metrics**: VaR, Sharpe ratio, and other risk calculations
- **Historical Performance**: Time-series performance tracking
- **Export Functionality**: PDF/Excel report generation
- **Multi-language Support**: German, French, Italian localization
- **Mobile App**: Native mobile application development

### Technical Improvements
- **Performance Optimization**: Bundle size reduction and loading optimization
- **API Enhancement**: Additional data source integration
- **Testing Expansion**: End-to-end testing with Playwright
- **Monitoring**: Application performance monitoring and analytics
- **Scalability**: Infrastructure scaling for increased usage

## Agent Integration Guidelines

When working with this codebase as an agent, consider the following:

### Key Components to Understand
1. **portfolio-parser.ts**: Core parsing logic for different bank formats
2. **swiss-portfolio-analyzer.tsx**: Main UI component with all visualizations
3. **api-service.ts**: External API integration and data fetching
4. **etf-data-service.ts**: ETF-specific data processing and analysis

### Common Modification Patterns
- **Adding New Bank Format**: Extend parsing patterns in `parsePositionLine()`
- **New Visualization**: Add charts in the main analyzer component
- **API Integration**: Extend the API service with new data sources
- **ETF Data**: Update ETF database with new compositions

### Testing Considerations
- **Mock API Responses**: Use comprehensive mocks for external APIs
- **Sample Data**: Leverage existing test data for consistent testing
- **Error Scenarios**: Test edge cases and error conditions
- **Performance**: Monitor parsing performance with large portfolios

### Deployment Notes
- **Environment Variables**: Configure API keys and external service endpoints
- **Docker**: Use provided Docker configuration for consistent deployment
- **Caching**: Monitor cache performance and adjust TTL as needed
- **Rate Limits**: Respect API rate limits and implement proper throttling

This documentation provides comprehensive context for understanding and working with the Swiss Portfolio Analyzer codebase, enabling effective development, maintenance, and enhancement of the application's capabilities.