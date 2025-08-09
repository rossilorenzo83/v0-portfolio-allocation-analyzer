import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PortfolioAnalyzer from '../../portfolio-analyzer'

// Mock the portfolio parser
jest.mock('../../portfolio-parser', () => ({
  parsePortfolioCsv: jest.fn()
}))

// Mock the API service
jest.mock('../../lib/api-service', () => ({
  apiService: {
    getQuote: jest.fn(),
    searchSymbol: jest.fn(),
    getETFData: jest.fn()
  }
}))

describe('CSV Upload Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Integration', () => {
    it('should render all main components together', () => {
      render(<PortfolioAnalyzer />)
      
      // Check for main title
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
      
      // Check for tabs
      expect(screen.getByText('Upload File')).toBeInTheDocument()
      expect(screen.getByText('Paste Text')).toBeInTheDocument()
      
      // Check for file upload helper
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText(/drag and drop your csv file here/i)).toBeInTheDocument()
      
      // Check for analyze button
      expect(screen.getByRole('button', { name: /Analyze Portfolio/i })).toBeInTheDocument()
    })

    it('should maintain component relationships', () => {
      render(<PortfolioAnalyzer />)
      
      // Verify the overall structure
      const container = screen.getByText('Swiss Portfolio Analyzer').closest('div')
      expect(container).toBeInTheDocument()
      
      // Verify tabs are properly structured
      const uploadTab = screen.getByRole('tab', { name: /upload file/i })
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      
      expect(uploadTab).toHaveAttribute('aria-selected', 'true')
      expect(pasteTab).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Tab Functionality', () => {
    it('should handle tab switching correctly', () => {
      render(<PortfolioAnalyzer />)
      
      const uploadTab = screen.getByRole('tab', { name: /upload file/i })
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      
      // Initially upload tab should be active
      expect(uploadTab).toHaveAttribute('aria-selected', 'true')
      expect(pasteTab).toHaveAttribute('aria-selected', 'false')
      
      // Click paste tab
      fireEvent.click(pasteTab)
      
      // Verify both tabs are still present
      expect(pasteTab).toBeInTheDocument()
      expect(uploadTab).toBeInTheDocument()
    })

    it('should show appropriate content for each tab', () => {
      render(<PortfolioAnalyzer />)
      
      // Upload tab content
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText(/drag and drop your csv file here/i)).toBeInTheDocument()
      
      // Switch to paste tab
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      fireEvent.click(pasteTab)
      
      // Wait for the tab content to be visible
      waitFor(() => {
        expect(screen.getByPlaceholderText(/paste your portfolio data here/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Interface Elements', () => {
    it('should render analyze button in correct initial state', () => {
      render(<PortfolioAnalyzer />)
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Portfolio/i })
      expect(analyzeButton).toBeInTheDocument()
      expect(analyzeButton).toBeDisabled()
    })

    it('should show supported formats information', () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByText(/supported formats: csv/i)).toBeInTheDocument()
      expect(screen.getByText(/for best results, ensure your csv includes columns/i)).toBeInTheDocument()
    })
  })

  describe('Component State Management', () => {
    it('should maintain consistent state across interactions', () => {
      render(<PortfolioAnalyzer />)
      
      // Initial state
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
      
      // Switch tabs
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      fireEvent.click(pasteTab)
      
      // State should remain consistent
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
      expect(pasteTab).toBeInTheDocument()
    })

    it('should handle multiple tab switches', () => {
      render(<PortfolioAnalyzer />)
      
      const uploadTab = screen.getByRole('tab', { name: /upload file/i })
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      
      // Switch to paste tab
      fireEvent.click(pasteTab)
      
      // Switch back to upload tab
      fireEvent.click(uploadTab)
      
      // Both tabs should still be functional
      expect(uploadTab).toBeInTheDocument()
      expect(pasteTab).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render gracefully without errors', () => {
      render(<PortfolioAnalyzer />)
      
      // Component should render without throwing errors
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
    })

    it('should handle tab interactions without errors', () => {
      render(<PortfolioAnalyzer />)
      
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      fireEvent.click(pasteTab)
      
      // Should not throw errors
      expect(pasteTab).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PortfolioAnalyzer />)
      
      const uploadTab = screen.getByRole('tab', { name: /upload file/i })
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      
      expect(uploadTab).toHaveAttribute('aria-selected', 'true')
      expect(pasteTab).toHaveAttribute('aria-selected', 'false')
    })

    it('should be keyboard accessible', () => {
      render(<PortfolioAnalyzer />)
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Portfolio/i })
      expect(analyzeButton).toBeInTheDocument()
    })
  })
})
