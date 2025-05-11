import { scheduler, SchedulerEventType } from '../scheduler';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { Client, TextChannel, ChannelType } from 'discord.js';
import { saveTask, loadTasks, clearTasks } from '../scheduler/persistence';

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

console.log('=== Scheduler Persistence Test ===');

// Clear existing tasks
console.log('\nClearing existing tasks...');
const cleared = clearTasks();
console.log(`Cleared ${cleared} tasks from database`);

// Schedule tasks
console.log('\nScheduling tasks...');

// Schedule a one-time task
const oneTimeExecuteAt = addDuration(getCurrentTime(), { minutes: 5 }).toMillis();
const oneTimeTask = scheduler.scheduleOnce('test_one_time_persist', oneTimeExecuteAt, { message: 'This is a persistent one-time task' });
console.log(`One-time task scheduled: ${oneTimeTask.id}`);

// Schedule a recurring task
const now = getCurrentTime();
const recurringPattern = `${(now.hour + 1) % 24}:${now.minute}`;
const recurringTask = scheduler.scheduleRecurring('test_recurring_persist', recurringPattern, { message: 'This is a persistent recurring task' });
console.log(`Recurring task scheduled: ${recurringTask.id} with pattern ${recurringPattern}`);

// Schedule a message task
const messageData = {
  type: MessageTaskType.CUSTOM,
  channelId: mockChannel.id,
  content: 'This is a persistent message task',
  embed: {
    title: 'Test Persistent Message',
    description: 'This message was scheduled to be sent at a specific time and persisted.',
    color: '#9b59b6'
  }
};
const messageTask = messageScheduler.scheduleOnce(addDuration(getCurrentTime(), { minutes: 10 }).toMillis(), messageData);
console.log(`Message task scheduled: ${messageTask.id}`);

// Verify tasks are saved
console.log('\nVerifying tasks are saved...');
const savedTasks = loadTasks();
console.log(`Loaded ${savedTasks.length} tasks from database`);
savedTasks.forEach(task => {
  console.log(`- ${task.id}: ${task.type}, Execute at: ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);
});

// Simulate restart
console.log('\nSimulating restart...');
scheduler.stop();
console.log('Scheduler stopped');

// Restart scheduler
console.log('\nRestarting scheduler...');
scheduler.initialize(mockClient);
messageScheduler.initialize(mockClient);

// Verify tasks are loaded
console.log('\nVerifying tasks are loaded after restart...');
const tasks = scheduler.getAllTasks();
console.log(`Loaded ${tasks.length} tasks after restart`);
tasks.forEach(task => {
  console.log(`- ${task.id}: ${task.type}, Execute at: ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);
});

// Cancel a task
console.log('\nCancelling a task...');
const cancelled = scheduler.cancelTask('test_one_time_persist');
console.log(`Task cancelled: ${cancelled}`);

// Verify task is removed from database
console.log('\nVerifying task is removed from database...');
const remainingTasks = loadTasks();
console.log(`Remaining ${remainingTasks.length} tasks in database`);
remainingTasks.forEach(task => {
  console.log(`- ${task.id}: ${task.type}, Execute at: ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);
});

// Clean up
console.log('\nCleaning up...');
clearTasks();
scheduler.stop();
console.log('\n=== Scheduler Persistence Test Complete ===');
