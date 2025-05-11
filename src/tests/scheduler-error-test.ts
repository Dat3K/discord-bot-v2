import { scheduler } from '../scheduler';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration } from '../utils/timeUtils';
import { Client, TextChannel, ChannelType } from 'discord.js';
import { handleSchedulerError, SchedulerErrorType, getRecentErrors, getErrorStatistics, clearRecentErrors } from '../scheduler/errorHandler';

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

console.log('=== Scheduler Error Handling Test ===');

// Initialize scheduler
console.log('\nInitializing scheduler...');
scheduler.initialize(mockClient);
messageScheduler.initialize(mockClient);

// Clear any existing errors
clearRecentErrors();

// Test error handling
console.log('\nTesting error handling:');

// Test direct error handling
console.log('\n1. Testing direct error handling:');
const testError = new Error('Test error');
const handledError = handleSchedulerError(
  SchedulerErrorType.UNKNOWN,
  'Test error message',
  testError,
  'test-task-id'
);
console.log(`Error handled: ${handledError.handled}`);

// Test scheduler error event
console.log('\n2. Testing scheduler error event:');
scheduler.on('error', (error, taskId) => {
  console.log(`Scheduler error event received for task ${taskId}:`, error.message);
});

// Schedule a task that will fail
console.log('\n3. Testing task execution error:');
const invalidTask = scheduler.scheduleOnce('test_error_task', addDuration(getCurrentTime(), { seconds: 1 }).toMillis(), {
  executeFunction: () => {
    throw new Error('Task execution failed');
  }
});
console.log(`Invalid task scheduled: ${invalidTask.id}`);

// Schedule a message with invalid channel
console.log('\n4. Testing message sending error:');
const invalidMessageData = {
  type: MessageTaskType.CUSTOM,
  channelId: 'invalid-channel-id',
  content: 'This message will fail to send',
  embed: {
    title: 'Test Error Message',
    description: 'This message should fail to send due to invalid channel ID.'
  }
};
const invalidMessageTask = messageScheduler.scheduleOnce(
  addDuration(getCurrentTime(), { seconds: 2 }).toMillis(),
  invalidMessageData
);
console.log(`Invalid message task scheduled: ${invalidMessageTask.id}`);

// Wait for errors to be processed
setTimeout(() => {
  // Get recent errors
  console.log('\nRecent errors:');
  const recentErrors = getRecentErrors();
  console.log(`Found ${recentErrors.length} recent errors:`);
  recentErrors.forEach((error, index) => {
    console.log(`${index + 1}. [${error.type}] ${error.message} (Task ID: ${error.taskId || 'N/A'})`);
  });
  
  // Get error statistics
  console.log('\nError statistics:');
  const statistics = getErrorStatistics();
  Object.entries(statistics).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`${type}: ${count}`);
    }
  });
  
  // Clean up
  console.log('\nCleaning up...');
  scheduler.stop();
  clearRecentErrors();
  
  console.log('\n=== Scheduler Error Handling Test Complete ===');
}, 5000);
