/**
 * Environment Utilities
 * 
 * This file provides utilities for working with environment variables.
 */

/**
 * Gets an environment variable
 * @param key The environment variable key
 * @param defaultValue The default value to return if the environment variable is not set
 * @returns The environment variable value, or the default value if not set
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Gets an environment variable as a number
 * @param key The environment variable key
 * @param defaultValue The default value to return if the environment variable is not set
 * @returns The environment variable value as a number, or the default value if not set
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a number`);
  }
  return num;
}

/**
 * Gets an environment variable as a boolean
 * @param key The environment variable key
 * @param defaultValue The default value to return if the environment variable is not set
 * @returns The environment variable value as a boolean, or the default value if not set
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value.toLowerCase() === 'true';
}

/**
 * Checks if the environment is development
 * @returns Whether the environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Checks if the environment is production
 * @returns Whether the environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
