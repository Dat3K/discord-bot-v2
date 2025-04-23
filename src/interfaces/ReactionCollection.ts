/**
 * Reaction Collection Interface
 * 
 * This file defines interfaces for reaction collections.
 */

/**
 * Reaction collection interface
 */
export interface ReactionCollection {
  /**
   * The unique ID of the collection
   */
  id: string;

  /**
   * The ID of the message to collect reactions from
   */
  messageId: string;

  /**
   * The ID of the channel the message is in
   */
  channelId: string;

  /**
   * Optional filter for specific emojis
   */
  emojiFilter?: string[];

  /**
   * Optional filter for specific users
   */
  userFilter?: string[];

  /**
   * The time when the collection ends
   */
  endTime: Date;

  /**
   * The collected reactions
   * Map of emoji name to set of user IDs
   */
  reactions: Map<string, Set<string>>;
}
