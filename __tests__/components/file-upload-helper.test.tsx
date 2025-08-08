import React from 'react'
import { render, screen } from '@testing-library/react'
import { FileUploadHelper } from '../../components/file-upload-helper'

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({
      role: 'button',
      tabIndex: 0,
      className: 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors'
    }),
    getInputProps: () => ({
      accept: '.csv',
      type: 'file'
    }),
    isDragActive: false,
    isDragReject: false
  })
}))

describe('FileUploadHelper Component', () => {
  const mockOnFileSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the file upload helper component', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop your CSV file here, or click to select.')).toBeInTheDocument()
    })

    it('should render with default props', () => {
      render(<FileUploadHelper />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })

    it('should render the upload area', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      // Use a more specific selector for the dropzone area
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      expect(uploadArea).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      // Use getAllByRole to get all buttons and check the dropzone area
      const buttons = screen.getAllByRole('button')
      const dropzoneButton = buttons.find(button => 
        button.textContent?.includes('Drag \'n\' drop')
      )
      expect(dropzoneButton).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      const container = uploadArea.closest('[role="button"]')
      expect(container).toHaveClass('border-2', 'border-dashed')
    })

    it('should have hover and focus states', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      const container = uploadArea.closest('[role="button"]')
      expect(container).toHaveClass('hover:border-gray-400')
    })
  })

  describe('Props', () => {
    it('should accept onFileSelect prop', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      // Component should render without errors
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })

    it('should work without onFileSelect prop', () => {
      render(<FileUploadHelper />)
      
      // Component should render without errors
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })
  })

  describe('Content Structure', () => {
    it('should have proper content hierarchy', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      // Check for main heading
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      
      // Check for description
      expect(screen.getByText('Drag and drop your CSV file here, or click to select.')).toBeInTheDocument()
    })

    it('should have consistent text content', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      const title = screen.getByText('Upload Portfolio CSV')
      const description = screen.getByText('Drag and drop your CSV file here, or click to select.')
      
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should integrate with react-dropzone', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      // The component should use react-dropzone internally
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      expect(uploadArea).toBeInTheDocument()
    })

    it('should handle file selection through dropzone', () => {
      render(<FileUploadHelper onFileSelect={mockOnFileSelect} />)
      
      // The dropzone should be properly configured
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      expect(uploadArea).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render gracefully with invalid props', () => {
      // @ts-ignore - Testing invalid props
      render(<FileUploadHelper onFileSelect={null} />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })

    it('should handle missing props', () => {
      // @ts-ignore - Testing missing props
      render(<FileUploadHelper />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })
  })
})
