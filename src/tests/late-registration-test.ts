import { createClient, connectClient } from '../utils/client';
import { logger } from '../utils/logger';
import config from '../config';
import { TextChannel } from 'discord.js';
import { mealRegistrationService } from '../services/mealRegistrationService';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { activeRegistrations, reactionData } from '../database';

// Main test function
async function testLateRegistration() {
  console.log('=== Late Registration Test ===');
  
  // Create and connect client
  console.log('\nConnecting to Discord...');
  const client = createClient();
  
  try {
    await connectClient(client, config.env.BOT_TOKEN);
    console.log('✅ Connected to Discord');
    
    // Wait for client to be ready
    await new Promise<void>((resolve) => {
      client.once('ready', () => {
        console.log(`✅ Logged in as ${client.user?.tag}`);
        resolve();
      });
    });
    
    // Set up Discord channels
    const guild = client.guilds.cache.get(config.env.GUILD_ID);
    if (!guild) {
      throw new Error(`Guild with ID ${config.env.GUILD_ID} not found`);
    }
    
    const testChannel = guild.channels.cache.get(config.env.TEST_LOG_CHANNEL_ID) as TextChannel;
    if (!testChannel) {
      throw new Error(`Test channel with ID ${config.env.TEST_LOG_CHANNEL_ID} not found`);
    }
    
    // Set up channels in config
    config.channels.testLog = testChannel;
    config.channels.lateMealRegistration = testChannel;
    config.channels.lateMealRegistrationLog = testChannel;
    
    console.log(`✅ Found test channel: ${testChannel.name}`);
    
    // Initialize meal registration service
    console.log('\nInitializing meal registration service...');
    mealRegistrationService.initialize(client);
    console.log('✅ Meal registration service initialized');
    
    // Test late morning registration
    console.log('\n=== Testing Late Morning Registration ===');
    await testLateRegistrationMessage(
      MessageTaskType.LATE_MORNING_REGISTRATION,
      config.json.messages.lateMorningRegistration,
      testChannel
    );
    
    // Wait a bit before testing late evening registration
    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    
    // Test late evening registration
    console.log('\n=== Testing Late Evening Registration ===');
    await testLateRegistrationMessage(
      MessageTaskType.LATE_EVENING_REGISTRATION,
      config.json.messages.lateEveningRegistration,
      testChannel
    );
    
    console.log('\n=== Late Registration Test Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Disconnect client
    console.log('\nDisconnecting from Discord...');
    client.destroy();
    console.log('✅ Disconnected from Discord');
  }
}

// Helper function to test a late registration message
async function testLateRegistrationMessage(
  type: MessageTaskType,
  messageTemplate: any,
  channel: TextChannel
): Promise<void> {
  try {
    console.log(`Testing ${type}...`);
    
    // Calculate end time (10 seconds from now)
    const endTime = addDuration(getCurrentTime(), { seconds: 10 }).toMillis();
    
    // Create message data
    const messageData = {
      type,
      channelId: channel.id,
      embed: {
        title: messageTemplate.title,
        description: messageTemplate.description,
        color: messageTemplate.color,
        footer: messageTemplate.footer.replace(
          '{endTime}', 
          formatDateTime(getCurrentTime().set({ millisecond: endTime }), DateTimeFormat.DATE_TIME)
        )
      },
      endTime: endTime,
      identifier: `TEST_${type}_${Date.now()}`
    };
    
    // Schedule the message to be sent immediately
    console.log('Scheduling test registration message...');
    const task = messageScheduler.scheduleOnce(getCurrentTime().toMillis(), messageData);
    console.log(`✅ Message scheduled with ID: ${task.id}`);
    
    // Schedule the end of registration
    console.log('Scheduling registration end...');
    const endTask = messageScheduler.scheduleOnce(endTime, {
      type: MessageTaskType.CUSTOM,
      channelId: channel.id,
      data: {
        registrationIdentifier: messageData.identifier
      }
    });
    console.log(`✅ Registration end scheduled with ID: ${endTask.id}`);
    
    // Wait for the registration to end
    console.log('\n⚠️ Please react to the test message in Discord with the late emoji (⏰)');
    console.log(`⚠️ The registration will end in 10 seconds at ${formatDateTime(getCurrentTime().set({ millisecond: endTime }), DateTimeFormat.DATE_TIME)}`);
    
    // Wait for the registration to end
    await new Promise<void>(resolve => {
      setTimeout(() => {
        console.log('\nRegistration period has ended');
        resolve();
      }, 15000); // Wait 15 seconds (5 seconds after registration ends)
    });
    
    // Check if the registration was processed
    console.log('\nChecking if registration was processed...');
    const activeRegs = activeRegistrations.getAll();
    const stillActive = activeRegs.find(reg => reg.identifier_string === messageData.identifier);
    
    if (!stillActive) {
      console.log('✅ Registration was successfully processed and removed from active registrations');
    } else {
      console.log('❌ Registration was not processed correctly');
      console.log(`- ${stillActive.message_id} (${stillActive.registration_type}): ${stillActive.identifier_string}`);
    }
  } catch (error) {
    console.error(`Error testing ${type}:`, error);
  }
}

// Run the test
testLateRegistration().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
