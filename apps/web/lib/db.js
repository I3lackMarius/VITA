import { Pool } from 'pg';

// This module exports a shared PostgreSQL connection pool.
// It reads the DATABASE_URL from environment variables. When running on Vercel
// or in Docker, this URL must be provided via env vars.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL non definito. Assicurati di impostarlo nel tuo .env o nella configurazione Vercel.');
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('postgres://') && !connectionString.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});