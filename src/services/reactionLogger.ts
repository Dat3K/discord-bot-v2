import { Client, TextChannel, User, EmbedBuilder, Colors, Message } from 'discord.js';
import { config } from '../config/config';
import { format } from 'date-fns-tz';
import { vi } from 'date-fns/locale';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export class ReactionLoggerService {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    private formatTime(date: Date): string {
        return format(date, 'HH:mm:ss dd/MM/yyyy', { 
            timeZone: VN_TIMEZONE, 
            locale: vi 
        });
    }

    async logReaction(
        messageId: string,
        channelId: string,
        emoji: string,
        user: User,
        isAdd: boolean,
        messageContent?: string
    ): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(config.logChannelId);
            if (!(channel instanceof TextChannel)) {
                console.error('Log channel is not a text channel');
                return;
            }

            const originalChannel = await this.client.channels.fetch(channelId);
            if (!(originalChannel instanceof TextChannel)) {
                console.error('Original channel is not a text channel');
                return;
            }

            let message: Message | null = null;
            try {
                message = await originalChannel.messages.fetch(messageId);
            } catch (err) {
                console.warn('Could not fetch original message:', err);
            }

            const now = new Date();
            const formattedTime = this.formatTime(now);
            const messageTime = message ? this.formatTime(message.createdAt) : 'N/A';

            const embed = new EmbedBuilder()
                .setDescription(
                    `${user.username} đã ${isAdd ? 'thêm' : 'xóa'} ${emoji}\n` +
                    `Tin nhắn: ${messageContent || message?.content || 'N/A'}\n` +
                    `Thời gian gửi tin nhắn: ${messageTime}\n` +
                    `Thời gian ${isAdd ? 'thêm' : 'xóa'} reaction: ${formattedTime}`
                )
                .setColor(isAdd ? Colors.Green : Colors.Red);

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging reaction:', error);
        }
    }
}

let instance: ReactionLoggerService | null = null;

export const createReactionLoggerService = (client: Client): ReactionLoggerService => {
    if (!instance) {
        instance = new ReactionLoggerService(client);
    }
    return instance;
}; 