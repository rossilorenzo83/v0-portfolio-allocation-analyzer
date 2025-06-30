# Swiss Portfolio Analyzer

A comprehensive portfolio analysis tool designed for Swiss bank statements with advanced ETF look-through analysis, tax optimization insights, and currency exposure breakdown.

## Features

### 📊 Portfolio Analysis
- **Asset Allocation**: Breakdown by stocks, ETFs, bonds, crypto, and other instruments
- **Currency Exposure**: True currency exposure analysis with ETF look-through
- **Geographic Distribution**: Regional allocation including ETF underlying holdings
- **Sector Analysis**: Sector breakdown with ETF underlying sector allocation

### 🏦 Swiss Banking Focus
- **Tax Optimization**: ETF domicile analysis for Swiss tax efficiency
- **Withholding Tax**: Identification of tax-optimized vs. high-tax ETFs
- **Currency Analysis**: CHF, USD, EUR exposure with ETF underlying breakdown
- **Swiss Bank Format**: Designed for Swiss portfolio statements

### 📈 Advanced ETF Analysis
- **Look-Through Analysis**: Analyzes underlying holdings of ETFs
- **Currency Mapping**: Maps ETF underlying currency exposure
- **Tax Domicile**: Ireland vs. US domiciled ETF identification
- **Performance Tracking**: Gain/loss analysis per position

## Getting Started

### Prerequisites
- Node.js 18+ 
- Docker (optional, for containerized deployment)

### Local Development

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/swiss-portfolio-analyzer.git
   cd swiss-portfolio-analyzer
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Deployment

1. **Build and run with Docker Compose**
   \`\`\`bash
   docker-compose up --build
   \`\`\`

2. **Access the application**
   - Production: [http://localhost:3000](http://localhost:3000)
   - Development: [http://localhost:3001](http://localhost:3001)

### Docker Commands
\`\`\`bash
# Build the image
docker build -t swiss-portfolio-analyzer .

# Run the container
docker run -p 3000:3000 swiss-portfolio-analyzer

# Run in development mode with volume mounting
docker run -p 3000:3000 -v $(pwd):/app swiss-portfolio-analyzer npm run dev
\`\`\`

## Usage

### File Upload
1. Export your portfolio statement from your Swiss bank
2. Save as PDF or copy text content to a .txt file
3. Upload the file using the upload interface
4. The analyzer will parse and display comprehensive analysis

### Expected File Format
The analyzer expects Swiss bank portfolio statements with the following information:
- Portfolio positions with symbols, names, quantities, prices
- Currency information
- Asset categories (Actions, ETF, Fonds, etc.)
- Account overview with total values

### Sample Data Structure
\`\`\`
Valeur totale 889'528.75
Solde espèces 5'129.55
Valeur des titres 877'853.96

Positions:
AAPL - Apple Inc. - 100 shares - USD 150.00
VWRL - Vanguard FTSE All-World - 500 shares - CHF 89.96
\`\`\`

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Deployment**: Docker, Docker Compose

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
├── components/            # Reusable UI components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
├── swiss-portfolio-analyzer.tsx    # Main analyzer component
├── swiss-portfolio-parser.ts       # Portfolio parsing logic
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
└── README.md            # This file
\`\`\`

## Features in Detail

### Currency Analysis
- **Trading Currency**: The currency in which ETFs are traded
- **Underlying Currency**: The actual currency exposure from ETF holdings
- **Look-Through Analysis**: Breaks down ETF holdings to show true exposure

### Tax Optimization
- **Ireland Domiciled**: 15% withholding tax (tax-optimized)
- **US Domiciled**: 30% withholding tax (higher tax burden)
- **Swiss Domiciled**: No withholding tax for Swiss residents

### ETF Database
The analyzer includes a comprehensive ETF database with:
- Underlying currency exposure percentages
- Geographic allocation
- Sector breakdown
- Tax domicile information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Real-time ETF data integration
- [ ] PDF parsing with PDF.js
- [ ] Portfolio rebalancing suggestions
- [ ] Risk metrics calculation
- [ ] Historical performance tracking
- [ ] Export functionality (PDF/Excel reports)
- [ ] Multi-language support (German, French, Italian)
- [ ] Mobile responsive improvements

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for informational purposes only and should not be considered as financial advice. Always consult with a qualified financial advisor before making investment decisions.

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the maintainers.

---

**Made with ❤️ for Swiss investors**
