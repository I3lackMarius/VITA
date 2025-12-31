import fs from 'fs/promises';
import path from 'path';

/*
 * Demo data store utilities.
 *
 * When the application is running in demo mode (DEMO_MODE=true) it should
 * avoid all external connections such as PostgreSQL or remote APIs. Instead
 * it reads from and writes to a JSON file stored alongside the application.
 * This module centralises the logic for detecting demo mode, loading the
 * dataset, persisting changes and generating unique identifiers.  The
 * functions exported here are used by the API route handlers to provide
 * a seamless experience without touching the database.
 */

// Determine the absolute path to the demo data file.  When running
// `npm run dev` from the apps/web directory, process.cwd() resolves to
// the root of the Next.js app (apps/web).  The JSON file lives in
// the same directory so we can simply join on 'demo-data.json'.
const dataFilePath = path.join(process.cwd(), 'demo-data.json');

/**
 * Returns true if the application is running in demo mode.  Demo mode
 * is enabled by setting the environment variable DEMO_MODE to 'true'.
 */
export function isDemo() {
  const value = process.env.DEMO_MODE;
  if (!value) return false;
  const normalized = String(value).toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Ensure that the demo data file exists.  If it does not exist, it
 * will be created with an empty dataset structure.  This helper is
 * invoked implicitly by readDemo() before attempting to read the file.
 */
async function ensureDataFile() {
  try {
    await fs.access(dataFilePath);
  } catch (_) {
    const initialData = {
      users: [],
      tasks: [],
      habits: [],
      habit_logs: [],
    };
    await fs.writeFile(dataFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

/**
 * Read and return the entire demo dataset.  If the file does not exist
 * it will be created with an empty structure.
 */
export async function readDemo() {
  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Persist the given dataset back to disk.  This completely replaces the
 * contents of the JSON file.  The data should be a plain object with
 * the same shape as returned by readDemo().
 */
export async function writeDemo(data) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Generate a unique identifier for demo records.  A prefix helps to
 * differentiate between different types of entities (e.g. users, tasks,
 * habits, logs).  The implementation uses the current timestamp and a
 * random string to avoid collisions.
 */
export function newId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}