/**
 * Shared normalization utilities for consistent data formatting across services
 */

export function normalizeSectorName(sector: string): string {
  const sectorMap: Record<string, string> = {
    'information technology': 'Technology',
    'it': 'Technology',
    'technology': 'Technology',
    'financial services': 'Financial Services',
    'financial_services': 'Financial Services',
    'financials': 'Financial Services',
    'finance': 'Financial Services',
    'healthcare': 'Healthcare',
    'health': 'Healthcare',
    'health care': 'Healthcare',
    'consumer discretionary': 'Consumer Discretionary',
    'consumer_cyclical': 'Consumer Discretionary',
    'consumer staples': 'Consumer Staples',
    'consumer_defensive': 'Consumer Staples',
    'industrials': 'Industrials',
    'communication services': 'Communication Services',
    'communication_services': 'Communication Services',
    'telecommunications': 'Telecommunications',
    'utilities': 'Utilities',
    'energy': 'Energy',
    'materials': 'Materials',
    'basic_materials': 'Materials',
    'real estate': 'Real Estate',
    'realestate': 'Real Estate'
  }
  
  return sectorMap[sector.toLowerCase()] || sector
}

export function normalizeCountryName(country: string): string {
  const countryMap: Record<string, string> = {
    'united states': 'United States',
    'usa': 'United States',
    'us': 'United States',
    'ireland': 'Ireland',
    'ie': 'Ireland',
    'luxembourg': 'Luxembourg',
    'lu': 'Luxembourg',
    'switzerland': 'Switzerland',
    'ch': 'Switzerland',
    'germany': 'Germany',
    'de': 'Germany',
    'france': 'France',
    'fr': 'France',
    'japan': 'Japan',
    'jp': 'Japan',
    'united kingdom': 'United Kingdom',
    'uk': 'United Kingdom',
    'gb': 'United Kingdom',
    'canada': 'Canada',
    'ca': 'Canada',
    'australia': 'Australia',
    'au': 'Australia',
    'china': 'China',
    'cn': 'China',
    'india': 'India',
    'in': 'India',
    'brazil': 'Brazil',
    'br': 'Brazil'
  }
  
  return countryMap[country.toLowerCase()] || country
}