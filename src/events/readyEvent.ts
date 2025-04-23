/**
 * Ready Event Handler
 *
 * This file handles the ready event from Discord.js.
 */

import { Client } from 'discord.js';
import { LoggingService } from '../services/LoggingService.js';
import { registerSlashCommands } from '../commands/SlashCommandRegistry.js';
import { MealReminderService } from '../services/MealReminderService.js';
import { MealRegistrationService } from '../services/MealRegistrationService.js';
import { MemberService } from '../services/MemberService.js';
import { config } from '../config/config.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Handles the ready event
 * @param client The Discord.js client
 */
export async function readyHandler(client: Client): Promise<void> {
  logger.info(`Logged in as ${client.user?.tag}`);

  // Set bot status
  client.user?.setPresence({
    status: 'online',
    activities: [{
      name: 'with scheduled messages',
      type: 0, // Playing
    }],
  });

  // Register slash commands
  await registerSlashCommands();

  // Start meal reminder service
  try {
    const mealReminderService = MealReminderService.getInstance();
    mealReminderService.setClient(client);
    mealReminderService.setReminderChannel(config.mealReminder.channelId);
    await mealReminderService.start();
    logger.info('Meal reminder service started');
  } catch (error) {
    logger.error('Failed to start meal reminder service', { error });
  }

  // Start meal registration service
  try {
    const mealRegistrationService = MealRegistrationService.getInstance();
    mealRegistrationService.setClient(client);
    mealRegistrationService.setRegistrationChannel(config.mealRegistration.channelId);
    mealRegistrationService.setLogChannel(config.mealRegistration.logChannelId);
    // Set the late registration channel to use the error notification channel in development mode
    mealRegistrationService.setLateRegistrationChannel();
    await mealRegistrationService.start();
    logger.info('Meal registration service started');
  } catch (error) {
    logger.error('Failed to start meal registration service', { error });
  }

  // Fetch and store all guild members
  try {
    logger.info('Fetching and storing guild members...');
    const memberService = MemberService.getInstance();
    memberService.setClient(client);

    // Fetch all members
    await memberService.fetchAndStoreAllMembers();

    // Also fetch members with the tracked role specifically
    await memberService.fetchAndStoreRoleMembers('1162022091630059531');

    logger.info('Guild members fetched and stored successfully');
  } catch (error) {
    logger.error('Failed to fetch and store guild members', { error });
  }

  logger.info('Bot is ready');
}
