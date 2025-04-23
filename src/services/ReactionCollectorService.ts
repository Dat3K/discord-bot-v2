/**
 * Reaction Collector Service
 *
 * This service handles reaction collection and processing.
 */

import { MessageReaction, User } from 'discord.js';
import { LoggingService } from './LoggingService';

import type { ReactionCollection } from '../interfaces/ReactionCollection';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Reaction Collector Service class
 * Handles reaction collection and processing
 */
export class ReactionCollectorService {
  private activeCollections: Map<string, ReactionCollection> = new Map();
  private collectionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    logger.info('ReactionCollectorService initialized');

    // Start cleanup interval
    setInterval(() => this.cleanupExpiredCollections(), 60000); // Check every minute
  }

  /**
   * Creates a new reaction collection
   * @param messageId The ID of the message to collect reactions from
   * @param channelId The ID of the channel the message is in
   * @param duration The duration of the collection in milliseconds
   * @param emojiFilter Optional filter for specific emojis
   * @param userFilter Optional filter for specific users
   * @returns The ID of the collection
   */
  public createCollection(
    messageId: string,
    channelId: string,
    duration: number,
    emojiFilter?: string[],
    userFilter?: string[]
  ): string {
    // Generate a unique ID for the collection
    const id = crypto.randomUUID();

    // Calculate end time
    const endTime = new Date(Date.now() + duration);

    // Create the collection
    const collection: ReactionCollection = {
      id,
      messageId,
      channelId,
      emojiFilter,
      userFilter,
      endTime,
      reactions: new Map(),
    };

    // Add the collection to the active collections map
    this.activeCollections.set(id, collection);

    // Set a timeout to end the collection
    const timeout = setTimeout(() => {
      this.endCollection(id);
    }, duration);

    // Store the timeout
    this.collectionTimeouts.set(id, timeout);

    logger.info('Reaction collection created', {
      collectionId: id,
      messageId,
      channelId,
      endTime: endTime.toISOString(),
    });

    return id;
  }

  /**
   * Handles a reaction
   * @param reaction The reaction
   * @param user The user who reacted
   * @returns Whether the reaction was handled
   */
  public handleReaction(reaction: MessageReaction, user: User): boolean {
    // Get the message ID and channel ID
    const messageId = reaction.message.id;
    const channelId = reaction.message.channel.id;

    // Find collections for this message
    const collections = Array.from(this.activeCollections.values()).filter(
      (collection) => collection.messageId === messageId && collection.channelId === channelId
    );

    // Return false if no collections found
    if (collections.length === 0) {
      return false;
    }

    // Get the emoji name
    const emojiName = reaction.emoji.name || 'unknown';

    // Process the reaction for each collection
    for (const collection of collections) {
      // Check emoji filter
      if (collection.emojiFilter && !collection.emojiFilter.includes(emojiName)) {
        continue;
      }

      // Check user filter
      if (collection.userFilter && !collection.userFilter.includes(user.id)) {
        continue;
      }

      // Add the reaction to the collection
      if (!collection.reactions.has(emojiName)) {
        collection.reactions.set(emojiName, new Set());
      }
      collection.reactions.get(emojiName)?.add(user.id);

      logger.debug('Reaction added to collection', {
        collectionId: collection.id,
        emoji: emojiName,
        userId: user.id,
      });
    }

    return true;
  }

  /**
   * Ends a reaction collection
   * @param id The ID of the collection to end
   * @returns The results of the collection, or undefined if not found
   */
  public endCollection(id: string): Record<string, string[]> | undefined {
    // Get the collection
    const collection = this.activeCollections.get(id);

    // Return undefined if collection doesn't exist
    if (!collection) {
      logger.warn('Collection not found', { collectionId: id });
      return undefined;
    }

    // Clear the timeout
    const timeout = this.collectionTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.collectionTimeouts.delete(id);
    }

    // Remove the collection from the active collections map
    this.activeCollections.delete(id);

    // Convert the reactions to a simple object
    const results: Record<string, string[]> = {};
    for (const [emoji, users] of collection.reactions.entries()) {
      results[emoji] = Array.from(users);
    }

    logger.info('Reaction collection ended', {
      collectionId: id,
      results,
    });

    return results;
  }

  /**
   * Gets all active collections
   * @returns All active collections
   */
  public getActiveCollections(): ReactionCollection[] {
    return Array.from(this.activeCollections.values());
  }

  /**
   * Gets a collection by ID
   * @param id The ID of the collection to get
   * @returns The collection, or undefined if not found
   */
  public getCollection(id: string): ReactionCollection | undefined {
    return this.activeCollections.get(id);
  }

  /**
   * Cleans up expired collections
   */
  private cleanupExpiredCollections(): void {
    const now = new Date();

    // Find expired collections
    const expiredCollections = Array.from(this.activeCollections.values()).filter(
      (collection) => collection.endTime <= now
    );

    // End each expired collection
    for (const collection of expiredCollections) {
      this.endCollection(collection.id);
    }

    if (expiredCollections.length > 0) {
      logger.debug('Cleaned up expired collections', {
        count: expiredCollections.length,
      });
    }
  }
}
