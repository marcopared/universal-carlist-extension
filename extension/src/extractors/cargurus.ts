import type { ExtractedListing } from '../types';
import { cleanPrice, cleanMileage, cleanYear, cleanVin, getTextContent } from './index';

export function extractCargurusListing(url: string): ExtractedListing {
  const listing: ExtractedListing = {
    url,
    source: 'cargurus',
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
  
  // Title
  const title = getTextContent('h1[data-testid="vdp-title"], .vdp-content-vdp h1');
  if (title) {
    const yearMatch = title.match(/^(\d{4})/);
    if (yearMatch) {
      listing.year = parseInt(yearMatch[1]);
      const rest = title.replace(yearMatch[0], '').trim();
      const parts = rest.split(' ');
      listing.make = parts[0] || null;
      listing.model = parts[1] || null;
      listing.trim = parts.slice(2).join(' ') || null;
    }
  }
  
  // Price
  const priceText = getTextContent('[data-testid="vdp-price-row"] span, .vdp-content-price');
  listing.price = cleanPrice(priceText);
  
  // Mileage
  const mileageText = getTextContent('[data-testid="vdp-mileage"], .vdp-mileage');
  listing.mileage = cleanMileage(mileageText);
  
  // VIN from URL or page
  const urlMatch = url.match(/VIN-([A-HJ-NPR-Z0-9]{17})/i);
  if (urlMatch) {
    listing.vin = urlMatch[1].toUpperCase();
  } else {
    const vinText = getTextContent('[data-testid="vdp-vin-value"]');
    listing.vin = cleanVin(vinText);
  }
  
  // Vehicle details
  const detailRows = document.querySelectorAll('[data-testid="vdp-vehicle-specs"] tr, .vdp-vehicle-specs tr');
  detailRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const label = cells[0].textContent?.toLowerCase().trim();
      const value = cells[1].textContent?.trim();
      
      if (!label || !value) return;
      
      if (label.includes('exterior')) listing.exteriorColor = value;
      if (label.includes('interior')) listing.interiorColor = value;
      if (label.includes('transmission')) listing.transmission = value;
      if (label.includes('drivetrain')) listing.drivetrain = value;
      if (label.includes('fuel')) listing.fuelType = value;
      if (label.includes('engine')) listing.engine = value;
      if (label.includes('body')) listing.bodyStyle = value;
    }
  });
  
  // Seller info
  const sellerName = getTextContent('[data-testid="vdp-dealer-name"], .dealer-info-name');
  listing.sellerName = sellerName;
  listing.sellerType = sellerName?.toLowerCase().includes('private') ? 'private' : 'dealer';
  
  const sellerLocation = getTextContent('[data-testid="vdp-dealer-address"], .dealer-info-address');
  listing.sellerLocation = sellerLocation;
  
  // Photos
  const photos = document.querySelectorAll('[data-testid="vdp-gallery"] img, .vdp-gallery img');
  listing.photoUrls = Array.from(photos)
    .map(img => img.getAttribute('src'))
    .filter((src): src is string => !!src && src.startsWith('http'))
    .slice(0, 20);
  
  // Deal rating might indicate status
  const dealBadge = getTextContent('[data-testid="deal-badge"]');
  if (dealBadge?.toLowerCase().includes('sold')) {
    listing.status = 'sold';
  }
  
  return listing;
}

