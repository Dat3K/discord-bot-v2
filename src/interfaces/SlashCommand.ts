/**
 * Slash Command Interface
 *
 * This file defines the interface for slash commands.
 */

import { ChatInputCommandInteraction } from 'discord.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

/**
 * Slash Command interface
 * Defines the structure of a slash command
 */
export interface SlashCommand {
  /**
   * The data for the slash command
   */
  data: {
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
    name: string;
    description: string;
    options?: any[];
  };

  /**
   * Executes the slash command
   * @param interaction The interaction that triggered the command
   */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
