import { mockEtfData, mockQuoteData, mockSearchData } from "./test-data"

// Mock the global fetch function for all tests in this file
beforeAll(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes("/api/yahoo/etf/")) {
      const symbol = url.split("/").pop()?.split("?")[0] // Remove query params if any
      const data = symbol ? (mockEtfData as any)[symbol] : undefined
      return Promise.resolve({
        ok: !!data,
        status: data ? 200 : 404,
        json: () => Promise.resolve(data || { message: "Not Found" }),
      } as Response)
    } else if (url.includes("/api/yahoo/quote/")) {
      const symbol = url.split("/").pop()?.split("?")[0]
      const data = symbol ? (mockQuoteData as any)[symbol] : undefined
      return Promise.resolve({
        ok: !!data,
        status: data ? 200 : 404,
        json: () => Promise.resolve(data || { message: "Not Found" }),
      } as Response)
    } else if (url.includes("/api/yahoo/search/")) {
      const query = url.split("/").pop()?.split("?")[0]
      const data = query ? (mockSearchData as any)[query.toUpperCase()] : []
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data || []),
      } as Response)
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    } as Response)
  })
})

describe('etf-data-service', () => {
  beforeEach(()\
