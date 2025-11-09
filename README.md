# Portfolio Allocation Analyzer

This project is a web application designed to help users analyze their investment portfolios, particularly focusing on Swiss bank CSV data. It provides detailed breakdowns of asset, currency, country, sector, and domicile allocations, leveraging real-time market data and ETF composition information.

## Features

- **CSV Import**: Upload or paste CSV data from your bank statements.
- **Detailed Portfolio Analysis**: Get a comprehensive overview of your holdings.
- **Real-time Data Integration**: Fetches current prices and ETF compositions using a mocked Yahoo Finance API.
- **Allocation Breakdowns**: Visualizes asset, currency, country, sector, and domicile allocations with interactive charts and tables.
- **Swiss Tax Optimization**: Considers tax implications for Swiss investors based on asset domicile.
- **Smart Symbol Resolution**: Attempts to resolve common European ETF and Swiss stock symbols.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or Yarn
- Git

### Installation

1.  **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/your-username/portfolio-allocation-analyzer.git
    cd portfolio-allocation-analyzer
    \`\`\`
2.  **Install dependencies:**
    \`\`\`bash
    npm install
    # or
    yarn install
    \`\`\`
3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root directory:
    \`\`\`
    NEXT_PUBLIC_YAHOO_FINANCE_API_BASE_URL=/api/yahoo
    \`\`\`
    *Note: The app uses web scraping from Yahoo Finance, so no API key is required.*

### Running the Application

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

-   `app/`: Next.js App Router pages and API routes.
    -   `api/yahoo/`: API routes for proxying Yahoo Finance API calls (quote, ETF, search).
-   `components/`: Reusable React components, including Shadcn UI components.
-   `hooks/`: Custom React hooks.
-   `lib/`: Utility functions and API service logic.
-   `portfolio-parser.ts`: Core logic for parsing CSV data and enriching portfolio positions.
-   `etf-data-service.ts`: Service for fetching and processing ETF and stock data from the API.
-   `public/`: Static assets.
-   `scripts/`: Utility scripts for testing and analysis.
-   `styles/`: Global CSS and Tailwind CSS configuration.
-   `__tests__/`: Jest test files.

## Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Runs ESLint to check for code quality issues.
-   `npm test`: Runs Jest tests.
-   `npm run test:watch`: Runs Jest tests in watch mode.
-   `npm run test:ci`: Runs Jest tests in CI mode.
-   `ts-node scripts/analyze-csv-structure.ts <path_to_csv_file>`: Analyzes the structure of a given CSV file.
-   `ts-node scripts/test-real-csv.ts <CSV_URL>`: Fetches and parses a CSV from a URL, printing detailed output.
-   `ts-node scripts/test-api-service.ts`: Tests the `api-service.ts` functions directly.
-   `ts-node scripts/test-file-upload.ts`: Tests the CSV parsing logic with a local sample file.
-   `ts-node scripts/test-integration.ts`: Tests the full integration of CSV parsing and data enrichment.
-   `ts-node scripts/analyze-real-csv.ts <path_to_csv_file>`: Provides a detailed analysis of a real CSV file, including enriched data.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
