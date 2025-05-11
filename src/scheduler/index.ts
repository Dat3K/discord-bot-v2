import { Client } from 'discord.js';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  getCurrentTime,
  getNextOccurrence,
  formatDateTime,
  DateTimeFormat
} from '../utils/timeUtils';
import { saveTask, deleteTask, loadTasks } from './persistence';
import { handleSchedulerError, SchedulerErrorType } from './errorHandler';

// Define scheduler event types
export enum SchedulerEventType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING'
}

// Define scheduler task interface
export interface SchedulerTask {
  id: string;
  type: SchedulerEventType;
  executeAt: number; // Timestamp in milliseconds
  data: any;
  recurring?: {
    pattern: string; // Time string in format HH:mm
    days?: number[]; // Days of week (0-6, 0 is Sunday)
  };
}

// Define scheduler events
export interface SchedulerEvents {
  taskScheduled: (task: SchedulerTask) => void;
  taskExecuted: (task: SchedulerTask) => void;
  taskCancelled: (taskId: string) => void;
  error: (error: Error, taskId?: string) => void;
}

/**
 * Scheduler class for managing timed tasks
 */
export class Scheduler extends EventEmitter {
  private tasks: Map<string, SchedulerTask>;
  private timers: Map<string, NodeJS.Timeout>;
  private client: Client | null;
  private isRunning: boolean;
  private checkInterval: NodeJS.Timeout | null;

  constructor() {
    super();
    this.tasks = new Map();
    this.timers = new Map();
    this.client = null;
    this.isRunning = false;
    this.checkInterval = null;
  }

  /**
   * Initialize the scheduler
   * @param client Discord client
   */
  public initialize(client: Client): void {
    this.client = client;
    this.isRunning = true;

    // Start the check interval (every minute)
    this.checkInterval = setInterval(() => this.checkTasks(), 60 * 1000);

    // Load tasks from database
    try {
      const tasks = loadTasks();
      tasks.forEach(task => this.scheduleTask(task));
      logger.info(`Loaded ${tasks.length} tasks from database`);
    } catch (error) {
      handleSchedulerError(
        SchedulerErrorType.INITIALIZATION,
        'Failed to load tasks from database',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }

    logger.info('Scheduler initialized');
  }

  /**
   * Schedule a one-time task
   * @param id Task ID
   * @param executeAt Timestamp to execute at
   * @param data Task data
   * @returns The scheduled task
   */
  public scheduleOnce(id: string, executeAt: number, data: any): SchedulerTask {
    const task: SchedulerTask = {
      id,
      type: SchedulerEventType.ONE_TIME,
      executeAt,
      data
    };

    this.scheduleTask(task);
    return task;
  }

  /**
   * Schedule a recurring task
   * @param id Task ID
   * @param pattern Time pattern (HH:mm)
   * @param data Task data
   * @param days Optional days of week to execute on
   * @returns The scheduled task
   */
  public scheduleRecurring(id: string, pattern: string, data: any, days?: number[]): SchedulerTask {
    // Calculate next execution time
    const nextExecutionTime = getNextOccurrence(pattern);

    const task: SchedulerTask = {
      id,
      type: SchedulerEventType.RECURRING,
      executeAt: nextExecutionTime.toMillis(),
      data,
      recurring: {
        pattern,
        days
      }
    };

    this.scheduleTask(task);
    return task;
  }

  /**
   * Cancel a scheduled task
   * @param id Task ID
   * @returns True if cancelled, false if not found
   */
  public cancelTask(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
      this.tasks.delete(id);

      // Delete from database
      try {
        deleteTask(id);
      } catch (error) {
        handleSchedulerError(
          SchedulerErrorType.TASK_CANCELLATION,
          `Failed to delete task ${id} from database, but it was cancelled in memory`,
          error instanceof Error ? error : new Error('Unknown error'),
          id
        );
      }

      this.emit('taskCancelled', id);
      logger.info(`Task ${id} cancelled`);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled tasks
   * @returns Array of scheduled tasks
   */
  public getAllTasks(): SchedulerTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get a specific task by ID
   * @param id Task ID
   * @returns The task or undefined if not found
   */
  public getTask(id: string): SchedulerTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Check if a task exists
   * @param id Task ID
   * @returns True if exists, false otherwise
   */
  public hasTask(id: string): boolean {
    return this.tasks.has(id);
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    this.isRunning = false;

    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear the check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('Scheduler stopped');
  }

  /**
   * Schedule a task
   * @param task The task to schedule
   */
  private scheduleTask(task: SchedulerTask): void {
    // Cancel existing task with the same ID if it exists
    this.cancelTask(task.id);

    // Add task to the map
    this.tasks.set(task.id, task);

    // Calculate delay in milliseconds
    const now = getCurrentTime().toMillis();
    const delay = Math.max(0, task.executeAt - now);

    // Schedule the task
    const timer = setTimeout(() => this.executeTask(task.id), delay);
    this.timers.set(task.id, timer);

    // Save to database
    try {
      saveTask(task);
    } catch (error) {
      handleSchedulerError(
        SchedulerErrorType.PERSISTENCE,
        `Failed to save task ${task.id} to database, but it was scheduled in memory`,
        error instanceof Error ? error : new Error('Unknown error'),
        task.id,
        task
      );
    }

    // Log and emit event
    logger.info(`Task ${task.id} scheduled to execute at ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);
    this.emit('taskScheduled', task);
  }

  /**
   * Execute a task
   * @param id Task ID
   */
  private executeTask(id: string): void {
    try {
      const task = this.tasks.get(id);
      if (!task) {
        handleSchedulerError(
          SchedulerErrorType.TASK_EXECUTION,
          `Task ${id} not found for execution`,
          undefined,
          id
        );
        return;
      }

      // Execute the task
      logger.info(`Executing task ${id}`);
      this.emit('taskExecuted', task);

      // If it's a recurring task, reschedule it
      if (task.type === SchedulerEventType.RECURRING && task.recurring) {
        // Calculate next execution time
        const nextExecutionTime = getNextOccurrence(task.recurring.pattern);

        // Check if the task should be executed on this day
        if (task.recurring.days && task.recurring.days.length > 0) {
          const dayOfWeek = nextExecutionTime.weekday % 7; // Convert to 0-6 format (0 is Sunday)
          if (!task.recurring.days.includes(dayOfWeek)) {
            // Skip this day and find the next valid day
            // This is a simplified implementation; a more robust one would calculate the exact next valid day
            const nextValidDay = this.findNextValidDay(dayOfWeek, task.recurring.days);
            const daysToAdd = (nextValidDay - dayOfWeek + 7) % 7;
            nextExecutionTime.plus({ days: daysToAdd });
          }
        }

        // Create a new task with the updated execution time
        const newTask: SchedulerTask = {
          ...task,
          executeAt: nextExecutionTime.toMillis()
        };

        // Schedule the new task
        this.scheduleTask(newTask);
      } else {
        // Remove one-time task
        this.tasks.delete(id);
        this.timers.delete(id);

        // Delete from database
        try {
          deleteTask(id);
        } catch (error) {
          handleSchedulerError(
            SchedulerErrorType.PERSISTENCE,
            `Failed to delete completed task ${id} from database`,
            error instanceof Error ? error : new Error('Unknown error'),
            id
          );
        }
      }
    } catch (error) {
      const schedulerError = handleSchedulerError(
        SchedulerErrorType.TASK_EXECUTION,
        `Error executing task ${id}`,
        error instanceof Error ? error : new Error('Unknown error'),
        id,
        this.tasks.get(id)
      );

      this.emit('error', schedulerError.error || new Error(schedulerError.message), id);
    }
  }

  /**
   * Find the next valid day for a recurring task
   * @param currentDay Current day of week (0-6)
   * @param validDays Valid days of week
   * @returns Next valid day
   */
  private findNextValidDay(currentDay: number, validDays: number[]): number {
    // Sort the valid days
    const sortedDays = [...validDays].sort((a, b) => a - b);

    // Find the next valid day
    for (const day of sortedDays) {
      if (day > currentDay) {
        return day;
      }
    }

    // If no valid day is found after the current day, return the first valid day
    return sortedDays[0] || currentDay; // Fallback to current day if array is empty
  }

  /**
   * Check for tasks that need to be executed
   */
  private checkTasks(): void {
    if (!this.isRunning) return;

    const now = getCurrentTime().toMillis();

    // Check for tasks that should have been executed but weren't
    this.tasks.forEach((task) => {
      if (task.executeAt <= now && this.timers.has(task.id)) {
        // Task should have been executed but wasn't
        logger.warn(`Task ${task.id} should have been executed at ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)} but wasn't. Executing now.`);

        // Cancel the existing timer
        const timer = this.timers.get(task.id);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(task.id);
        }

        // Execute the task
        this.executeTask(task.id);
      }
    });
  }
}

// Create and export a singleton instance
export const scheduler = new Scheduler();
export default scheduler;
