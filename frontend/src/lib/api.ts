const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    return await response.json();
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

export const api = {
  // Auth
  async login(email: string, password: string) {
    return request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  async register(email: string, password: string, name?: string) {
    return request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },
  
  async getMe() {
    return request<any>('/auth/me');
  },
  
  async updateSettings(data: { name?: string; emailNotifications?: boolean; pushNotifications?: boolean }) {
    return request<any>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  // Watchlist
  async getWatchlist(page = 1, pageSize = 20) {
    return request<{
      items: any[];
      total: number;
      page: number;
      pageSize: number;
      hasMore: boolean;
    }>(`/watchlist?page=${page}&pageSize=${pageSize}`);
  },
  
  async getWatchlistStats() {
    return request<{
      totalWatching: number;
      totalPriceDrops: number;
      activeListings: number;
      staleListings: number;
      totalSavings: number;
    }>('/watchlist/stats');
  },
  
  async addToWatchlist(vehicleId: string, options?: {
    notes?: string;
    tags?: string[];
    targetPrice?: number;
  }) {
    return request<any>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, ...options }),
    });
  },
  
  async updateWatchlistEntry(vehicleId: string, data: any) {
    return request<any>(`/watchlist/${vehicleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async removeFromWatchlist(vehicleId: string) {
    return request<void>(`/watchlist/${vehicleId}`, {
      method: 'DELETE',
    });
  },
  
  // Vehicles
  async getVehicle(id: string) {
    return request<any>(`/vehicles/${id}`);
  },
  
  async getVehicleByVin(vin: string) {
    return request<any>(`/vehicles/vin/${vin}`);
  },
  
  async getPriceHistory(vehicleId: string, days = 90) {
    return request<{
      snapshots: { capturedAt: string; price: number }[];
      priceChanges: any[];
    }>(`/vehicles/${vehicleId}/price-history?days=${days}`);
  },
  
  async compareVehicles(vehicleIds: string[]) {
    return request<any[]>('/vehicles/compare', {
      method: 'POST',
      body: JSON.stringify({ vehicleIds }),
    });
  },
  
  // Notifications
  async getNotifications(page = 1, unreadOnly = false) {
    return request<{
      items: any[];
      total: number;
      hasMore: boolean;
    }>(`/notifications?page=${page}&unreadOnly=${unreadOnly}`);
  },
  
  async getUnreadCount() {
    return request<{ count: number }>('/notifications/unread-count');
  },
  
  async markNotificationRead(id: string) {
    return request<void>(`/notifications/${id}/read`, { method: 'PATCH' });
  },
  
  async markAllNotificationsRead() {
    return request<void>('/notifications/read-all', { method: 'POST' });
  },
};

