// Optional: configure or set up a testing framework before each test.
// If you add more files here, make sure to add them to jest.config.js

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom"

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
                regularMarketPrice: 100.0,
                currency: "USD",
                regularMarketChange: 2.5,
                regularMarketChangePercent: 2.5,
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
          name: `${query} Company`,
          longName: `${query} Company`,
          sector: "Technology",
          country: "United States",
          currency: "USD",
          type: "EQUITY",
          exchange: "NASDAQ",
        }),
    })
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url}`))
})
