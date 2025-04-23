/**
 * Help Slash Command
 *
 * This file implements the help slash command.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import type { SlashCommand } from '../interfaces/SlashCommand';
import { SlashCommandHandler } from './SlashCommandHandler';

/**
 * Help slash command
 * Displays a list of available slash commands
 */
export const HelpSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of available commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('The command to get help for')
        .setRequired(false)
    ),

  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const commandHandler = SlashCommandHandler.getInstance();
    const commands = commandHandler.getCommands();

    // Get the command option
    const commandName = interaction.options.getString('command');

    // If a specific command is requested
    if (commandName) {
      const command = commandHandler.getCommand(commandName);

      // If command not found
      if (!command) {
        await interaction.reply({ content: `Command "/${commandName}" not found.`, flags: MessageFlags.Ephemeral });
        return;
      }

      // Create embed for specific command
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Command: /${command.data.name}`)
        .setDescription(command.data.description);

      // Add options if any
      const options = command.data.options;
      if (options && options.length > 0) {
        const optionsField = options.map(option => {
          // Cast to any to access properties
          const opt = option as any;
          return `**${opt.name}**: ${opt.description}`;
        }).join('\n');

        embed.addFields({ name: 'Options', value: optionsField });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // Create embed for all commands
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Available Commands')
      .setDescription('Use `/help command:command-name` for more information about a specific command.');

    // Add commands to embed
    commands.forEach(command => {
      embed.addFields({
        name: `/${command.data.name}`,
        value: command.data.description,
      });
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
