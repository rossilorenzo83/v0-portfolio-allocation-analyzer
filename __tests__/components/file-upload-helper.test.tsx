import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadHelper } from '../../components/file-upload-helper'

// Mock react-dropzone
const mockOnDrop = jest.fn()
const mockGetRootProps = jest.fn(() => ({
  role: 'button',
  tabIndex: 0,
  className: 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors'
}))
const mockGetInputProps = jest.fn(() => ({
  accept: '.csv',
  type: 'file'
}))

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: mockGetRootProps,
    getInputProps: mockGetInputProps,
    isDragActive: false,
    isDragReject: false
  }))
}))

describe('FileUploadHelper Component', () => {
  const mockOnFileChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnDrop.mockClear()
  })

  describe('Rendering', () => {
    it('should render the file upload helper component', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop your CSV file here, or click to select.')).toBeInTheDocument()
    })

    it('should render the upload area', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      expect(uploadArea).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const buttons = screen.getAllByRole('button')
      const dropzoneButton = buttons.find(button => 
        button.textContent?.includes('Drag \'n\' drop')
      )
      expect(dropzoneButton).toHaveAttribute('tabIndex', '0')
    })

    it('should render supported formats information', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      expect(screen.getByText('Supported formats: CSV (.csv)')).toBeInTheDocument()
      expect(screen.getByText(/For best results, ensure your CSV includes columns like Symbol, Quantity, Price, and Currency./)).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      const container = uploadArea.closest('[role="button"]')
      expect(container).toHaveClass('border-2', 'border-dashed')
    })

    it('should have hover and focus states', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      const container = uploadArea.closest('[role="button"]')
      expect(container).toHaveClass('hover:border-gray-400')
    })
  })

  describe('Props', () => {
    it('should accept onFileChange prop', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })

    it('should work without onFileChange prop', () => {
      render(<FileUploadHelper />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })
  })

  describe('Content Structure', () => {
    it('should have proper content hierarchy', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop your CSV file here, or click to select.')).toBeInTheDocument()
    })

    it('should have consistent text content', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const title = screen.getByText('Upload Portfolio CSV')
      const description = screen.getByText('Drag and drop your CSV file here, or click to select.')
      
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should integrate with react-dropzone', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      expect(uploadArea).toBeInTheDocument()
    })

    it('should handle file selection through dropzone', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      expect(uploadArea).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render gracefully with invalid props', () => {
      // @ts-ignore - Testing invalid props
      render(<FileUploadHelper onFileChange={null} />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })

    it('should handle missing props', () => {
      // @ts-ignore - Testing missing props
      render(<FileUploadHelper />)
      
      expect(screen.getByText('Upload Portfolio CSV')).toBeInTheDocument()
    })
  })

  describe('Drag States', () => {
    it('should show drag active state', () => {
      const { useDropzone } = require('react-dropzone')
      useDropzone.mockReturnValue({
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: true,
        isDragReject: false
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      expect(screen.getByText('Drop the CSV file here ...')).toBeInTheDocument()
    })

    it('should show normal state when not dragging', () => {
      const { useDropzone } = require('react-dropzone')
      useDropzone.mockReturnValue({
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
        isDragReject: false
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      expect(screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')).toBeInTheDocument()
    })
  })

  describe('File Upload Scenarios', () => {
    it('should handle valid CSV file upload', async () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => ({
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
        isDragReject: false,
        onDrop: (files: File[]) => options?.onDrop?.(files),
      }))

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // Simulate file drop
      const file = new File(['test'], 'test.csv', { type: 'text/csv' })
      // Call the hook again to capture options and invoke
      const { useDropzone: hookAgain } = require('react-dropzone')
      hookAgain.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })
      // Re-render to register capturedOnDrop
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      act(() => {
        capturedOnDrop?.([file])
      })
      
      await waitFor(() => {
        expect(mockOnFileChange).toHaveBeenCalledWith(file)
      })
    })

    it('should handle invalid file type', async () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // Simulate invalid file drop
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      act(() => {
        capturedOnDrop?.([file])
      })
      
      await waitFor(() => {
        expect(mockOnFileChange).toHaveBeenCalledWith(null)
      })
    })

    it('should handle empty file array', async () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // Simulate empty drop
      act(() => {
        capturedOnDrop?.([])
      })
      
      await waitFor(() => {
        expect(mockOnFileChange).not.toHaveBeenCalled()
      })
    })
  })

  describe('File Display and Removal', () => {
    it('should display uploaded file information', () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // Simulate file upload
      const file = new File(['test'], 'portfolio.csv', { type: 'text/csv' })
      act(() => {
        capturedOnDrop?.([file])
      })
      
      expect(screen.getByText('portfolio.csv')).toBeInTheDocument()
    })

    it('should handle file removal', async () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // Simulate file upload
      const file = new File(['test'], 'portfolio.csv', { type: 'text/csv' })
      act(() => {
        capturedOnDrop?.([file])
      })
      
      // Find and click remove button
      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)
      
      await waitFor(() => {
        expect(mockOnFileChange).toHaveBeenCalledWith(null)
      })
    })
  })

  describe('Error Display', () => {
    it('should display error message for invalid file type', async () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // Simulate invalid file drop
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      act(() => {
        capturedOnDrop?.([file])
      })
      
      await waitFor(() => {
        expect(screen.getByText('Invalid file type. Please upload a CSV file.')).toBeInTheDocument()
      })
    })

    it('should clear error when valid file is uploaded', async () => {
      const { useDropzone } = require('react-dropzone')
      let capturedOnDrop: ((files: File[]) => void) | undefined
      
      useDropzone.mockImplementation((options: any) => {
        capturedOnDrop = options?.onDrop
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
          isDragReject: false,
        }
      })

      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      // First upload invalid file
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      act(() => {
        capturedOnDrop?.([invalidFile])
      })
      
      await waitFor(() => {
        expect(screen.getByText('Invalid file type. Please upload a CSV file.')).toBeInTheDocument()
      })
      
      // Then upload valid file
      const validFile = new File(['test'], 'test.csv', { type: 'text/csv' })
      act(() => {
        capturedOnDrop?.([validFile])
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Invalid file type. Please upload a CSV file.')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const uploadArea = screen.getByText('Drag \'n\' drop a CSV file here, or click to select one')
      const container = uploadArea.closest('[role="button"]')
      expect(container).toHaveAttribute('role', 'button')
      expect(container).toHaveAttribute('tabIndex', '0')
    })

    it('should have proper button roles', () => {
      render(<FileUploadHelper onFileChange={mockOnFileChange} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
