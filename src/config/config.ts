import dotenv from 'dotenv';
import {Colors } from 'discord.js';
import { format } from 'date-fns-tz';
import { vi } from 'date-fns/locale';

dotenv.config();

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

const formatTime = (date: Date): string => {
    return format(date, 'dd/MM', { timeZone: VN_TIMEZONE, locale: vi });
};

interface ScheduledMessage {
    id: string;
    channelId: string;
    cronExpression: string;
    timezone: string;
    enabled: boolean;
    message?: string;
    embed: {
        title: string;
        description: string;
        color: number;
        fields?: {
            name: string;
            value: string;
            inline?: boolean;
        }[];
    };
}

interface Config {
    token: string;
    clientId: string;
    guildId?: string;
    scheduledMessages: ScheduledMessage[];
}

if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is required in .env file');
}

if (!process.env.CLIENT_ID) {
    throw new Error('CLIENT_ID is required in .env file');
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
    scheduledMessages: [
        {
            id: 'notice-meal-registration',
            channelId: process.env.MAIN_CHANNEL_ID as string,
            cronExpression: '0 */6 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            message: `Anh em vào đăng ký cơm nào <@&${process.env.AE_ROLE_ID}>`,
            embed: {
                title: `🍽️ Đây là lời nhắc nhở đăng ký cơm`,
                description: 'Đừng quên đăng ký cơm nhé!',
                color: Colors.Green,
            }
        },
        {
            id: 'morning-late-registration',
            channelId: process.env.LATE_CHANNEL_ID as string,
            cronExpression: '0 5 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            message: `Đăng ký cơm trễ cho buổi sáng! ⏰ ${process.env.DEV_MODE === 'false' ? '[track][emojis:🌞][6h]' : '[track][emojis:🌞][10s]'}`,
            embed: {
                title: `⏰ Đăng ký trễ sáng hôm nay ${formatTime(new Date())}`,
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
            }
        },
        {
            id: 'night-late-registration',
            channelId: process.env.LATE_CHANNEL_ID as string,
            cronExpression: '0 12 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            message: `Đăng ký cơm trễ cho buổi tối! 🌙 ${process.env.DEV_MODE === 'false' ? '[track][emojis:🌚][6h15m]' : '[track][emojis:🌚][10s]'}`,
            embed: {
                title: `⏰ Đăng ký trễ tối ngày ${formatTime(new Date())}`,
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
            }
        },
        {
            id: 'meal-registration',
            channelId: process.env.MEAL_CHANNEL_ID as string,
            cronExpression: '0 5 * * *',
            timezone: VN_TIMEZONE,
            enabled: true,
            message: `Đăng ký cơm cho ngày mai! 📅 ${process.env.DEV_MODE === 'false' ? '[track][emojis:🌞,🌚][22h]' : '[track][emojis:🌞,🌚][10s]'}`,
            embed: {
                title: `🍽️ Đăng ký cơm ngày mai ngày ${formatTime(new Date(new Date().setDate(new Date().getDate() + 1)))}`,
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
            }
        },
    ]
}; 