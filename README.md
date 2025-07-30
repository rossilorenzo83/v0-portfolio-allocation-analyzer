# Portfolio Allocation Analyzer

This project is a web application designed to help users analyze their investment portfolio allocation. It allows users to upload their portfolio data (e.g., via CSV or PDF statements) and visualizes the allocation by various metrics such as currency, geography, and sector. It also includes features for Swiss tax optimization analysis for ETFs.

## Features

- **CSV Upload**: Upload portfolio data from a CSV file.
- **PDF Statement Parsing**: (Planned/Partial) Parse Swiss bank PDF statements for automated data extraction.
- **Portfolio Summary**: Display total portfolio value, number of holdings, asset types, and currencies.
- **Allocation Analysis**:
  - **Asset Type Distribution**: Pie chart showing allocation across stocks, ETFs, bonds, crypto, etc.
  - **Currency Distribution**: Pie and bar charts showing exposure to different currencies.
  - **Geographic Allocation**: Pie and bar charts showing country/region exposure, with ETF look-through.
  - **Sector Allocation**: Pie and bar charts showing industry sector exposure, with ETF look-through.
- **Detailed Holdings Table**: A sortable table of all individual positions with key metrics.
- **Swiss Tax Optimization**: Specific analysis and recommendations for Swiss investors regarding ETF domicile and withholding taxes.
- **Responsive Design**: Optimized for various screen sizes.

## Technologies Used

- **Next.js 14**: React framework for building the web application.
- **React**: Frontend library for UI.
- **TypeScript**: Type-safe JavaScript.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: Reusable UI components built with Radix UI and Tailwind CSS.
- **Recharts**: Composable charting library for React.
- **PDF.js**: For parsing PDF documents (client-side).
- **Yahoo Finance API (via proxy)**: For fetching real-time ETF data and holdings (mocked for now, but API routes are set up).
- **Jest & React Testing Library**: For unit and integration testing.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1.  **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/your-username/portfolio-analyzer.git
    cd portfolio-analyzer
    \`\`\`

2.  **Install dependencies:**
    \`\`\`bash
    npm install
    # or
    yarn install
    \`\`\`

3.  **Environment Variables:**
    Create a `.env.local` file in the root directory and add your Yahoo Finance API key:
    \`\`\`
    YAHOO_FINANCE_API_KEY=YOUR_YAHOO_FINANCE_API_KEY
    NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/yahoo
    \`\`\`
    Replace `YOUR_YAHOO_FINANCE_API_KEY` with your actual API key from Yahoo Finance API (e.g., from RapidAPI).

### Running the Development Server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

\`\`\`bash
npm run build
# or
yarn build
\`\`\`

This builds the application for production to the `.next` folder.

### Running Tests

\`\`\`bash
npm test
# or
yarn test
\`\`\`

To run tests in watch mode:
\`\`\`bash
npm run test:watch
# or
yarn test:watch
\`\`\`

### Running Scripts

You can run various utility scripts located in the `scripts/` directory using `npx ts-node`.

- **Analyze CSV Structure**:
  \`\`\`bash
  npx ts-node scripts/analyze-csv-structure.ts
  \`\`\`
  This script helps understand the column structure of a CSV file.

- **Analyze Real CSV (with parsing logic)**:
  \`\`\`bash
  npx ts-node scripts/analyze-real-csv.ts
  \`\`\`
  This script runs the CSV parsing logic on a sample file and logs the detailed output.

- **Test API Service**:
  \`\`\`bash
  npx ts-node scripts/test-api-service.ts
  \`\`\`
  This script tests the integration with the Yahoo Finance API proxy.

- **Test File Upload (simulated)**:
  \`\`\`bash
  npx ts-node scripts/test-file-upload.ts
  \`\`\`
  This script simulates a file upload to the `PortfolioAnalyzer` component.

- **Test Integration (CSV & PDF parsing)**:
  \`\`\`bash
  npx ts-node scripts/test-integration.ts
  \`\`\`
  This script runs a broader integration test including both CSV and PDF parsing.

## Project Structure

\`\`\`
.
├── app/                      # Next.js App Router routes and API routes
│   ├── api/                  # API routes (e.g., Yahoo Finance proxy)
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page (renders SwissPortfolioAnalyzer)
├── components/               # React components
│   ├── ui/                   # shadcn/ui components (generated)
│   ├── file-upload-helper.tsx
│   └── loading-progress.tsx
├── hooks/                    # Custom React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/                      # Utility functions and configurations
│   ├── api-service.ts        # Yahoo Finance API client
│   ├── config.ts             # Environment configurations
│   ├── pdf-config.ts         # PDF.js worker configuration
│   ├── pdf-utils.ts          # PDF loading and text extraction utilities
│   └── utils.ts              # General utilities (e.g., cn for tailwind)
├── public/                   # Static assets
├── scripts/                  # Node.js/TypeScript scripts for testing/analysis
├── __tests__/                # Jest tests
│   ├── test-data/            # Sample data for tests (CSV, PDF)
│   ├── api-service.test.ts
│   ├── portfolio-parser.test.ts
│   └── portfolio-views.test.ts
├── portfolio-analyzer.tsx    # Main CSV portfolio analysis component
├── portfolio-parser.ts       # Logic for parsing Swiss PDF statements
├── swiss-portfolio-analyzer.tsx # Main Swiss portfolio analysis component
├── etf-data-service.ts       # (Placeholder) For real-time ETF data fetching
├── jest.config.js            # Jest configuration
├── jest.setup.js             # Jest setup file
├── next.config.mjs           # Next.js configuration
├── package.json              # Project dependencies and scripts
├── postcss.config.mjs        # PostCSS configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
\`\`\`

## Contributing

Feel free to fork the repository and submit pull requests.

## License

This project is licensed under the MIT License.
