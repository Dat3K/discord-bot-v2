import { Events, Message, TextChannel } from 'discord.js';
import { reactionTracker } from '../services';
import { add, format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const TRACK_EMOJI = '📊';
const DEFAULT_DURATION = { days: 1 }; // 24 giờ mặc định
const DEFAULT_EMOJIS = ['👍', '👎']; // Emoji mặc định để theo dõi

interface Duration {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}

const parseTrackingTime = (content: string): Duration => {
    // Tìm pattern như [1h], [2d], [30m], [45s]
    const timeMatch = content.match(/\[(\d+)([hmds])\]/i);
    if (!timeMatch) return DEFAULT_DURATION;

    const [_, amount, unit] = timeMatch;
    const value = parseInt(amount);

    switch (unit.toLowerCase()) {
        case 'h': return { hours: value };
        case 'd': return { days: value };
        case 'm': return { minutes: value };
        case 's': return { seconds: value };
        default: return DEFAULT_DURATION;
    }
};

const parseEmojis = (content: string): string[] => {
    // Tìm pattern như [emoji:👍,👎] hoặc [emojis:😊,😄]
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
        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) return;

        // Kiểm tra xem tin nhắn có chứa ký hiệu track không
        if (!message.content.includes('[track]') && !message.content.includes(TRACK_EMOJI)) return;

        try {
            // Tính thời gian theo dõi từ nội dung tin nhắn
            const duration = parseTrackingTime(message.content);
            const endTime = add(new Date(), duration);
            const timeDescription = getTimeDescription(duration);
            const emojis = parseEmojis(message.content);

            // Tạo mô tả từ nội dung tin nhắn
            const description = message.content
                .replace(/\[track\]/gi, '')
                .replace(TRACK_EMOJI, '')
                .replace(/\[\d+[hmds]\]/i, '')
                .replace(/\[emojis?:[\p{Emoji},\s]+\]/u, '')
                .trim();

            // Tạo tracker cho mỗi emoji
            const trackers = await Promise.all(emojis.map(emoji =>
                reactionTracker.createTracker({
                    messageId: message.id,
                    channelId: message.channelId,
                    guildId: message.guildId || '',
                    emoji,
                    endTime,
                    description: description || 'Theo dõi phản hồi'
                })
            ));

            if (trackers.some(t => t) && message.channel instanceof TextChannel) {
                const formattedEndTime = formatEndTime(endTime);
                await message.channel.send([
                    '**Bắt đầu theo dõi reactions**',
                    `📝 Mô tả: ${description || 'Theo dõi phản hồi'}`,
                    `⏱️ Thời gian theo dõi: ${timeDescription}`,
                    `⌛ Kết thúc: ${formattedEndTime}`,
                    `👥 Reactions: ${emojis.join(' ')}`
                ].join('\n'));
            }
        } catch (error) {
            console.error('Error creating auto tracker:', error);
            if (message.channel instanceof TextChannel) {
                await message.channel.send('❌ Có lỗi xảy ra khi tạo theo dõi reaction.');
            }
        }
    },
}; 