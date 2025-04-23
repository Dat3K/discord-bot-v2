/**
 * Configuration Interfaces
 * 
 * This file defines interfaces for configuration.
 */

import type { LogLevel } from '../config/config';

/**
 * Bot configuration interface
 */
export interface BotConfig {
  /**
   * The bot token
   */
  token: string;

  /**
   * The client ID
   */
  clientId: string;

  /**
   * The guild ID
   */
  guildId: string;
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  /**
   * The log level
   */
  level: LogLevel;

  /**
   * The channel ID for error notifications
   */
  errorNotificationChannelId: string;
}

/**
 * Timezone configuration interface
 */
export interface TimezoneConfig {
  /**
   * The timezone
   */
  timezone: string;
}

/**
 * Main configuration interface
 */
export interface Config {
  /**
   * Bot configuration
   */
  bot: BotConfig;

  /**
   * Logging configuration
   */
  logging: LoggingConfig;

  /**
   * Timezone configuration
   */
  timezone: TimezoneConfig;

  /**
   * Whether the bot is running in development mode
   */
  isDevelopment: boolean;
}
