import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import config from '../config';

// Test function
async function testLateRegistration() {
  console.log('=== Late Registration Simple Test ===');
  
  // Calculate end time (10 seconds from now)
  const endTime = addDuration(getCurrentTime(), { seconds: 10 }).toMillis();
  
  // Create message data for late morning registration
  const lateMorningData = {
    type: MessageTaskType.LATE_MORNING_REGISTRATION,
    channelId: config.env.TEST_LOG_CHANNEL_ID,
    embed: {
      title: config.json.messages.lateMorningRegistration.title,
      description: config.json.messages.lateMorningRegistration.description,
      color: config.json.messages.lateMorningRegistration.color,
      footer: config.json.messages.lateMorningRegistration.footer.replace(
        '{endTime}', 
        formatDateTime(getCurrentTime().set({ millisecond: endTime }), DateTimeFormat.DATE_TIME)
      )
    },
    endTime: endTime,
    identifier: `TEST_LATE_MORNING_${Date.now()}`
  };
  
  // Create message data for late evening registration
  const lateEveningData = {
    type: MessageTaskType.LATE_EVENING_REGISTRATION,
    channelId: config.env.TEST_LOG_CHANNEL_ID,
    embed: {
      title: config.json.messages.lateEveningRegistration.title,
      description: config.json.messages.lateEveningRegistration.description,
      color: config.json.messages.lateEveningRegistration.color,
      footer: config.json.messages.lateEveningRegistration.footer.replace(
        '{endTime}', 
        formatDateTime(getCurrentTime().set({ millisecond: endTime }), DateTimeFormat.DATE_TIME)
      )
    },
    endTime: endTime,
    identifier: `TEST_LATE_EVENING_${Date.now()}`
  };
  
  // Print the message data
  console.log('\nLate Morning Registration Data:');
  console.log(JSON.stringify(lateMorningData, null, 2));
  
  console.log('\nLate Evening Registration Data:');
  console.log(JSON.stringify(lateEveningData, null, 2));
  
  console.log('\n=== Late Registration Simple Test Complete ===');
}

// Run the test
testLateRegistration().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
