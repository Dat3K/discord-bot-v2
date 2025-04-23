/**
 * Meal Registration Command
 *
 * This file implements the meal registration command.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import type { SlashCommand } from '../interfaces/SlashCommand.js';
import { MealRegistrationService } from '../services/MealRegistrationService.js';
import { config } from '../config/config.js';

/**
 * Meal registration command
 * Manages meal registrations
 */
export const MealRegistrationCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Manages meal registrations')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Shows the status of meal registrations')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Creates a new meal registration message')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lists registered and unregistered users')
        .addStringOption(option =>
          option
            .setName('meal')
            .setDescription('The meal to list registrations for')
            .setRequired(true)
            .addChoices(
              { name: 'Breakfast', value: 'breakfast' },
              { name: 'Dinner', value: 'dinner' }
            )
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const subcommand = interaction.options.getSubcommand();
    const mealRegistrationService = MealRegistrationService.getInstance();

    switch (subcommand) {
      case 'status':
        await handleStatusSubcommand(interaction);
        break;
      case 'create':
        await handleCreateSubcommand(interaction, mealRegistrationService);
        break;
      case 'list':
        await handleListSubcommand(interaction, mealRegistrationService);
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
    .setTitle('🍽️ Meal Registration Status')
    .setDescription('Current status of meal registrations')
    .addFields(
      { name: 'Channel', value: `<#${config.mealRegistration.channelId}>`, inline: true },
      { name: 'Timezone', value: config.timezone.timezone, inline: true },
      { name: 'Schedule', value: 'Registration opens at 5 AM and closes at 3 AM the next day' }
    )
    .setFooter({ text: 'Meal Registration Service' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Handles the create subcommand
 * @param interaction The interaction
 * @param mealRegistrationService The meal registration service
 */
async function handleCreateSubcommand(
  interaction: ChatInputCommandInteraction,
  mealRegistrationService: MealRegistrationService
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await mealRegistrationService.createRegistrationMessage();
    await interaction.editReply('Meal registration message created successfully.');
  } catch (error) {
    await interaction.editReply(`Failed to create meal registration message: ${error}`);
  }
}

/**
 * Handles the list subcommand
 * @param interaction The interaction
 * @param mealRegistrationService The meal registration service
 */
async function handleListSubcommand(
  interaction: ChatInputCommandInteraction,
  mealRegistrationService: MealRegistrationService
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Get the meal type from the options
    const mealType = interaction.options.getString('meal', true) as 'breakfast' | 'dinner';

    // Create the registration status embed
    const embed = await mealRegistrationService.createRegistrationStatusEmbed(mealType);

    // Send the embed
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply(`Failed to list registrations: ${error}`);
  }
}
