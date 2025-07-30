# Portfolio Allocation Analyzer

This project is an AI-powered portfolio allocation analyzer designed to help users understand and optimize their investment portfolios. It provides insights into asset allocation, currency exposure, geographic breakdown, sector analysis, and tax implications, especially for Swiss investors.

## Features

- **CSV/PDF Upload**: Upload portfolio statements in CSV or PDF format for analysis.
- **Real-time ETF Data Integration**: Fetches real-time data for ETFs and stocks to provide up-to-date analysis.
- **Smart Symbol Resolution**: Intelligently resolves ETF symbols, including European variations, with caching to prevent rate limiting.
- **ETF Composition Scraping**: Scrapes and processes detailed ETF compositions (currency, country, sector) from various sources.
- **Swiss Tax Optimization**: Analyzes and provides insights into tax efficiency for Swiss investors, particularly regarding US-domiciled ETFs.
- **Dynamic Data Processing**: Handles dynamic processing of sector, country, and currency data from scraped content.
- **Fallback Data**: Provides realistic fallback data for common ETFs when API data is unavailable.
- **Comprehensive Allocations**: Calculates and visualizes asset, currency, country, sector, and domicile allocations.
- **Performance Tracking**: Tracks unrealized gains/losses and daily changes for positions.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/your-username/portfolio-analyzer.git
   cd portfolio-analyzer
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

### Environment Variables

Create a `.env.local` file in the root directory and add your API keys for financial data services.
Example:
\`\`\`
YAHOO_FINANCE_API_KEY=your_yahoo_finance_api_key
\`\`\`

### Running the Development Server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Running Tests

To run the unit and integration tests:
\`\`\`bash
npm test
\`\`\`

To run specific scripts for testing CSV parsing or API services:
\`\`\`bash
npm run script scripts/test-real-csv.ts
npm run script scripts/analyze-csv-structure.ts
npm run script scripts/test-api-service.ts
\`\`\`

### Building for Production

\`\`\`bash
npm run build
\`\`\`

### Deployment

The application can be easily deployed to Vercel.

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable React components, including Shadcn UI components.
- `lib/`: Utility functions, API service integrations, and PDF/CSV parsing logic.
- `hooks/`: Custom React hooks.
- `public/`: Static assets.
- `scripts/`: Standalone scripts for testing and analysis.
- `__tests__/`: Jest test files.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
