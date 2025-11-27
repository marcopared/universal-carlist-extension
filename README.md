# 🚗 Carlist - Universal Used Car Watchlist

Track used car listings across **Cars.com, Autotrader, CarGurus, Craigslist, Facebook Marketplace**, and dealer sites. Get instant notifications when prices drop.

## 🎯 What This Does

- **Universal Watchlist**: One list for cars from any site
- **Price Drop Alerts**: Get notified when prices drop
- **VIN-Based Tracking**: Same car tracked across multiple sites
- **Crowd-Powered Updates**: When one user refreshes, everyone benefits
- **Price History**: See how prices change over time
- **100% Legal**: User-driven data capture only, no scraping

## 🏗️ Architecture

This is a **monorepo** with three main components:

```
├── backend/          # Express.js API server
├── frontend/         # Next.js web dashboard
├── extension/        # Chrome/Firefox browser extension
└── packages/
    └── shared/       # Shared types and utilities
```

### How It Works (Legal Approach)

1. **User-Driven Capture**: Data is ONLY captured when a user views a listing
2. **Crowd Refresh**: When ANY user refreshes a listing, ALL watchers benefit
3. **Email Integration**: Gmail OAuth parses price alerts from listing sites
4. **HEAD Checks**: Lightweight checks (no HTML parsing) detect removed listings

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/universal-carlist-extension.git
cd universal-carlist-extension
npm install
```

### 2. Set Up Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/carlist?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-key"

# Google OAuth (optional, for Gmail integration)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 3. Initialize Database

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development

```bash
# From root directory
npm run dev

# Or individually:
npm run dev:backend   # API on http://localhost:3001
npm run dev:frontend  # Web on http://localhost:3000
npm run dev:extension # Build extension with watch
```

### 5. Load Extension

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## 📱 Features

### Browser Extension

- **Floating "Track" Button**: Appears on car listing pages
- **One-Click Add**: Add any car to your watchlist
- **Popup Dashboard**: Quick access to recent watches
- **Auto-Extraction**: Captures price, mileage, VIN, photos, etc.

### Web Dashboard

- **Watchlist View**: See all tracked vehicles
- **Price History Charts**: Visualize price changes
- **Freshness Indicators**: Know when data was last updated
- **Compare Vehicles**: Side-by-side comparison
- **Notification Center**: All your alerts in one place

### Backend API

- **RESTful API**: Full CRUD for vehicles and watchlist
- **Real-time Updates**: Redis pub/sub for instant notifications
- **Background Jobs**: BullMQ for HEAD checks and emails
- **Email Notifications**: Automatic alerts on price drops

## 🔌 Supported Sites

| Site | Status | VIN Detection | Photos |
|------|--------|---------------|--------|
| Cars.com | ✅ | ✅ | ✅ |
| Autotrader | ✅ | ✅ | ✅ |
| CarGurus | ✅ | ✅ | ✅ |
| Craigslist | ✅ | ⚠️ | ✅ |
| FB Marketplace | ✅ | ⚠️ | ✅ |
| Carvana | ✅ | ✅ | ✅ |
| Dealer Sites | ⚠️ Generic | ⚠️ | ⚠️ |

## 🔄 Crowd Refresh System

The key innovation is **crowd-powered updates**:

1. User A views a listing → extension captures snapshot
2. Backend detects price changed from previous snapshot
3. Backend notifies ALL users watching that VIN
4. Everyone benefits from User A's view

This means:
- More users = fresher data for everyone
- No scraping needed
- Fully compliant with ToS

## 📊 Data Model

```
Vehicle (VIN is primary key when available)
├── Snapshots (point-in-time captures)
├── PriceChanges (detected drops/rises)
├── StatusChanges (sold, removed, relisted)
└── WatchlistEntries (user-specific settings)
```

When VIN isn't available, we use **fuzzy fingerprinting**:
- Year + Make + Model + Trim + Mileage (rounded) + Price (rounded) + Location

## 🔒 Privacy & Legal

- **No Scraping**: We never crawl or scrape sites
- **No HTML Parsing on Server**: All extraction happens in user's browser
- **User-Triggered Only**: Data captured only when user views a page
- **HEAD Requests Only**: Server only checks if URLs are alive (200 vs 404)
- **Email Parsing**: Only with explicit OAuth consent

## 📁 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google/url` - Get OAuth URL

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add to watchlist
- `PATCH /api/watchlist/:vehicleId` - Update preferences
- `DELETE /api/watchlist/:vehicleId` - Remove from watchlist

### Vehicles
- `GET /api/vehicles/:id` - Get vehicle with history
- `GET /api/vehicles/vin/:vin` - Find by VIN
- `GET /api/vehicles/:id/price-history` - Get price timeline
- `POST /api/vehicles/compare` - Compare multiple vehicles

### Extension
- `POST /api/extension/snapshot` - Submit listing data
- `POST /api/extension/watch` - Quick add to watchlist
- `GET /api/extension/check-url` - Check if URL is tracked

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TailwindCSS, Framer Motion |
| Backend | Express.js, TypeScript, Prisma |
| Database | PostgreSQL |
| Cache/Queue | Redis, BullMQ |
| Extension | Chrome Manifest V3, React, Vite |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with ❤️ for smarter car shopping**

