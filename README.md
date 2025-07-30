# Swiss Portfolio Analyzer

This project is a web application designed to help Swiss investors analyze their investment portfolios. It allows users to upload PDF or CSV statements from various Swiss banks (e.g., Swissquote, UBS, Credit Suisse) or paste text content, and then provides a detailed breakdown of their holdings, including asset allocation, currency exposure, country exposure, sector exposure, and domicile allocation.

## Features

- **PDF/CSV Upload & Text Paste**: Easily import your portfolio data.
- **Automated Parsing**: Intelligently extracts and structures data from various bank statement formats.
- **Real-time Data Integration (Mocked)**: Fetches (mocked) real-time prices and asset metadata for accurate valuations.
- **ETF Look-through Analysis**: Provides true underlying exposure for ETFs by analyzing their compositions (mocked data).
- **Swiss Tax Optimization Insights**: Identifies tax-optimized investments based on domicile and withholding tax (mocked logic).
- **Detailed Allocations**: Visualizes asset, currency, country, sector, and domicile breakdowns.
- **Responsive UI**: Built with Next.js and Shadcn UI for a modern and accessible user experience.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   \`\`\`bash
   git clone https://github.com/your-username/swiss-portfolio-analyzer.git
   cd swiss-portfolio-analyzer
   \`\`\`

2. **Install dependencies**:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Run the development server**:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

   Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Running Tests

- **Unit Tests**:
  \`\`\`bash
  npm test
  \`\`\`
- **Integration Tests**:
  \`\`\`bash
  ts-node scripts/test-integration.ts
  \`\`\`
  (Ensure you have `ts-node` installed: `npm install -g ts-node`)

### Analyzing CSV Structure

If you have a new CSV format and want to understand its structure for parsing, you can use the `analyze-csv-structure.ts` script:

\`\`\`bash
ts-node scripts/analyze-csv-structure.ts <path_to_your_csv_file>
\`\`\`
This script will output detected headers, sample data, and inferred column types, which can help in refining the `portfolio-parser.ts` logic.

### Testing with Real CSV URL

You can test the parser with a real CSV file available online using `test-real-csv.ts`:

\`\`\`bash
ts-node scripts/test-real-csv.ts <URL_to_your_csv_file>
\`\`\`
This will fetch the CSV from the provided URL and print the parsing output.

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable React components, including Shadcn UI components.
- `lib/`: Utility functions and API service integrations.
- `portfolio-parser.ts`: Core logic for parsing PDF/CSV data and enriching it.
- `public/`: Static assets.
- `scripts/`: Utility scripts for testing and analysis.
- `__tests__/`: Jest test files.

## Technologies Used

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) (for charts)
- [PapaParse](https://www.papaparse.com/) (for CSV parsing)
- [PDF.js](https://mozilla.github.io/pdf.js/) (for PDF text extraction)
- [Jest](https://jestjs.io/) (for testing)

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.
