import type { ExtractedListing } from '../types';
import { extractCarsComListing } from './cars-com';
import { extractAutotraderListing } from './autotrader';
import { extractCargurusListing } from './cargurus';
import { extractCraigslistListing } from './craigslist';
import { extractFacebookListing } from './facebook';
import { extractCarvanaListing } from './carvana';

// Detect which site we're on and use appropriate extractor
export function extractListing(): ExtractedListing | null {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  try {
    if (hostname.includes('cars.com')) {
      return extractCarsComListing(url);
    }
    
    if (hostname.includes('autotrader.com')) {
      return extractAutotraderListing(url);
    }
    
    if (hostname.includes('cargurus.com')) {
      return extractCargurusListing(url);
    }
    
    if (hostname.includes('craigslist.org')) {
      return extractCraigslistListing(url);
    }
    
    if (hostname.includes('facebook.com')) {
      return extractFacebookListing(url);
    }
    
    if (hostname.includes('carvana.com')) {
      return extractCarvanaListing(url);
    }
    
    // Generic extractor for dealer sites
    return extractGenericListing(url);
  } catch (error) {
    console.error('Extraction error:', error);
    return null;
  }
}

// Generic extractor that looks for common patterns
function extractGenericListing(url: string): ExtractedListing | null {
  // Look for common meta tags and structured data
  const listing: ExtractedListing = {
    url,
    source: 'dealer_site',
    vin: null,
    year: null,
    make: null,
    model: null,
    trim: null,
    price: null,
    mileage: null,
    exteriorColor: null,
    interiorColor: null,
    bodyStyle: null,
    transmission: null,
    drivetrain: null,
    fuelType: null,
    engine: null,
    sellerName: null,
    sellerType: 'unknown',
    sellerLocation: null,
    sellerPhone: null,
    photoUrls: [],
    status: 'active',
  };
  
  // Try JSON-LD structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      if (data['@type'] === 'Car' || data['@type'] === 'Vehicle') {
        listing.make = data.brand?.name || data.manufacturer || null;
        listing.model = data.model || null;
        listing.year = data.vehicleModelDate ? parseInt(data.vehicleModelDate) : null;
        listing.vin = data.vehicleIdentificationNumber || null;
        listing.mileage = data.mileageFromOdometer?.value ? parseInt(data.mileageFromOdometer.value) : null;
        listing.price = data.offers?.price ? parseFloat(data.offers.price) : null;
        listing.exteriorColor = data.color || null;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  
  // Try meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  if (ogTitle && !listing.make) {
    const yearMatch = ogTitle.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      listing.year = parseInt(yearMatch[0]);
    }
  }
  
  // Try to find VIN in page content
  if (!listing.vin) {
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;
    const bodyText = document.body.innerText;
    const vinMatch = bodyText.match(vinPattern);
    if (vinMatch) {
      listing.vin = vinMatch[0].toUpperCase();
    }
  }
  
  // Try to find price
  if (!listing.price) {
    const pricePattern = /\$[\d,]+/g;
    const priceElements = document.querySelectorAll('[class*="price"], [data-price], .price, #price');
    for (const el of priceElements) {
      const match = el.textContent?.match(pricePattern);
      if (match) {
        listing.price = parseFloat(match[0].replace(/[$,]/g, ''));
        break;
      }
    }
  }
  
  // Get photos
  const images = document.querySelectorAll('img[src*="vehicle"], img[src*="car"], img[class*="gallery"]');
  listing.photoUrls = Array.from(images)
    .map(img => img.getAttribute('src'))
    .filter((src): src is string => !!src && src.startsWith('http'))
    .slice(0, 20);
  
  return listing;
}

// Helper functions used by extractors
export function cleanPrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

export function cleanMileage(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9]/g, '');
  const mileage = parseInt(cleaned);
  return isNaN(mileage) ? null : mileage;
}

export function cleanYear(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

export function cleanVin(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/[A-HJ-NPR-Z0-9]{17}/i);
  return match ? match[0].toUpperCase() : null;
}

export function getTextContent(selector: string): string | null {
  const element = document.querySelector(selector);
  return element?.textContent?.trim() || null;
}

export function getAttribute(selector: string, attr: string): string | null {
  const element = document.querySelector(selector);
  return element?.getAttribute(attr) || null;
}

