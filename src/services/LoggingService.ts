/**
 * Logging Service
 *
 * This service implements the Singleton pattern for logging.
 * It uses Winston for logging and implements the Observer pattern for error notifications.
 */

import { createLogger, format, transports, Logger } from 'winston';
import { config } from '../config/config';
import { join } from 'path';
import { mkdir } from 'fs/promises';


// Observer pattern for error notifications
type ErrorObserver = (error: Error, context?: Record<string, unknown>) => void;

export class LoggingService {
  private static instance: LoggingService;
  private logger: Logger;
  private errorObservers: ErrorObserver[] = [];

  private constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), 'logs');
    mkdir(logsDir, { recursive: true }).catch(err => {
      console.error('Failed to create logs directory:', err);
    });

    // Create Winston logger
    this.logger = createLogger({
      level: config.logging.level,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: 'discord-bot' },
      transports: [
        // Console transport
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              }`;
            })
          ),
        }),
        // File transport for all logs
        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // File transport for error logs
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  // Observer pattern methods
  public addErrorObserver(observer: ErrorObserver): void {
    this.errorObservers.push(observer);
  }

  public removeErrorObserver(observer: ErrorObserver): void {
    const index = this.errorObservers.indexOf(observer);
    if (index !== -1) {
      this.errorObservers.splice(index, 1);
    }
  }

  private notifyErrorObservers(error: Error, context?: Record<string, unknown>): void {
    for (const observer of this.errorObservers) {
      observer(error, context);
    }
  }

  // Logging methods
  public error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
    if (meta?.error instanceof Error) {
      this.notifyErrorObservers(meta.error, meta);
    }
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  public http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }

  public verbose(message: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, meta);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  public silly(message: string, meta?: Record<string, unknown>): void {
    this.logger.silly(message, meta);
  }
}
