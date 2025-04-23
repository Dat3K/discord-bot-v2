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
 * Meal reminder configuration interface
 */
export interface MealReminderConfig {
  /**
   * The channel ID for meal reminders
   */
  channelId: string;
}

/**
 * Meal registration configuration interface
 */
export interface MealRegistrationConfig {
  /**
   * The channel ID for meal registration
   */
  channelId: string;

  /**
   * The channel ID for logging meal registration activities
   */
  logChannelId: string;
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
   * Meal reminder configuration
   */
  mealReminder: MealReminderConfig;

  /**
   * Meal registration configuration
   */
  mealRegistration: MealRegistrationConfig;

  /**
   * Whether the bot is running in development mode
   */
  isDevelopment: boolean;
}
