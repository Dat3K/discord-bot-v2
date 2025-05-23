/**
 * Configuration Singleton
 *
 * This file implements the Singleton pattern for configuration management.
 * It loads environment variables and provides a centralized configuration object.
 */

// Load environment variables
import { getEnv, isDevelopment } from '../utils/env';

// Define log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

// Import configuration interfaces
import type { Config } from '../interfaces/Config';

// Create the configuration singleton
class Configuration {
  private static instance: Configuration;
  private config: Config;

  private constructor() {
    // Load environment variables
    this.config = {
      bot: {
        token: getEnv('BOT_TOKEN'),
        clientId: getEnv('CLIENT_ID'),
        guildId: getEnv('GUILD_ID'),
      },
      logging: {
        level: getEnv('LOG_LEVEL', 'info') as LogLevel,
        errorNotificationChannelId: getEnv('ERROR_NOTIFICATION_CHANNEL_ID', ''),
      },
      timezone: {
        timezone: getEnv('TZ', 'America/Sao_Paulo'), // Default to UTC-3
      },
      mealReminder: {
        channelId: getEnv('MEAL_REMINDER_CHANNEL_ID', ''),
      },
      mealRegistration: {
        channelId: getEnv('MEAL_REGISTRATION_CHANNEL_ID', ''),
        logChannelId: getEnv('MEAL_REGISTRATION_LOG_CHANNEL_ID', ''),
        lateChannelId: getEnv('LATE_MEAL_REGISTRATION_CHANNEL_ID', ''),
        lateLogChannelId: getEnv('LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID', ''),
      },
      isDevelopment: isDevelopment(),
    };

    // Validate configuration
    this.validateConfig();
  }

  public static getInstance(): Configuration {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration();
    }
    return Configuration.instance;
  }

  public getConfig(): Config {
    return this.config;
  }

  private validateConfig(): void {
    // Validate bot token
    if (!this.config.bot.token) {
      throw new Error('BOT_TOKEN is required');
    }

    // Validate client ID
    if (!this.config.bot.clientId) {
      throw new Error('CLIENT_ID is required');
    }

    // Validate guild ID
    if (!this.config.bot.guildId) {
      throw new Error('GUILD_ID is required');
    }
  }
}

// Export the configuration
export const config = Configuration.getInstance().getConfig();
