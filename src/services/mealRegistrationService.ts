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
      
      // Create and send the end of registration message
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
