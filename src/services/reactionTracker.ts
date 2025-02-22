import { Client, TextChannel, ReactionCollector, MessageReaction, User, EmbedBuilder, Colors } from 'discord.js';
import {formatDuration, intervalToDuration } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ReactionTracker, ReactionTrackerData } from '../types/reactionTracker';
import { config } from '../config/config';

interface EmojiTracker {
    emoji: string;
    participants: string[];
}

interface TrackerData {
    messageData: ReactionTracker;
    emojiTrackers: Map<string, EmojiTracker>;
    collector?: ReactionCollector;
    startTime: Date;
    isActive: boolean;
}

const EMBED_COLORS = {
    SUCCESS: Colors.Green,
    ERROR: Colors.Red,
    INFO: Colors.Blurple,
    WARNING: Colors.Yellow,
};

class ReactionTrackerService {
    private trackers: Map<string, TrackerData> = new Map();

    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    private normalizeEmoji(emoji: string): string {
        // Chuyển đổi emoji thành dạng chuẩn hóa
        return emoji.replace(/[\uFE0F]/g, '');
    }

    private async createResultEmbed(
        tracker: {
            messageData: ReactionTracker;
            emojiTrackers: Map<string, EmojiTracker>;
            startTime: Date;
        },
        totalParticipants: number,
        formattedDuration: string
    ): Promise<EmbedBuilder> {
        const embed = new EmbedBuilder()
            .setTitle('📝 Danh sách đăng ký')
            .setDescription(tracker.messageData.description)
            .setColor(EMBED_COLORS.SUCCESS)
            .setTimestamp()
            .setFooter({ text: `Thời gian theo dõi: ${formattedDuration}` });

        // Thêm trường tổng số người tham gia
        embed.addFields({
            name: '👨‍🎓 Tổng số người đăng ký',
            value: `\n${totalParticipants} người`,
            inline: false
        });

        // Thêm kết quả cho từng emoji
        for (const [emoji, emojiTracker] of tracker.emojiTrackers.entries()) {
            const participants = await Promise.all(
                emojiTracker.participants.map(async (userId) => {
                    try {
                        const guild = await this.client.guilds.fetch(tracker.messageData.guildId);
                        const member = await guild.members.fetch(userId);
                        return member.nickname || member.user.username;
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
                : '*Không có người đăng ký*';

            embed.addFields({
                name: `${emoji} - ${participants.length} người (${percentage}%)`,
                value: participantsList,
                inline: true
            });
        }
        return embed;
    }

    private async logReaction(messageId: string, emoji: string, user: User, isAdd: boolean) {
        try {
            const tracker = this.trackers.get(messageId);
            if (!tracker || !tracker.isActive) return;

            const channel = await this.client.channels.fetch(config.logChannelId);
            if (!(channel instanceof TextChannel)) return;

            const originalChannel = await this.client.channels.fetch(tracker.messageData.channelId);
            if (!(originalChannel instanceof TextChannel)) return;

            const originalMessage = await originalChannel.messages.fetch(messageId);
            if (!originalMessage) return;

            const embed = new EmbedBuilder()
                .setTitle(isAdd ? '➕ Reaction Added' : '➖ Reaction Removed')
                .setDescription(`**Message:** ${tracker.messageData.description}\n**Channel:** ${originalChannel.name}\n**User:** ${user.username}\n**Emoji:** ${emoji}`)
                .setColor(isAdd ? Colors.Green : Colors.Red)
                .setTimestamp()
                .setFooter({ text: `Message ID: ${messageId}` });

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging reaction:', error);
        }
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

            // Tạo một tracker duy nhất cho tất cả emoji
            const trackerData: TrackerData = {
                messageData: {
                    ...data,
                    isActive: true,
                    participants: []
                },
                emojiTrackers: new Map<string, EmojiTracker>(),
                startTime: new Date(),
                isActive: true
            };

            // Xử lý tất cả emoji trong một tracker
            const emojis = data.emoji.split(',').map(e => e.trim());
            
            // Thêm reaction và khởi tạo tracker cho mỗi emoji
            for (const emoji of emojis) {
                await message.react(emoji);
                trackerData.emojiTrackers.set(emoji, {
                    emoji,
                    participants: []
                });
            }

            // Tạo một collector duy nhất cho tất cả emoji
            const filter = (reaction: MessageReaction, user: User) => {
                const reactionEmoji = this.normalizeEmoji(reaction.emoji.toString());
                return emojis.includes(reactionEmoji) && !user.bot;
            };

            const collector = message.createReactionCollector({
                filter,
                time: data.endTime.getTime() - Date.now(),
                dispose: true
            });

            collector.on('collect', async (reaction, user) => {
                const emoji = reaction.emoji.toString();
                const emojiTracker = trackerData.emojiTrackers.get(emoji);
                if (emojiTracker && !emojiTracker.participants.includes(user.id)) {
                    emojiTracker.participants.push(user.id);
                }
            });

            collector.on('remove', async (reaction, user) => {
                const emoji = reaction.emoji.toString();
                const emojiTracker = trackerData.emojiTrackers.get(emoji);
                if (emojiTracker) {
                    emojiTracker.participants = emojiTracker.participants.filter(id => id !== user.id);
                }
            });

            collector.on('end', async () => {
                await this.endTracking(data.messageId);
            });

            trackerData.collector = collector;
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
        tracker.collector?.stop();

        try {
            const channel = await this.client.channels.fetch(tracker.messageData.channelId);
            if (!(channel instanceof TextChannel)) return;

            // Lấy tin nhắn gốc
            const originalMessage = await channel.messages.fetch(messageId);
            if (!originalMessage) return;

            // Khóa tin nhắn để không ai có thể thêm reactions
            await originalMessage.reactions.removeAll();

            const duration = intervalToDuration({
                start: tracker.startTime,
                end: new Date()
            });

            const formattedDuration = formatDuration(duration, {
                locale: vi,
                delimiter: ', '
            });

            // Tính tổng số người tham gia duy nhất
            const uniqueParticipants = new Set(
                Array.from(tracker.emojiTrackers.values())
                    .flatMap(et => et.participants)
            );

            const resultEmbed = await this.createResultEmbed(
                tracker,
                uniqueParticipants.size,
                formattedDuration
            );

            await channel.send({ embeds: [resultEmbed] });
            this.trackers.delete(messageId);
        } catch (error) {
            console.error('Error ending reaction tracker:', error);
            const channel = await this.client.channels.fetch(tracker.messageData.channelId);
            if (channel instanceof TextChannel) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi')
                    .setDescription('Có lỗi xảy ra khi kết thúc theo dõi reaction.')
                    .setColor(EMBED_COLORS.ERROR)
                    .setTimestamp();

                await channel.send({ embeds: [errorEmbed] });
            }
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