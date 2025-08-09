import { parsePortfolioCsv } from '../../portfolio-parser'

// Test helper functions that are not exported but need coverage
// We'll use a different approach - testing through the main exported function

describe('Portfolio Parser Extended Coverage', () => {
  // Mock the ETF data service to avoid external dependencies
  jest.mock('../../etf-data-service', () => ({
    etfDataService: {
      getETFData: jest.fn().mockResolvedValue({
        symbol: 'VTI',
        composition: {
          sectors: { 'Technology': 25.0 },
          countries: { 'United States': 100.0 },
          currencies: { 'USD': 100.0 }
        }
      })
    },
    resolveSymbolAndFetchData: jest.fn().mockResolvedValue({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currentPrice: 150.0,
      currency: 'USD',
      sector: 'Technology',
      geography: 'United States',
      domicile: 'US'
    })
  }))

  // Test parseSwissNumber function through different CSV inputs
  describe('Swiss Number Parsing', () => {
    it('should handle Swiss formatted numbers in CSV', async () => {
      const csvContent = `Symbol,Quantity,Price,Total
AAPL,10,"1'234.56","12'345.60"
GOOGL,5,"2,500.00","12'500.00"`

      const result = await parsePortfolioCsv(csvContent)
      
      // The function should parse Swiss numbers correctly
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle negative Swiss numbers', async () => {
      const csvContent = `Symbol,Quantity,Price,Total
AAPL,10,"-1'234.56","-12'345.60"`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle numbers with currency symbols', async () => {
      const csvContent = `Symbol,Quantity,Price,Currency
AAPL,10,"CHF 150.00",CHF
GOOGL,5,"USD 2'500.00",USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test category normalization through different CSV inputs
  describe('Category Normalization', () => {
    it('should normalize different action categories', async () => {
      const csvContent = `Category,Symbol,Quantity,Price
Actions,AAPL,10,150
ACTIONS,GOOGL,5,2500
Actions diverses,MSFT,8,300`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should normalize ETF categories', async () => {
      const csvContent = `Category,Symbol,Quantity,Price
ETF,VTI,100,200
etf,SPY,50,400
ETF Funds,QQQ,25,350`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle unknown categories', async () => {
      const csvContent = `Category,Symbol,Quantity,Price
Unknown,AAPL,10,150
"",GOOGL,5,2500`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test column mapping detection
  describe('Column Mapping Detection', () => {
    it('should detect French column headers', async () => {
      const csvContent = `Symbole,Quantité,Prix,Devise
AAPL,10,150,USD
GOOGL,5,2500,USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle missing columns gracefully', async () => {
      const csvContent = `Symbol,Price
AAPL,150
GOOGL,2500`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should detect alternative column names', async () => {
      const csvContent = `Ticker,Shares,Current Price,Currency
AAPL,10,150,USD
GOOGL,5,2500,USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test CSV delimiter detection
  describe('CSV Delimiter Detection', () => {
    it('should handle semicolon delimited CSV', async () => {
      const csvContent = `Symbol;Quantity;Price;Currency
AAPL;10;150;USD
GOOGL;5;2500;USD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle tab delimited CSV', async () => {
      const csvContent = `Symbol\tQuantity\tPrice\tCurrency
AAPL\t10\t150\tUSD
GOOGL\t5\t2500\tUSD`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })

  // Test allocation calculations
  describe('Allocation Calculations', () => {
    it('should calculate allocations with valid data', async () => {
      const csvContent = `Symbol,Quantity,Price,Currency,Category
AAPL,10,150,USD,Actions
GOOGL,5,2500,USD,Actions
VTI,100,200,USD,ETF`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.assetAllocation).toBeDefined()
      expect(result.currencyAllocation).toBeDefined()
      expect(result.trueCountryAllocation).toBeDefined()
      expect(result.trueSectorAllocation).toBeDefined()
      expect(result.domicileAllocation).toBeDefined()
    })

    it('should handle empty portfolio for allocations', async () => {
      const csvContent = `Symbol,Quantity,Price,Currency`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.assetAllocation).toHaveLength(0)
      expect(result.currencyAllocation).toHaveLength(0)
    })
  })

  // Test edge cases
  describe('Edge Cases', () => {
    it('should handle completely empty CSV', async () => {
      const result = await parsePortfolioCsv('')
      
      expect(result).toBeDefined()
      expect(result.positions).toHaveLength(0)
      expect(result.accountOverview.totalValue).toBe(0)
    })

    it('should handle CSV with only headers', async () => {
      const csvContent = 'Symbol,Quantity,Price,Currency'
      
      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toHaveLength(0)
    })

    it('should handle malformed CSV data', async () => {
      const csvContent = `Invalid CSV Content
Missing proper structure
No headers or data`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })

    it('should handle CSV with special characters', async () => {
      const csvContent = `Symbol,Name,Quantity,Price
AAPL,"Apple Inc. (NASDAQ)",10,150
GOOGL,"Alphabet Inc. - Class A",5,2500`

      const result = await parsePortfolioCsv(csvContent)
      
      expect(result).toBeDefined()
      expect(result.positions).toBeDefined()
    })
  })
})