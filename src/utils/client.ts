import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { logger } from './logger';

/**
 * Create and configure a new Discord client
 * @returns A configured Discord client
 */
export function createClient(): Client {
  // Create a new client instance with required intents and partials
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember,
    ],
    // Enable automatic reconnection attempts
    failIfNotExists: false,
    rest: {
      retries: 3,
      timeout: 15000,
    },
  });

  return client;
}

/**
 * Connect the client to Discord
 * @param client The Discord client
 * @param token The bot token
 * @returns A promise that resolves when the client is connected
 */
export async function connectClient(client: Client, token: string): Promise<void> {
  try {
    logger.info('Connecting to Discord...');
    await client.login(token);
    logger.info('Bot logged in successfully');
  } catch (error) {
    logger.error('Failed to connect to Discord:', error);
    throw error;
  }
}

/**
 * Gracefully disconnect the client
 * @param client The Discord client
 */
export function disconnectClient(client: Client): void {
  logger.info('Disconnecting from Discord...');
  client.destroy();
  logger.info('Bot disconnected successfully');
}
