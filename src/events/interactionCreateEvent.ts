/**
 * Interaction Create Event Handler
 *
 * This file handles the interactionCreate event from Discord.js.
 */

import type { Interaction } from 'discord.js';
import { SlashCommandHandler } from '../commands/SlashCommandHandler.js';

// Get slash command handler instance
const slashCommandHandler = SlashCommandHandler.getInstance();

/**
 * Handles the interactionCreate event
 * @param interaction The Discord.js interaction
 */
export async function interactionCreateHandler(interaction: Interaction): Promise<void> {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    await slashCommandHandler.handleInteraction(interaction);
  }
}
