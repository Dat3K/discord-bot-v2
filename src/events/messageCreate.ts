import { Events, Message, TextChannel, EmbedBuilder } from 'discord.js';
import { reactionTracker } from '../services';
import { add, format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const TRACK_EMOJI = '📊';
const DEFAULT_DURATION = { days: 1 }; // 24 giờ mặc định
const DEFAULT_EMOJIS = ['🌞', '🌚']; // Emoji mặc định để theo dõi

interface Duration {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}

const parseTrackingTime = (content: string): Duration => {
    // Tìm tất cả các pattern thời gian như [6h15m], [1h30m], [2d6h]
    const timePattern = /\[(\d+[hmds])+\]/i;
    const match = content.match(timePattern);
    
    if (!match) return DEFAULT_DURATION;

    const duration: Duration = {};
    const timeString = match[0];
    
    // Tách các số và đơn vị
    const timeUnits = timeString.match(/\d+[hmds]/gi) || [];
    
    timeUnits.forEach(unit => {
        const value = parseInt(unit);
        const type = unit.slice(-1).toLowerCase();
        
        switch (type) {
            case 'h': duration.hours = value; break;
            case 'd': duration.days = value; break;
            case 'm': duration.minutes = value; break;
            case 's': duration.seconds = value; break;
        }
    });
    
    return Object.keys(duration).length > 0 ? duration : DEFAULT_DURATION;
};

const parseEmojis = (content: string): string[] => {
    const emojiMatch = content.match(/\[emojis?:([\p{Emoji},\s]+)\]/u);
    if (!emojiMatch) return DEFAULT_EMOJIS;

    const emojis = emojiMatch[1].split(',').map(e => e.trim());
    return emojis.length > 0 ? emojis : DEFAULT_EMOJIS;
};

const formatEndTime = (endTime: Date): string => {
    const formattedTime = format(endTime, 'HH:mm:ss - dd/MM/yyyy', { locale: vi });
    const timeFromNow = formatDistanceToNow(endTime, { locale: vi, addSuffix: true });
    return `${formattedTime} (${timeFromNow})`;
};

const getTimeDescription = (duration: Duration): string => {
    const parts = [];
    if (duration.days) parts.push(`${duration.days} ngày`);
    if (duration.hours) parts.push(`${duration.hours} giờ`);
    if (duration.minutes) parts.push(`${duration.minutes} phút`);
    if (duration.seconds) parts.push(`${duration.seconds} giây`);
    return parts.join(', ') || '24 giờ';
};

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message) {
        // Kiểm tra xem tin nhắn có chứa ký hiệu track không
        if (!message.content.includes('[track]') && !message.content.includes(TRACK_EMOJI)) return;

        try {
            // Tính thời gian theo dõi từ nội dung tin nhắn
            const duration = parseTrackingTime(message.content);
            const endTime = add(new Date(), duration);
            const emojis = parseEmojis(message.content);

            // Tạo mô tả từ nội dung tin nhắn
            const description = message.content
                .replace(/\[track\]/gi, '')
                .replace(TRACK_EMOJI, '')
                .replace(/\[\d+[hmds]\]/i, '')
                .replace(/\[emojis?:[\p{Emoji},\s]+\]/u, '')
                .trim();

            // Tạo một tracker duy nhất cho tất cả emoji
            await reactionTracker.createTracker({
                messageId: message.id,
                channelId: message.channelId,
                guildId: message.guildId || '',
                emoji: emojis.join(','),
                endTime,
                description: description || 'Theo dõi phản hồi'
            });
        } catch (error) {
            console.error('Error creating auto tracker:', error);
            if (message.channel instanceof TextChannel) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi')
                    .setDescription('Có lỗi xảy ra khi tạo theo dõi reaction.')
                    .setColor('#ff0000');
                    
                await message.channel.send({ embeds: [errorEmbed] });
            }
        }
    },
}; 