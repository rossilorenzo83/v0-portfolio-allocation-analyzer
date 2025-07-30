// Optional: configure or set up a testing framework before each test.
// If you add a file here, remember to add it to the 'setupFilesAfterEnv' property in jest.config.js

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/extend-expect"
import jest from "jest"

// Mock fetch API for tests
global.fetch = jest.fn((url) => {
  if (url.includes("/api/yahoo/etf/")) {
    const symbol = url.split("/").pop()
    const mockEtfData = require("./__tests__/test-data").mockEtfData
    if (mockEtfData[symbol]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEtfData[symbol]),
      })
    }
  } else if (url.includes("/api/yahoo/quote/")) {
    const symbol = url.split("/").pop()
    const mockQuoteData = require("./__tests__/test-data").mockQuoteData
    if (mockQuoteData[symbol]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockQuoteData[symbol]),
      })
    }
  } else if (url.includes("/api/yahoo/search/")) {
    const query = url.split("/").pop()
    const mockSearchData = require("./__tests__/test-data").mockSearchData
    if (mockSearchData[query.toUpperCase()]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSearchData[query.toUpperCase()]),
      })
    }
  } else if (url.includes("sample-portfolio.csv")) {
    const sampleCsvContent = `Symbol,Quantity,Average Price,Currency,Exchange,Name
AAPL,10,150.00,USD,NASDAQ,Apple Inc.
MSFT,5,200.50,USD,NASDAQ,Microsoft Corp.
VUSA.L,10,70.00,USD,LSE,Vanguard S&P 500 UCITS ETF`
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(sampleCsvContent),
    })
  }
  return Promise.resolve({
    ok: false,
    status: 404,
    statusText: "Not Found",
    json: () => Promise.resolve({ message: "Not Found" }),
  })
})
