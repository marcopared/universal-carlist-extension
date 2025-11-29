// Extension configuration
declare global {
  interface ImportMetaEnv {
    DEV: boolean;
  }

  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const isDevMode = import.meta.env.DEV;

const mockWatchlist = [
  {
    id: 'mock-entry-1',
    vehicleId: 'mock-vehicle-1',
    vehicle: {
      id: 'mock-vehicle-1',
      year: 2025,
      make: 'Tesla',
      model: 'Model 3',
      currentPrice: 4399900,
      currentStatus: 'active',
      primaryPhotoUrl: 'https://images.unsplash.com/photo-1511912882253-5b8f0a1a637b?auto=format&fit=crop&w=400&q=80',
      sourceUrls: ['https://www.cars.com'],
      lastCheckedAt: new Date().toISOString(),
    },
    addedAt: new Date().toISOString(),
    priceWhenAdded: 4599900,
    freshness: 'fresh',
  },
  {
    id: 'mock-entry-2',
    vehicleId: 'mock-vehicle-2',
    vehicle: {
      id: 'mock-vehicle-2',
      year: 2023,
      make: 'Toyota',
      model: 'Tacoma',
      currentPrice: 3899900,
      currentStatus: 'recent',
      primaryPhotoUrl: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=400&q=80',
      sourceUrls: ['https://www.autotrader.com'],
      lastCheckedAt: new Date().toISOString(),
    },
    addedAt: new Date().toISOString(),
    priceWhenAdded: 4099900,
    freshness: 'recent',
  },
];

const mockUser = {
  id: 'dev-user',
  email: 'dev@carlist.local',
  name: 'Dev Tester',
};

export const config = {
  apiUrl: 'http://localhost:3001/api',
  extensionApiKey: 'dev-extension-key', // Should match backend
  frontendUrl: 'http://localhost:3000',
  dev: {
    enabled: isDevMode,
    mockAuthToken: 'dev-token',
    mockUser,
    mockWatchlist,
  },
};

// Update for production
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  const manifest = chrome.runtime.getManifest();
  if (manifest.version !== '1.0.0' || !manifest.name.includes('Dev')) {
    config.apiUrl = 'https://api.carlist.app/api';
    config.frontendUrl = 'https://carlist.app';
  }
}

