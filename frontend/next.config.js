/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cars.com' },
      { protocol: 'https', hostname: '**.autotrader.com' },
      { protocol: 'https', hostname: '**.cargurus.com' },
      { protocol: 'https', hostname: '**.craigslist.org' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.carvana.com' },
      { protocol: 'https', hostname: '**.carfax.com' },
    ],
  },
};

module.exports = nextConfig;

