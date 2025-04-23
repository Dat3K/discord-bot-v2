/**
 * Message Reaction Add Event Handler
 *
 * This file handles the messageReactionAdd event from Discord.js.
 */

import { MessageReaction, User } from 'discord.js';
import type { PartialMessageReaction, PartialUser } from 'discord.js';
import { LoggingService } from '../services/LoggingService.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Handles the messageReactionAdd event
 * @param reaction The Discord.js reaction
 * @param user The Discord.js user
 */
export async function messageReactionAddHandler(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
  // Ignore reactions from bots
  if (user.bot) return;

  // Ensure the reaction and user are fully fetched
  const fetchedReaction = reaction.partial ? await reaction.fetch() : reaction;
  const fetchedUser = user.partial ? await user.fetch() : user;

  logger.debug('Reaction added', {
    user: fetchedUser.tag,
    emoji: fetchedReaction.emoji.name,
    messageId: fetchedReaction.message.id,
    channelId: fetchedReaction.message.channel.id,
  });

  // Reaction handling is implemented directly in MealRegistrationService
}
