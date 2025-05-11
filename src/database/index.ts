import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import config from '../config';
import { logger } from '../utils/logger';

// Define database schema types
export interface ActiveRegistration {
  message_id: string;
  channel_id: string;
  registration_type: string;
  end_timestamp: number;
  identifier_string?: string;
}

export interface ReactionData {
  id?: number;
  user_id: string;
  message_id: string;
  reaction_type: string;
  timestamp: number;
  removed: boolean;
}

export interface UserRegistration {
  id?: number;
  user_id: string;
  message_id: string;
  registration_type: string;
  meal_type: string; // 'breakfast', 'dinner', 'late'
  timestamp: number;
}

// Ensure the database directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, config.json.database.filename);
const db = new Database(dbPath);

// Set pragmas for better performance and safety
db.exec('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging for better concurrency
db.exec('PRAGMA foreign_keys = ON;'); // Enable foreign key constraints

// Initialize database with required tables
function initializeDatabase() {
  try {
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

    // Create reaction_data table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS reaction_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        reaction_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        removed BOOLEAN NOT NULL DEFAULT 0,
        UNIQUE(user_id, message_id, reaction_type)
      )
    `);

    // Create user_registrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        registration_type TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        UNIQUE(user_id, message_id, meal_type)
      )
    `);

    // Create indexes for better query performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_reaction_data_message_id ON reaction_data(message_id);
      CREATE INDEX IF NOT EXISTS idx_reaction_data_user_id ON reaction_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_registrations_message_id ON user_registrations(message_id);
      CREATE INDEX IF NOT EXISTS idx_user_registrations_user_id ON user_registrations(user_id);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to initialize database:', error);
    } else {
      logger.error('Failed to initialize database with unknown error');
    }
    throw error;
  }
}

// Initialize the database when this module is imported
initializeDatabase();

// Database operations for active_registrations
export const activeRegistrations = {
  /**
   * Add a new active registration
   * @param registration The registration data to add
   * @returns The added registration
   */
  add: (registration: ActiveRegistration): ActiveRegistration => {
    try {
      const stmt = db.prepare(`
        INSERT INTO active_registrations (message_id, channel_id, registration_type, end_timestamp, identifier_string)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        registration.message_id,
        registration.channel_id,
        registration.registration_type,
        registration.end_timestamp,
        registration.identifier_string || null
      );

      return registration;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to add active registration for message ${registration.message_id}:`, error);
      } else {
        logger.error(`Failed to add active registration for message ${registration.message_id} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get an active registration by message ID
   * @param messageId The message ID to look for
   * @returns The registration or null if not found
   */
  getByMessageId: (messageId: string): ActiveRegistration | null => {
    try {
      const stmt = db.prepare('SELECT * FROM active_registrations WHERE message_id = ?');
      return stmt.get(messageId) as ActiveRegistration | null;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get active registration for message ${messageId}:`, error);
      } else {
        logger.error(`Failed to get active registration for message ${messageId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get all active registrations
   * @returns Array of all active registrations
   */
  getAll: (): ActiveRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM active_registrations');
      return stmt.all() as ActiveRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to get all active registrations:', error);
      } else {
        logger.error('Failed to get all active registrations with unknown error');
      }
      throw error;
    }
  },

  /**
   * Get active registrations by type
   * @param type The registration type to filter by
   * @returns Array of matching active registrations
   */
  getByType: (type: string): ActiveRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM active_registrations WHERE registration_type = ?');
      return stmt.all(type) as ActiveRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get active registrations of type ${type}:`, error);
      } else {
        logger.error(`Failed to get active registrations of type ${type} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get active registrations that have ended
   * @param currentTimestamp The current timestamp to compare against
   * @returns Array of ended active registrations
   */
  getEnded: (currentTimestamp: number): ActiveRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM active_registrations WHERE end_timestamp <= ?');
      return stmt.all(currentTimestamp) as ActiveRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to get ended active registrations:', error);
      } else {
        logger.error('Failed to get ended active registrations with unknown error');
      }
      throw error;
    }
  },

  /**
   * Update an active registration
   * @param registration The registration data to update
   * @returns The updated registration
   */
  update: (registration: ActiveRegistration): ActiveRegistration => {
    try {
      const stmt = db.prepare(`
        UPDATE active_registrations
        SET channel_id = ?, registration_type = ?, end_timestamp = ?, identifier_string = ?
        WHERE message_id = ?
      `);

      stmt.run(
        registration.channel_id,
        registration.registration_type,
        registration.end_timestamp,
        registration.identifier_string || null,
        registration.message_id
      );

      return registration;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to update active registration for message ${registration.message_id}:`, error);
      } else {
        logger.error(`Failed to update active registration for message ${registration.message_id} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Remove an active registration
   * @param messageId The message ID to remove
   * @returns True if removed, false if not found
   */
  remove: (messageId: string): boolean => {
    try {
      const stmt = db.prepare('DELETE FROM active_registrations WHERE message_id = ?');
      const result = stmt.run(messageId);
      return result.changes > 0;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to remove active registration for message ${messageId}:`, error);
      } else {
        logger.error(`Failed to remove active registration for message ${messageId} with unknown error`);
      }
      throw error;
    }
  }
};

// Database operations for reaction_data
export const reactionData = {
  /**
   * Add a new reaction data entry
   * @param reaction The reaction data to add
   * @returns The added reaction data with ID
   */
  add: (reaction: ReactionData): ReactionData => {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO reaction_data (user_id, message_id, reaction_type, timestamp, removed)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        reaction.user_id,
        reaction.message_id,
        reaction.reaction_type,
        reaction.timestamp,
        reaction.removed ? 1 : 0
      );

      return { ...reaction, id: result.lastInsertRowid as number };
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to add reaction data for user ${reaction.user_id} on message ${reaction.message_id}:`, error);
      } else {
        logger.error(`Failed to add reaction data for user ${reaction.user_id} on message ${reaction.message_id} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get reaction data by message ID
   * @param messageId The message ID to look for
   * @returns Array of reaction data for the message
   */
  getByMessageId: (messageId: string): ReactionData[] => {
    try {
      const stmt = db.prepare('SELECT * FROM reaction_data WHERE message_id = ?');
      return stmt.all(messageId) as ReactionData[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get reaction data for message ${messageId}:`, error);
      } else {
        logger.error(`Failed to get reaction data for message ${messageId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get active (not removed) reaction data by message ID
   * @param messageId The message ID to look for
   * @returns Array of active reaction data for the message
   */
  getActiveByMessageId: (messageId: string): ReactionData[] => {
    try {
      const stmt = db.prepare('SELECT * FROM reaction_data WHERE message_id = ? AND removed = 0');
      return stmt.all(messageId) as ReactionData[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get active reaction data for message ${messageId}:`, error);
      } else {
        logger.error(`Failed to get active reaction data for message ${messageId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get reaction data by user ID
   * @param userId The user ID to look for
   * @returns Array of reaction data for the user
   */
  getByUserId: (userId: string): ReactionData[] => {
    try {
      const stmt = db.prepare('SELECT * FROM reaction_data WHERE user_id = ?');
      return stmt.all(userId) as ReactionData[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get reaction data for user ${userId}:`, error);
      } else {
        logger.error(`Failed to get reaction data for user ${userId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get specific reaction data
   * @param userId The user ID
   * @param messageId The message ID
   * @param reactionType The reaction type
   * @returns The reaction data or null if not found
   */
  get: (userId: string, messageId: string, reactionType: string): ReactionData | null => {
    try {
      const stmt = db.prepare('SELECT * FROM reaction_data WHERE user_id = ? AND message_id = ? AND reaction_type = ?');
      return stmt.get(userId, messageId, reactionType) as ReactionData | null;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get reaction data for user ${userId} on message ${messageId} with reaction ${reactionType}:`, error);
      } else {
        logger.error(`Failed to get reaction data for user ${userId} on message ${messageId} with reaction ${reactionType} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Mark a reaction as removed
   * @param userId The user ID
   * @param messageId The message ID
   * @param reactionType The reaction type
   * @param timestamp The timestamp of the removal
   * @returns True if marked as removed, false if not found
   */
  markAsRemoved: (userId: string, messageId: string, reactionType: string, timestamp: number): boolean => {
    try {
      const stmt = db.prepare(`
        UPDATE reaction_data
        SET removed = 1, timestamp = ?
        WHERE user_id = ? AND message_id = ? AND reaction_type = ?
      `);

      const result = stmt.run(timestamp, userId, messageId, reactionType);
      return result.changes > 0;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to mark reaction as removed for user ${userId} on message ${messageId} with reaction ${reactionType}:`, error);
      } else {
        logger.error(`Failed to mark reaction as removed for user ${userId} on message ${messageId} with reaction ${reactionType} with unknown error`);
      }
      throw error;
    }
  }
};

// Database operations for user_registrations
export const userRegistrations = {
  /**
   * Add a new user registration
   * @param registration The user registration data to add
   * @returns The added user registration with ID
   */
  add: (registration: UserRegistration): UserRegistration => {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_registrations (user_id, message_id, registration_type, meal_type, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        registration.user_id,
        registration.message_id,
        registration.registration_type,
        registration.meal_type,
        registration.timestamp
      );

      return { ...registration, id: result.lastInsertRowid as number };
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to add user registration for user ${registration.user_id} on message ${registration.message_id}:`, error);
      } else {
        logger.error(`Failed to add user registration for user ${registration.user_id} on message ${registration.message_id} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get user registrations by message ID
   * @param messageId The message ID to look for
   * @returns Array of user registrations for the message
   */
  getByMessageId: (messageId: string): UserRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM user_registrations WHERE message_id = ?');
      return stmt.all(messageId) as UserRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get user registrations for message ${messageId}:`, error);
      } else {
        logger.error(`Failed to get user registrations for message ${messageId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get user registrations by user ID
   * @param userId The user ID to look for
   * @returns Array of user registrations for the user
   */
  getByUserId: (userId: string): UserRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM user_registrations WHERE user_id = ?');
      return stmt.all(userId) as UserRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get user registrations for user ${userId}:`, error);
      } else {
        logger.error(`Failed to get user registrations for user ${userId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get user registrations by type
   * @param type The registration type to filter by
   * @returns Array of user registrations of the specified type
   */
  getByType: (type: string): UserRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM user_registrations WHERE registration_type = ?');
      return stmt.all(type) as UserRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get user registrations of type ${type}:`, error);
      } else {
        logger.error(`Failed to get user registrations of type ${type} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Get user registrations by meal type
   * @param mealType The meal type to filter by
   * @returns Array of user registrations for the specified meal type
   */
  getByMealType: (mealType: string): UserRegistration[] => {
    try {
      const stmt = db.prepare('SELECT * FROM user_registrations WHERE meal_type = ?');
      return stmt.all(mealType) as UserRegistration[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get user registrations for meal type ${mealType}:`, error);
      } else {
        logger.error(`Failed to get user registrations for meal type ${mealType} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Remove user registrations by message ID
   * @param messageId The message ID to remove registrations for
   * @returns The number of registrations removed
   */
  removeByMessageId: (messageId: string): number => {
    try {
      const stmt = db.prepare('DELETE FROM user_registrations WHERE message_id = ?');
      const result = stmt.run(messageId);
      return result.changes;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to remove user registrations for message ${messageId}:`, error);
      } else {
        logger.error(`Failed to remove user registrations for message ${messageId} with unknown error`);
      }
      throw error;
    }
  },

  /**
   * Remove a specific user registration
   * @param userId The user ID
   * @param messageId The message ID
   * @param mealType The meal type
   * @returns True if removed, false if not found
   */
  remove: (userId: string, messageId: string, mealType: string): boolean => {
    try {
      const stmt = db.prepare('DELETE FROM user_registrations WHERE user_id = ? AND message_id = ? AND meal_type = ?');
      const result = stmt.run(userId, messageId, mealType);
      return result.changes > 0;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to remove user registration for user ${userId} on message ${messageId} for meal type ${mealType}:`, error);
      } else {
        logger.error(`Failed to remove user registration for user ${userId} on message ${messageId} for meal type ${mealType} with unknown error`);
      }
      throw error;
    }
  }
};

// Export the database instance for direct access if needed
export default db;
