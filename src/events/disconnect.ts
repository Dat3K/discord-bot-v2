import { Client, Events } from 'discord.js';
import type { CloseEvent } from 'discord.js';
import { logger } from '../utils/logger';

/**
 * Event handler for when the client disconnects
 * @param client The Discord client
 */
export default (client: Client): void => {
  // Handle shard disconnect event
  client.on(Events.ShardDisconnect, (closeEvent: CloseEvent, shardId: number) => {
    logger.warn(`Shard ${shardId} disconnected (Code: ${closeEvent.code})`);
  });

  // Handle general disconnection warnings
  client.on(Events.Warn, (message: string) => {
    if (message.includes('disconnect') || message.includes('connection')) {
      logger.warn(`Discord connection warning: ${message}`);
    }
  });

  // Handle WebSocket errors
  client.on(Events.ShardError, (error: Error, shardId: number) => {
    logger.error(`Shard ${shardId} encountered a WebSocket error:`, error);
  });
};
