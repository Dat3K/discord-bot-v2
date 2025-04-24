/**
 * Discord Bot V2 - Main Entry Point
 *
 * This is the main entry point for the Discord bot.
 * It initializes the bot, sets up event handlers, and starts the bot.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config/config.js';
import { setupEventHandlers } from './events/eventHandler.js';
import { LoggingService } from './services/LoggingService.js';

// Initialize the logger
const logger = LoggingService.getInstance();

// Display startup banner
logger.divider('DISCORD BOT STARTUP');
logger.info('Initializing Discord Bot V2', {
  environment: config.isDevelopment ? 'Development' : 'Production',
  timezone: config.timezone.timezone,
  logLevel: config.logging.level
});

// Create a new Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Required for fetching guild members
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

// Set up event handlers
setupEventHandlers(client);

// Login to Discord with the bot token
logger.divider('CONNECTING TO DISCORD');
client.login(config.bot.token)
  .then(() => {
    logger.info('Bot successfully logged in', {
      clientId: config.bot.clientId,
      guildId: config.bot.guildId
    });
    logger.divider('BOT READY');
  })
  .catch((error) => {
    logger.error('Failed to login to Discord', { error });
    process.exit(1);
  });

// Handle process termination
process.on('SIGINT', () => {
  logger.divider('SHUTDOWN INITIATED');
  logger.info('SIGINT received. Shutting down...');
  client.destroy();
  logger.divider('BOT TERMINATED');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.divider('SHUTDOWN INITIATED');
  logger.info('SIGTERM received. Shutting down...');
  client.destroy();
  logger.divider('BOT TERMINATED');
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.divider('ERROR', 'error');
  logger.error('Unhandled promise rejection', { error });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.divider('FATAL ERROR', 'error');
  logger.error('Uncaught exception', { error });
  client.destroy();
  logger.divider('BOT TERMINATED DUE TO ERROR', 'error');
  process.exit(1);
});
