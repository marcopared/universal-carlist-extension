import React, { useEffect, useState } from 'react';
import { config } from '../config';

interface Vehicle {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  currentPrice: number | null;
  currentStatus: string;
  primaryPhotoUrl: string | null;
  lastCheckedAt: string;
}

interface WatchlistEntry {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  addedAt: string;
  priceWhenAdded: number | null;
  freshness: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

type Screen = 'loading' | 'login' | 'watchlist';

export function Popup() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [stats, setStats] = useState({ totalWatching: 0, unreadNotifications: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      
      if (response.success && response.auth.isAuthenticated) {
        setUser(response.auth.user);
        setScreen('watchlist');
        loadWatchlist();
      } else {
        setScreen('login');
      }
    } catch (err) {
      setScreen('login');
    }
  }

  async function loadWatchlist() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_WATCHLIST' });
      
      if (response.success && response.data) {
        setWatchlist(response.data.recentWatchlist || []);
        setStats({
          totalWatching: response.data.totalWatching || 0,
          unreadNotifications: response.data.unreadNotifications || 0,
        });
      }
    } catch (err) {
      setError('Failed to load watchlist');
    }
  }

  async function handleRemove(vehicleId: string) {
    try {
      await chrome.runtime.sendMessage({ 
        type: 'REMOVE_FROM_WATCHLIST', 
        payload: { vehicleId } 
      });
      setWatchlist(prev => prev.filter(e => e.vehicleId !== vehicleId));
      setStats(prev => ({ ...prev, totalWatching: prev.totalWatching - 1 }));
    } catch (err) {
      setError('Failed to remove vehicle');
    }
  }

  function openLogin() {
    chrome.tabs.create({ url: `${config.frontendUrl}/login?source=extension` });
  }

  function openDashboard() {
    chrome.tabs.create({ url: `${config.frontendUrl}/watchlist` });
  }

  function formatPrice(cents: number | null): string {
    if (cents === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }

  function getPriceChange(entry: WatchlistEntry): { amount: number; percent: number } | null {
    if (!entry.priceWhenAdded || !entry.vehicle.currentPrice) return null;
    const amount = entry.vehicle.currentPrice - entry.priceWhenAdded;
    const percent = (amount / entry.priceWhenAdded) * 100;
    return { amount: amount / 100, percent };
  }

  if (screen === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="spinner w-8 h-8 mx-auto text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <path d="M12 2C6.48 2 2 6.48 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <div className="p-6 fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Carlist</h1>
          <p className="text-gray-500 text-sm mt-1">Universal Car Watchlist</p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-lg">📉</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Price Drop Alerts</p>
              <p className="text-xs text-gray-500">Get notified when prices drop</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg">🔄</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Cross-Site Tracking</p>
              <p className="text-xs text-gray-500">Track the same car everywhere</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Price History</p>
              <p className="text-xs text-gray-500">See how prices change over time</p>
            </div>
          </div>
        </div>

        {/* Login Button */}
        <button 
          onClick={openLogin}
          className="w-full btn-primary"
        >
          Sign in to Get Started
        </button>
        
        <p className="text-center text-xs text-gray-400 mt-4">
          Works with Cars.com, Autotrader, CarGurus, Craigslist, Carvana & more
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚗</span>
            <h1 className="font-bold">Carlist</h1>
          </div>
          <button 
            onClick={openDashboard}
            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition"
          >
            Dashboard →
          </button>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 mt-3">
          <div className="bg-white/10 rounded-lg px-3 py-2 flex-1">
            <p className="text-2xl font-bold">{stats.totalWatching}</p>
            <p className="text-xs opacity-80">Watching</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2 flex-1">
            <p className="text-2xl font-bold">{stats.unreadNotifications}</p>
            <p className="text-xs opacity-80">Alerts</p>
          </div>
        </div>
      </div>

      {/* Watchlist */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {watchlist.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👀</span>
            </div>
            <p className="text-gray-600 font-medium">No vehicles tracked yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Visit a car listing and click "Track" to start
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase font-medium">Recently Added</p>
            
            {watchlist.map(entry => {
              const priceChange = getPriceChange(entry);
              
              return (
                <div 
                  key={entry.id} 
                  className="vehicle-card bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="flex">
                    {/* Image */}
                    <div className="w-24 h-20 bg-gray-100 flex-shrink-0">
                      {entry.vehicle.primaryPhotoUrl ? (
                        <img 
                          src={entry.vehicle.primaryPhotoUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="text-2xl">🚗</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {entry.vehicle.year} {entry.vehicle.make} {entry.vehicle.model}
                          </p>
                          <p className="text-lg font-bold text-primary-600">
                            {formatPrice(entry.vehicle.currentPrice)}
                          </p>
                        </div>
                        
                        {/* Freshness badge */}
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full flex-shrink-0
                          ${entry.freshness === 'fresh' ? 'badge-fresh' : 
                            entry.freshness === 'recent' ? 'badge-recent' : 'badge-stale'}
                        `}>
                          {entry.freshness}
                        </span>
                      </div>
                      
                      {/* Price change indicator */}
                      {priceChange && (
                        <p className={`text-xs mt-1 ${priceChange.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange.amount < 0 ? '↓' : '↑'} ${Math.abs(priceChange.amount).toLocaleString()} 
                          ({priceChange.percent > 0 ? '+' : ''}{priceChange.percent.toFixed(1)}%)
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex border-t">
                    <button 
                      onClick={() => {
                        const url = entry.vehicle.sourceUrls?.[0];
                        if (url) chrome.tabs.create({ url });
                      }}
                      className="flex-1 py-2 text-xs font-medium text-primary-600 hover:bg-gray-50 transition"
                    >
                      View Listing
                    </button>
                    <button 
                      onClick={() => handleRemove(entry.vehicleId)}
                      className="flex-1 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition border-l"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Logged in as {user?.email}</span>
          <button 
            onClick={() => {
              chrome.storage.local.remove(['authToken']);
              setScreen('login');
            }}
            className="hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

