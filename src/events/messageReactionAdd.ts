import { Events, MessageReaction, User } from 'discord.js';
import { reactionLogger } from '../services';

export default {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction: MessageReaction, user: User) {
        if (user.bot) return;

        try {
            // Đảm bảo reaction được fetch đầy đủ
            if (reaction.partial) {
                await reaction.fetch();
            }

            // Đảm bảo message được fetch đầy đủ
            if (reaction.message.partial) {
                await reaction.message.fetch();
            }

            // Log reaction
            await reactionLogger.logReaction(
                reaction.message.id,
                reaction.message.channelId,
                reaction.emoji.toString(),
                user,
                true,
                reaction.message.content || undefined
            );
        } catch (error) {
            console.error('Error handling reaction:', error);
        }
    },
}; 