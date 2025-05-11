import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { TextChannel } from 'discord.js';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Define types for environment variables
export interface EnvConfig {
  // Discord Bot Configuration
  BOT_TOKEN: string;
  CLIENT_ID: string;
  GUILD_ID: string;
  
  // Timezone Configuration
  TZ: string;
  
  // Logging Configuration
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  TEST_LOG_CHANNEL_ID: string;
  
  // Meal Reminder Configuration
  MEAL_REMINDER_CHANNEL_ID: string;
  
  // Meal Registration Configuration
  MEAL_REGISTRATION_CHANNEL_ID: string;
  MEAL_REGISTRATION_LOG_CHANNEL_ID: string;
  LATE_MEAL_REGISTRATION_CHANNEL_ID: string;
  LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID: string;
  
  // User Role Configuration
  TRACKED_ROLE_ID: string;
  
  // Development Mode
  NODE_ENV: 'development' | 'production';
  
  // Optional: Error notification channel
  ERROR_NOTIFICATION_CHANNEL_ID?: string;
}

// Define types for config.json
export interface JsonConfig {
  bot: {
    name: string;
    version: string;
  };
  messages: {
    reminder: {
      title: string;
      description: string;
      color: string;
    };
    mealRegistration: {
      title: string;
      description: string;
      color: string;
      footer: string;
    };
    lateMorningRegistration: {
      title: string;
      description: string;
      color: string;
      footer: string;
    };
    lateEveningRegistration: {
      title: string;
      description: string;
      color: string;
      footer: string;
    };
    registrationEnd: {
      title: string;
      description: string;
      color: string;
      footer: string;
    };
  };
  emojis: {
    breakfast: string;
    dinner: string;
    late: string;
  };
  database: {
    filename: string;
  };
  timing?: {
    regularRegistration: {
      startTime: string; // Format: "HH:MM"
      endTime: string;   // Format: "HH:MM"
    };
    lateMorningRegistration: {
      startTime: string;
      endTime: string;
    };
    lateEveningRegistration: {
      startTime: string;
      endTime: string;
    };
    developmentMode: {
      registrationDurationSeconds: number;
    };
  };
}

// Define the combined configuration type
export interface Config {
  env: EnvConfig;
  json: JsonConfig;
  isDevelopment: boolean;
  channels: {
    testLog?: TextChannel;
    mealReminder?: TextChannel;
    mealRegistration?: TextChannel;
    mealRegistrationLog?: TextChannel;
    lateMealRegistration?: TextChannel;
    lateMealRegistrationLog?: TextChannel;
    errorNotification?: TextChannel;
  };
}

// Load JSON configuration
function loadJsonConfig(): JsonConfig {
  try {
    const configPath = path.join(process.cwd(), 'src', 'config', 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData) as JsonConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config.json: ${error.message}`);
    }
    throw new Error('Failed to load config.json: Unknown error');
  }
}

// Validate environment variables
function validateEnvConfig(): EnvConfig {
  const requiredEnvVars = [
    'BOT_TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'TZ',
    'LOG_LEVEL',
    'TEST_LOG_CHANNEL_ID',
    'MEAL_REMINDER_CHANNEL_ID',
    'MEAL_REGISTRATION_CHANNEL_ID',
    'MEAL_REGISTRATION_LOG_CHANNEL_ID',
    'LATE_MEAL_REGISTRATION_CHANNEL_ID',
    'LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID',
    'TRACKED_ROLE_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate LOG_LEVEL
  const logLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (logLevel && !['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error(`Invalid LOG_LEVEL: ${logLevel}. Must be one of: debug, info, warn, error`);
  }
  
  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv && !['development', 'production'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be one of: development, production`);
  }
  
  return {
    BOT_TOKEN: process.env.BOT_TOKEN!,
    CLIENT_ID: process.env.CLIENT_ID!,
    GUILD_ID: process.env.GUILD_ID!,
    TZ: process.env.TZ!,
    LOG_LEVEL: (process.env.LOG_LEVEL?.toLowerCase() || 'info') as EnvConfig['LOG_LEVEL'],
    TEST_LOG_CHANNEL_ID: process.env.TEST_LOG_CHANNEL_ID!,
    MEAL_REMINDER_CHANNEL_ID: process.env.MEAL_REMINDER_CHANNEL_ID!,
    MEAL_REGISTRATION_CHANNEL_ID: process.env.MEAL_REGISTRATION_CHANNEL_ID!,
    MEAL_REGISTRATION_LOG_CHANNEL_ID: process.env.MEAL_REGISTRATION_LOG_CHANNEL_ID!,
    LATE_MEAL_REGISTRATION_CHANNEL_ID: process.env.LATE_MEAL_REGISTRATION_CHANNEL_ID!,
    LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID: process.env.LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID!,
    TRACKED_ROLE_ID: process.env.TRACKED_ROLE_ID!,
    NODE_ENV: (process.env.NODE_ENV?.toLowerCase() || 'production') as EnvConfig['NODE_ENV'],
    ERROR_NOTIFICATION_CHANNEL_ID: process.env.ERROR_NOTIFICATION_CHANNEL_ID
  };
}

// Create the configuration object
const config: Config = {
  env: validateEnvConfig(),
  json: loadJsonConfig(),
  isDevelopment: process.env.NODE_ENV?.toLowerCase() === 'development',
  channels: {}
};

// Function to set Discord channels after client is ready
export function setDiscordChannels(channels: Config['channels']): void {
  config.channels = { ...config.channels, ...channels };
  logger.info('Discord channels configured');
}

// Export the configuration
export default config;
