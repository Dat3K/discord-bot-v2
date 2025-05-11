import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { Client, TextChannel, ChannelType } from 'discord.js';
import { createClient } from '../utils/client';
import scheduler from '../scheduler';

// Mock Discord client and channels
const mockClient = {
  channels: {
    cache: new Map()
  },
  user: {
    tag: 'MockBot#0000'
  },
  guilds: {
    cache: new Map()
  }
} as unknown as Client;

// Mock text channel
const mockChannel = {
  id: 'mock-channel-id',
  name: 'mock-channel',
  type: ChannelType.GuildText,
  send: async (options: any) => {
    console.log(`Message sent to channel ${mockChannel.name}:`, options);
    return {
      id: 'mock-message-id',
      content: options.content || '',
      embeds: options.embeds || []
    };
  }
} as unknown as TextChannel;

// Add mock channel to client
mockClient.channels.cache.set(mockChannel.id, mockChannel);

console.log('=== One-Time Schedule Test ===');

// Initialize scheduler
console.log('\nInitializing scheduler...');
scheduler.initialize(mockClient);
messageScheduler.initialize(mockClient);

// Test one-time message scheduling
console.log('\nTesting one-time message scheduling:');

// Schedule a message to be sent in 2 seconds
const executeAt = addDuration(getCurrentTime(), { seconds: 2 }).toMillis();
const messageData = {
  type: MessageTaskType.CUSTOM,
  channelId: mockChannel.id,
  content: 'This is a test one-time message',
  embed: {
    title: 'Test One-Time Message',
    description: 'This message was scheduled to be sent at a specific time.',
    color: '#3498db'
  }
};

const task = messageScheduler.scheduleOnce(executeAt, messageData);
console.log(`Message scheduled with ID ${task.id} to execute at ${formatDateTime(getCurrentTime().set({ millisecond: executeAt }), DateTimeFormat.DATE_TIME)}`);

// Wait for the message to be sent
console.log('\nWaiting for the message to be sent...');

// Exit after 5 seconds
setTimeout(() => {
  console.log('\nStopping scheduler...');
  scheduler.stop();
  console.log('\n=== One-Time Schedule Test Complete ===');
  process.exit(0);
}, 5000);
