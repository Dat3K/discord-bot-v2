import { Client, Events, WebSocketShardEvents } from 'discord.js';
import { logger } from '../utils/logger';

/**
 * Event handler for when the client disconnects
 * @param client The Discord client
 */
export default (client: Client): void => {
  // Handle WebSocket disconnection
  client.ws.on(WebSocketShardEvents.Destroyed, ({ reconnecting }) => {
    if (reconnecting) {
      logger.warn('WebSocket connection lost, attempting to reconnect...');
    } else {
      logger.error('WebSocket connection lost and not reconnecting');
    }
  });
  
  // Handle general disconnection
  client.on(Events.Warn, (message) => {
    if (message.includes('disconnect') || message.includes('connection')) {
      logger.warn(`Discord connection warning: ${message}`);
    }
  });
};
