/**
 * Command Registry
 * 
 * This file registers all commands with the command handler.
 */

import { LoggingService } from '../services/LoggingService';
import { CommandHandler } from './CommandHandler';
import { HelpCommand } from './HelpCommand';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Registers all commands with the command handler
 */
export function registerCommands(): void {
  logger.info('Registering commands');

  const commandHandler = CommandHandler.getInstance();

  // Register commands
  commandHandler.registerCommand(HelpCommand);

  // TODO: Register more commands

  logger.info('Commands registered successfully');
}
