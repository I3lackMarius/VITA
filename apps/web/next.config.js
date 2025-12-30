/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true
  },
  // Allow Next.js API routes to connect to the database URL at runtime.
  env: {
    DATABASE_URL: process.env.DATABASE_URL || ''
  }
};

module.exports = nextConfig;