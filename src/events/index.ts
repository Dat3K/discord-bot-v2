import { Client } from 'discord.js';
import readyEvent from './ready';
import errorEvent from './error';
import reconnectingEvent from './reconnecting';
import disconnectEvent from './disconnect';
import roleEvents from './roleEvents';

/**
 * Register all event handlers
 * @param client The Discord client
 */
export function registerEvents(client: Client): void {
  readyEvent(client);
  errorEvent(client);
  reconnectingEvent(client);
  disconnectEvent(client);
  roleEvents(client);
}
