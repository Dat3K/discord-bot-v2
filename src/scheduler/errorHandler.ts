import { logger } from '../utils/logger';
import { SchedulerTask } from './index';
import config from '../config';
import { TextChannel } from 'discord.js';

/**
 * Error types for scheduler
 */
export enum SchedulerErrorType {
  INITIALIZATION = 'INITIALIZATION',
  TASK_SCHEDULING = 'TASK_SCHEDULING',
  TASK_EXECUTION = 'TASK_EXECUTION',
  TASK_CANCELLATION = 'TASK_CANCELLATION',
  PERSISTENCE = 'PERSISTENCE',
  MESSAGE_SENDING = 'MESSAGE_SENDING',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Scheduler error interface
 */
export interface SchedulerError {
  type: SchedulerErrorType;
  message: string;
  error?: Error;
  taskId?: string;
  task?: SchedulerTask;
  timestamp: number;
  handled: boolean;
}

// Store recent errors for debugging
const recentErrors: SchedulerError[] = [];
const MAX_RECENT_ERRORS = 50;

/**
 * Handle a scheduler error
 * @param type Error type
 * @param message Error message
 * @param error Original error
 * @param taskId Task ID
 * @param task Task object
 * @returns The handled error
 */
export function handleSchedulerError(
  type: SchedulerErrorType,
  message: string,
  error?: Error,
  taskId?: string,
  task?: SchedulerTask
): SchedulerError {
  // Create error object
  const schedulerError: SchedulerError = {
    type,
    message,
    error,
    taskId,
    task,
    timestamp: Date.now(),
    handled: false
  };
  
  // Log the error
  if (error) {
    logger.error(`Scheduler error [${type}]: ${message}`, error);
  } else {
    logger.error(`Scheduler error [${type}]: ${message}`);
  }
  
  // Store in recent errors
  recentErrors.unshift(schedulerError);
  if (recentErrors.length > MAX_RECENT_ERRORS) {
    recentErrors.pop();
  }
  
  // Send to error notification channel if configured
  sendErrorNotification(schedulerError);
  
  // Mark as handled
  schedulerError.handled = true;
  
  return schedulerError;
}

/**
 * Send an error notification to the configured channel
 * @param error The scheduler error
 */
function sendErrorNotification(error: SchedulerError): void {
  const errorChannel = config.channels.errorNotification;
  
  if (!errorChannel) {
    return;
  }
  
  try {
    // Create error message
    let errorMessage = `**Scheduler Error [${error.type}]**\n`;
    errorMessage += `**Message:** ${error.message}\n`;
    
    if (error.taskId) {
      errorMessage += `**Task ID:** ${error.taskId}\n`;
    }
    
    if (error.task) {
      errorMessage += `**Task Type:** ${error.task.type}\n`;
      errorMessage += `**Execute At:** <t:${Math.floor(error.task.executeAt / 1000)}:F>\n`;
    }
    
    if (error.error) {
      errorMessage += `**Error:** ${error.error.message}\n`;
      if (error.error.stack) {
        errorMessage += `**Stack:** \`\`\`\n${error.error.stack.substring(0, 500)}${error.error.stack.length > 500 ? '...' : ''}\n\`\`\``;
      }
    }
    
    // Send to channel
    errorChannel.send({ content: errorMessage }).catch(err => {
      logger.error('Failed to send error notification:', err);
    });
  } catch (err) {
    logger.error('Failed to create error notification:', err);
  }
}

/**
 * Get recent scheduler errors
 * @param limit Maximum number of errors to return
 * @returns Array of recent errors
 */
export function getRecentErrors(limit: number = MAX_RECENT_ERRORS): SchedulerError[] {
  return recentErrors.slice(0, limit);
}

/**
 * Clear recent errors
 */
export function clearRecentErrors(): void {
  recentErrors.length = 0;
}

/**
 * Get error statistics
 * @returns Error statistics by type
 */
export function getErrorStatistics(): Record<SchedulerErrorType, number> {
  const stats: Record<SchedulerErrorType, number> = {
    [SchedulerErrorType.INITIALIZATION]: 0,
    [SchedulerErrorType.TASK_SCHEDULING]: 0,
    [SchedulerErrorType.TASK_EXECUTION]: 0,
    [SchedulerErrorType.TASK_CANCELLATION]: 0,
    [SchedulerErrorType.PERSISTENCE]: 0,
    [SchedulerErrorType.MESSAGE_SENDING]: 0,
    [SchedulerErrorType.UNKNOWN]: 0
  };
  
  recentErrors.forEach(error => {
    stats[error.type]++;
  });
  
  return stats;
}
