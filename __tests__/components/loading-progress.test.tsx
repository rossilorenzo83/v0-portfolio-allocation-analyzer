import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingProgress } from '../../components/loading-progress'

describe('LoadingProgress Component', () => {
  describe('Rendering', () => {
    it('should render the loading progress component', () => {
      render(<LoadingProgress progress={50} />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText('50% Complete')).toBeInTheDocument()
    })

    it('should render with different progress values', () => {
      render(<LoadingProgress progress={75} />)
      
      expect(screen.getByText('75% Complete')).toBeInTheDocument()
    })

    it('should render progress bar with correct attributes', () => {
      render(<LoadingProgress progress={25} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Props', () => {
    it('should accept progress prop', () => {
      render(<LoadingProgress progress={33} />)
      
      expect(screen.getByText('33% Complete')).toBeInTheDocument()
    })

    it('should handle zero progress', () => {
      render(<LoadingProgress progress={0} />)
      
      expect(screen.getByText('0% Complete')).toBeInTheDocument()
    })

    it('should handle 100% progress', () => {
      render(<LoadingProgress progress={100} />)
      
      expect(screen.getByText('100% Complete')).toBeInTheDocument()
    })

    it('should handle decimal progress values', () => {
      render(<LoadingProgress progress={33.5} />)
      
      expect(screen.getByText('33.5% Complete')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<LoadingProgress progress={50} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      // Note: aria-valuenow is not set by the Progress component
    })

    it('should be accessible to screen readers', () => {
      render(<LoadingProgress progress={25} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(screen.getByText('25% Complete')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      render(<LoadingProgress progress={50} />)
      
      const container = screen.getByText('50% Complete').parentElement
      expect(container).toHaveClass('w-full')
    })

    it('should have proper container styling', () => {
      render(<LoadingProgress progress={50} />)
      
      const container = screen.getByText('50% Complete').parentElement
      expect(container).toHaveClass('w-full')
    })
  })

  describe('Content Structure', () => {
    it('should have proper content hierarchy', () => {
      render(<LoadingProgress progress={50} />)
      
      // Check for progress text
      expect(screen.getByText('50% Complete')).toBeInTheDocument()
      
      // Check for progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should maintain consistent structure with different progress values', () => {
      render(<LoadingProgress progress={80} />)
      
      expect(screen.getByText('80% Complete')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render gracefully with negative progress', () => {
      render(<LoadingProgress progress={-10} />)
      
      expect(screen.getByText('-10% Complete')).toBeInTheDocument()
    })

    it('should handle undefined props', () => {
      render(<LoadingProgress progress={undefined as any} />)
      
      // When progress is undefined, it shows "% Complete" without the value
      expect(screen.getByText('% Complete')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should integrate with shadcn/ui components', () => {
      render(<LoadingProgress progress={50} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('relative', 'h-2', 'overflow-hidden', 'rounded-full')
    })

    it('should work within a larger component tree', () => {
      render(
        <div>
          <h1>Portfolio Analyzer</h1>
          <LoadingProgress progress={50} />
        </div>
      )
      
      expect(screen.getByText('Portfolio Analyzer')).toBeInTheDocument()
      expect(screen.getByText('50% Complete')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Default Behavior', () => {
    it('should show progress percentage when provided', () => {
      render(<LoadingProgress progress={25} />)
      
      expect(screen.getByText('25% Complete')).toBeInTheDocument()
    })

    it('should always render a progress bar', () => {
      render(<LoadingProgress progress={0} />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })
})
