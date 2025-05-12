import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';
import { getMembersWithRole, getTrackedRoleId } from '../utils/roleUtils';
import config from '../config';

/**
 * Event handler for when the client is ready
 * @param client The Discord client
 */
export default (client: Client): void => {
  client.once(Events.ClientReady, async (readyClient: Client) => {
    if (!readyClient.user) return;

    logger.info(`Logged in as ${readyClient.user.tag}!`);
    logger.info(`Bot is ready and serving in ${readyClient.guilds.cache.size} guild(s)`);

    // Set bot activity
    readyClient.user.setActivity('meal registrations', { type: 4 }); // 4 is "Watching"

    // Fetch all members with the tracked role
    try {
      const trackedRoleId = getTrackedRoleId();
      logger.info(`Fetching members with tracked role (${trackedRoleId})...`);

      const members = await getMembersWithRole(client, trackedRoleId, true);

      if (members) {
        logger.info(`Found ${members.size} members with tracked role`);
      } else {
        logger.warn(`Failed to fetch members with tracked role (${trackedRoleId})`);
      }
    } catch (error) {
      logger.error('Error fetching members with tracked role:', error instanceof Error ? error : new Error('Unknown error'));
    }
  });
};
