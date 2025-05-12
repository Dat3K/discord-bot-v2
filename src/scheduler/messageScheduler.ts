import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import type { MessageCreateOptions } from 'discord.js';
import { scheduler } from './index';
import type { SchedulerTask } from './index';
import { logger } from '../utils/logger';
import { getCurrentTime, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import config from '../config';
import { activeRegistrations } from '../database';
import { handleSchedulerError, SchedulerErrorType } from './errorHandler';
import { mealRegistrationService } from '../services/mealRegistrationService';

// Define message task types
export enum MessageTaskType {
  MEAL_REGISTRATION = 'MEAL_REGISTRATION',
  LATE_MORNING_REGISTRATION = 'LATE_MORNING_REGISTRATION',
  LATE_EVENING_REGISTRATION = 'LATE_EVENING_REGISTRATION',
  REMINDER = 'REMINDER',
  CUSTOM = 'CUSTOM'
}

// Define message task data interface
export interface MessageTaskData {
  type: MessageTaskType;
  channelId: string;
  content?: string;
  embed?: {
    title?: string;
    description?: string;
    color?: string;
    footer?: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  };
  components?: any[]; // Discord.js message components
  endTime?: number; // For registration messages
  identifier?: string; // For tracking purposes
  data?: any; // For custom data
}

/**
 * Message scheduler class for scheduling Discord messages
 */
export class MessageScheduler {
  private client: Client | null;

  constructor() {
    this.client = null;
  }

  /**
   * Initialize the message scheduler
   * @param client Discord client
   */
  public initialize(client: Client): void {
    this.client = client;

    // Set up event listeners
    scheduler.on('taskExecuted', this.handleTaskExecution.bind(this));
    scheduler.on('error', this.handleError.bind(this));

    logger.info('Message scheduler initialized');
  }

  /**
   * Schedule a one-time message
   * @param executeAt Timestamp to execute at
   * @param data Message task data
   * @returns The scheduled task
   */
  public scheduleOnce(executeAt: number, data: MessageTaskData): SchedulerTask {
    const taskId = `message_${data.type.toLowerCase()}_${Date.now()}`;
    return scheduler.scheduleOnce(taskId, executeAt, data);
  }

  /**
   * Schedule a recurring message
   * @param pattern Time pattern (HH:mm)
   * @param data Message task data
   * @param days Optional days of week to execute on
   * @returns The scheduled task
   */
  public scheduleRecurring(pattern: string, data: MessageTaskData, days?: number[]): SchedulerTask {
    const taskId = `message_${data.type.toLowerCase()}_recurring_${pattern.replace(':', '')}`;
    return scheduler.scheduleRecurring(taskId, pattern, data, days);
  }

  /**
   * Cancel a scheduled message
   * @param taskId Task ID
   * @returns True if cancelled, false if not found
   */
  public cancelMessage(taskId: string): boolean {
    return scheduler.cancelTask(taskId);
  }

  /**
   * Get all scheduled messages
   * @returns Array of scheduled message tasks
   */
  public getAllMessages(): SchedulerTask[] {
    return scheduler.getAllTasks().filter(task =>
      task.id.startsWith('message_')
    );
  }

  /**
   * Get scheduled messages by type
   * @param type Message task type
   * @returns Array of scheduled message tasks of the specified type
   */
  public getMessagesByType(type: MessageTaskType): SchedulerTask[] {
    return scheduler.getAllTasks().filter(task =>
      task.id.startsWith(`message_${type.toLowerCase()}`)
    );
  }

  /**
   * Handle task execution
   * @param task The executed task
   */
  private handleTaskExecution(task: SchedulerTask): void {
    if (!task.id.startsWith('message_') || !this.client) {
      return;
    }

    const data = task.data as MessageTaskData;

    try {
      // Check if this is a custom task for registration end
      if (data.type === MessageTaskType.CUSTOM && data.data && data.data.registrationIdentifier) {
        // Process registration end
        mealRegistrationService.processRegistrationEnd(data.data.registrationIdentifier)
          .catch(error => {
            handleSchedulerError(
              SchedulerErrorType.TASK_EXECUTION,
              `Error processing registration end for ${data.data.registrationIdentifier}`,
              error instanceof Error ? error : new Error('Unknown error'),
              task.id,
              task
            );
          });
        return;
      }

      // Get the channel
      const channel = this.client.channels.cache.get(data.channelId) as TextChannel;

      if (!channel) {
        handleSchedulerError(
          SchedulerErrorType.MESSAGE_SENDING,
          `Channel with ID ${data.channelId} not found`,
          new Error(`Channel not found`),
          task.id,
          task
        );
        return;
      }

      // Create message options
      const messageOptions: MessageCreateOptions = {};

      // Add content if provided
      if (data.content) {
        messageOptions.content = data.content;
      }

      // Add embed if provided
      if (data.embed) {
        const embed = new EmbedBuilder();

        if (data.embed.title) {
          embed.setTitle(data.embed.title);
        }

        if (data.embed.description) {
          embed.setDescription(data.embed.description);
        }

        if (data.embed.color) {
          embed.setColor(data.embed.color as any);
        }

        if (data.embed.footer) {
          // Replace {endTime} placeholder with actual end time
          let footerText = data.embed.footer;
          if (data.endTime && footerText.includes('{endTime}')) {
            const endTime = getCurrentTime().set({ millisecond: data.endTime });
            footerText = footerText.replace('{endTime}', formatDateTime(endTime, DateTimeFormat.DATE_TIME));
          }

          embed.setFooter({ text: footerText });
        }

        if (data.embed.fields) {
          embed.addFields(data.embed.fields);
        }

        // Add timestamp
        embed.setTimestamp();

        messageOptions.embeds = [embed];
      }

      // Add components if provided
      if (data.components) {
        messageOptions.components = data.components;
      }

      // Send the message
      channel.send(messageOptions).then(message => {
        logger.info(`Message sent to channel ${channel.name} (${channel.id})`);

        // If it's a registration message, store it in the database
        if (
          data.type === MessageTaskType.MEAL_REGISTRATION ||
          data.type === MessageTaskType.LATE_MORNING_REGISTRATION ||
          data.type === MessageTaskType.LATE_EVENING_REGISTRATION
        ) {
          if (data.endTime) {
            try {
              // Store in database
              activeRegistrations.add({
                message_id: message.id,
                channel_id: channel.id,
                registration_type: data.type,
                end_timestamp: data.endTime,
                identifier_string: data.identifier
              });

              logger.info(`Registration message ${message.id} stored in database`);

              // Add reactions to the message
              if (data.type === MessageTaskType.MEAL_REGISTRATION) {
                message.react(config.json.emojis.breakfast)
                  .then(() => message.react(config.json.emojis.dinner))
                  .catch(error => {
                    logger.error(`Failed to add reactions to message ${message.id}:`, error);
                  });
              } else if (data.type === MessageTaskType.LATE_MORNING_REGISTRATION ||
                         data.type === MessageTaskType.LATE_EVENING_REGISTRATION) {
                message.react(config.json.emojis.late)
                  .catch(error => {
                    logger.error(`Failed to add late reaction to message ${message.id}:`, error);
                  });
              }
            } catch (dbError) {
              handleSchedulerError(
                SchedulerErrorType.PERSISTENCE,
                `Failed to store registration message ${message.id} in database`,
                dbError instanceof Error ? dbError : new Error('Unknown database error'),
                task.id,
                task
              );
            }
          }
        }
      }).catch(error => {
        handleSchedulerError(
          SchedulerErrorType.MESSAGE_SENDING,
          `Error sending message to channel ${data.channelId}`,
          error instanceof Error ? error : new Error('Unknown error'),
          task.id,
          task
        );
      });
    } catch (error) {
      handleSchedulerError(
        SchedulerErrorType.TASK_EXECUTION,
        `Error executing message task ${task.id}`,
        error instanceof Error ? error : new Error('Unknown error'),
        task.id,
        task
      );
    }
  }

  /**
   * Handle scheduler errors
   * @param error The error
   * @param taskId The task ID
   */
  private handleError(error: Error, taskId?: string): void {
    handleSchedulerError(
      SchedulerErrorType.UNKNOWN,
      `Scheduler error${taskId ? ` for task ${taskId}` : ''}`,
      error,
      taskId
    );
  }
}

// Create and export a singleton instance
export const messageScheduler = new MessageScheduler();
export default messageScheduler;
