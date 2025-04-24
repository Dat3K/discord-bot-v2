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
  logger.divider('BOT CONNECTED');
  logger.info(`Logged in as ${client.user?.tag}`, {
    id: client.user?.id,
    discriminator: client.user?.discriminator,
    verified: client.user?.verified
  });

  // Set bot status
  client.user?.setPresence({
    status: 'online',
    activities: [{
      name: 'with scheduled messages',
      type: 0, // Playing
    }],
  });

  // Register slash commands
  logger.divider('REGISTERING COMMANDS');
  await registerSlashCommands();

  // Start meal reminder service
  logger.divider('STARTING SERVICES');
  try {
    const mealReminderService = MealReminderService.getInstance();
    mealReminderService.setClient(client);
    mealReminderService.setReminderChannel(config.mealReminder.channelId);
    await mealReminderService.start();
    logger.info('Meal reminder service started', {
      channelId: config.mealReminder.channelId
    });
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
    logger.info('Meal registration service started', {
      registrationChannelId: config.mealRegistration.channelId,
      logChannelId: config.mealRegistration.logChannelId,
      lateChannelId: config.isDevelopment ? config.logging.errorNotificationChannelId : config.mealRegistration.lateChannelId
    });
  } catch (error) {
    logger.error('Failed to start meal registration service', { error });
  }

  // Fetch and store all guild members
  logger.divider('FETCHING MEMBERS');
  try {
    logger.info('Fetching and storing guild members...');
    const memberService = MemberService.getInstance();
    memberService.setClient(client);

    // Fetch all members
    const allMembersCount = await memberService.fetchAndStoreAllMembers();

    // Also fetch members with the tracked role specifically
    const roleMembersCount = await memberService.fetchAndStoreRoleMembers('1162022091630059531');

    logger.info('Guild members fetched and stored successfully', {
      allMembersCount,
      roleMembersCount,
      trackedRoleId: '1162022091630059531'
    });
  } catch (error) {
    logger.error('Failed to fetch and store guild members', { error });
  }

  logger.divider('INITIALIZATION COMPLETE');
  logger.info('Bot is ready and fully operational', {
    mode: config.isDevelopment ? 'Development' : 'Production',
    timezone: config.timezone.timezone
  });
}
