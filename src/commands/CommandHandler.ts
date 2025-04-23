/**
 * Command Handler
 *
 * This file implements the Command pattern for handling commands.
 * It provides a registry for commands and handles command execution.
 */

import { Message } from 'discord.js';
import { LoggingService } from '../services/LoggingService';
import type { Command } from '../interfaces/Command';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Command Handler class
 * Implements the Command pattern for handling commands
 */
export class CommandHandler {
  private static instance: CommandHandler;
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private prefix = '!';

  private constructor() {
    logger.info('CommandHandler initialized');
  }

  public static getInstance(): CommandHandler {
    if (!CommandHandler.instance) {
      CommandHandler.instance = new CommandHandler();
    }
    return CommandHandler.instance;
  }

  /**
   * Sets the command prefix
   * @param prefix The prefix to use for commands
   */
  public setPrefix(prefix: string): void {
    this.prefix = prefix;
    logger.info('Command prefix set', { prefix });
  }

  /**
   * Gets the command prefix
   * @returns The command prefix
   */
  public getPrefix(): string {
    return this.prefix;
  }

  /**
   * Registers a command
   * @param command The command to register
   */
  public registerCommand(command: Command): void {
    // Add the command to the commands map
    this.commands.set(command.name, command);

    // Add aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }

    logger.info('Command registered', { command: command.name });
  }

  /**
   * Handles a message
   * @param message The message to handle
   * @returns Whether the message was handled as a command
   */
  public async handleMessage(message: Message): Promise<boolean> {
    // Check if the message starts with the prefix
    if (!message.content.startsWith(this.prefix)) {
      return false;
    }

    // Parse the command and arguments
    const args = message.content.slice(this.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // Return false if no command name
    if (!commandName) {
      return false;
    }

    // Get the command
    let command = this.commands.get(commandName);

    // Check aliases if command not found
    if (!command) {
      const alias = this.aliases.get(commandName);
      if (alias) {
        command = this.commands.get(alias);
      }
    }

    // Return false if command not found
    if (!command) {
      return false;
    }

    // Execute the command
    try {
      await command.execute(message, args);
      logger.debug('Command executed', {
        command: command.name,
        user: message.author.tag,
        args,
      });
      return true;
    } catch (error) {
      logger.error('Error executing command', {
        error,
        command: command.name,
        user: message.author.tag,
        args,
      });
      await message.reply('There was an error executing that command.');
      return true;
    }
  }

  /**
   * Gets all registered commands
   * @returns All registered commands
   */
  public getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Gets a command by name
   * @param name The name of the command to get
   * @returns The command, or undefined if not found
   */
  public getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }
}
