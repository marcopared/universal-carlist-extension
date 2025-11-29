'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, TrendingDown, TrendingUp, Clock, Bell, Settings, LogOut,
  RefreshCw, Trash2, ExternalLink, Filter, Search, ChevronDown,
  AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { clsx } from 'clsx';

interface Vehicle {
  id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  currentPrice: number | null;
  currentMileage: number | null;
  currentStatus: string;
  primaryPhotoUrl: string | null;
  sources: string[];
  sourceUrls: string[];
  lastCheckedAt: string;
  priceDropCount: number;
  lowestPrice: number | null;
  highestPrice: number | null;
}

interface WatchlistEntry {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  addedAt: string;
  priceWhenAdded: number | null;
  notes: string | null;
  tags: string[];
  freshness: string;
  priceDifference: number | null;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMileage(miles: number | null): string {
  if (miles === null) return 'N/A';
  return new Intl.NumberFormat('en-US').format(miles) + ' mi';
}

function FreshnessBadge({ freshness }: { freshness: string }) {
  const styles = {
    fresh: 'bg-green-100 text-green-700',
    recent: 'bg-amber-100 text-amber-700',
    stale: 'bg-red-100 text-red-700',
  };
  
  const icons = {
    fresh: <CheckCircle2 className="w-3 h-3" />,
    recent: <Clock className="w-3 h-3" />,
    stale: <AlertCircle className="w-3 h-3" />,
  };
  
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      styles[freshness as keyof typeof styles] || styles.stale
    )}>
      {icons[freshness as keyof typeof icons]}
      {freshness}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    SOLD: 'bg-red-100 text-red-700',
    REMOVED: 'bg-gray-100 text-gray-700',
    RELISTED: 'bg-purple-100 text-purple-700',
  };
  
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded-full text-xs font-medium',
      styles[status] || 'bg-gray-100 text-gray-700'
    )}>
      {status.toLowerCase()}
    </span>
  );
}

function VehicleCard({ entry, onRemove }: { entry: WatchlistEntry; onRemove: () => void }) {
  const { vehicle, priceDifference, freshness } = entry;
  
  const priceChange = priceDifference !== null ? {
    amount: priceDifference / 100,
    percent: entry.priceWhenAdded ? (priceDifference / entry.priceWhenAdded) * 100 : 0,
    isDown: priceDifference < 0,
  } : null;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden card-hover border border-slate-100"
    >
      <div className="flex">
        {/* Image */}
        <div className="w-48 h-36 bg-slate-100 flex-shrink-0 relative">
          {vehicle.primaryPhotoUrl ? (
            <img 
              src={vehicle.primaryPhotoUrl} 
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Car className="w-12 h-12" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <FreshnessBadge freshness={freshness} />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              {vehicle.trim && (
                <p className="text-sm text-slate-500">{vehicle.trim}</p>
              )}
            </div>
            <StatusBadge status={vehicle.currentStatus} />
          </div>
          
          <div className="flex items-baseline gap-3 mt-2">
            <p className="text-2xl font-bold text-primary-600">
              {formatPrice(vehicle.currentPrice)}
            </p>
            {priceChange && (
              <span className={clsx(
                'flex items-center gap-1 text-sm font-medium',
                priceChange.isDown ? 'text-green-600' : 'text-red-500'
              )}>
                {priceChange.isDown ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                ${Math.abs(priceChange.amount).toLocaleString()}
                <span className="text-slate-400">
                  ({priceChange.percent > 0 ? '+' : ''}{priceChange.percent.toFixed(1)}%)
                </span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span>{formatMileage(vehicle.currentMileage)}</span>
            {vehicle.vin && (
              <span className="font-mono text-xs">{vehicle.vin}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
            <div className="flex gap-1">
              {vehicle.sources.map(source => (
                <span 
                  key={source}
                  className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                >
                  {source.replace('_', '.')}
                </span>
              ))}
            </div>
            
            <div className="flex gap-2">
              <a
                href={vehicle.sourceUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                title="View Listing"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <Link
                href={`/vehicle/${vehicle.id}`}
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                title="Price History"
              >
                <TrendingDown className="w-4 h-4" />
              </Link>
              <button
                onClick={onRemove}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WatchlistPage() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: watchlistData, isLoading, refetch } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.getWatchlist(),
    enabled: isAuthenticated,
  });
  
  const { data: statsData } = useQuery({
    queryKey: ['watchlistStats'],
    queryFn: () => api.getWatchlistStats(),
    enabled: isAuthenticated,
  });
  
  const { data: unreadData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => api.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  
  const entries = watchlistData?.data?.items || [];
  const stats = statsData?.data;
  const unreadCount = unreadData?.data?.count || 0;
  
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const v = entry.vehicle;
    return (
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.vin?.toLowerCase().includes(q) ||
      v.year?.toString().includes(q)
    );
  });
  
  async function handleRemove(vehicleId: string) {
    await api.removeFromWatchlist(vehicleId);
    refetch();
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Please sign in</h1>
          <Link href="/login" className="text-primary-600 hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🚗</span>
                <span className="font-bold text-xl">Carlist</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/notifications"
                className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              
              <Link 
                href="/settings"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <Settings className="w-5 h-5" />
              </Link>
              
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.name || user?.email}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500">Watching</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalWatching}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500">Price Drops</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPriceDrops}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeListings}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500">Total Savings</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalSavings)}</p>
            </div>
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Watchlist</h1>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <button 
              onClick={() => refetch()}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Vehicle List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Car className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? 'No matching vehicles' : 'No vehicles tracked yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Install the browser extension and start tracking cars!'}
            </p>
            {!searchQuery && (
              <Link 
                href="/get-extension"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
              >
                Get the Extension
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredEntries.map(entry => (
                <VehicleCard 
                  key={entry.id} 
                  entry={entry} 
                  onRemove={() => handleRemove(entry.vehicleId)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

