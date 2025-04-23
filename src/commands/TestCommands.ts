/**
 * Test Commands
 *
 * This file implements test commands for development purposes.
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import type { SlashCommand } from '../interfaces/SlashCommand.js';
import { MealReminderService } from '../services/MealReminderService.js';
import { MealRegistrationService } from '../services/MealRegistrationService.js';
import { LoggingService } from '../services/LoggingService.js';
import { config } from '../config/config.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Test command for development purposes
 */
export const TestCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test commands for development')
    .addSubcommand(subcommand =>
      subcommand
        .setName('meal_reminder')
        .setDescription('Test sending a meal reminder message')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('meal_registration')
        .setDescription('Test sending a meal registration message')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('late_breakfast')
        .setDescription('Test sending a late breakfast registration message')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('late_dinner')
        .setDescription('Test sending a late dinner registration message')
    ),

  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    // Only allow these commands in development mode
    if (!config.isDevelopment) {
      await interaction.reply({
        content: 'Test commands are only available in development mode.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const mealReminderService = MealReminderService.getInstance();
    const mealRegistrationService = MealRegistrationService.getInstance();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      switch (subcommand) {
        case 'meal_reminder':
          await mealReminderService.sendMealReminder();
          await interaction.editReply('Test meal reminder sent successfully.');
          break;
        case 'meal_registration':
          await mealRegistrationService.createRegistrationMessage();
          await interaction.editReply('Test meal registration message sent successfully.');
          break;
        case 'late_breakfast':
          await mealRegistrationService.createLateBreakfastMessage();
          await interaction.editReply('Test late breakfast registration message sent successfully.');
          break;
        case 'late_dinner':
          await mealRegistrationService.createLateDinnerMessage();
          await interaction.editReply('Test late dinner registration message sent successfully.');
          break;

        default:
          await interaction.editReply('Unknown test subcommand.');
      }

      logger.info(`Test command executed: ${subcommand}`, {
        user: interaction.user.tag,
      });
    } catch (error) {
      logger.error(`Error executing test command: ${subcommand}`, { error });
      await interaction.editReply(`Failed to execute test command: ${error}`);
    }
  },
};
