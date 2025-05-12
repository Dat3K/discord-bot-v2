import { createClient, connectClient, disconnectClient } from './utils/client';
import { registerEvents } from './events';
import { logger } from './utils/logger';
import config, { setDiscordChannels } from './config';
import { TextChannel } from 'discord.js';
import scheduler from './scheduler';
import messageScheduler from './scheduler/messageScheduler';
import mealRegistrationService from './services/mealRegistrationService';
import stateRecoveryService from './services/stateRecoveryService';

// Main function to start the bot
async function main() {
  try {
    // Create and configure the Discord client
    const client = createClient();

    // Register event handlers
    registerEvents(client);

    // Connect to Discord
    await connectClient(client, config.env.BOT_TOKEN);

    // Set up Discord channels once client is ready
    client.once('ready', () => {
      try {
        const guild = client.guilds.cache.get(config.env.GUILD_ID);
        if (!guild) {
          throw new Error(`Guild with ID ${config.env.GUILD_ID} not found`);
        }

        // Set up channel references
        const channels: {[key: string]: TextChannel | undefined} = {
          testLog: guild.channels.cache.get(config.env.TEST_LOG_CHANNEL_ID) as TextChannel,
          mealReminder: guild.channels.cache.get(config.env.MEAL_REMINDER_CHANNEL_ID) as TextChannel,
          mealRegistration: guild.channels.cache.get(config.env.MEAL_REGISTRATION_CHANNEL_ID) as TextChannel,
          mealRegistrationLog: guild.channels.cache.get(config.env.MEAL_REGISTRATION_LOG_CHANNEL_ID) as TextChannel,
          lateMealRegistration: guild.channels.cache.get(config.env.LATE_MEAL_REGISTRATION_CHANNEL_ID) as TextChannel,
          lateMealRegistrationLog: guild.channels.cache.get(config.env.LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID) as TextChannel
        };

        // Add error notification channel if configured
        if (config.env.ERROR_NOTIFICATION_CHANNEL_ID) {
          channels.errorNotification = guild.channels.cache.get(config.env.ERROR_NOTIFICATION_CHANNEL_ID) as TextChannel;
        }

        // Validate channels
        const missingChannels = Object.entries(channels)
          .filter(([_, channel]) => !channel)
          .map(([name]) => name);

        if (missingChannels.length > 0) {
          throw new Error(`Missing channels: ${missingChannels.join(', ')}`);
        }

        // Set channels in config
        setDiscordChannels(channels);

        // Initialize scheduler and services
        scheduler.initialize(client);
        messageScheduler.initialize(client);

        // Initialize state recovery service first to recover any active registrations
        stateRecoveryService.initialize(client);

        // Initialize other services
        mealRegistrationService.initialize(client);

        logger.info(`Bot is running in ${config.isDevelopment ? 'development' : 'production'} mode`);
      } catch (error) {
        if (error instanceof Error) {
          logger.error('Failed to set up Discord channels:', error);
        } else {
          logger.error('Failed to set up Discord channels with unknown error');
        }
      }
    });

    // Handle process termination
    setupProcessHandlers(client);

    logger.info('Bot initialization complete');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Failed to start bot:', error);
    } else {
      logger.error('Failed to start bot with unknown error');
    }
    process.exit(1);
  }
}

// Set up handlers for process termination
function setupProcessHandlers(client: ReturnType<typeof createClient>) {
  const shutdown = () => {
    logger.info('Bot is shutting down...');

    // Stop the scheduler
    scheduler.stop();

    // Disconnect from Discord
    disconnectClient(client);

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error);
    shutdown();
  });
  process.on('unhandledRejection', (reason: unknown) => {
    if (reason instanceof Error) {
      logger.error('Unhandled rejection:', reason);
    } else {
      logger.error('Unhandled rejection with unknown reason');
    }
  });
}

// Start the bot
main();
