/**
 * Slash Command Registry
 *
 * This file registers all slash commands with the slash command handler.
 */

import { LoggingService } from '../services/LoggingService.js';
import { SlashCommandHandler } from './SlashCommandHandler.js';
import { HelpSlashCommand } from './HelpSlashCommand.js';
import { MealReminderCommand } from './MealReminderCommand.js';
import { MealRegistrationCommand } from './MealRegistrationCommand.js';
import { TestCommand } from './TestCommands.js';
import { config } from '../config/config.js';

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
  commandHandler.registerCommand(MealRegistrationCommand);

  // Register test commands in development mode only
  if (config.isDevelopment) {
    commandHandler.registerCommand(TestCommand);
    logger.info('Test commands registered for development mode');
  }

  // Deploy commands to Discord
  await commandHandler.deployCommands();

  logger.info('Slash commands registered and deployed successfully');
}
