import { Client, Events, MessageReaction, PartialMessageReaction, User, PartialUser, Message, PartialMessage } from 'discord.js';
import { logger } from '../utils/logger';
import { reactionData } from '../database';
import { getCurrentTime } from '../utils/timeUtils';
import { activeRegistrations } from '../database';
import { hasRole } from '../utils/roleUtils';
import config from '../config';

// Define valid emojis for different message types
const VALID_EMOJIS = {
  MEAL_REGISTRATION: [config.json.emojis.breakfast, config.json.emojis.dinner],
  LATE_MORNING_REGISTRATION: [config.json.emojis.late],
  LATE_EVENING_REGISTRATION: [config.json.emojis.late],
};

/**
 * Check if a message is a registration message
 * @param messageId The message ID to check
 * @returns Promise that resolves to the registration type or null if not a registration message
 */
async function getRegistrationType(messageId: string): Promise<string | null> {
  try {
    const registration = activeRegistrations.getByMessageId(messageId);
    return registration ? registration.registration_type : null;
  } catch (error) {
    logger.error(`Failed to check if message ${messageId} is a registration message:`, error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Check if an emoji is valid for a registration type
 * @param emoji The emoji to check
 * @param registrationType The registration type
 * @returns True if the emoji is valid for the registration type
 */
function isValidEmoji(emoji: string, registrationType: string): boolean {
  const validEmojis = VALID_EMOJIS[registrationType as keyof typeof VALID_EMOJIS];
  return validEmojis ? validEmojis.includes(emoji) : false;
}

/**
 * Get the meal type from an emoji
 * @param emoji The emoji to check
 * @returns The meal type or null if not a valid meal emoji
 */
function getMealTypeFromEmoji(emoji: string): string | null {
  if (emoji === config.json.emojis.breakfast) {
    return 'breakfast';
  } else if (emoji === config.json.emojis.dinner) {
    return 'dinner';
  } else if (emoji === config.json.emojis.late) {
    return 'late';
  }
  return null;
}

/**
 * Handle a reaction add event
 * @param reaction The reaction that was added
 * @param user The user who added the reaction
 */
async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  try {
    // Skip reactions from bots
    if (user.bot) return;

    // Ensure the reaction is fully fetched
    const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
    const fullUser = user.partial ? await user.fetch() : user;
    const message = fullReaction.message.partial ? await fullReaction.message.fetch() : fullReaction.message;

    // Get the emoji
    const emoji = fullReaction.emoji.name;
    if (!emoji) {
      logger.debug(`Skipping reaction with null emoji from user ${fullUser.tag} (${fullUser.id})`);
      return;
    }

    // Check if this is a registration message
    const registrationType = await getRegistrationType(message.id);
    if (!registrationType) {
      logger.debug(`Skipping reaction to non-registration message ${message.id}`);
      return;
    }

    // Check if the emoji is valid for this registration type
    if (!isValidEmoji(emoji, registrationType)) {
      logger.debug(`Invalid emoji ${emoji} for registration type ${registrationType}`);
      // Remove invalid reactions
      try {
        await fullReaction.users.remove(fullUser.id);
        logger.debug(`Removed invalid reaction ${emoji} from user ${fullUser.id}`);
      } catch (removeError) {
        logger.error(`Failed to remove invalid reaction:`, removeError instanceof Error ? removeError : new Error('Unknown error'));
      }
      return;
    }

    // Check if the user has the tracked role
    const client = fullReaction.client;
    const hasTrackedRole = await hasRole(client, fullUser.id);

    // Store the reaction in the database
    const timestamp = getCurrentTime().toMillis();
    await reactionData.add({
      user_id: fullUser.id,
      message_id: message.id,
      reaction_type: emoji,
      timestamp,
      removed: false
    });

    // Log the reaction
    const logChannel = config.channels.mealRegistrationLog;
    if (logChannel) {
      const mealType = getMealTypeFromEmoji(emoji);
      const hasRoleText = hasTrackedRole ? '✅' : '❌';

      await logChannel.send({
        embeds: [{
          title: 'Reaction Added',
          description: `**User:** ${fullUser.tag} (${fullUser.id})\n**Message:** [Jump to Message](${message.url})\n**Reaction:** ${emoji}\n**Has Tracked Role:** ${hasRoleText}\n**Meal Type:** ${mealType || 'Unknown'}\n**Registration Type:** ${registrationType}`,
          color: 0x2ecc71, // Green
          timestamp: new Date(timestamp)
        }]
      });
    }

    logger.info(`User ${fullUser.tag} (${fullUser.id}) added reaction ${emoji} to message ${message.id}`);
  } catch (error) {
    logger.error('Error handling reaction add:', error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Handle a reaction remove event
 * @param reaction The reaction that was removed
 * @param user The user who removed the reaction
 */
async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  try {
    // Skip reactions from bots
    if (user.bot) return;

    // Ensure the reaction is fully fetched
    const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
    const fullUser = user.partial ? await user.fetch() : user;
    const message = fullReaction.message.partial ? await fullReaction.message.fetch() : fullReaction.message;

    // Get the emoji
    const emoji = fullReaction.emoji.name;
    if (!emoji) {
      logger.debug(`Skipping removed reaction with null emoji from user ${fullUser.tag} (${fullUser.id})`);
      return;
    }

    // Check if this is a registration message
    const registrationType = await getRegistrationType(message.id);
    if (!registrationType) {
      logger.debug(`Skipping removed reaction from non-registration message ${message.id}`);
      return;
    }

    // Check if the emoji is valid for this registration type
    if (!isValidEmoji(emoji, registrationType)) {
      logger.debug(`Invalid emoji ${emoji} removed for registration type ${registrationType}`);
      return;
    }

    // Check if the user has the tracked role
    const client = fullReaction.client;
    const hasTrackedRole = await hasRole(client, fullUser.id);

    // Mark the reaction as removed in the database
    const timestamp = getCurrentTime().toMillis();
    await reactionData.markAsRemoved(fullUser.id, message.id, emoji, timestamp);

    // Log the reaction removal
    const logChannel = config.channels.mealRegistrationLog;
    if (logChannel) {
      const mealType = getMealTypeFromEmoji(emoji);
      const hasRoleText = hasTrackedRole ? '✅' : '❌';

      await logChannel.send({
        embeds: [{
          title: 'Reaction Removed',
          description: `**User:** ${fullUser.tag} (${fullUser.id})\n**Message:** [Jump to Message](${message.url})\n**Reaction:** ${emoji}\n**Has Tracked Role:** ${hasRoleText}\n**Meal Type:** ${mealType || 'Unknown'}\n**Registration Type:** ${registrationType}`,
          color: 0xe74c3c, // Red
          timestamp: new Date(timestamp)
        }]
      });
    }

    logger.info(`User ${fullUser.tag} (${fullUser.id}) removed reaction ${emoji} from message ${message.id}`);
  } catch (error) {
    logger.error('Error handling reaction remove:', error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Event handler for reaction-related events
 * @param client The Discord client
 */
export default (client: Client): void => {
  // Handle reaction add event
  client.on(Events.MessageReactionAdd, handleReactionAdd);

  // Handle reaction remove event
  client.on(Events.MessageReactionRemove, handleReactionRemove);
};
