import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';

/**
 * Event handler for client errors
 * @param client The Discord client
 */
export default (client: Client): void => {
  client.on(Events.Error, (error) => {
    logger.error('Discord client error:', error);
  });
};
