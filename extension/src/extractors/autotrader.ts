import type { ExtractedListing } from '../types';
import { cleanPrice, cleanMileage, cleanYear, cleanVin, getTextContent } from './index';

export function extractAutotraderListing(url: string): ExtractedListing {
  const listing: ExtractedListing = {
    url,
    source: 'autotrader',
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
  
  // Title - Year Make Model
  const title = getTextContent('h1[data-cmp="heading"], .vehicle-title h1');
  if (title) {
    const parts = title.split(' ');
    if (parts.length >= 3) {
      listing.year = cleanYear(parts[0]);
      listing.make = parts[1];
      listing.model = parts.slice(2).join(' ');
    }
  }
  
  // Trim from subheading
  const trim = getTextContent('.vehicle-trim, [data-cmp="subheading"]');
  listing.trim = trim;
  
  // Price
  const priceText = getTextContent('[data-cmp="pricing"] .first-price, .pricing-container .first-price');
  listing.price = cleanPrice(priceText);
  
  // Mileage
  const mileageText = getTextContent('[data-cmp="vehicleSpecificationsItem"]:has([data-cmp="iconMileage"]) .text-bold');
  if (!mileageText) {
    // Try alternative selector
    const specs = document.querySelectorAll('.key-specs span');
    specs.forEach(span => {
      if (span.textContent?.toLowerCase().includes('mile')) {
        listing.mileage = cleanMileage(span.textContent);
      }
    });
  } else {
    listing.mileage = cleanMileage(mileageText);
  }
  
  // VIN
  const allText = document.body.innerText;
  const vinMatch = allText.match(/VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i);
  if (vinMatch) {
    listing.vin = vinMatch[1].toUpperCase();
  }
  
  // Vehicle specs
  const specItems = document.querySelectorAll('[data-cmp="vehicleSpecificationsItem"]');
  specItems.forEach(item => {
    const label = item.querySelector('.text-subdued-lighter')?.textContent?.toLowerCase();
    const value = item.querySelector('.text-bold')?.textContent?.trim();
    
    if (!label || !value) return;
    
    if (label.includes('exterior')) listing.exteriorColor = value;
    if (label.includes('interior')) listing.interiorColor = value;
    if (label.includes('transmission')) listing.transmission = value;
    if (label.includes('drivetrain') || label.includes('drive type')) listing.drivetrain = value;
    if (label.includes('fuel')) listing.fuelType = value;
    if (label.includes('engine')) listing.engine = value;
    if (label.includes('body')) listing.bodyStyle = value;
  });
  
  // Seller info
  const sellerName = getTextContent('[data-cmp="dealerName"], .dealer-name');
  listing.sellerName = sellerName;
  listing.sellerType = sellerName ? 'dealer' : 'unknown';
  
  const sellerLocation = getTextContent('[data-cmp="dealerAddress"], .dealer-address');
  listing.sellerLocation = sellerLocation;
  
  // Photos
  const photos = document.querySelectorAll('[data-cmp="gallery"] img, .gallery-slides img');
  listing.photoUrls = Array.from(photos)
    .map(img => img.getAttribute('src'))
    .filter((src): src is string => !!src && src.startsWith('http') && !src.includes('placeholder'))
    .slice(0, 20);
  
  return listing;
}

