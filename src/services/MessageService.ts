/**
 * Message Service
 *
 * This service handles message scheduling and sending.
 * It uses the cron package for scheduling.
 */

import { TextChannel } from 'discord.js';
import { CronJob } from 'cron';
import { LoggingService } from './LoggingService';
import { config } from '../config/config';
import { formatInTimeZone } from 'date-fns-tz';

import type { ScheduledMessage, MessagePriority } from '../interfaces/ScheduledMessage';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Message Service class
 * Handles message scheduling and sending
 */
export class MessageService {
  private scheduledMessages: Map<string, ScheduledMessage> = new Map();
  private cronJobs: Map<string, CronJob> = new Map();
  private messageQueue: ScheduledMessage[] = [];
  private processingQueue = false;

  constructor() {
    logger.info('MessageService initialized');
  }

  /**
   * Schedules a message to be sent
   * @param message The message to schedule
   * @returns The scheduled message ID
   */
  public scheduleMessage(message: Omit<ScheduledMessage, 'id'>): string {
    // Generate a unique ID for the message
    const id = crypto.randomUUID();

    // Create the scheduled message
    const scheduledMessage: ScheduledMessage = {
      ...message,
      id,
    };

    // Add the message to the scheduled messages map
    this.scheduledMessages.set(id, scheduledMessage);

    // Create a cron job for the message
    if (scheduledMessage.enabled) {
      this.createCronJob(scheduledMessage);
    }

    logger.info('Message scheduled', { messageId: id });

    return id;
  }

  /**
   * Creates a cron job for a scheduled message
   * @param message The scheduled message
   */
  private createCronJob(message: ScheduledMessage): void {
    // Create a cron job
    const job = new CronJob(
      message.cronExpression,
      () => {
        // Add the message to the queue
        this.queueMessage(message);
      },
      null,
      true,
      config.timezone.timezone
    );

    // Store the cron job
    this.cronJobs.set(message.id, job);

    // Log the next run time
    const nextRunTime = job.nextDate();
    logger.info('Cron job created', {
      messageId: message.id,
      nextRunTime: formatInTimeZone(
        new Date(nextRunTime.valueOf()),
        config.timezone.timezone,
        'yyyy-MM-dd HH:mm:ss'
      ),
    });
  }

  /**
   * Queues a message to be sent
   * @param message The message to queue
   */
  private queueMessage(message: ScheduledMessage): void {
    // Add the message to the queue
    this.messageQueue.push(message);

    // Sort the queue by priority
    this.sortQueue();

    // Process the queue if it's not already being processed
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Sorts the message queue by priority
   */
  private sortQueue(): void {
    // Define priority values
    const priorityValues: Record<MessagePriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    // Sort the queue by priority
    this.messageQueue.sort((a, b) => {
      return priorityValues[b.priority] - priorityValues[a.priority];
    });
  }

  /**
   * Processes the message queue
   */
  private async processQueue(): Promise<void> {
    // Set processing flag
    this.processingQueue = true;

    // Process messages until the queue is empty
    while (this.messageQueue.length > 0) {
      // Get the next message
      const message = this.messageQueue.shift();

      // Skip if message is undefined
      if (!message) continue;

      try {
        // Send the message
        await this.sendMessage(message);
      } catch (error) {
        logger.error('Error sending message', { error, messageId: message.id });

        // Retry the message
        this.retryMessage(message);
      }
    }

    // Reset processing flag
    this.processingQueue = false;
  }

  /**
   * Sends a message
   * @param message The message to send
   */
  private async sendMessage(message: ScheduledMessage): Promise<void> {
    // TODO: Implement message sending logic
    logger.info('Sending message', { messageId: message.id });
  }

  /**
   * Retries sending a message
   * @param message The message to retry
   */
  private retryMessage(message: ScheduledMessage): void {
    // TODO: Implement retry logic
    logger.info('Retrying message', { messageId: message.id });
  }

  /**
   * Enables a scheduled message
   * @param id The ID of the message to enable
   * @returns Whether the message was enabled
   */
  public enableMessage(id: string): boolean {
    // Get the message
    const message = this.scheduledMessages.get(id);

    // Return false if message doesn't exist
    if (!message) {
      logger.warn('Message not found', { messageId: id });
      return false;
    }

    // Return true if message is already enabled
    if (message.enabled) {
      return true;
    }

    // Enable the message
    message.enabled = true;

    // Create a cron job for the message
    this.createCronJob(message);

    logger.info('Message enabled', { messageId: id });

    return true;
  }

  /**
   * Disables a scheduled message
   * @param id The ID of the message to disable
   * @returns Whether the message was disabled
   */
  public disableMessage(id: string): boolean {
    // Get the message
    const message = this.scheduledMessages.get(id);

    // Return false if message doesn't exist
    if (!message) {
      logger.warn('Message not found', { messageId: id });
      return false;
    }

    // Return true if message is already disabled
    if (!message.enabled) {
      return true;
    }

    // Disable the message
    message.enabled = false;

    // Stop the cron job
    const job = this.cronJobs.get(id);
    if (job) {
      job.stop();
      this.cronJobs.delete(id);
    }

    logger.info('Message disabled', { messageId: id });

    return true;
  }

  /**
   * Removes a scheduled message
   * @param id The ID of the message to remove
   * @returns Whether the message was removed
   */
  public removeMessage(id: string): boolean {
    // Get the message
    const message = this.scheduledMessages.get(id);

    // Return false if message doesn't exist
    if (!message) {
      logger.warn('Message not found', { messageId: id });
      return false;
    }

    // Disable the message
    this.disableMessage(id);

    // Remove the message from the scheduled messages map
    this.scheduledMessages.delete(id);

    logger.info('Message removed', { messageId: id });

    return true;
  }

  /**
   * Gets all scheduled messages
   * @returns All scheduled messages
   */
  public getScheduledMessages(): ScheduledMessage[] {
    return Array.from(this.scheduledMessages.values());
  }

  /**
   * Gets a scheduled message by ID
   * @param id The ID of the message to get
   * @returns The scheduled message, or undefined if not found
   */
  public getScheduledMessage(id: string): ScheduledMessage | undefined {
    return this.scheduledMessages.get(id);
  }
}
