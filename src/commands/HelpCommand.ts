/**
 * Help Command
 *
 * This file implements the help command.
 */

import { Message, EmbedBuilder } from 'discord.js';
import type { Command } from '../interfaces/Command';
import { CommandHandler } from './CommandHandler';


/**
 * Help command
 * Displays a list of available commands
 */
export const HelpCommand: Command = {
  name: 'help',
  description: 'Displays a list of available commands',
  aliases: ['commands'],
  execute: async (message: Message, args: string[]): Promise<void> => {
    const commandHandler = CommandHandler.getInstance();
    const commands = commandHandler.getCommands();
    const prefix = commandHandler.getPrefix();

    // If a specific command is requested
    if (args.length > 0) {
      const commandName = args[0]?.toLowerCase() || '';
      const command = commandHandler.getCommand(commandName);

      // If command not found
      if (!command) {
        await message.reply(`Command "${commandName}" not found.`);
        return;
      }

      // Create embed for specific command
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Command: ${prefix}${command.name}`)
        .setDescription(command.description)
        .addFields(
          { name: 'Usage', value: `${prefix}${command.name}` },
          { name: 'Aliases', value: command.aliases?.join(', ') || 'None' }
        );

      await message.reply({ embeds: [embed] });
      return;
    }

    // Create embed for all commands
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Available Commands')
      .setDescription(`Use \`${prefix}help [command]\` for more information about a specific command.`);

    // Add commands to embed
    for (const command of commands) {
      embed.addFields({
        name: `${prefix}${command.name}`,
        value: command.description,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
