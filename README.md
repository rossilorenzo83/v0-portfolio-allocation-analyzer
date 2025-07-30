# Portfolio Allocation Analyzer

This project is a portfolio allocation analyzer built with Next.js, React, and Tailwind CSS. It allows users to upload a CSV file containing their investment positions, analyze their portfolio's allocation, and get insights into diversification, risk, and tax implications.

## Features

- **CSV Upload**: Upload your portfolio data via CSV.
- **Portfolio Analysis**: View your portfolio's breakdown by sector, country, and currency.
- **Tax Optimization (Swiss Focus)**: Get insights into tax efficiency for Swiss investors, particularly regarding US-domiciled ETFs.
- **Real-time ETF Data**: Integration with a mock Yahoo Finance API for real-time ETF data (prices, compositions).
- **Responsive UI**: A clean and responsive user interface built with Shadcn UI components.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/vercel/v0-portfolio-analyzer.git
   cd v0-portfolio-analyzer
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your API keys. For this project, a mock API is used, so no actual keys are strictly required for basic functionality, but you can configure them if you extend the API integration.

   \`\`\`
   # Example .env.local (if you were to integrate with a real API)
   # YAHOO_FINANCE_API_KEY=your_api_key_here
   \`\`\`

### Running the Development Server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Running Tests

\`\`\`bash
npm test
# or
yarn test
\`\`\`

### Building for Production

\`\`\`bash
npm run build
# or
yarn build
\`\`\`

### Running in Production Mode

\`\`\`bash
npm start
# or
yarn start
\`\`\`

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable React components, including Shadcn UI components.
- `lib/`: Utility functions and helper modules.
- `hooks/`: Custom React hooks.
- `public/`: Static assets.
- `__tests__/`: Jest test files.
- `scripts/`: Utility scripts for testing and analysis.
- `portfolio-parser.ts`: Core logic for parsing CSV portfolio data.
- `etf-data-service.ts`: Service for fetching and caching ETF data.
- `swiss-portfolio-analyzer.tsx`: Main component for the portfolio analysis UI.

## API Endpoints (Mocked)

The application uses mocked API endpoints for Yahoo Finance data. These are located in `app/api/yahoo/`.

- `/api/yahoo/search/[symbol]`: Search for symbols.
- `/api/yahoo/quote/[symbol]`: Get quote data for a symbol.
- `/api/yahoo/etf/[symbol]`: Get ETF composition data.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
