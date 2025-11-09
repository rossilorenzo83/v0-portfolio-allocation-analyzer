// Optional: configure or set up a testing framework before each test.
// If you add more files here, make sure to add them to jest.config.js

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom"

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch for all tests
global.fetch = jest.fn((url) => {
  console.log(`Mocking fetch for: ${url}`)
  if (url.includes("/api/yahoo/quote/")) {
    const symbol = url.split("/").pop()
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          quoteResponse: {
            result: [
              {
                symbol: symbol.toUpperCase(),
                regularMarketPrice: 100 + Math.random() * 50, // Random price
                currency: "USD",
                regularMarketChangePercent: (Math.random() - 0.5) * 5, // Random change
              },
            ],
          },
        }),
    })
  } else if (url.includes("/api/yahoo/etf/")) {
    const symbol = url.split("/").pop()
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          symbol: symbol.toUpperCase(),
          domicile: "IE",
          withholdingTax: 15,
          country: [
            { country: "United States", weight: 60 },
            { country: "Ireland", weight: 10 },
          ],
          sector: [
            { sector: "Technology", weight: 25 },
            { sector: "Financial Services", weight: 15 },
          ],
          currency: [
            { currency: "USD", weight: 70 },
            { currency: "EUR", weight: 30 },
          ],
        }),
    })
  } else if (url.includes("/api/yahoo/search/")) {
    const query = url.split("/").pop()
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          quotes: [
            {
              symbol: query.toUpperCase(),
              longname: `${query} Company`,
              exchange: "NASDAQ",
              currency: "USD",
              sector: "Technology",
              country: "United States",
              quoteType: "EQUITY",
            },
          ],
        }),
    })
  } else if (url.includes("query1.finance.yahoo.com/v10/finance/quoteSummary/")) {
    // Mock direct Yahoo Finance asset metadata requests
    const symbol = url.split("/").pop()?.split("?")[0]
    const sectorMappings = {
      'ABNB': 'Consumer Cyclical',
      'AZN': 'Healthcare',
      'BABA': 'Consumer Cyclical',
      'META': 'Communication Services',
      'OXY': 'Energy', 
      'SQN': 'Financial Services',
      'SQN.SW': 'Financial Services',
      'UMC': 'Technology',
      'AAPL': 'Technology',
      'JPM': 'Financial Services',
      'JNJ': 'Healthcare',
      'XOM': 'Energy',
      'NESN': 'Consumer Defensive'
    }
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          quoteSummary: {
            result: [
              {
                summaryProfile: {
                  sector: sectorMappings[symbol] || 'Technology',
                  country: symbol === 'NESN' || symbol === 'SQN' || symbol === 'SQN.SW' ? 'Switzerland' : 'United States',
                  industry: 'Technology Services'
                },
                summaryDetail: {
                  currency: 'USD',
                  marketCap: { raw: 1000000000 }
                }
              },
            ],
          },
        }),
    })
  } else if (url.includes("localhost:3000/api/yahoo/share-metadata/")) {
    // Mock local share-metadata API route calls
    const symbol = url.split("/").pop()
    const sectorMappings = {
      'ABNB': 'Consumer Cyclical',
      'AZN': 'Healthcare',
      'BABA': 'Consumer Cyclical',
      'META': 'Communication Services',
      'OXY': 'Energy', 
      'SQN': 'Financial Services',
      'SQN.SW': 'Financial Services',
      'UMC': 'Technology',
      'AAPL': 'Technology',
      'JPM': 'Financial Services',
      'JNJ': 'Healthcare',
      'XOM': 'Energy',
      'NESN': 'Consumer Defensive'
    }
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          symbol: symbol,
          name: symbol,
          sector: sectorMappings[symbol] || 'Technology',
          country: symbol === 'NESN' || symbol === 'SQN' || symbol === 'SQN.SW' ? 'Switzerland' : 'United States',
          currency: 'USD',
          type: 'EQUITY',
          exchange: 'NMS'
        }),
    })
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url}`))
})
