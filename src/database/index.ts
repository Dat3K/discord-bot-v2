import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import config from '../config/config.json';

// Ensure the database directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, config.database.filename);
const db = new Database(dbPath);

// Initialize database with required tables
function initializeDatabase() {
  // Create active_registrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS active_registrations (
      message_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      registration_type TEXT NOT NULL,
      end_timestamp INTEGER NOT NULL,
      identifier_string TEXT
    )
  `);

  console.log('Database initialized successfully');
}

// Initialize the database when this module is imported
initializeDatabase();

export default db;
