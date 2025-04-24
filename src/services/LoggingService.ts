/**
 * Logging Service
 *
 * This service implements the Singleton pattern for logging.
 * It uses Winston for logging and implements the Observer pattern for error notifications.
 */

import { createLogger, format, transports, Logger } from 'winston';
import { config } from '../config/config';
import type { LogLevel } from '../config/config';

// Observer pattern for error notifications
type ErrorObserver = (error: Error, context?: Record<string, unknown>) => void;

export class LoggingService {
  private static instance: LoggingService;
  private logger: Logger;
  private errorObservers: ErrorObserver[] = [];

  private constructor() {
    // Create Winston logger with enhanced console transport
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
        // Enhanced console transport with better visual formatting
        new transports.Console({
          format: format.combine(
            format.colorize({ all: true }),
            format.printf(({ timestamp, level, message, ...meta }) => {
              // Create a visual separator based on log level
              let prefix = '';
              if (level.includes('error')) {
                prefix = '❌ ';
              } else if (level.includes('warn')) {
                prefix = '⚠️ ';
              } else if (level.includes('info')) {
                prefix = '📝 ';
              } else if (level.includes('debug')) {
                prefix = '🔍 ';
              } else if (level.includes('http')) {
                prefix = '🌐 ';
              } else if (level.includes('verbose')) {
                prefix = '🔊 ';
              } else if (level.includes('silly')) {
                prefix = '🤪 ';
              }

              // Format metadata for better readability
              let metaStr = '';
              if (Object.keys(meta).length) {
                // Filter out service from meta to avoid duplication
                const { service, ...restMeta } = meta;

                // Format the metadata as a pretty JSON string with indentation
                if (Object.keys(restMeta).length) {
                  metaStr = '\n' + JSON.stringify(restMeta, null, 2)
                    .split('\n')
                    .map(line => '  ' + line) // Add indentation to each line
                    .join('\n');
                }
              }

              // Return the formatted log message
              return `[${timestamp}] ${prefix}${level}: ${message}${metaStr}`;
            })
          ),
        })
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

  /**
   * Creates a visual divider in the logs
   * @param title Optional title for the divider
   * @param level Log level to use (default: info)
   */
  public divider(title?: string, level: LogLevel = 'info'): void {
    const dividerLength = 60;
    const dividerChar = '=';

    if (title) {
      // Calculate padding to center the title
      const padding = Math.max(0, Math.floor((dividerLength - title.length - 2) / 2));
      const leftPad = dividerChar.repeat(padding);
      const rightPad = dividerChar.repeat(dividerLength - padding - title.length - 2);
      const divider = `${leftPad} ${title} ${rightPad}`;

      // Log the divider with the title
      this.log(level, divider);
    } else {
      // Log a simple divider
      this.log(level, dividerChar.repeat(dividerLength));
    }
  }

  /**
   * Generic log method that can be used with any log level
   * @param level Log level
   * @param message Message to log
   * @param meta Additional metadata
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    switch (level) {
      case 'error':
        this.error(message, meta);
        break;
      case 'warn':
        this.warn(message, meta);
        break;
      case 'info':
        this.info(message, meta);
        break;
      case 'http':
        this.http(message, meta);
        break;
      case 'verbose':
        this.verbose(message, meta);
        break;
      case 'debug':
        this.debug(message, meta);
        break;
      case 'silly':
        this.silly(message, meta);
        break;
      default:
        this.info(message, meta);
    }
  }
}
