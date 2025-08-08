import { formatCurrency, formatPercentage, capitalizeFirstLetter } from '../../lib/utils'

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly with USD', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(1000000)).toBe('$1,000,000.00')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format positive numbers correctly with CHF', () => {
      expect(formatCurrency(1234.56, 'CHF')).toBe('CHF\u00A01,234.56')
      expect(formatCurrency(1000000, 'CHF')).toBe('CHF\u00A01,000,000.00')
      expect(formatCurrency(0, 'CHF')).toBe('CHF\u00A00.00')
    })

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
      expect(formatCurrency(-1000000)).toBe('-$1,000,000.00')
      expect(formatCurrency(-1234.56, 'CHF')).toBe('-CHF\u00A01,234.56')
    })

    it('should handle decimal places correctly', () => {
      expect(formatCurrency(1234.567)).toBe('$1,234.57') // Rounds up
      expect(formatCurrency(1234.564)).toBe('$1,234.56') // Rounds down
    })

    it('should handle very large numbers', () => {
      expect(formatCurrency(999999999.99)).toBe('$999,999,999.99')
      expect(formatCurrency(999999999.99, 'CHF')).toBe('CHF\u00A0999,999,999.99')
    })

    it('should handle very small numbers', () => {
      expect(formatCurrency(0.01)).toBe('$0.01')
      expect(formatCurrency(0.001)).toBe('$0.00') // Rounds down
    })

    it('should handle different locales', () => {
      expect(formatCurrency(1234.56, 'USD', 'de-DE')).toBe('1.234,56\u00A0$')
      expect(formatCurrency(1234.56, 'EUR', 'de-DE')).toBe('1.234,56\u00A0€')
    })
  })

  describe('formatPercentage', () => {
    it('should format positive percentages correctly', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%')
      expect(formatPercentage(1.0)).toBe('100.00%')
      expect(formatPercentage(0.0)).toBe('0.00%')
    })

    it('should format negative percentages correctly', () => {
      expect(formatPercentage(-0.1234)).toBe('-12.34%')
      expect(formatPercentage(-1.0)).toBe('-100.00%')
    })

    it('should handle decimal places correctly', () => {
      expect(formatPercentage(0.12345)).toBe('12.35%') // Rounds up
      expect(formatPercentage(0.12344)).toBe('12.34%') // Rounds down
    })

    it('should handle very large percentages', () => {
      expect(formatPercentage(2.5)).toBe('250.00%')
    })

    it('should handle very small percentages', () => {
      expect(formatPercentage(0.0001)).toBe('0.01%')
      expect(formatPercentage(0.00001)).toBe('0.00%') // Rounds down
    })

    it('should handle custom decimal places', () => {
      expect(formatPercentage(0.1234, 1)).toBe('12.3%')
      expect(formatPercentage(0.1234, 3)).toBe('12.340%')
    })
  })

  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello')
      expect(capitalizeFirstLetter('world')).toBe('World')
      expect(capitalizeFirstLetter('test')).toBe('Test')
    })

    it('should handle single character strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A')
      expect(capitalizeFirstLetter('z')).toBe('Z')
    })

    it('should handle already capitalized strings', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello')
      expect(capitalizeFirstLetter('WORLD')).toBe('WORLD')
    })

    it('should handle empty strings', () => {
      expect(capitalizeFirstLetter('')).toBe('')
    })

    it('should handle strings with numbers', () => {
      expect(capitalizeFirstLetter('123abc')).toBe('123abc')
      expect(capitalizeFirstLetter('abc123')).toBe('Abc123')
    })

    it('should handle special characters', () => {
      expect(capitalizeFirstLetter('!hello')).toBe('!hello')
      expect(capitalizeFirstLetter('hello!')).toBe('Hello!')
    })
  })
})
