import dotenv from 'dotenv';

dotenv.config();

interface ScheduledMessage {
    id: string;
    channelId: string;
    cronExpression: string;
    message: string;
    timezone: string;
    enabled: boolean;
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

export const config: Config = {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    scheduledMessages: [
        {
            id: 'morning-message',
            channelId: process.env.TEST_CHANNEL_ID as string,
            cronExpression: '0 8 * * *', // every 5 seconds
            timezone: 'Asia/Ho_Chi_Minh',
            message: "Chào buổi sáng! Chúc mọi người một ngày tốt lành! 🌅",
            enabled: true
        },
        {
            id: 'lunch-message',
            channelId: process.env.TEST_CHANNEL_ID as string,
            cronExpression: '0 12 * * *',
            timezone: 'Asia/Ho_Chi_Minh',
            message: "Đã đến giờ ăn trưa! Nhớ nghỉ ngơi đầy đủ nhé! 🍱",
            enabled: true
        },
        {
            id: 'evening-message',
            channelId: process.env.TEST_CHANNEL_ID as string,
            cronExpression: '0 18 * * *',
            timezone: 'Asia/Ho_Chi_Minh',
            message: "Chào buổi tối! Hãy kiểm tra công việc trong ngày nào! 🌙",
            enabled: true
        }
    ]
}; 