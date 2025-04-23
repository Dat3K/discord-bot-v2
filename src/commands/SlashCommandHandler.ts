/**
 * Slash Command Handler
 *
 * This file implements the Command pattern for handling slash commands.
 * It provides a registry for slash commands and handles command execution.
 */

import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  REST,
  Routes,
  MessageFlags
} from 'discord.js';
import { LoggingService } from '../services/LoggingService';
import type { SlashCommand } from '../interfaces/SlashCommand';
import { config } from '../config/config';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Slash Command Handler class
 * Implements the Command pattern for handling slash commands
 */
export class SlashCommandHandler {
  private static instance: SlashCommandHandler;
  private commands: Collection<string, SlashCommand> = new Collection();
  private rest: REST;
  private client: Client | null = null;

  private constructor() {
    this.rest = new REST({ version: '10' }).setToken(config.bot.token);
    logger.info('SlashCommandHandler initialized');
  }

  public static getInstance(): SlashCommandHandler {
    if (!SlashCommandHandler.instance) {
      SlashCommandHandler.instance = new SlashCommandHandler();
    }
    return SlashCommandHandler.instance;
  }

  /**
   * Sets the client
   * @param client The Discord.js client
   */
  public setClient(client: Client): void {
    this.client = client;
  }

  /**
   * Registers a slash command
   * @param command The slash command to register
   */
  public registerCommand(command: SlashCommand): void {
    // Add the command to the commands collection
    this.commands.set(command.data.name, command);
    logger.info('Slash command registered locally', { command: command.data.name });
  }

  /**
   * Deploys all registered slash commands to Discord
   */
  public async deployCommands(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not set');
    }

    try {
      logger.info('Started refreshing application (/) commands');

      // Get command data for all commands
      const commandData = this.commands.map(command => command.data.toJSON());

      // Deploy commands
      if (config.isDevelopment) {
        // In development, deploy commands to the test guild only
        await this.rest.put(
          Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
          { body: commandData },
        );
        logger.info('Successfully reloaded application (/) commands for development guild');
      } else {
        // In production, deploy commands globally
        await this.rest.put(
          Routes.applicationCommands(config.bot.clientId),
          { body: commandData },
        );
        logger.info('Successfully reloaded application (/) commands globally');
      }
    } catch (error) {
      logger.error('Error deploying slash commands', { error });
    }
  }

  /**
   * Deletes all existing slash commands from Discord
   */
  public async deleteCommands(): Promise<void> {
    try {
      logger.info('Started deleting application (/) commands');

      if (config.isDevelopment) {
        // In development, delete commands from the test guild only
        await this.rest.put(
          Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
          { body: [] },
        );
        logger.info('Successfully deleted application (/) commands for development guild');
      } else {
        // In production, delete commands globally
        await this.rest.put(
          Routes.applicationCommands(config.bot.clientId),
          { body: [] },
        );
        logger.info('Successfully deleted application (/) commands globally');
      }
    } catch (error) {
      logger.error('Error deleting slash commands', { error });
    }
  }

  /**
   * Handles an interaction
   * @param interaction The interaction to handle
   */
  public async handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    // Get the command
    const command = this.commands.get(interaction.commandName);

    // Return if command not found
    if (!command) {
      logger.warn('Command not found', { commandName: interaction.commandName });
      await interaction.reply({ content: 'Command not found.', ephemeral: true });
      return;
    }

    // Execute the command
    try {
      await command.execute(interaction);
      logger.debug('Slash command executed', {
        command: interaction.commandName,
        user: interaction.user.tag,
        options: interaction.options.data,
      });
    } catch (error) {
      logger.error('Error executing slash command', {
        error,
        command: interaction.commandName,
        user: interaction.user.tag,
        options: interaction.options.data,
      });

      // Reply with error message if interaction hasn't been replied to yet
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error executing this command.', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error executing this command.', flags: MessageFlags.Ephemeral });
      }
    }
  }

  /**
   * Gets all registered slash commands
   * @returns All registered slash commands
   */
  public getCommands(): Collection<string, SlashCommand> {
    return this.commands;
  }

  /**
   * Gets a slash command by name
   * @param name The name of the slash command to get
   * @returns The slash command, or undefined if not found
   */
  public getCommand(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }
}
