/**
 * Event Handler
 *
 * This file sets up event handlers for Discord.js events.
 * It implements the Observer pattern for event handling.
 */

import { Client } from 'discord.js';
import { LoggingService } from '../services/LoggingService';
import { readyHandler } from './readyEvent.js';
import { messageCreateHandler } from './messageCreateEvent.js';
import { messageReactionAddHandler } from './messageReactionAddEvent.js';
import { interactionCreateHandler } from './interactionCreateEvent.js';
import { SlashCommandHandler } from '../commands/SlashCommandHandler.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Sets up event handlers for the Discord client
 * @param client The Discord.js client
 */
export function setupEventHandlers(client: Client): void {
  logger.info('Setting up event handlers');

  // Set up slash command handler
  const slashCommandHandler = SlashCommandHandler.getInstance();
  slashCommandHandler.setClient(client);

  // Set up ready event
  client.on('ready', async (client) => {
    try {
      await readyHandler(client);
    } catch (error) {
      logger.error('Error in ready event handler', { error });
    }
  });

  // Set up messageCreate event
  client.on('messageCreate', (message) => {
    try {
      messageCreateHandler(message);
    } catch (error) {
      logger.error('Error in messageCreate event handler', { error });
    }
  });

  // Set up messageReactionAdd event
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      await messageReactionAddHandler(reaction, user);
    } catch (error) {
      logger.error('Error in messageReactionAdd event handler', { error });
    }
  });

  // Set up interactionCreate event
  client.on('interactionCreate', (interaction) => {
    try {
      interactionCreateHandler(interaction);
    } catch (error) {
      logger.error('Error in interactionCreate event handler', { error });
    }
  });

  // Log all events in debug mode
  if (logger.debug) {
    client.on('debug', (info) => {
      logger.debug('Discord.js debug', { info });
    });
  }

  // Log warnings
  client.on('warn', (info) => {
    logger.warn('Discord.js warning', { info });
  });

  // Log errors
  client.on('error', (error) => {
    logger.error('Discord.js error', { error });
  });

  logger.info('Event handlers set up successfully');
}
