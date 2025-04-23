/**
 * Ready Event Handler
 *
 * This file handles the ready event from Discord.js.
 */

import { Client } from 'discord.js';
import { LoggingService } from '../services/LoggingService.js';
import { registerCommands } from '../commands/CommandRegistry.js';
import { registerSlashCommands } from '../commands/SlashCommandRegistry.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Handles the ready event
 * @param client The Discord.js client
 */
export async function readyHandler(client: Client): Promise<void> {
  logger.info(`Logged in as ${client.user?.tag}`);

  // Set bot status
  client.user?.setPresence({
    status: 'online',
    activities: [{
      name: 'with scheduled messages',
      type: 0, // Playing
    }],
  });

  // Register legacy commands
  registerCommands();

  // Register slash commands
  await registerSlashCommands();

  logger.info('Bot is ready');
}
