/**
 * Command Interface
 * 
 * This file defines the interface for commands.
 */

import { Message } from 'discord.js';

/**
 * Command interface
 * Defines the structure of a command
 */
export interface Command {
  /**
   * The name of the command
   */
  name: string;

  /**
   * The description of the command
   */
  description: string;

  /**
   * Optional aliases for the command
   */
  aliases?: string[];

  /**
   * Executes the command
   * @param message The message that triggered the command
   * @param args The arguments passed to the command
   */
  execute: (message: Message, args: string[]) => Promise<void>;
}
