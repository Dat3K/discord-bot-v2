import db from '../database';
import type { SchedulerTask } from './index';
import { SchedulerEventType } from './index';
import { logger } from '../utils/logger';

// Define database schema for scheduler tasks
export interface DbSchedulerTask {
  id: string;
  type: string;
  execute_at: number;
  data: string;
  recurring_pattern?: string;
  recurring_days?: string;
}

/**
 * Initialize the scheduler database
 */
export function initializeSchedulerDatabase(): void {
  try {
    // Create scheduler_tasks table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduler_tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        execute_at INTEGER NOT NULL,
        data TEXT NOT NULL,
        recurring_pattern TEXT,
        recurring_days TEXT
      )
    `);

    logger.info('Scheduler database initialized');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to initialize scheduler database:', error);
    } else {
      logger.error('Failed to initialize scheduler database with unknown error');
    }
    throw error;
  }
}

/**
 * Save a task to the database
 * @param task The task to save
 */
export function saveTask(task: SchedulerTask): void {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO scheduler_tasks (id, type, execute_at, data, recurring_pattern, recurring_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.type,
      task.executeAt,
      JSON.stringify(task.data),
      task.recurring?.pattern || null,
      task.recurring?.days ? JSON.stringify(task.recurring.days) : null
    );

    logger.debug(`Task ${task.id} saved to database`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to save task ${task.id} to database:`, error);
    } else {
      logger.error(`Failed to save task ${task.id} to database with unknown error`);
    }
    throw error;
  }
}

/**
 * Delete a task from the database
 * @param taskId The ID of the task to delete
 * @returns True if deleted, false if not found
 */
export function deleteTask(taskId: string): boolean {
  try {
    const stmt = db.prepare('DELETE FROM scheduler_tasks WHERE id = ?');
    const result = stmt.run(taskId);

    const deleted = result.changes > 0;
    if (deleted) {
      logger.debug(`Task ${taskId} deleted from database`);
    }

    return deleted;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to delete task ${taskId} from database:`, error);
    } else {
      logger.error(`Failed to delete task ${taskId} from database with unknown error`);
    }
    throw error;
  }
}

/**
 * Load all tasks from the database
 * @returns Array of scheduler tasks
 */
export function loadTasks(): SchedulerTask[] {
  try {
    const stmt = db.prepare('SELECT * FROM scheduler_tasks');
    const dbTasks = stmt.all() as DbSchedulerTask[];

    const tasks: SchedulerTask[] = dbTasks.map(dbTask => {
      const task: SchedulerTask = {
        id: dbTask.id,
        type: dbTask.type as SchedulerEventType,
        executeAt: dbTask.execute_at,
        data: JSON.parse(dbTask.data)
      };

      if (dbTask.recurring_pattern) {
        task.recurring = {
          pattern: dbTask.recurring_pattern
        };

        if (dbTask.recurring_days) {
          task.recurring.days = JSON.parse(dbTask.recurring_days);
        }
      }

      return task;
    });

    logger.info(`Loaded ${tasks.length} tasks from database`);
    return tasks;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to load tasks from database:', error);
    } else {
      logger.error('Failed to load tasks from database with unknown error');
    }
    throw error;
  }
}

/**
 * Clear all tasks from the database
 * @returns Number of tasks deleted
 */
export function clearTasks(): number {
  try {
    const stmt = db.prepare('DELETE FROM scheduler_tasks');
    const result = stmt.run();

    const deleted = result.changes;
    logger.info(`Cleared ${deleted} tasks from database`);

    return deleted;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to clear tasks from database:', error);
    } else {
      logger.error('Failed to clear tasks from database with unknown error');
    }
    throw error;
  }
}

// Initialize the scheduler database when this module is imported
initializeSchedulerDatabase();
