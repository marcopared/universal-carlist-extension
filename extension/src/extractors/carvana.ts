import type { ExtractedListing } from '../types';
import { cleanPrice, cleanMileage, cleanYear, cleanVin, getTextContent } from './index';

export function extractCarvanaListing(url: string): ExtractedListing {
  const listing: ExtractedListing = {
    url,
    source: 'carvana',
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
    sellerName: 'Carvana',
    sellerType: 'dealer',
    sellerLocation: null,
    sellerPhone: null,
    photoUrls: [],
    status: 'active',
  };
  
  // Title
  const title = getTextContent('h1[data-qa="vehicle-details-title"], .vehicle-title h1');
  if (title) {
    const parts = title.split(' ');
    listing.year = cleanYear(parts[0]);
    listing.make = parts[1] || null;
    listing.model = parts[2] || null;
    listing.trim = parts.slice(3).join(' ') || null;
  }
  
  // Price
  const priceText = getTextContent('[data-qa="price"], .vehicle-price');
  listing.price = cleanPrice(priceText);
  
  // Mileage
  const mileageText = getTextContent('[data-qa="mileage"], .vehicle-mileage');
  listing.mileage = cleanMileage(mileageText);
  
  // VIN - often in URL for Carvana
  const urlMatch = url.match(/\/vehicle\/(\d+)/);
  if (urlMatch) {
    // Carvana uses internal IDs, try to find VIN elsewhere
    const vinText = getTextContent('[data-qa="vin"]');
    listing.vin = cleanVin(vinText);
  }
  
  // Also try to find VIN in page
  if (!listing.vin) {
    const allText = document.body.innerText;
    const vinMatch = allText.match(/VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i);
    if (vinMatch) {
      listing.vin = vinMatch[1].toUpperCase();
    }
  }
  
  // Features/specs
  const specs = document.querySelectorAll('[data-qa="feature-item"], .feature-item');
  specs.forEach(spec => {
    const label = spec.querySelector('.feature-label, [data-qa="feature-label"]')?.textContent?.toLowerCase();
    const value = spec.querySelector('.feature-value, [data-qa="feature-value"]')?.textContent?.trim();
    
    if (!label || !value) return;
    
    if (label.includes('exterior')) listing.exteriorColor = value;
    if (label.includes('interior')) listing.interiorColor = value;
    if (label.includes('transmission')) listing.transmission = value;
    if (label.includes('drivetrain') || label.includes('drive')) listing.drivetrain = value;
    if (label.includes('fuel')) listing.fuelType = value;
    if (label.includes('engine')) listing.engine = value;
    if (label.includes('body')) listing.bodyStyle = value;
  });
  
  // Photos
  const photos = document.querySelectorAll('[data-qa="gallery-image"] img, .gallery img');
  listing.photoUrls = Array.from(photos)
    .map(img => img.getAttribute('src'))
    .filter((src): src is string => !!src && src.startsWith('http'))
    .slice(0, 20);
  
  // Alternative: look for image gallery
  if (listing.photoUrls.length === 0) {
    const bgImages = document.querySelectorAll('[style*="background-image"]');
    bgImages.forEach(el => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1].startsWith('http')) {
        listing.photoUrls.push(match[1]);
      }
    });
  }
  
  // Status
  const unavailable = document.querySelector('[data-qa="unavailable-banner"]');
  if (unavailable) {
    listing.status = 'sold';
  }
  
  return listing;
}

