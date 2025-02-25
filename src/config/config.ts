import dotenv from 'dotenv';
import {Colors } from 'discord.js';
import { format } from 'date-fns-tz';
import { vi } from 'date-fns/locale';

dotenv.config();

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Hàm này sẽ trả về thời gian hiện tại mỗi khi được gọi
const formatTime = (dateOffset = 0): string => {
    const date = new Date();
    if (dateOffset !== 0) {
        date.setDate(date.getDate() + dateOffset);
    }
    return format(date, 'dd/MM', { timeZone: VN_TIMEZONE, locale: vi });
};

// Hàm tạo nội dung tin nhắn với thời gian hiện tại
const createMessageContent = (template: string, isDevMode: boolean, trackConfig: string): string => {
    return `${template} ${isDevMode === false ? trackConfig : trackConfig.replace(/\d+h/g, '10s')}`;
};

// Interface để tạo message embed động
interface DynamicEmbed {
    title: (date?: Date) => string;
    description: string;
    color: number;
    fields?: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
}

interface ScheduledMessage {
    id: string;
    channelId: string;
    cronExpression: string;
    timezone: string;
    enabled: boolean;
    createMessage: () => string;
    createEmbed: () => DynamicEmbed;
}

interface Config {
    token: string;
    clientId: string;
    guildId?: string;
    logChannelId: string;
    scheduledMessages: ScheduledMessage[];
}

if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is required in .env file');
}

if (!process.env.CLIENT_ID) {
    throw new Error('CLIENT_ID is required in .env file');
}

if (!process.env.LOG_CHANNEL_ID) {
    throw new Error('LOG_CHANNEL_ID is required in .env file');
}

if (!process.env.TEST_CHANNEL_ID) {
    throw new Error('TEST_CHANNEL_ID is required in .env file');
}

if (!process.env.AE_ROLE_ID) {
    throw new Error('AE_ROLE_ID is required in .env file');
}

if (!process.env.DEV_MODE) {
    throw new Error('DEV_MODE is required in .env file');
}

if (!process.env.MEAL_CHANNEL_ID) {
    throw new Error('MEAL_CHANNEL_ID is required in .env file');
}

if (!process.env.LATE_CHANNEL_ID) {
    throw new Error('LATE_CHANNEL_ID is required in .env file');
}

if (!process.env.MAIN_CHANNEL_ID) {
    throw new Error('MAIN_CHANNEL_ID is required in .env file');
}

export const config: Config = {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    scheduledMessages: [
        {
            id: 'notice-meal-registration',
            channelId: process.env.MAIN_CHANNEL_ID as string,
            cronExpression: '0 */6 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            createMessage: () => `Anh em vào đăng ký cơm nào <@&${process.env.AE_ROLE_ID}>`,
            createEmbed: () => ({
                title: () => `🍽️ Đây là lời nhắc nhở đăng ký cơm`,
                description: 'Đừng quên đăng ký cơm nhé!',
                color: Colors.Green,
            })
        },
        {
            id: 'morning-late-registration',
            channelId: process.env.LATE_CHANNEL_ID as string,
            cronExpression: '0 5 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            createMessage: () => createMessageContent(
                'Đăng ký cơm trễ cho buổi sáng! ⏰',
                process.env.DEV_MODE === 'false',
                '[track][emojis:🌞][6h]'
            ),
            createEmbed: () => ({
                title: () => `⏰ Đăng ký trễ sáng hôm nay ${formatTime()}`,
                description: 'Đăng ký cơm trễ cho buổi sáng hôm nay',
                color: Colors.Blue,
                fields: [
                    {
                        name: '📝 Hướng dẫn',
                        value: 'React với emoji 🌞 để đăng ký cơm trễ',
                        inline: false
                    },
                    {
                        name: '⏱️ Thời gian đăng ký',
                        value: 'Vui lòng đăng ký trước 11:15',
                        inline: false
                    },
                ]
            })
        },
        {
            id: 'night-late-registration',
            channelId: process.env.LATE_CHANNEL_ID as string,
            cronExpression: '0 12 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            createMessage: () => createMessageContent(
                'Đăng ký cơm trễ cho buổi tối! 🌙',
                process.env.DEV_MODE === 'false',
                '[track][emojis:🌚][6h15m]'
            ),
            createEmbed: () => ({
                title: () => `⏰ Đăng ký trễ tối ngày ${formatTime()}`,
                description: 'Đăng ký cơm trễ cho buổi tối hôm nay',
                color: Colors.Blue,
                fields: [
                    {
                        name: '📝 Hướng dẫn',
                        value: 'React với emoji 🌚 để đăng ký cơm trễ',
                        inline: false
                    },
                    {
                        name: '⏱️ Thời gian đăng ký',
                        value: 'Vui lòng đăng ký trước 18:30',
                        inline: false
                    },
                ]
            })
        },
        {
            id: 'meal-registration',
            channelId: process.env.MEAL_CHANNEL_ID as string,
            cronExpression: '0 5 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            createMessage: () => createMessageContent(
                'Đăng ký cơm cho ngày mai! 📅',
                process.env.DEV_MODE === 'false',
                '[track][emojis:🌞,🌚][22h]'
            ),
            createEmbed: () => ({
                title: () => `🍽️ Đăng ký cơm ngày mai ngày ${formatTime(1)}`,
                description: 'Đăng ký cơm cho ngày mai',
                color: Colors.Blue,
                fields: [
                    {
                        name: '📝 Hướng dẫn',
                        value: 'React với emoji 🌞 để đăng ký cơm sáng\nReact với emoji 🌚 để đăng ký cơm tối',
                        inline: false
                    },
                    {
                        name: '⏱️ Thời gian đăng ký',
                        value: 'Vui lòng đăng ký trước 3:00 sáng mai',
                        inline: false
                    },
                ]
            })
        },
    ]
}; 