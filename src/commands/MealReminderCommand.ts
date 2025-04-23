/**
 * Meal Reminder Command
 *
 * This file implements the meal reminder command.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import type { SlashCommand } from '../interfaces/SlashCommand.js';
import { MealReminderService } from '../services/MealReminderService.js';
import { config } from '../config/config.js';

/**
 * Meal reminder command
 * Manages meal reminders
 */
export const MealReminderCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('meal')
    .setDescription('Manages meal reminders')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Shows the status of meal reminders')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('send')
        .setDescription('Sends a meal reminder immediately')
    ),

  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const subcommand = interaction.options.getSubcommand();
    const mealReminderService = MealReminderService.getInstance();

    switch (subcommand) {
      case 'status':
        await handleStatusSubcommand(interaction);
        break;
      case 'send':
        await handleSendSubcommand(interaction, mealReminderService);
        break;
      default:
        await interaction.reply({ content: 'Unknown subcommand', flags: MessageFlags.Ephemeral });
    }
  },
};

/**
 * Handles the status subcommand
 * @param interaction The interaction
 */
async function handleStatusSubcommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🍽️ Meal Reminder Status')
    .setDescription('Current status of meal reminders')
    .addFields(
      { name: 'Channel', value: `<#${config.mealReminder.channelId}>`, inline: true },
      { name: 'Timezone', value: config.timezone.timezone, inline: true },
      { name: 'Schedule', value: 'Reminders are sent at 6 AM, 12 PM, 6 PM, and 12 AM' }
    )
    .setFooter({ text: 'Meal Reminder Service' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Handles the send subcommand
 * @param interaction The interaction
 * @param mealReminderService The meal reminder service
 */
async function handleSendSubcommand(
  interaction: ChatInputCommandInteraction,
  mealReminderService: MealReminderService
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await mealReminderService.sendMealReminder();
    await interaction.editReply('Meal reminder sent successfully.');
  } catch (error) {
    await interaction.editReply(`Failed to send meal reminder: ${error}`);
  }
}
