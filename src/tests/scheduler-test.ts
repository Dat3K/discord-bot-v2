import { scheduler, SchedulerEventType } from '../scheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';

console.log('=== Scheduler Test ===');

// Test event listeners
scheduler.on('taskScheduled', (task) => {
  console.log(`Event: Task ${task.id} scheduled to execute at ${formatDateTime(getCurrentTime().set({ millisecond: task.executeAt }), DateTimeFormat.DATE_TIME)}`);
});

scheduler.on('taskExecuted', (task) => {
  console.log(`Event: Task ${task.id} executed`);
});

scheduler.on('taskCancelled', (taskId) => {
  console.log(`Event: Task ${taskId} cancelled`);
});

scheduler.on('error', (error, taskId) => {
  console.error(`Event: Error for task ${taskId}:`, error);
});

// Test one-time task
console.log('\nTesting one-time task:');
const executeAt = addDuration(getCurrentTime(), { seconds: 2 }).toMillis();
const oneTimeTask = scheduler.scheduleOnce('test_one_time', executeAt, { message: 'This is a one-time task' });
console.log(`One-time task scheduled: ${oneTimeTask.id}`);

// Test recurring task
console.log('\nTesting recurring task:');
const now = getCurrentTime();
const minutes = now.minute;
const recurringPattern = `${now.hour}:${(minutes + 1) % 60}`;
const recurringTask = scheduler.scheduleRecurring('test_recurring', recurringPattern, { message: 'This is a recurring task' });
console.log(`Recurring task scheduled: ${recurringTask.id} with pattern ${recurringPattern}`);

// Test task retrieval
console.log('\nTesting task retrieval:');
console.log('All tasks:', scheduler.getAllTasks().map(t => t.id));
console.log('Has test_one_time:', scheduler.hasTask('test_one_time'));
console.log('Get test_one_time:', scheduler.getTask('test_one_time')?.id);

// Test task cancellation (after a delay to allow events to fire)
setTimeout(() => {
  console.log('\nTesting task cancellation:');
  const cancelled = scheduler.cancelTask('test_recurring');
  console.log(`Recurring task cancelled: ${cancelled}`);
  
  // Check remaining tasks
  console.log('Remaining tasks:', scheduler.getAllTasks().map(t => t.id));
  
  // Stop the scheduler after all tests
  setTimeout(() => {
    console.log('\nStopping scheduler...');
    scheduler.stop();
    console.log('\n=== Scheduler Test Complete ===');
    
    // Exit the process after a short delay
    setTimeout(() => process.exit(0), 500);
  }, 3000);
}, 3000);

// Initialize the scheduler
console.log('\nInitializing scheduler...');
scheduler.initialize(null as any); // We don't need a real client for this test
