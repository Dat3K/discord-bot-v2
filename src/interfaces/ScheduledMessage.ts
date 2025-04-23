/**
 * Scheduled Message Interface
 * 
 * This file defines interfaces for scheduled messages.
 */

/**
 * Message priority types (Strategy Pattern)
 */
export type MessagePriority = 'high' | 'medium' | 'low';

/**
 * Scheduled message interface
 */
export interface ScheduledMessage {
  /**
   * The unique ID of the message
   */
  id: string;

  /**
   * The ID of the channel to send the message to
   */
  channelId: string;

  /**
   * The content of the message
   */
  content: string;

  /**
   * The cron expression for scheduling
   */
  cronExpression: string;

  /**
   * The priority of the message
   */
  priority: MessagePriority;

  /**
   * Whether the message is enabled
   */
  enabled: boolean;
}
