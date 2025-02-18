import { Client, Message, TextChannel, ReactionCollector, MessageReaction, User, EmbedBuilder } from 'discord.js';
import { format, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ReactionTracker, ReactionTrackerData } from '../types/reactionTracker';

interface EmojiTracker {
    emoji: string;
    participants: string[];
    collector?: ReactionCollector;
}

const VOTE_EMOJIS = {
    YES: '🌞',  // Sáng
    NO: '🌚',   // Tối
};

class ReactionTrackerService {
    private trackers: Map<string, {
        messageData: ReactionTracker;
        emojiTrackers: Map<string, EmojiTracker>;
        startTime: Date;
        isActive: boolean;
    }> = new Map();

    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    private normalizeEmoji(emoji: string): string {
        // Chuyển đổi emoji thành dạng chuẩn hóa
        return emoji.replace(/[\uFE0F]/g, '');
    }

    async createTracker(data: ReactionTrackerData): Promise<ReactionTracker | null> {
        try {
            const channel = await this.client.channels.fetch(data.channelId);
            if (!(channel instanceof TextChannel)) {
                throw new Error('Invalid channel');
            }

            const message = await channel.messages.fetch(data.messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            const trackerData = {
                messageData: {
                    ...data,
                    isActive: true,
                    participants: []
                },
                emojiTrackers: new Map<string, EmojiTracker>(),
                startTime: new Date(),
                isActive: true
            };

            // Tạo collector cho mỗi emoji
            for (const [key, emoji] of Object.entries(VOTE_EMOJIS)) {
                await message.react(emoji);

                const targetEmoji = this.normalizeEmoji(emoji);
                const filter = (reaction: MessageReaction, user: User) => {
                    const reactionEmoji = this.normalizeEmoji(reaction.emoji.toString());
                    return reactionEmoji === targetEmoji && !user.bot;
                };

                const collector = message.createReactionCollector({
                    filter,
                    time: data.endTime.getTime() - Date.now(),
                    dispose: true
                });

                const emojiTracker: EmojiTracker = {
                    emoji,
                    participants: [],
                    collector
                };

                collector.on('collect', (reaction, user) => {
                    if (!emojiTracker.participants.includes(user.id)) {
                        emojiTracker.participants.push(user.id);
                    }
                });

                collector.on('remove', (reaction, user) => {
                    emojiTracker.participants = emojiTracker.participants.filter(id => id !== user.id);
                });

                collector.on('end', async () => {
                    await this.endTracking(data.messageId);
                });

                trackerData.emojiTrackers.set(emoji, emojiTracker);
            }

            this.trackers.set(data.messageId, trackerData);
            return trackerData.messageData;
        } catch (error) {
            console.error('Error creating reaction tracker:', error);
            return null;
        }
    }

    private async endTracking(messageId: string) {
        const tracker = this.trackers.get(messageId);
        if (!tracker || !tracker.isActive) return;

        tracker.isActive = false;
        tracker.emojiTrackers.forEach(et => et.collector?.stop());

        try {
            const channel = await this.client.channels.fetch(tracker.messageData.channelId);
            if (!(channel instanceof TextChannel)) return;

            const duration = intervalToDuration({
                start: tracker.startTime,
                end: new Date()
            });

            const formattedDuration = formatDuration(duration, {
                locale: vi,
                delimiter: ', '
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 Kết quả bình chọn')
                .setDescription(tracker.messageData.description)
                .setColor('#00ff00')
                .setFooter({ text: `Thời gian theo dõi: ${formattedDuration}` });

            // Tính tổng số người tham gia
            const totalParticipants = new Set(
                Array.from(tracker.emojiTrackers.values())
                    .flatMap(et => et.participants)
            ).size;

            embed.addFields({ 
                name: '👥 Tổng số người tham gia', 
                value: `${totalParticipants} người`,
                inline: false 
            });

            // Thêm kết quả cho từng emoji
            for (const [emoji, emojiTracker] of tracker.emojiTrackers.entries()) {
                const participants = await Promise.all(
                    emojiTracker.participants.map(async (userId) => {
                        try {
                            const user = await this.client.users.fetch(userId);
                            return user.tag;
                        } catch {
                            return userId;
                        }
                    })
                );

                const percentage = totalParticipants > 0 
                    ? Math.round((participants.length / totalParticipants) * 100) 
                    : 0;

                const participantsList = participants.length > 0
                    ? participants.map((p, i) => `${i + 1}. ${p}`).join('\n')
                    : '*Không có người tham gia*';

                embed.addFields({
                    name: `${emoji} - ${participants.length} người (${percentage}%)`,
                    value: participantsList,
                    inline: false
                });
            }

            await channel.send({ embeds: [embed] });
            this.trackers.delete(messageId);
        } catch (error) {
            console.error('Error ending reaction tracker:', error);
        }
    }

    getTracker(messageId: string): ReactionTracker | undefined {
        const tracker = this.trackers.get(messageId);
        if (tracker) {
            return tracker.messageData;
        }
        return undefined;
    }

    getAllActiveTrackers(): ReactionTracker[] {
        return Array.from(this.trackers.values())
            .filter(t => t.isActive)
            .map(t => t.messageData);
    }
}

export const createReactionTrackerService = (client: Client) => {
    return new ReactionTrackerService(client);
}; 