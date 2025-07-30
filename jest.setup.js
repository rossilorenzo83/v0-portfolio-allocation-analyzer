import "@testing-library/jest-dom"
import { TextEncoder, TextDecoder } from "util"
import jest from "jest"

// Polyfill for TextEncoder and TextDecoder for JSDOM environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock window.matchMedia for components that use it (e.g., shadcn/ui's theme-provider)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock crypto for uuid or other crypto-related functions
Object.defineProperty(global.self, "crypto", {
  value: {
    getRandomValues: (arr) => crypto.webcrypto.getRandomValues(arr),
  },
})

// Mock fetch for tests that might use it
global.fetch = jest.fn((url) => {
  if (url.includes("example.com/api/data")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: "Mock data" }),
    })
  }
  return Promise.reject(new Error(`Unhandled fetch request for ${url}`))
})
