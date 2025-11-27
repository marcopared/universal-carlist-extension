import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Carlist - Universal Car Watchlist',
  description: 'Track used car listings across Cars.com, Autotrader, CarGurus, Craigslist, Facebook Marketplace & more. Get price drop alerts!',
  keywords: ['used cars', 'car watchlist', 'price tracker', 'cars.com', 'autotrader', 'cargurus'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

