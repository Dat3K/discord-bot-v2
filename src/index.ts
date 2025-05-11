import dotenv from 'dotenv';
import { createClient, connectClient, disconnectClient } from './utils/client';
import { registerEvents } from './events';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Main function to start the bot
async function main() {
  try {
    // Validate required environment variables
    const token = process.env.BOT_TOKEN;
    if (!token) {
      throw new Error('BOT_TOKEN is not defined in environment variables');
    }

    // Create and configure the Discord client
    const client = createClient();

    // Register event handlers
    registerEvents(client);

    // Connect to Discord
    await connectClient(client, token);

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
    disconnectClient(client);
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
