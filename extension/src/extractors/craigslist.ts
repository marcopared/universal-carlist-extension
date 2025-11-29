import type { ExtractedListing } from '../types';
import { cleanPrice, cleanMileage, cleanYear, cleanVin, getTextContent } from './index';

export function extractCraigslistListing(url: string): ExtractedListing {
  const listing: ExtractedListing = {
    url,
    source: 'craigslist',
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
    sellerType: 'private', // Craigslist is mostly private sellers
    sellerLocation: null,
    sellerPhone: null,
    photoUrls: [],
    status: 'active',
  };
  
  // Title
  const title = getTextContent('#titletextonly, .postingtitletext span#titletextonly');
  if (title) {
    listing.year = cleanYear(title);
    // Try to parse make/model from title
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const afterYear = title.substring(title.indexOf(yearMatch[0]) + 4).trim();
      const parts = afterYear.split(/[\s-]+/);
      listing.make = parts[0] || null;
      listing.model = parts[1] || null;
      listing.trim = parts.slice(2).join(' ') || null;
    }
  }
  
  // Price
  const priceText = getTextContent('.price, .postingtitletext .price');
  listing.price = cleanPrice(priceText);
  
  // Attributes section
  const attrGroups = document.querySelectorAll('.attrgroup span');
  attrGroups.forEach(span => {
    const text = span.textContent?.toLowerCase().trim() || '';
    
    // Look for patterns
    if (text.includes('odometer:')) {
      listing.mileage = cleanMileage(text);
    }
    if (text.includes('vin:')) {
      listing.vin = cleanVin(text);
    }
    if (text.includes('paint color:') || text.includes('exterior:')) {
      listing.exteriorColor = text.split(':')[1]?.trim() || null;
    }
    if (text.includes('transmission:')) {
      listing.transmission = text.split(':')[1]?.trim() || null;
    }
    if (text.includes('drive:')) {
      listing.drivetrain = text.split(':')[1]?.trim() || null;
    }
    if (text.includes('fuel:')) {
      listing.fuelType = text.split(':')[1]?.trim() || null;
    }
    if (text.includes('type:')) {
      listing.bodyStyle = text.split(':')[1]?.trim() || null;
    }
    if (text.includes('cylinders:')) {
      listing.engine = text.split(':')[1]?.trim() + ' cyl' || null;
    }
  });
  
  // Also check for VIN in body text
  if (!listing.vin) {
    const bodyText = document.querySelector('#postingbody')?.textContent || '';
    listing.vin = cleanVin(bodyText);
  }
  
  // Location
  const location = getTextContent('.postingtitletext small');
  if (location) {
    listing.sellerLocation = location.replace(/[()]/g, '').trim();
  }
  
  // Photos
  const photos = document.querySelectorAll('#thumbs a, .gallery img, .slide img');
  listing.photoUrls = Array.from(photos)
    .map(el => el.getAttribute('href') || el.getAttribute('src'))
    .filter((src): src is string => !!src && src.startsWith('http'))
    .map(src => src.replace('50x50c', '600x450')) // Get larger images
    .slice(0, 20);
  
  // Check if removed
  const removed = document.querySelector('.removed');
  if (removed) {
    listing.status = 'removed';
  }
  
  return listing;
}

