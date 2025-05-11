import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';

/**
 * Event handler for when the client is reconnecting
 * @param client The Discord client
 */
export default (client: Client): void => {
  // Handle shard reconnection
  client.on(Events.ShardReconnecting, (shardId: number) => {
    logger.warn(`Shard ${shardId} is reconnecting...`);
  });

  // Handle shard resume
  client.on(Events.ShardResume, (shardId: number, replayedEvents: number) => {
    logger.info(`Shard ${shardId} resumed connection. Replayed ${replayedEvents} events.`);
  });
};
