// Common API types and utilities
// Consolidates API-related types from various service files

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
}

export interface RateLimitConfig {
  requests: number
  windowMs: number
  delay: number
}

export interface ApiConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  rateLimit: RateLimitConfig
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

export interface ErrorResponse {
  error: string
  code?: number
  details?: any
  timestamp: string
}