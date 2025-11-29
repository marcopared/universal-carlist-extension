import Link from 'next/link';
import { ArrowRight, Bell, TrendingDown, RefreshCw, Shield, Zap, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              <span className="font-bold text-xl">Carlist</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium">
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-midnight text-white px-4 py-2 rounded-lg font-medium hover:bg-midnight-light transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-dark px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <Zap className="w-4 h-4" />
            Never miss a price drop again
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-midnight leading-tight animate-slide-up">
            Track Car Prices
            <br />
            <span className="gradient-text">Across Every Site</span>
          </h1>
          
          <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            One watchlist for Cars.com, Autotrader, CarGurus, Craigslist, Carvana, and dealer sites. 
            Get instant alerts when prices drop.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-primary-800 transition shadow-lg shadow-primary-500/25"
            >
              Start Tracking Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#how-it-works" 
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 transition border border-slate-200"
            >
              See How It Works
            </a>
          </div>
          
          {/* Supported Sites */}
          <div className="mt-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <p className="text-sm text-slate-500 mb-4">Works with all major car listing sites</p>
            <div className="flex flex-wrap justify-center gap-6 text-slate-400">
              <span className="font-medium">Cars.com</span>
              <span>•</span>
              <span className="font-medium">Autotrader</span>
              <span>•</span>
              <span className="font-medium">CarGurus</span>
              <span>•</span>
              <span className="font-medium">Craigslist</span>
              <span>•</span>
              <span className="font-medium">Carvana</span>
              <span>•</span>
              <span className="font-medium">+ More</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-20 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-midnight">How It Works</h2>
            <p className="mt-4 text-lg text-slate-600">Three simple steps to never overpay for a used car</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm card-hover">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-midnight mb-3">1. Browse Normally</h3>
              <p className="text-slate-600">
                Install our browser extension and browse car listings on any supported site as you normally would.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm card-hover">
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <RefreshCw className="w-7 h-7 text-accent-dark" />
              </div>
              <h3 className="text-xl font-bold text-midnight mb-3">2. Click to Track</h3>
              <p className="text-slate-600">
                See a car you like? Click the "Track" button. We'll save it to your watchlist and start monitoring.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm card-hover">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Bell className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-midnight mb-3">3. Get Alerts</h3>
              <p className="text-slate-600">
                Receive instant notifications when prices drop, listings are removed, or vehicles get relisted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-midnight mb-6">
                Never Miss a Deal
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-midnight">Price Drop Alerts</h3>
                    <p className="text-slate-600">Get notified the moment a price drops on any vehicle you're watching.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-midnight">Cross-Site Tracking</h3>
                    <p className="text-slate-600">Track the same VIN across multiple sites. One car, one watchlist entry.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-midnight">100% Privacy Focused</h3>
                    <p className="text-slate-600">We only capture data when you view a listing. No scraping, no crawling.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats Card */}
            <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-3xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-8">Why Users Love Carlist</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-4xl font-bold">$2,400</p>
                  <p className="text-white/70 mt-1">Average savings</p>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-4xl font-bold">15k+</p>
                  <p className="text-white/70 mt-1">Vehicles tracked</p>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-4xl font-bold">6</p>
                  <p className="text-white/70 mt-1">Sites supported</p>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-4xl font-bold">24/7</p>
                  <p className="text-white/70 mt-1">Price monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Saving?</h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of smart car shoppers who never overpay.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-midnight text-white/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚗</span>
            <span className="font-bold text-white">Carlist</span>
          </div>
          <p className="text-sm">© 2024 Carlist. Track smarter, save more.</p>
        </div>
      </footer>
    </div>
  );
}

