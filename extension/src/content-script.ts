// Content script - runs on car listing pages
import { extractListing } from './extractors';
import type { ExtractedListing } from './types';

// Inject floating button UI
function injectUI() {
  // Check if already injected
  if (document.getElementById('carlist-extension-root')) return;
  
  const root = document.createElement('div');
  root.id = 'carlist-extension-root';
  document.body.appendChild(root);
  
  // Create floating action button
  const button = document.createElement('button');
  button.id = 'carlist-fab';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L12 20M4 12L20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Track</span>
  `;
  button.title = 'Add to Carlist Watchlist';
  
  // Style the button
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    color: white;
    border: none;
    border-radius: 50px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.4)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
  });
  
  button.addEventListener('click', handleTrackClick);
  
  root.appendChild(button);
}

// Handle track button click
async function handleTrackClick() {
  const button = document.getElementById('carlist-fab') as HTMLButtonElement;
  if (!button) return;
  
  // Show loading state
  const originalContent = button.innerHTML;
  button.innerHTML = `
    <svg class="carlist-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      <path d="M12 2C6.48 2 2 6.48 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Tracking...</span>
  `;
  button.disabled = true;
  
  try {
    // Extract listing data
    const listing = extractListing();
    
    if (!listing) {
      showToast('Could not extract listing data', 'error');
      button.innerHTML = originalContent;
      button.disabled = false;
      return;
    }
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      type: 'TRACK_LISTING',
      payload: listing,
    });
    
    if (response.success) {
      if (response.alreadyWatching) {
        showToast('Already tracking this vehicle!', 'info');
        updateButtonState('watching');
      } else {
        showToast('Added to watchlist! 🎉', 'success');
        updateButtonState('watching');
      }
    } else {
      if (response.error === 'NOT_AUTHENTICATED') {
        showToast('Please sign in to track vehicles', 'error');
        // Open popup for login
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      } else {
        showToast(response.message || 'Failed to track vehicle', 'error');
      }
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  } catch (error) {
    console.error('Track error:', error);
    showToast('Something went wrong', 'error');
    button.innerHTML = originalContent;
    button.disabled = false;
  }
}

// Update button to show watching state
function updateButtonState(state: 'watching' | 'track') {
  const button = document.getElementById('carlist-fab') as HTMLButtonElement;
  if (!button) return;
  
  if (state === 'watching') {
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Watching</span>
    `;
    button.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    button.disabled = false;
  } else {
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 4L12 20M4 12L20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Track</span>
    `;
    button.style.background = 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)';
    button.disabled = false;
  }
}

// Show toast notification
function showToast(message: string, type: 'success' | 'error' | 'info') {
  // Remove existing toast
  const existing = document.getElementById('carlist-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'carlist-toast';
  toast.textContent = message;
  
  const bgColor = {
    success: '#059669',
    error: '#dc2626',
    info: '#0072c6',
  }[type];
  
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 24px;
    z-index: 999999;
    padding: 12px 20px;
    background: ${bgColor};
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: carlist-slide-in 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'carlist-slide-out 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Check if current page is a listing and inject UI
function checkAndInject() {
  const url = window.location.href;
  
  // Patterns that indicate a vehicle listing page
  const listingPatterns = [
    /cars\.com\/vehicledetail/i,
    /autotrader\.com\/cars-for-sale\/vehicledetails/i,
    /cargurus\.com\/Cars\/.*VIN/i,
    /craigslist\.org\/.*\/cto\//i,
    /facebook\.com\/marketplace\/item/i,
    /carvana\.com\/vehicle/i,
    /carfax\.com\/vehicle/i,
    /vroom\.com\/inventory/i,
  ];
  
  const isListingPage = listingPatterns.some(pattern => pattern.test(url));
  
  if (isListingPage) {
    injectUI();
    checkWatchingStatus();
  }
}

// Check if user is already watching this vehicle
async function checkWatchingStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_URL',
      payload: { url: window.location.href },
    });
    
    if (response.success && response.isWatching) {
      updateButtonState('watching');
    }
  } catch (error) {
    // User might not be logged in
    console.log('Could not check watching status');
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes carlist-slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes carlist-slide-out {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes carlist-spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .carlist-spinner {
    animation: carlist-spin 1s linear infinite;
  }
`;
document.head.appendChild(style);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_LISTING') {
    const listing = extractListing();
    sendResponse({ success: !!listing, listing });
  }
  
  if (message.type === 'UPDATE_BUTTON_STATE') {
    updateButtonState(message.payload.state);
    sendResponse({ success: true });
  }
  
  return true;
});

// Run on page load
checkAndInject();

// Also run on URL changes (for SPAs)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Remove old UI
    const root = document.getElementById('carlist-extension-root');
    if (root) root.remove();
    // Check new page
    setTimeout(checkAndInject, 1000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

