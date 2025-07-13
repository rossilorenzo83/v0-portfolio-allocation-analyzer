// jest.setup.js - DO NOT include "use client" directive here
require("@testing-library/jest-dom");
require("@jest/globals");

// Global fetch mock for all tests
global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      redirected: false,
      type: "basic",
      url: "",
      clone: jest.fn(),
    })
);

// Mock FormData for file upload tests
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  forEach: jest.fn(),
}));

// Mock File for file upload tests
global.File = jest.fn((bits, name, opts) => ({
  name,
  size: bits.length,
  type: opts?.type || "text/plain",
  lastModified: Date.now(),
  text: () => Promise.resolve(bits.join("")),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
}));

// Mock next/router (for Pages Router)
jest.mock("next/router", () => ({
  useRouter: jest.fn(() => ({
    route: "/",
    pathname: "/",
    query: {},
    asPath: "/",
    push: jest.fn(),
    pop: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    replace: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  })),
}));

// Mock next/navigation (for App Router)
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock your config module
jest.mock("./lib/config", () => ({
  API_CONFIG: {
    ALPHA_VANTAGE: {
      KEY: "test-alpha-vantage-key",
      BASE_URL: "https://www.alphavantage.co/query",
    },
    FINNHUB: {
      KEY: "test-finnhub-key",
      BASE_URL: "https://finnhub.io/api/v1",
    },
  },
  rateLimiter: {
    canMakeRequest: jest.fn(() => true),
  },
}));

// Mock the portfolio-parser module
jest.mock("./portfolio-parser", () => ({
  resolveYahooSymbol: jest.fn((symbol) => symbol),
}));

// Mock finnhub-ts
jest.mock("finnhub-ts", () => ({
  DefaultApi: jest.fn(() => ({
    etfsHoldings: jest.fn(),
    etfsSectorExposure: jest.fn(),
  })),
}));

// Environment variables for testing
process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY = "test-alpha-vantage-key";
process.env.NEXT_PUBLIC_FINNHUB_KEY = "test-finnhub-key";
process.env.NODE_ENV = "test";

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
