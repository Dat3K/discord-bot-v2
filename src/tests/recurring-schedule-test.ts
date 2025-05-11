import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { Client, TextChannel, ChannelType } from 'discord.js';
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

console.log('=== Recurring Schedule Test ===');

// Initialize scheduler
console.log('\nInitializing scheduler...');
scheduler.initialize(mockClient);
messageScheduler.initialize(mockClient);

// Test recurring message scheduling
console.log('\nTesting recurring message scheduling:');

// Get current time
const now = getCurrentTime();
// Schedule a message to be sent every minute at the current second
const minute = (now.minute + 1) % 60;
const pattern = `${now.hour}:${minute}`;

const messageData = {
  type: MessageTaskType.CUSTOM,
  channelId: mockChannel.id,
  content: 'This is a test recurring message',
  embed: {
    title: 'Test Recurring Message',
    description: `This message was scheduled to be sent at ${pattern} every hour.`,
    color: '#2ecc71'
  }
};

// Schedule the recurring message
const task = messageScheduler.scheduleRecurring(pattern, messageData);
console.log(`Message scheduled with ID ${task.id} to execute at pattern ${pattern}`);
console.log(`Next execution at: ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);

// Wait for the message to be sent and rescheduled
console.log('\nWaiting for the message to be sent and rescheduled...');

// Check for rescheduling after 3 seconds
setTimeout(() => {
  const tasks = messageScheduler.getAllMessages();
  console.log('\nCurrent scheduled messages:');
  tasks.forEach(task => {
    console.log(`- ${task.id}: Next execution at ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);
  });
}, 3000);

// Exit after 10 seconds
setTimeout(() => {
  console.log('\nStopping scheduler...');
  scheduler.stop();
  console.log('\n=== Recurring Schedule Test Complete ===');
  process.exit(0);
}, 10000);
