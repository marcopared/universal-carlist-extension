// ============================================
// UNIVERSAL CARLIST - SHARED TYPES & UTILITIES
// ============================================

// Supported listing sources
export type ListingSource = 
  | 'cars.com'
  | 'autotrader'
  | 'cargurus'
  | 'craigslist'
  | 'facebook'
  | 'carfax'
  | 'carvana'
  | 'vroom'
  | 'dealer_site'
  | 'unknown';

// Listing status lifecycle
export type ListingStatus = 
  | 'active'       // Currently for sale
  | 'pending'      // Sale pending
  | 'sold'         // Confirmed sold
  | 'removed'      // Listing removed (unknown reason)
  | 'relisted'     // Same car relisted (detected via VIN/fingerprint)
  | 'unknown';     // Status cannot be determined

// Data freshness tiers
export type FreshnessLevel = 
  | 'fresh'    // Checked within 24 hours
  | 'recent'   // Checked within 6 days
  | 'stale';   // 7+ days since last check

// Vehicle snapshot - captured at a point in time
export interface VehicleSnapshot {
  id: string;
  vehicleId: string;
  capturedAt: Date;
  capturedByUserId: string;
  
  // Core data
  price: number | null;
  mileage: number | null;
  
  // Status
  status: ListingStatus;
  
  // Source info
  sourceUrl: string;
  source: ListingSource;
  
  // Raw extracted data for debugging
  rawData?: Record<string, unknown>;
}

// Vehicle entity - the canonical record
export interface Vehicle {
  id: string;
  
  // Identity
  vin: string | null;
  fingerprint: string | null; // Fuzzy ID when no VIN
  
  // Core specs
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  bodyStyle: string | null;
  transmission: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  engine: string | null;
  
  // Current state (from latest snapshot)
  currentPrice: number | null;
  currentMileage: number | null;
  currentStatus: ListingStatus;
  
  // Price tracking
  lowestPrice: number | null;
  highestPrice: number | null;
  priceDropCount: number;
  
  // Seller info
  sellerName: string | null;
  sellerType: 'dealer' | 'private' | 'unknown';
  sellerLocation: string | null;
  sellerPhone: string | null;
  
  // Photos
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  photoHashes: string[]; // For relist detection
  
  // Source tracking
  sources: ListingSource[];
  sourceUrls: string[];
  
  // Freshness
  lastCheckedAt: Date;
  freshnessLevel: FreshnessLevel;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// User's watchlist entry
export interface WatchlistEntry {
  id: string;
  userId: string;
  vehicleId: string;
  
  // User's personal tracking
  addedAt: Date;
  priceWhenAdded: number | null;
  notes: string | null;
  tags: string[];
  
  // Notification preferences
  notifyPriceDrop: boolean;
  notifyPriceRise: boolean;
  notifyStatusChange: boolean;
  notifyRelist: boolean;
  
  // Alert thresholds
  priceDropThreshold: number | null; // e.g., notify if drops by $500+
  targetPrice: number | null;        // notify when hits this price
  
  // Tracking
  lastNotifiedAt: Date | null;
  lastViewedAt: Date | null;
}

// Price change event
export interface PriceChange {
  id: string;
  vehicleId: string;
  detectedAt: Date;
  
  previousPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
  
  // What triggered the detection
  triggeredBy: 'extension_refresh' | 'email_alert' | 'crowd_refresh';
  triggeredByUserId: string | null;
}

// Status change event
export interface StatusChange {
  id: string;
  vehicleId: string;
  detectedAt: Date;
  
  previousStatus: ListingStatus;
  newStatus: ListingStatus;
  
  triggeredBy: 'extension_refresh' | 'email_alert' | 'head_check' | 'crowd_refresh';
  triggeredByUserId: string | null;
}

// Notification to send to user
export interface Notification {
  id: string;
  userId: string;
  vehicleId: string;
  
  type: 'price_drop' | 'price_rise' | 'status_change' | 'relist_detected' | 'target_price_hit';
  
  title: string;
  body: string;
  
  // Related data
  priceChangeId: string | null;
  statusChangeId: string | null;
  
  // Delivery
  sentAt: Date | null;
  readAt: Date | null;
  channel: 'email' | 'push' | 'in_app';
}

// Extension -> Backend payload
export interface ExtensionSnapshotPayload {
  // Source
  url: string;
  source: ListingSource;
  
  // Extracted data
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  price: number | null;
  mileage: number | null;
  
  exteriorColor: string | null;
  interiorColor: string | null;
  bodyStyle: string | null;
  transmission: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  engine: string | null;
  
  sellerName: string | null;
  sellerType: 'dealer' | 'private' | 'unknown';
  sellerLocation: string | null;
  sellerPhone: string | null;
  
  photoUrls: string[];
  
  // Status
  status: ListingStatus;
  
  // Timestamp
  capturedAt: string; // ISO string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Utility functions
export function detectSource(url: string): ListingSource {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('cars.com')) return 'cars.com';
  if (hostname.includes('autotrader.com')) return 'autotrader';
  if (hostname.includes('cargurus.com')) return 'cargurus';
  if (hostname.includes('craigslist.org')) return 'craigslist';
  if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook';
  if (hostname.includes('carfax.com')) return 'carfax';
  if (hostname.includes('carvana.com')) return 'carvana';
  if (hostname.includes('vroom.com')) return 'vroom';
  
  return 'dealer_site';
}

export function calculateFreshness(lastCheckedAt: Date): FreshnessLevel {
  const now = new Date();
  const diffMs = now.getTime() - lastCheckedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffDays < 1) return 'fresh';
  if (diffDays < 6) return 'recent';
  return 'stale';
}

export function generateFingerprint(data: {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  mileage?: number | null;
  price?: number | null;
  sellerLocation?: string | null;
}): string {
  // Create a fuzzy fingerprint for VIN-less matching
  const parts = [
    data.year?.toString() || 'XXXX',
    (data.make || 'unknown').toLowerCase().replace(/\s+/g, ''),
    (data.model || 'unknown').toLowerCase().replace(/\s+/g, ''),
    (data.trim || '').toLowerCase().replace(/\s+/g, ''),
    // Round mileage to nearest 1000
    data.mileage ? Math.round(data.mileage / 1000).toString() + 'k' : 'XXXk',
    // Round price to nearest 500
    data.price ? Math.round(data.price / 500) * 500 : 'XXXXX',
    (data.sellerLocation || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  ];
  
  return parts.join('|');
}

// Normalize VIN to uppercase, remove spaces
export function normalizeVin(vin: string | null | undefined): string | null {
  if (!vin) return null;
  const normalized = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // VINs are always 17 characters
  if (normalized.length !== 17) return null;
  return normalized;
}

// Price formatting
export function formatPrice(price: number | null): string {
  if (price === null) return 'Price not available';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

// Mileage formatting
export function formatMileage(mileage: number | null): string {
  if (mileage === null) return 'Mileage not available';
  return new Intl.NumberFormat('en-US').format(mileage) + ' mi';
}

