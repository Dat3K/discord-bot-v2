import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';

/**
 * Event handler for when the client is ready
 * @param client The Discord client
 */
export default (client: Client): void => {
  client.once(Events.ClientReady, (readyClient: Client) => {
    if (!readyClient.user) return;

    logger.info(`Logged in as ${readyClient.user.tag}!`);
    logger.info(`Bot is ready and serving in ${readyClient.guilds.cache.size} guild(s)`);

    // Set bot activity
    readyClient.user.setActivity('meal registrations', { type: 4 }); // 4 is "Watching"
  });
};
