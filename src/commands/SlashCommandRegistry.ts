/**
 * Slash Command Registry
 *
 * This file registers all slash commands with the slash command handler.
 */

import { LoggingService } from '../services/LoggingService.js';
import { SlashCommandHandler } from './SlashCommandHandler.js';
import { HelpSlashCommand } from './HelpSlashCommand.js';
import { MealReminderCommand } from './MealReminderCommand.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Registers all slash commands with the slash command handler
 */
export async function registerSlashCommands(): Promise<void> {
  logger.info('Registering slash commands');

  const commandHandler = SlashCommandHandler.getInstance();

  // Delete existing commands
  await commandHandler.deleteCommands();

  // Register commands
  commandHandler.registerCommand(HelpSlashCommand);
  commandHandler.registerCommand(MealReminderCommand);

  // Deploy commands to Discord
  await commandHandler.deployCommands();

  logger.info('Slash commands registered and deployed successfully');
}
