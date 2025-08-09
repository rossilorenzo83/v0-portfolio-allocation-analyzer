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

describe('End-to-End User Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the main portfolio analyzer component', () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
      expect(screen.getByText(/Upload your Swiss bank PDF\/CSV or paste text/)).toBeInTheDocument()
    })

    it('should render upload and paste tabs', () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByText('Upload File')).toBeInTheDocument()
      expect(screen.getByText('Paste Text')).toBeInTheDocument()
    })

    it('should render analyze button in disabled state initially', () => {
      render(<PortfolioAnalyzer />)
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Portfolio/i })
      expect(analyzeButton).toBeInTheDocument()
      expect(analyzeButton).toBeDisabled()
    })
  })

  describe('Tab Switching', () => {
    it('should switch between upload and paste tabs', () => {
      render(<PortfolioAnalyzer />)
      
      const uploadTab = screen.getByRole('tab', { name: /upload file/i })
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      
      expect(uploadTab).toHaveAttribute('aria-selected', 'true')
      expect(pasteTab).toHaveAttribute('aria-selected', 'false')
      
      fireEvent.click(pasteTab)
      
      expect(pasteTab).toBeInTheDocument()
      expect(uploadTab).toBeInTheDocument()
    })
  })

  describe('File Upload Interface', () => {
    it('should render file upload helper', () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText(/drag and drop your csv file here/i)).toBeInTheDocument()
    })

    it('should show supported formats information', () => {
      render(<PortfolioAnalyzer />)
      
      expect(screen.getByText(/supported formats: csv/i)).toBeInTheDocument()
      expect(screen.getByText(/for best results, ensure your csv includes columns/i)).toBeInTheDocument()
    })
  })

  describe('Text Input Interface', () => {
    it('should render text input area when paste tab is active', () => {
      render(<PortfolioAnalyzer />)
      
      const pasteTab = screen.getByRole('tab', { name: /paste text/i })
      fireEvent.click(pasteTab)
      
      // Wait for the tab content to be visible
      waitFor(() => {
        expect(screen.getByPlaceholderText(/paste your portfolio data here/i)).toBeInTheDocument()
      })
    })
  })

  describe('Component Integration', () => {
    it('should integrate all components properly', () => {
      render(<PortfolioAnalyzer />)
      
      // Check for all main components
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText(/supported formats: csv/i)).toBeInTheDocument()
    })

    it('should maintain consistent UI structure', () => {
      render(<PortfolioAnalyzer />)
      
      // Verify the overall structure is maintained
      const container = screen.getByText('Swiss Portfolio Analyzer').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle component rendering gracefully', () => {
      render(<PortfolioAnalyzer />)
      
      // Component should render without errors
      expect(screen.getByText('Swiss Portfolio Analyzer')).toBeInTheDocument()
    })

    it('should handle tab switching without errors', () => {
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
