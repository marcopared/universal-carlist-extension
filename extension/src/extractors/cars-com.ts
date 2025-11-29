import type { ExtractedListing } from '../types';
import { cleanPrice, cleanMileage, cleanYear, cleanVin, getTextContent } from './index';

export function extractCarsComListing(url: string): ExtractedListing {
  const listing: ExtractedListing = {
    url,
    source: 'cars.com',
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
  
  // Title contains Year Make Model Trim
  const title = getTextContent('h1.listing-title, h1[data-qa="vdp-title"]');
  if (title) {
    const parts = title.split(' ');
    if (parts.length >= 3) {
      listing.year = cleanYear(parts[0]);
      listing.make = parts[1];
      listing.model = parts[2];
      listing.trim = parts.slice(3).join(' ') || null;
    }
  }
  
  // Price
  const priceText = getTextContent('.primary-price, [data-qa="price-section"] .primary-price');
  listing.price = cleanPrice(priceText);
  
  // Mileage
  const mileageText = getTextContent('.listing-mileage, [data-qa="mileage"]');
  listing.mileage = cleanMileage(mileageText);
  
  // VIN - usually in basics section
  const vinElement = document.querySelector('[data-qa="vin-value"], .vehicle-vin');
  if (vinElement) {
    listing.vin = cleanVin(vinElement.textContent);
  }
  
  // Vehicle details
  const detailRows = document.querySelectorAll('.fancy-description-list dt, .vdp-details-basics dt');
  detailRows.forEach(dt => {
    const label = dt.textContent?.toLowerCase().trim();
    const value = (dt.nextElementSibling as HTMLElement)?.textContent?.trim();
    
    if (!label || !value) return;
    
    if (label.includes('exterior')) listing.exteriorColor = value;
    if (label.includes('interior')) listing.interiorColor = value;
    if (label.includes('transmission')) listing.transmission = value;
    if (label.includes('drivetrain')) listing.drivetrain = value;
    if (label.includes('fuel type')) listing.fuelType = value;
    if (label.includes('engine')) listing.engine = value;
    if (label.includes('body style')) listing.bodyStyle = value;
  });
  
  // Seller info
  const sellerName = getTextContent('.dealer-name, [data-qa="dealer-name"]');
  listing.sellerName = sellerName;
  listing.sellerType = sellerName ? 'dealer' : 'unknown';
  
  const sellerLocation = getTextContent('.dealer-address, [data-qa="dealer-address"]');
  listing.sellerLocation = sellerLocation;
  
  const sellerPhone = getTextContent('.dealer-phone, [data-qa="dealer-phone"]');
  listing.sellerPhone = sellerPhone;
  
  // Photos
  const photos = document.querySelectorAll('.image-gallery img, [data-qa="image-gallery"] img');
  listing.photoUrls = Array.from(photos)
    .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
    .filter((src): src is string => !!src && src.startsWith('http'))
    .slice(0, 20);
  
  // Status
  const soldBanner = document.querySelector('.sold-banner, [data-qa="sold-banner"]');
  if (soldBanner) {
    listing.status = 'sold';
  }
  
  const pendingBanner = document.querySelector('.pending-banner, .sale-pending');
  if (pendingBanner) {
    listing.status = 'pending';
  }
  
  return listing;
}

