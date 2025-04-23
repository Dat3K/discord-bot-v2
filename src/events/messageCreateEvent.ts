/**
 * Message Create Event Handler
 *
 * This file handles the messageCreate event from Discord.js.
 */

import { Message } from 'discord.js';
import { LoggingService } from '../services/LoggingService.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Handles the messageCreate event
 * @param message The Discord.js message
 */
export async function messageCreateHandler(message: Message): Promise<void> {
  // Ignore messages from bots
  if (message.author.bot) return;

  logger.debug('Message received', {
    author: message.author.tag,
    channel: message.channel.id,
    content: message.content,
  });

  // Using slash commands instead of traditional commands
  // No message processing needed here
}
