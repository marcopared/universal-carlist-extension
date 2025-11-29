// Background service worker
import { api } from './api';
import type { ExtractedListing } from './types';

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender) {
  console.log('Background received:', message.type);
  
  switch (message.type) {
    case 'TRACK_LISTING':
      return handleTrackListing(message.payload);
    
    case 'CHECK_URL':
      return handleCheckUrl(message.payload.url);
    
    case 'CHECK_AUTH':
      return handleCheckAuth();
    
    case 'GET_WATCHLIST':
      return handleGetWatchlist();
    
    case 'REMOVE_FROM_WATCHLIST':
      return handleRemoveFromWatchlist(message.payload.vehicleId);
    
    case 'OPEN_POPUP':
      // This would typically open the popup, but we can't do that programmatically
      // Instead, we'll show a notification
      return { success: true };
    
    default:
      return { success: false, error: 'Unknown message type' };
  }
}

async function handleTrackListing(listing: ExtractedListing) {
  try {
    // First check if user is authenticated
    const auth = await api.checkAuth();
    
    if (!auth.isAuthenticated) {
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }
    
    // Submit snapshot to backend
    const snapshotResult = await api.submitSnapshot(listing);
    
    if (!snapshotResult.success) {
      return { 
        success: false, 
        error: snapshotResult.error?.code,
        message: snapshotResult.error?.message 
      };
    }
    
    const vehicleId = snapshotResult.data!.vehicle.id;
    const alreadyWatching = snapshotResult.data!.isWatching;
    
    if (alreadyWatching) {
      return { success: true, alreadyWatching: true, vehicle: snapshotResult.data!.vehicle };
    }
    
    // Add to watchlist
    const watchResult = await api.addToWatchlist(vehicleId);
    
    if (!watchResult.success) {
      return { 
        success: false, 
        error: watchResult.error?.code,
        message: watchResult.error?.message 
      };
    }
    
    return { 
      success: true, 
      alreadyWatching: watchResult.data!.alreadyWatching,
      vehicle: snapshotResult.data!.vehicle 
    };
  } catch (error) {
    console.error('Track listing error:', error);
    return { success: false, error: 'UNKNOWN_ERROR', message: 'Something went wrong' };
  }
}

async function handleCheckUrl(url: string) {
  try {
    const auth = await api.checkAuth();
    
    if (!auth.isAuthenticated) {
      return { success: false, isWatching: false };
    }
    
    const result = await api.checkUrl(url);
    
    return {
      success: result.success,
      isWatching: result.data?.isWatching || false,
      vehicle: result.data?.vehicle,
      freshness: result.data?.freshness,
    };
  } catch (error) {
    return { success: false, isWatching: false };
  }
}

async function handleCheckAuth() {
  const auth = await api.checkAuth();
  return { success: true, auth };
}

async function handleGetWatchlist() {
  try {
    const auth = await api.checkAuth();
    
    if (!auth.isAuthenticated) {
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }
    
    const result = await api.getWatchlistSummary();
    
    return {
      success: result.success,
      data: result.data,
    };
  } catch (error) {
    return { success: false, error: 'UNKNOWN_ERROR' };
  }
}

async function handleRemoveFromWatchlist(vehicleId: string) {
  try {
    const auth = await api.checkAuth();
    
    if (!auth.isAuthenticated) {
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }
    
    const result = await api.removeFromWatchlist(vehicleId);
    
    return { success: result.success };
  } catch (error) {
    return { success: false, error: 'UNKNOWN_ERROR' };
  }
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page
    chrome.tabs.create({
      url: 'https://carlist.app/welcome?source=extension'
    });
  }
});

// Handle auth callback from web
chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    if (message.type === 'AUTH_CALLBACK' && message.token) {
      await api.saveToken(message.token);
      sendResponse({ success: true });
    }
    return true;
  }
);

