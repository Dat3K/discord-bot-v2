import { createClient, connectClient } from '../utils/client';
import { logger } from '../utils/logger';
import config from '../config';
import { TextChannel } from 'discord.js';
import { activeRegistrations } from '../database';
import { getCurrentTime, addDuration, formatDateTime, DateTimeFormat } from '../utils/timeUtils';
import { messageScheduler, MessageTaskType } from '../scheduler/messageScheduler';
import stateRecoveryService from '../services/stateRecoveryService';

// Main test function
async function testStateRecovery() {
  console.log('=== State Recovery Test ===');
  
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
    
    console.log(`✅ Found test channel: ${testChannel.name}`);
    
    // Step 1: Create a test registration message
    console.log('\nStep 1: Creating test registration message...');
    
    // Calculate end time (30 seconds from now)
    const endTime = addDuration(getCurrentTime(), { seconds: 30 }).toMillis();
    
    // Send a test message
    const message = await testChannel.send({
      content: '**TEST MESSAGE**: This is a test message for state recovery',
      embeds: [{
        title: 'Test Registration',
        description: 'This is a test registration message for state recovery',
        color: 0x2ecc71,
        footer: {
          text: `Registration ends at ${formatDateTime(getCurrentTime().set({ millisecond: endTime }), DateTimeFormat.DATE_TIME)}`
        }
      }]
    });
    
    console.log(`✅ Sent test message with ID: ${message.id}`);
    
    // Add the message to active registrations
    const identifier = `TEST_STATE_RECOVERY_${Date.now()}`;
    
    activeRegistrations.add({
      message_id: message.id,
      channel_id: testChannel.id,
      registration_type: MessageTaskType.MEAL_REGISTRATION,
      end_timestamp: endTime,
      identifier_string: identifier
    });
    
    console.log('✅ Added message to active_registrations');
    
    // Step 2: Simulate bot restart
    console.log('\nStep 2: Simulating bot restart...');
    
    // Wait a bit to simulate time passing
    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    
    // Initialize state recovery service
    console.log('Initializing state recovery service...');
    stateRecoveryService.initialize(client);
    console.log('✅ State recovery service initialized');
    
    // Step 3: Verify recovery
    console.log('\nStep 3: Verifying recovery...');
    
    // Wait a bit to allow recovery to complete
    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    
    // Check if the registration is still in the database
    const activeRegs = activeRegistrations.getAll();
    const recoveredReg = activeRegs.find(reg => reg.identifier_string === identifier);
    
    if (recoveredReg) {
      console.log('✅ Registration was recovered successfully');
      console.log(`- Message ID: ${recoveredReg.message_id}`);
      console.log(`- Channel ID: ${recoveredReg.channel_id}`);
      console.log(`- Registration Type: ${recoveredReg.registration_type}`);
      console.log(`- End Timestamp: ${formatDateTime(getCurrentTime().set({ millisecond: recoveredReg.end_timestamp }), DateTimeFormat.DATE_TIME)}`);
      console.log(`- Identifier: ${recoveredReg.identifier_string}`);
      
      // Wait for the registration to end
      console.log('\nWaiting for registration to end...');
      
      // Wait until after the end time
      const waitTime = Math.max(0, endTime - getCurrentTime().toMillis() + 5000);
      await new Promise<void>(resolve => setTimeout(resolve, waitTime));
      
      // Check if the registration was removed after ending
      const finalActiveRegs = activeRegistrations.getAll();
      const finalReg = finalActiveRegs.find(reg => reg.identifier_string === identifier);
      
      if (!finalReg) {
        console.log('✅ Registration was removed after ending');
      } else {
        console.log('❌ Registration was not removed after ending');
      }
    } else {
      console.log('❌ Registration was not recovered');
    }
    
    console.log('\n=== State Recovery Test Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    try {
      // Remove any remaining test registrations
      const finalActiveRegs = activeRegistrations.getAll();
      const finalReg = finalActiveRegs.find(reg => reg.identifier_string?.includes('TEST_STATE_RECOVERY'));
      
      if (finalReg) {
        activeRegistrations.remove(finalReg.message_id);
        console.log(`Cleaned up test registration: ${finalReg.message_id}`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    // Disconnect client
    console.log('\nDisconnecting from Discord...');
    client.destroy();
    console.log('✅ Disconnected from Discord');
  }
}

// Run the test
testStateRecovery().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
