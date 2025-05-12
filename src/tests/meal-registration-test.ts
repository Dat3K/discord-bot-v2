import { createClient, connectClient } from '../utils/client';
import { logger } from '../utils/logger';
import config from '../config';
import { TextChannel } from 'discord.js';
import { mealRegistrationService } from '../services/mealRegistrationService';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { activeRegistrations, reactionData } from '../database';

// Main test function
async function testMealRegistration() {
  console.log('=== Meal Registration Test ===');
  
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
    config.channels.mealRegistration = testChannel;
    config.channels.mealRegistrationLog = testChannel;
    
    console.log(`✅ Found test channel: ${testChannel.name}`);
    
    // Initialize meal registration service
    console.log('\nInitializing meal registration service...');
    mealRegistrationService.initialize(client);
    console.log('✅ Meal registration service initialized');
    
    // Create a test registration message
    console.log('\nCreating test registration message...');
    
    // Calculate end time (10 seconds from now)
    const endTime = addDuration(getCurrentTime(), { seconds: 10 }).toMillis();
    
    // Create message data
    const messageData = {
      type: MessageTaskType.MEAL_REGISTRATION,
      channelId: testChannel.id,
      embed: {
        title: config.json.messages.mealRegistration.title,
        description: config.json.messages.mealRegistration.description,
        color: config.json.messages.mealRegistration.color,
        footer: config.json.messages.mealRegistration.footer.replace(
          '{endTime}', 
          formatDateTime(getCurrentTime().set({ millisecond: endTime }), DateTimeFormat.DATE_TIME)
        )
      },
      endTime: endTime,
      identifier: `TEST_MEAL_REGISTRATION_${Date.now()}`
    };
    
    // Schedule the message to be sent immediately
    console.log('Scheduling test registration message...');
    const task = messageScheduler.scheduleOnce(getCurrentTime().toMillis(), messageData);
    console.log(`✅ Message scheduled with ID: ${task.id}`);
    
    // Schedule the end of registration
    console.log('Scheduling registration end...');
    const endTask = messageScheduler.scheduleOnce(endTime, {
      type: MessageTaskType.CUSTOM,
      channelId: testChannel.id,
      data: {
        registrationIdentifier: messageData.identifier
      }
    });
    console.log(`✅ Registration end scheduled with ID: ${endTask.id}`);
    
    // Wait for the registration to end
    console.log('\n⚠️ Please react to the test message in Discord with the breakfast or dinner emoji');
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
    console.log(`Active registrations: ${activeRegs.length}`);
    
    if (activeRegs.length === 0) {
      console.log('✅ Registration was successfully processed and removed from active registrations');
    } else {
      console.log('❌ Registration was not processed correctly');
      activeRegs.forEach(reg => {
        console.log(`- ${reg.message_id} (${reg.registration_type}): ${reg.identifier_string}`);
      });
    }
    
    console.log('\n=== Meal Registration Test Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Disconnect client
    console.log('\nDisconnecting from Discord...');
    client.destroy();
    console.log('✅ Disconnected from Discord');
  }
}

// Run the test
testMealRegistration().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
