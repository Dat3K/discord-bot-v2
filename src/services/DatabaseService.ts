/**
 * Database Service
 *
 * This service manages the SQLite database for storing meal registrations and guild members.
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

    // Create the guild_members table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS guild_members (
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        nickname TEXT,
        roles TEXT,
        joined_at DATETIME,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
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

  /**
   * Stores a guild member in the database
   * @param userId The user ID
   * @param username The username
   * @param nickname The nickname (optional)
   * @param roles Comma-separated list of role IDs
   * @param joinedAt When the user joined the guild
   * @returns Whether the operation was successful
   */
  public storeGuildMember(userId: string, username: string, nickname: string | null, roles: string, joinedAt: Date | null): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO guild_members (user_id, username, nickname, roles, joined_at, last_updated)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        userId,
        username,
        nickname,
        roles,
        joinedAt ? joinedAt.toISOString() : null
      );

      logger.debug('Guild member stored', { userId, username });

      return true;
    } catch (error) {
      logger.error('Error storing guild member', { error, userId, username });
      return false;
    }
  }

  /**
   * Gets all guild members from the database
   * @returns The list of guild members
   */
  public getAllGuildMembers(): { userId: string, username: string, nickname: string | null, roles: string[], joinedAt: Date | null }[] {
    try {
      const stmt = this.db.prepare(`
        SELECT user_id, username, nickname, roles, joined_at
        FROM guild_members
        ORDER BY username
      `);

      const rows = stmt.all() as { user_id: string, username: string, nickname: string | null, roles: string, joined_at: string | null }[];

      return rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        nickname: row.nickname,
        roles: row.roles ? row.roles.split(',') : [],
        joinedAt: row.joined_at ? new Date(row.joined_at) : null
      }));
    } catch (error) {
      logger.error('Error getting guild members', { error });
      return [];
    }
  }

  /**
   * Gets guild members with a specific role
   * @param roleId The role ID to filter by
   * @returns The list of guild members with the role
   */
  public getGuildMembersByRole(roleId: string): { userId: string, username: string, nickname: string | null }[] {
    try {
      const stmt = this.db.prepare(`
        SELECT user_id, username, nickname
        FROM guild_members
        WHERE roles LIKE ?
        ORDER BY username
      `);

      // Use LIKE with wildcards to find the role ID in the comma-separated list
      const rows = stmt.all(`%${roleId}%`) as { user_id: string, username: string, nickname: string | null }[];

      return rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        nickname: row.nickname
      }));
    } catch (error) {
      logger.error('Error getting guild members by role', { error, roleId });
      return [];
    }
  }

  /**
   * Clears all guild members from the database
   * @returns Whether the operation was successful
   */
  public clearGuildMembers(): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM guild_members
      `);

      stmt.run();

      logger.info('Guild members cleared');

      return true;
    } catch (error) {
      logger.error('Error clearing guild members', { error });
      return false;
    }
  }
}
