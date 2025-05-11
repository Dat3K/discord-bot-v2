import { Client } from 'discord.js';
import { logger } from '../utils/logger';

/**
 * Event handler for when the client is reconnecting
 * @param client The Discord client
 */
export default (client: Client): void => {
  // Discord.js v14 doesn't have a specific reconnecting event
  // Instead, we can use the shardReconnecting event if using shards
  // or handle reconnection logic in the disconnect event
  
  // For WebSocket reconnection attempts
  client.ws.on('reconnecting', () => {
    logger.warn('WebSocket is reconnecting...');
  });
};
