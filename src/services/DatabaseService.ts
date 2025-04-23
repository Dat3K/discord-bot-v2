/**
 * Database Service
 * 
 * This service manages the SQLite database for storing meal registrations.
 */

import { Database } from 'bun:sqlite';
import { LoggingService } from './LoggingService.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Database Service
 * Manages the SQLite database
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database;

  /**
   * Private constructor (Singleton pattern)
   */
  private constructor() {
    // Create an in-memory SQLite database
    this.db = new Database(':memory:');
    
    // Initialize the database
    this.initialize();
    
    logger.info('DatabaseService initialized');
  }

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initializes the database
   */
  private initialize(): void {
    // Create the meal_registrations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS meal_registrations (
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        message_id TEXT NOT NULL,
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, meal_type, message_id)
      )
    `);

    logger.info('Database initialized');
  }

  /**
   * Registers a user for a meal
   * @param userId The user ID
   * @param username The username
   * @param mealType The meal type (breakfast or dinner)
   * @param messageId The message ID
   * @returns Whether the registration was successful
   */
  public registerMeal(userId: string, username: string, mealType: string, messageId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO meal_registrations (user_id, username, meal_type, message_id)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(userId, username, mealType, messageId);
      
      logger.info('User registered for meal', { userId, username, mealType, messageId });
      
      return true;
    } catch (error) {
      logger.error('Error registering user for meal', { error, userId, username, mealType, messageId });
      return false;
    }
  }

  /**
   * Unregisters a user from a meal
   * @param userId The user ID
   * @param mealType The meal type (breakfast or dinner)
   * @param messageId The message ID
   * @returns Whether the unregistration was successful
   */
  public unregisterMeal(userId: string, mealType: string, messageId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM meal_registrations
        WHERE user_id = ? AND meal_type = ? AND message_id = ?
      `);
      
      stmt.run(userId, mealType, messageId);
      
      logger.info('User unregistered from meal', { userId, mealType, messageId });
      
      return true;
    } catch (error) {
      logger.error('Error unregistering user from meal', { error, userId, mealType, messageId });
      return false;
    }
  }

  /**
   * Gets all users registered for a meal
   * @param mealType The meal type (breakfast or dinner)
   * @param messageId The message ID
   * @returns The list of registered users
   */
  public getRegisteredUsers(mealType: string, messageId: string): { userId: string, username: string }[] {
    try {
      const stmt = this.db.prepare(`
        SELECT user_id, username
        FROM meal_registrations
        WHERE meal_type = ? AND message_id = ?
        ORDER BY username
      `);
      
      const rows = stmt.all(mealType, messageId) as { user_id: string, username: string }[];
      
      return rows.map(row => ({
        userId: row.user_id,
        username: row.username
      }));
    } catch (error) {
      logger.error('Error getting registered users', { error, mealType, messageId });
      return [];
    }
  }

  /**
   * Clears all registrations for a message
   * @param messageId The message ID
   * @returns Whether the clear was successful
   */
  public clearRegistrations(messageId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM meal_registrations
        WHERE message_id = ?
      `);
      
      stmt.run(messageId);
      
      logger.info('Registrations cleared', { messageId });
      
      return true;
    } catch (error) {
      logger.error('Error clearing registrations', { error, messageId });
      return false;
    }
  }
}
