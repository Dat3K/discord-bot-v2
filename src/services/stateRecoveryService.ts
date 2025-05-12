import { Client, TextChannel } from 'discord.js';
import { logger } from '../utils/logger';
import { activeRegistrations } from '../database';
import { getCurrentTime, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import config from '../config';

/**
 * Service for recovering bot state after restart
 */
class StateRecoveryService {
  private client: Client | null;
  private isInitialized: boolean;

  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the state recovery service
   * @param client Discord client
   */
  public initialize(client: Client): void {
    if (this.isInitialized) {
      logger.warn('State recovery service is already initialized');
      return;
    }

    this.client = client;
    this.isInitialized = true;

    // Recover state
    this.recoverState();

    logger.info('State recovery service initialized');
  }

  /**
   * Recover bot state after restart
   */
  private async recoverState(): Promise<void> {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot recover state: service not initialized');
      return;
    }

    try {
      // Get all active registrations from the database
      const activeRegs = activeRegistrations.getAll();
      logger.info(`Found ${activeRegs.length} active registrations to recover`);

      // Process each active registration
      for (const registration of activeRegs) {
        await this.recoverRegistration(registration);
      }

      logger.info('State recovery complete');
    } catch (error) {
      logger.error('Failed to recover state:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Recover a single registration
   * @param registration The registration to recover
   */
  private async recoverRegistration(registration: any): Promise<void> {
    if (!this.client || !this.isInitialized) {
      logger.error('Cannot recover registration: service not initialized');
      return;
    }

    try {
      const { message_id, channel_id, registration_type, end_timestamp, identifier_string } = registration;
      
      // Get the channel
      const channel = this.client.channels.cache.get(channel_id) as TextChannel;
      
      if (!channel) {
        logger.error(`Channel with ID ${channel_id} not found, removing registration ${message_id}`);
        activeRegistrations.remove(message_id);
        return;
      }
      
      // Check if the registration period has ended
      const now = getCurrentTime().toMillis();
      
      if (end_timestamp <= now) {
        // Registration period has ended, process it
        logger.info(`Registration ${message_id} has ended, processing it`);
        
        try {
          // Try to fetch the message
          const message = await channel.messages.fetch(message_id);
          
          if (!message) {
            logger.error(`Message with ID ${message_id} not found, removing registration`);
            activeRegistrations.remove(message_id);
            return;
          }
          
          // Schedule the end of registration message to be processed immediately
          messageScheduler.scheduleOnce(now, {
            type: MessageTaskType.CUSTOM,
            channelId: channel_id,
            data: {
              registrationIdentifier: identifier_string
            }
          });
          
          logger.info(`Scheduled immediate processing of ended registration ${message_id}`);
        } catch (error) {
          logger.error(`Failed to fetch message ${message_id}, removing registration:`, error instanceof Error ? error : new Error('Unknown error'));
          activeRegistrations.remove(message_id);
        }
      } else {
        // Registration period has not ended, reschedule it
        logger.info(`Registration ${message_id} has not ended, rescheduling it`);
        
        try {
          // Try to fetch the message
          const message = await channel.messages.fetch(message_id);
          
          if (!message) {
            logger.error(`Message with ID ${message_id} not found, removing registration`);
            activeRegistrations.remove(message_id);
            return;
          }
          
          // Schedule the end of registration message
          messageScheduler.scheduleOnce(end_timestamp, {
            type: MessageTaskType.CUSTOM,
            channelId: channel_id,
            data: {
              registrationIdentifier: identifier_string
            }
          });
          
          logger.info(`Rescheduled registration ${message_id} to end at ${formatDateTime(getCurrentTime().set({ millisecond: end_timestamp }), DateTimeFormat.DATE_TIME)}`);
        } catch (error) {
          logger.error(`Failed to fetch message ${message_id}, removing registration:`, error instanceof Error ? error : new Error('Unknown error'));
          activeRegistrations.remove(message_id);
        }
      }
    } catch (error) {
      logger.error('Failed to recover registration:', error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Export a singleton instance
export const stateRecoveryService = new StateRecoveryService();
export default stateRecoveryService;
