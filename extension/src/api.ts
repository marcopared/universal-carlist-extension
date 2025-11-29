import { config } from './config';
import type { ExtractedListing, ApiResponse, AuthState } from './types';

const isDevMode = config.dev?.enabled;
const mockWatchlist = config.dev?.mockWatchlist ?? [];
const mockUser = config.dev?.mockUser ?? null;
const mockAuthToken = config.dev?.mockAuthToken ?? null;

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

// Get stored auth token
async function getAuthToken(): Promise<string | null> {
  if (isDevMode && mockAuthToken) {
    return mockAuthToken;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      resolve(result.authToken || null);
    });
  });
}

// Make authenticated API request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Extension-Key': config.extensionApiKey,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
      },
    };
  }
}

function createMockVehicle(listing: ExtractedListing) {
  return {
    id: listing.vin || `mock-${Date.now()}`,
    year: listing.year,
    make: listing.make,
    model: listing.model,
    currentPrice: listing.price ?? 2500000,
    currentStatus: listing.status ?? 'active',
    primaryPhotoUrl:
      listing.photoUrls?.[0] ||
      'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=400&q=80',
    lastCheckedAt: new Date().toISOString(),
    sourceUrls: [listing.url],
  };
}

function getMockWatchlistSummary() {
  return {
    success: true,
    data: {
      recentWatchlist: mockWatchlist,
      totalWatching: mockWatchlist.length,
      unreadNotifications: 2,
    },
  };
}

// API Functions
export const api = {
  // Submit listing snapshot
  async submitSnapshot(listing: ExtractedListing) {
    if (isDevMode) {
      await delay();
      const vehicle = createMockVehicle(listing);

      return {
        success: true,
        data: {
          vehicle,
          snapshot: { id: 'mock-snapshot', capturedAt: new Date().toISOString() },
          isNewVehicle: true,
          isWatching: false,
          freshness: 'fresh',
        },
      };
    }

    return apiRequest<{
      vehicle: any;
      snapshot: any;
      isNewVehicle: boolean;
      isWatching: boolean;
      freshness: string;
    }>('/extension/snapshot', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
  },
  
  // Add to watchlist
  async addToWatchlist(vehicleId: string, notes?: string) {
    if (isDevMode) {
      await delay();
      return {
        success: true,
        data: {
          alreadyWatching: mockWatchlist.some((entry) => entry.vehicleId === vehicleId),
          entry: mockWatchlist[0] ?? null,
        },
      };
    }

    return apiRequest<{ alreadyWatching: boolean; entry: any }>('/extension/watch', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, notes }),
    });
  },
  
  // Remove from watchlist
  async removeFromWatchlist(vehicleId: string) {
    if (isDevMode) {
      await delay();
      return { success: true };
    }

    return apiRequest<void>(`/extension/watch/${vehicleId}`, {
      method: 'DELETE',
    });
  },
  
  // Check if URL is tracked
  async checkUrl(url: string) {
    if (isDevMode) {
      await delay();
      return {
        success: true,
        data: {
          found: true,
          isWatching: true,
          vehicle: mockWatchlist[0]?.vehicle,
          freshness: mockWatchlist[0]?.freshness,
          watchEntry: mockWatchlist[0],
        },
      };
    }

    return apiRequest<{
      found: boolean;
      isWatching: boolean;
      vehicle?: any;
      freshness?: string;
      watchEntry?: any;
    }>(`/extension/check-url?url=${encodeURIComponent(url)}`);
  },
  
  // Get watchlist summary
  async getWatchlistSummary() {
    if (isDevMode) {
      await delay();
      return getMockWatchlistSummary();
    }

    return apiRequest<{
      recentWatchlist: any[];
      totalWatching: number;
      unreadNotifications: number;
    }>('/extension/watchlist-summary');
  },
  
  // Check auth status
  async checkAuth(): Promise<AuthState> {
    const token = await getAuthToken();
    
    if (!token) {
      if (isDevMode && mockUser && mockAuthToken) {
        return {
          isAuthenticated: true,
          token: mockAuthToken,
          user: mockUser,
        };
      }
      return { isAuthenticated: false, token: null, user: null };
    }
    
    const response = await apiRequest<any>('/auth/me');
    
    if (response.success && response.data) {
      return {
        isAuthenticated: true,
        token,
        user: response.data,
      };
    }
    
    // Token invalid, clear it
    await chrome.storage.local.remove(['authToken']);
    return { isAuthenticated: false, token: null, user: null };
  },
  
  // Save auth token
  async saveToken(token: string) {
    await chrome.storage.local.set({ authToken: token });
  },
  
  // Logout
  async logout() {
    await chrome.storage.local.remove(['authToken']);
  },
};

