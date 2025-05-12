import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { logger } from '../utils/logger';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import {
  getCurrentTime,
  getNextOccurrence,
  addDuration,
  formatDateTime,
  DateTimeFormat,
  parseTimeString
} from '../utils/timeUtils';
import config from '../config';
import { activeRegistrations, reactionData, userRegistrations } from '../database';
import { getMembersWithRole, getTrackedRoleId } from '../utils/roleUtils';

/**
 * Service for handling meal registration
 */
class MealRegistrationService {
  private client: Client | null;
  private isInitialized: boolean;

  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the meal registration service
   * @param client Discord client
   */
  public initialize(client: Client): void {
    if (this.isInitialized) {
      logger.warn('Meal registration service is already initialized');
      return;
    }

    this.client = client;
    this.isInitialized = true;

    // Schedule the regular meal registration message
    this.scheduleRegularMealRegistration();

    // Schedule the late registration messages
    this.scheduleLateMorningRegistration();
    this.scheduleLateEveningRegistration();

    logger.info('Meal registration service initialized');
  }

  /**
   * Schedule the regular meal registration message
   */
  private scheduleRegularMealRegistration(): void {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot schedule meal registration: service not initialized');
      return;
    }

    try {
      const { startTime, endTime } = config.json.timing?.regularRegistration || { startTime: '05:00', endTime: '03:00' };

      if (config.isDevelopment) {
        // In development mode, schedule a message to be sent in 10 seconds
        logger.info('Development mode: Scheduling meal registration message in 10 seconds');

        const executeAt = addDuration(getCurrentTime(), { seconds: 10 }).toMillis();
        const endAt = addDuration(getCurrentTime(), { seconds: config.json.timing?.developmentMode?.registrationDurationSeconds || 10 }).toMillis();

        this.scheduleMealRegistrationMessage(executeAt, endAt);
      } else {
        // In production mode, schedule a daily message at the configured time
        logger.info(`Production mode: Scheduling daily meal registration message at ${startTime}`);

        // Schedule the message to be sent at the configured time
        const data = this.createMealRegistrationData(startTime, endTime);

        messageScheduler.scheduleRecurring(startTime, data);
      }
    } catch (error) {
      logger.error('Failed to schedule meal registration:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Schedule a one-time meal registration message
   * @param executeAt Timestamp to execute at
   * @param endAt Timestamp when registration ends
   */
  private scheduleMealRegistrationMessage(executeAt: number, endAt: number): void {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot schedule meal registration message: service not initialized');
      return;
    }

    try {
      const data = {
        type: MessageTaskType.MEAL_REGISTRATION,
        channelId: config.isDevelopment
          ? config.env.TEST_LOG_CHANNEL_ID
          : config.env.MEAL_REGISTRATION_CHANNEL_ID,
        embed: {
          title: config.json.messages.mealRegistration.title,
          description: config.json.messages.mealRegistration.description,
          color: config.json.messages.mealRegistration.color,
          footer: config.json.messages.mealRegistration.footer.replace(
            '{endTime}',
            formatDateTime(getCurrentTime().set({ millisecond: endAt }), DateTimeFormat.DATE_TIME)
          )
        },
        endTime: endAt,
        identifier: `MEAL_REGISTRATION_${formatDateTime(getCurrentTime(), DateTimeFormat.DATE_ONLY)}`
      };

      messageScheduler.scheduleOnce(executeAt, data);

      // Also schedule the end of registration message
      this.scheduleRegistrationEnd(endAt, data.identifier);

      logger.info(`Scheduled meal registration message at ${formatDateTime(getCurrentTime().set({ millisecond: executeAt }), DateTimeFormat.DATE_TIME)}`);
    } catch (error) {
      logger.error('Failed to schedule meal registration message:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Create meal registration data for recurring schedule
   * @param startTimeString Start time string (e.g., "05:00")
   * @param endTimeString End time string (e.g., "03:00")
   * @returns Message task data
   */
  private createMealRegistrationData(startTimeString: string, endTimeString: string): any {
    // Calculate the end time (might be on the next day)
    const startTime = parseTimeString(startTimeString);
    let endTime = parseTimeString(endTimeString);

    // If end time is earlier than start time, it's on the next day
    if (endTime < startTime) {
      endTime = endTime.plus({ days: 1 });
    }

    // Calculate the end timestamp
    const endTimestamp = endTime.toMillis();

    // Create the identifier string with the current date
    const identifier = `MEAL_REGISTRATION_${formatDateTime(getCurrentTime(), DateTimeFormat.DATE_ONLY)}`;

    return {
      type: MessageTaskType.MEAL_REGISTRATION,
      channelId: config.isDevelopment
        ? config.env.TEST_LOG_CHANNEL_ID
        : config.env.MEAL_REGISTRATION_CHANNEL_ID,
      embed: {
        title: config.json.messages.mealRegistration.title,
        description: config.json.messages.mealRegistration.description,
        color: config.json.messages.mealRegistration.color,
        footer: config.json.messages.mealRegistration.footer.replace(
          '{endTime}',
          formatDateTime(endTime, DateTimeFormat.DATE_TIME)
        )
      },
      endTime: endTimestamp,
      identifier
    };
  }

  /**
   * Schedule the end of registration message
   * @param executeAt Timestamp to execute at
   * @param registrationIdentifier The identifier of the registration message
   */
  private scheduleRegistrationEnd(executeAt: number, registrationIdentifier: string): void {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot schedule registration end: service not initialized');
      return;
    }

    try {
      const taskId = `registration_end_${Date.now()}`;

      // Schedule a task to process the registration end
      const task = {
        id: taskId,
        registrationIdentifier
      };

      messageScheduler.scheduleOnce(executeAt, {
        type: MessageTaskType.CUSTOM,
        channelId: config.isDevelopment
          ? config.env.TEST_LOG_CHANNEL_ID
          : config.env.MEAL_REGISTRATION_CHANNEL_ID,
        data: task
      });

      logger.info(`Scheduled registration end at ${formatDateTime(getCurrentTime().set({ millisecond: executeAt }), DateTimeFormat.DATE_TIME)}`);
    } catch (error) {
      logger.error('Failed to schedule registration end:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Schedule the late morning registration message
   */
  private scheduleLateMorningRegistration(): void {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot schedule late morning registration: service not initialized');
      return;
    }

    try {
      const { startTime, endTime } = config.json.timing?.lateMorningRegistration || { startTime: '05:00', endTime: '11:00' };

      if (config.isDevelopment) {
        // In development mode, schedule a message to be sent in 10 seconds
        logger.info('Development mode: Scheduling late morning registration message in 10 seconds');

        const executeAt = addDuration(getCurrentTime(), { seconds: 10 }).toMillis();
        const endAt = addDuration(getCurrentTime(), { seconds: config.json.timing?.developmentMode?.registrationDurationSeconds || 10 }).toMillis();

        this.scheduleLateRegistrationMessage(
          MessageTaskType.LATE_MORNING_REGISTRATION,
          executeAt,
          endAt,
          config.json.messages.lateMorningRegistration
        );
      } else {
        // In production mode, schedule a daily message at the configured time
        logger.info(`Production mode: Scheduling daily late morning registration message at ${startTime}`);

        // Create the data for the message
        const data = this.createLateRegistrationData(
          MessageTaskType.LATE_MORNING_REGISTRATION,
          startTime,
          endTime,
          config.json.messages.lateMorningRegistration,
          config.env.LATE_MEAL_REGISTRATION_CHANNEL_ID
        );

        // Schedule the message
        messageScheduler.scheduleRecurring(startTime, data);
      }
    } catch (error) {
      logger.error('Failed to schedule late morning registration:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Schedule the late evening registration message
   */
  private scheduleLateEveningRegistration(): void {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot schedule late evening registration: service not initialized');
      return;
    }

    try {
      const { startTime, endTime } = config.json.timing?.lateEveningRegistration || { startTime: '11:30', endTime: '18:15' };

      if (config.isDevelopment) {
        // In development mode, schedule a message to be sent in 20 seconds
        logger.info('Development mode: Scheduling late evening registration message in 20 seconds');

        const executeAt = addDuration(getCurrentTime(), { seconds: 20 }).toMillis();
        const endAt = addDuration(getCurrentTime(), { seconds: config.json.timing?.developmentMode?.registrationDurationSeconds || 10 }).toMillis();

        this.scheduleLateRegistrationMessage(
          MessageTaskType.LATE_EVENING_REGISTRATION,
          executeAt,
          endAt,
          config.json.messages.lateEveningRegistration
        );
      } else {
        // In production mode, schedule a daily message at the configured time
        logger.info(`Production mode: Scheduling daily late evening registration message at ${startTime}`);

        // Create the data for the message
        const data = this.createLateRegistrationData(
          MessageTaskType.LATE_EVENING_REGISTRATION,
          startTime,
          endTime,
          config.json.messages.lateEveningRegistration,
          config.env.LATE_MEAL_REGISTRATION_CHANNEL_ID
        );

        // Schedule the message
        messageScheduler.scheduleRecurring(startTime, data);
      }
    } catch (error) {
      logger.error('Failed to schedule late evening registration:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Schedule a one-time late registration message
   * @param type The type of late registration message
   * @param executeAt Timestamp to execute at
   * @param endAt Timestamp when registration ends
   * @param messageTemplate The message template to use
   */
  private scheduleLateRegistrationMessage(
    type: MessageTaskType,
    executeAt: number,
    endAt: number,
    messageTemplate: any
  ): void {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot schedule late registration message: service not initialized');
      return;
    }

    try {
      const data = {
        type,
        channelId: config.isDevelopment
          ? config.env.TEST_LOG_CHANNEL_ID
          : config.env.LATE_MEAL_REGISTRATION_CHANNEL_ID,
        embed: {
          title: messageTemplate.title,
          description: messageTemplate.description,
          color: messageTemplate.color,
          footer: messageTemplate.footer.replace(
            '{endTime}',
            formatDateTime(getCurrentTime().set({ millisecond: endAt }), DateTimeFormat.DATE_TIME)
          )
        },
        endTime: endAt,
        identifier: `${type}_${formatDateTime(getCurrentTime(), DateTimeFormat.DATE_ONLY)}`
      };

      messageScheduler.scheduleOnce(executeAt, data);

      // Also schedule the end of registration message
      this.scheduleRegistrationEnd(endAt, data.identifier);

      logger.info(`Scheduled ${type} message at ${formatDateTime(getCurrentTime().set({ millisecond: executeAt }), DateTimeFormat.DATE_TIME)}`);
    } catch (error) {
      logger.error(`Failed to schedule ${type} message:`, error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Create late registration data for recurring schedule
   * @param type The type of late registration message
   * @param startTimeString Start time string (e.g., "05:00")
   * @param endTimeString End time string (e.g., "11:00")
   * @param messageTemplate The message template to use
   * @param channelId The channel ID to send the message to
   * @returns Message task data
   */
  private createLateRegistrationData(
    type: MessageTaskType,
    startTimeString: string,
    endTimeString: string,
    messageTemplate: any,
    channelId: string
  ): any {
    // Calculate the end time
    const startTime = parseTimeString(startTimeString);
    const endTime = parseTimeString(endTimeString);

    // Calculate the end timestamp
    const endTimestamp = endTime.toMillis();

    // Create the identifier string with the current date
    const identifier = `${type}_${formatDateTime(getCurrentTime(), DateTimeFormat.DATE_ONLY)}`;

    return {
      type,
      channelId: config.isDevelopment
        ? config.env.TEST_LOG_CHANNEL_ID
        : channelId,
      embed: {
        title: messageTemplate.title,
        description: messageTemplate.description,
        color: messageTemplate.color,
        footer: messageTemplate.footer.replace(
          '{endTime}',
          formatDateTime(endTime, DateTimeFormat.DATE_TIME)
        )
      },
      endTime: endTimestamp,
      identifier
    };
  }

  /**
   * Process the end of a registration period
   * @param registrationIdentifier The identifier of the registration message
   */
  public async processRegistrationEnd(registrationIdentifier: string): Promise<void> {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot process registration end: service not initialized');
      return;
    }

    try {
      // Find the active registration with this identifier
      const activeRegs = activeRegistrations.getAll();
      const registration = activeRegs.find(reg => reg.identifier_string === registrationIdentifier);

      if (!registration) {
        logger.warn(`No active registration found with identifier ${registrationIdentifier}`);
        return;
      }

      // Get the channel
      const channelId = registration.channel_id;
      const channel = this.client.channels.cache.get(channelId) as TextChannel;

      if (!channel) {
        logger.error(`Channel with ID ${channelId} not found`);
        return;
      }

      // Get the message
      const messageId = registration.message_id;
      const message = await channel.messages.fetch(messageId);

      if (!message) {
        logger.error(`Message with ID ${messageId} not found`);
        return;
      }

      // Get all reactions for this message
      const reactions = reactionData.getActiveByMessageId(messageId);

      // Get all members with the tracked role
      const trackedRoleId = getTrackedRoleId();
      const membersWithRole = await getMembersWithRole(this.client, trackedRoleId);

      if (!membersWithRole) {
        logger.error(`Failed to get members with tracked role ${trackedRoleId}`);
        return;
      }

      // Create the embed based on the registration type
      const embed = new EmbedBuilder()
        .setTitle(config.json.messages.registrationEnd.title)
        .setDescription(config.json.messages.registrationEnd.description)
        .setColor(config.json.messages.registrationEnd.color as any)
        .setFooter({
          text: config.json.messages.registrationEnd.footer.replace(
            '{endTime}',
            formatDateTime(getCurrentTime(), DateTimeFormat.DATE_TIME)
          )
        })
        .setTimestamp();

      // Process based on registration type
      if (registration.registration_type === MessageTaskType.MEAL_REGISTRATION) {
        // Process regular meal registration

        // Process breakfast registrations
        const breakfastEmoji = config.json.emojis.breakfast;
        const breakfastReactions = reactions.filter(r => r.reaction_type === breakfastEmoji);
        const breakfastUserIds = breakfastReactions.map(r => r.user_id);

        // Process dinner registrations
        const dinnerEmoji = config.json.emojis.dinner;
        const dinnerReactions = reactions.filter(r => r.reaction_type === dinnerEmoji);
        const dinnerUserIds = dinnerReactions.map(r => r.user_id);

        // Create lists of registered and unregistered users
        const registeredBreakfastUsers = Array.from(membersWithRole.values())
          .filter(member => breakfastUserIds.includes(member.id));

        const registeredDinnerUsers = Array.from(membersWithRole.values())
          .filter(member => dinnerUserIds.includes(member.id));

        const unregisteredBreakfastUsers = Array.from(membersWithRole.values())
          .filter(member => !breakfastUserIds.includes(member.id));

        const unregisteredDinnerUsers = Array.from(membersWithRole.values())
          .filter(member => !dinnerUserIds.includes(member.id));

        // Add fields for registered users
        if (registeredBreakfastUsers.length > 0) {
          embed.addFields({
            name: `Registered for Breakfast (${registeredBreakfastUsers.length})`,
            value: registeredBreakfastUsers.map(u => u.displayName || u.user.tag).join('\n').substring(0, 1024) || 'None',
            inline: true
          });
        }

        if (registeredDinnerUsers.length > 0) {
          embed.addFields({
            name: `Registered for Dinner (${registeredDinnerUsers.length})`,
            value: registeredDinnerUsers.map(u => u.displayName || u.user.tag).join('\n').substring(0, 1024) || 'None',
            inline: true
          });
        }

        // Add fields for unregistered users
        if (unregisteredBreakfastUsers.length > 0) {
          embed.addFields({
            name: `Not Registered for Breakfast (${unregisteredBreakfastUsers.length})`,
            value: unregisteredBreakfastUsers.map(u => u.displayName || u.user.tag).join('\n').substring(0, 1024) || 'None',
            inline: true
          });
        }

        if (unregisteredDinnerUsers.length > 0) {
          embed.addFields({
            name: `Not Registered for Dinner (${unregisteredDinnerUsers.length})`,
            value: unregisteredDinnerUsers.map(u => u.displayName || u.user.tag).join('\n').substring(0, 1024) || 'None',
            inline: true
          });
        }
      } else if (
        registration.registration_type === MessageTaskType.LATE_MORNING_REGISTRATION ||
        registration.registration_type === MessageTaskType.LATE_EVENING_REGISTRATION
      ) {
        // Process late registration

        // Get the late emoji
        const lateEmoji = config.json.emojis.late;

        // Get users who registered late
        const lateReactions = reactions.filter(r => r.reaction_type === lateEmoji);
        const lateUserIds = lateReactions.map(r => r.user_id);

        // Create lists of registered and unregistered users
        const registeredLateUsers = Array.from(membersWithRole.values())
          .filter(member => lateUserIds.includes(member.id));

        const unregisteredLateUsers = Array.from(membersWithRole.values())
          .filter(member => !lateUserIds.includes(member.id));

        // Add fields for registered users
        if (registeredLateUsers.length > 0) {
          embed.addFields({
            name: `Registered for Late ${registration.registration_type === MessageTaskType.LATE_MORNING_REGISTRATION ? 'Morning' : 'Evening'} (${registeredLateUsers.length})`,
            value: registeredLateUsers.map(u => u.displayName || u.user.tag).join('\n').substring(0, 1024) || 'None',
            inline: true
          });
        }

        // Add fields for unregistered users
        if (unregisteredLateUsers.length > 0) {
          embed.addFields({
            name: `Not Registered for Late ${registration.registration_type === MessageTaskType.LATE_MORNING_REGISTRATION ? 'Morning' : 'Evening'} (${unregisteredLateUsers.length})`,
            value: unregisteredLateUsers.map(u => u.displayName || u.user.tag).join('\n').substring(0, 1024) || 'None',
            inline: true
          });
        }
      }

      // Send the message
      await channel.send({ embeds: [embed] });

      // Remove all reactions from the original message
      await message.reactions.removeAll();

      // Remove the registration from active registrations
      activeRegistrations.remove(messageId);

      logger.info(`Processed end of registration for ${registrationIdentifier}`);
    } catch (error) {
      logger.error('Failed to process registration end:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Export a singleton instance
export const mealRegistrationService = new MealRegistrationService();
export default mealRegistrationService;
