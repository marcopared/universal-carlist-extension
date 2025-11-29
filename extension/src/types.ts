// Extension message types
export interface ExtractedListing {
  url: string;
  source: string;
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
  status: 'active' | 'pending' | 'sold' | 'removed' | 'unknown';
}

export interface Message {
  type: 'EXTRACT_LISTING' | 'LISTING_EXTRACTED' | 'ADD_TO_WATCHLIST' | 'CHECK_AUTH' | 'GET_WATCHLIST';
  payload?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export interface WatchlistEntry {
  id: string;
  vehicleId: string;
  vehicle: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    currentPrice: number | null;
    primaryPhotoUrl: string | null;
  };
  addedAt: string;
  priceWhenAdded: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

