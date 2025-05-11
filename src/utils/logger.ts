import { TextChannel } from 'discord.js';
import { getCurrentTime, formatDateTime } from './timeUtils';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Get log level from environment variable directly to avoid circular dependencies
const currentLogLevel = (process.env.LOG_LEVEL?.toLowerCase() || 'info') as string;
const LOG_LEVEL = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
}[currentLogLevel] || LogLevel.INFO;

// ANSI color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Discord error notification channel
let errorChannel: TextChannel | null = null;

/**
 * Set the Discord error notification channel
 * @param channel The Discord text channel to send error notifications to
 */
export function setErrorChannel(channel: TextChannel) {
  errorChannel = channel;
}

/**
 * Log a message to the console and optionally to Discord
 * @param level The log level
 * @param message The message to log
 * @param error Optional error object
 */
function log(level: LogLevel, message: string, error?: Error) {
  // Skip if below current log level
  if (level < LOG_LEVEL) return;

  const timestamp = formatDateTime(getCurrentTime(), 'yyyy-MM-dd HH:mm:ss');
  let prefix = '';
  let color = '';

  switch (level) {
    case LogLevel.DEBUG:
      prefix = 'DEBUG';
      color = COLORS.cyan;
      break;
    case LogLevel.INFO:
      prefix = 'INFO';
      color = COLORS.green;
      break;
    case LogLevel.WARN:
      prefix = 'WARN';
      color = COLORS.yellow;
      break;
    case LogLevel.ERROR:
      prefix = 'ERROR';
      color = COLORS.red;
      break;
  }

  // Console output
  console.log(`${color}[${timestamp}] [${prefix}]${COLORS.reset} ${message}`);

  // Log stack trace for errors
  if (error && level >= LogLevel.ERROR) {
    console.error(`${COLORS.red}${error.stack || error}${COLORS.reset}`);
  }

  // Send to Discord if it's an error and we have an error channel
  if (level === LogLevel.ERROR && errorChannel) {
    const errorMessage = error ? `\n\`\`\`\n${error.stack || error}\n\`\`\`` : '';
    errorChannel.send(`**ERROR:** ${message}${errorMessage}`)
      .catch(err => console.error('Failed to send error to Discord:', err));
  }
}

// Export log functions
export const logger = {
  debug: (message: string) => log(LogLevel.DEBUG, message),
  info: (message: string) => log(LogLevel.INFO, message),
  warn: (message: string) => log(LogLevel.WARN, message),
  error: (message: string, error?: Error) => log(LogLevel.ERROR, message, error),
};
