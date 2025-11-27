import type { ExtractedListing } from '../types';
import { cleanPrice, cleanMileage, cleanYear, cleanVin } from './index';

export function extractFacebookListing(url: string): ExtractedListing {
  const listing: ExtractedListing = {
    url,
    source: 'facebook',
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
    sellerType: 'private',
    sellerLocation: null,
    sellerPhone: null,
    photoUrls: [],
    status: 'active',
  };
  
  // Facebook Marketplace has dynamic content, we need to be creative
  // Look for the main content area
  
  // Title - usually contains year make model
  const titleSelectors = [
    'h1 span',
    '[data-testid="marketplace_pdp_title"]',
    'span[dir="auto"]',
  ];
  
  for (const selector of titleSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      // Check if it looks like a car title (has a year)
      if (/\b(19|20)\d{2}\b/.test(text)) {
        listing.year = cleanYear(text);
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          const afterYear = text.substring(text.indexOf(yearMatch[0]) + 4).trim();
          const parts = afterYear.split(/[\s]+/);
          listing.make = parts[0] || null;
          listing.model = parts[1] || null;
          listing.trim = parts.slice(2).join(' ') || null;
        }
        break;
      }
    }
    if (listing.year) break;
  }
  
  // Price - look for currency patterns
  const allText = document.body.innerText;
  const priceMatch = allText.match(/\$[\d,]+(?:\.\d{2})?/);
  if (priceMatch) {
    listing.price = cleanPrice(priceMatch[0]);
  }
  
  // Mileage patterns
  const mileageMatch = allText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi\.?)/i);
  if (mileageMatch) {
    listing.mileage = cleanMileage(mileageMatch[1]);
  }
  
  // VIN in description
  listing.vin = cleanVin(allText);
  
  // Look for common vehicle attributes in the text
  const transmissionMatch = allText.match(/\b(automatic|manual|cvt)\b/i);
  if (transmissionMatch) {
    listing.transmission = transmissionMatch[1];
  }
  
  const drivetrainMatch = allText.match(/\b(4wd|awd|fwd|rwd|4x4|2wd)\b/i);
  if (drivetrainMatch) {
    listing.drivetrain = drivetrainMatch[1].toUpperCase();
  }
  
  // Seller name - look for profile links
  const profileLinks = document.querySelectorAll('a[href*="/marketplace/profile/"]');
  if (profileLinks.length > 0) {
    listing.sellerName = profileLinks[0].textContent?.trim() || null;
  }
  
  // Location - usually shown near the listing
  const locationMatch = allText.match(/Listed\s+(?:in\s+)?([^·\n]+)/i);
  if (locationMatch) {
    listing.sellerLocation = locationMatch[1].trim();
  }
  
  // Photos - Facebook uses background images extensively
  const images = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
  listing.photoUrls = Array.from(images)
    .map(img => img.getAttribute('src'))
    .filter((src): src is string => {
      if (!src) return false;
      // Filter out profile pics and icons (usually small)
      return src.includes('scontent') && !src.includes('50x50') && !src.includes('32x32');
    })
    .slice(0, 20);
  
  // Check for sold/pending status
  if (allText.toLowerCase().includes('sold') || allText.toLowerCase().includes('no longer available')) {
    listing.status = 'sold';
  } else if (allText.toLowerCase().includes('pending')) {
    listing.status = 'pending';
  }
  
  return listing;
}

