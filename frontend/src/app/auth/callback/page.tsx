'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  
  useEffect(() => {
    async function handleCallback() {
      const token = searchParams.get('token');
      
      if (token) {
        // Save token
        localStorage.setItem('token', token);
        
        // Fetch user data
        const result = await api.getMe();
        
        if (result.success && result.data) {
          setAuth(token, result.data);
          
          // Check if this came from extension
          const source = searchParams.get('source');
          if (source === 'extension') {
            // Send token to extension
            try {
              // @ts-ignore - Chrome extension API
              if (typeof chrome !== 'undefined' && chrome.runtime) {
                // Try to send message to extension
                // Extension ID would need to be known in production
              }
            } catch (e) {
              console.log('Could not communicate with extension');
            }
          }
          
          router.push('/watchlist');
        } else {
          router.push('/login?error=auth_failed');
        }
      } else {
        router.push('/login?error=no_token');
      }
    }
    
    handleCallback();
  }, [searchParams, router, setAuth]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Signing you in...</p>
      </div>
    </div>
  );
}

