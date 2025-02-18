import { Client, Events, TextChannel } from 'discord.js';
import { config } from '../config/config';
import * as cron from 'node-cron';

const scheduleMessages = (client: Client) => {
    const jobs: cron.ScheduledTask[] = [];

    try {
        config.scheduledMessages.forEach(({ id, channelId, cronExpression, message, timezone, enabled }) => {
            if (!enabled) {
                console.log(`Message ${id} is disabled, skipping...`);
                return;
            }

            if (!cron.validate(cronExpression)) {
                console.error(`Invalid cron expression for message ${id}:`, cronExpression);
                return;
            }

            const job = cron.schedule(cronExpression, () => {
                const channel = client.channels.cache.get(channelId);
                if (channel instanceof TextChannel) {
                    channel.send(message)
                        .then(() => console.log(`Successfully sent scheduled message: ${id}`))
                        .catch(error => console.error(`Failed to send scheduled message ${id}:`, error));
                } else {
                    console.error(`Channel not found or not a text channel for message ${id}:`, channelId);
                }
            }, {
                timezone,
                scheduled: true,
            });

            jobs.push(job);
            console.log(`Scheduled message ${id} set for: ${cronExpression} ${timezone}`);
        });
    } catch (error) {
        console.error('Error in scheduleMessages:', error);
    }

    return () => jobs.forEach(job => job.stop());
};

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client) {
        try {
            console.log('Bot is starting...');
            console.log(`Ready! Logged in as ${client.user?.tag}`);
            console.log('Initializing scheduled messages...');
            scheduleMessages(client);
            console.log('Bot initialization completed!');
        } catch (error) {
            console.error('Error during bot initialization:', error);
        }
    },
}; 