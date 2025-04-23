/**
 * Meal Reminder Service
 *
 * This service handles automatic meal registration reminders.
 */

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { CronJob } from 'cron';
import { LoggingService } from './LoggingService.js';
import { config } from '../config/config.js';
import { formatInTimeZone } from 'date-fns-tz';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Meal Reminder Service class
 * Handles automatic meal registration reminders
 */
export class MealReminderService {
  private static instance: MealReminderService;
  private client: Client | null = null;
  private cronJobs: Map<string, CronJob> = new Map();
  private reminderChannelId: string = '';

  private constructor() {
    logger.info('MealReminderService initialized');
  }

  public static getInstance(): MealReminderService {
    if (!MealReminderService.instance) {
      MealReminderService.instance = new MealReminderService();
    }
    return MealReminderService.instance;
  }

  /**
   * Sets the Discord client
   * @param client The Discord.js client
   */
  public setClient(client: Client): void {
    this.client = client;
  }

  /**
   * Sets the channel ID for reminders
   * @param channelId The channel ID to send reminders to
   */
  public setReminderChannel(channelId: string): void {
    // If in development mode, use the error notification channel
    if (config.isDevelopment) {
      this.reminderChannelId = config.logging.errorNotificationChannelId;
      logger.info('Development mode: Using error notification channel for meal reminders', {
        channelId: this.reminderChannelId,
        originalChannelId: channelId
      });
    } else {
      this.reminderChannelId = channelId;
      logger.info('Reminder channel set', { channelId });
    }
  }

  /**
   * Starts the meal reminder service
   */
  public async start(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not set');
    }

    if (!this.reminderChannelId) {
      throw new Error('Reminder channel not set');
    }

    // Verify that the channel exists
    try {
      const channel = await this.client.channels.fetch(this.reminderChannelId);
      if (!channel) {
        throw new Error(`Channel with ID ${this.reminderChannelId} not found`);
      }
      if (!(channel.isTextBased())) {
        throw new Error(`Channel with ID ${this.reminderChannelId} is not a text channel`);
      }
    } catch (error: any) {
      logger.error('Failed to fetch reminder channel', { error, channelId: this.reminderChannelId });
      throw new Error(`Failed to fetch reminder channel: ${error.message || 'Unknown error'}`);
    }

    logger.info('Starting meal reminder service');

    // Schedule reminders
    this.scheduleReminders();
  }

  /**
   * Schedules all meal reminders
   */
  private scheduleReminders(): void {
    // Schedule 6 AM reminder
    this.scheduleMealReminder('morning', '0 6 * * *');

    // Schedule 12 PM reminder
    this.scheduleMealReminder('noon', '0 12 * * *');

    // Schedule 6 PM reminder
    this.scheduleMealReminder('evening', '0 18 * * *');

    // Schedule 12 AM reminder
    this.scheduleMealReminder('midnight', '0 0 * * *');

    logger.info('All meal reminders scheduled');
  }

  /**
   * Schedules a meal reminder
   * @param id The ID of the reminder
   * @param cronExpression The cron expression for scheduling
   */
  private scheduleMealReminder(id: string, cronExpression: string): void {
    // Create a cron job
    const job = new CronJob(
      cronExpression,
      () => {
        this.sendMealReminder();
      },
      null,
      true,
      config.timezone.timezone
    );

    // Store the cron job
    this.cronJobs.set(id, job);

    // Log the next run time
    const nextRunTime = job.nextDate();
    logger.info('Meal reminder scheduled', {
      id,
      nextRunTime: formatInTimeZone(
        new Date(nextRunTime.valueOf()),
        config.timezone.timezone,
        'yyyy-MM-dd HH:mm:ss'
      ),
    });
  }

  /**
   * Sends a meal reminder
   */
  public async sendMealReminder(): Promise<void> {
    if (!this.client) {
      logger.error('Client not set');
      return;
    }

    try {
      // Get the channel
      const channel = await this.client.channels.fetch(this.reminderChannelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.error('Invalid reminder channel', { channelId: this.reminderChannelId });
        return;
      }

      // Create the embed
      const embed = this.createMealReminderEmbed();

      // Send the reminder
      await channel.send({ embeds: [embed] });

      logger.info('Meal reminder sent', { channelId: this.reminderChannelId });
    } catch (error) {
      logger.error('Error sending meal reminder', { error });
    }
  }

  /**
   * Creates a meal reminder embed
   * @returns The embed
   */
  private createMealReminderEmbed(): EmbedBuilder {
    const now = new Date();

    // Format date in UTC+7 timezone
    const dateStr = formatInTimeZone(now, config.timezone.timezone, 'dd/MM/yyyy');
    const timeStr = formatInTimeZone(now, config.timezone.timezone, 'HH:mm:ss');
    const timezoneStr = 'UTC+7';

    // Get tomorrow's date for registration
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatInTimeZone(tomorrow, config.timezone.timezone, 'dd/MM/yyyy');

    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`🍽️ Nhắc nhở đăng ký bữa ăn`)
      .setDescription(`Xin hãy đăng ký các bữa ăn cho ngày mai (${tomorrowStr}).`)
      .addFields(
        { name: 'Ngày hiện tại', value: dateStr, inline: true },
        { name: 'Thời gian', value: `${timeStr} (${timezoneStr})`, inline: true }
      )
      .setFooter({ text: 'Hệ thống nhắc nhở tự động' })
      .setTimestamp();
  }

  /**
   * Stops the meal reminder service
   */
  public stop(): void {
    // Stop all cron jobs
    for (const [id, job] of this.cronJobs.entries()) {
      job.stop();
      logger.info('Meal reminder stopped', { id });
    }

    // Clear the cron jobs map
    this.cronJobs.clear();

    logger.info('Meal reminder service stopped');
  }
}
