import { createClient, connectClient } from '../utils/client';
import { logger } from '../utils/logger';
import config from '../config';
import { activeRegistrations, reactionData } from '../database';
import { getCurrentTime, addDuration } from '../utils/timeUtils';
import { TextChannel, MessageCreateOptions, EmbedBuilder } from 'discord.js';

// Main test function
async function testReactionEvents() {
  console.log('=== Reaction Events Test ===');
  
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
    
    // Get the test channel
    const guild = client.guilds.cache.get(config.env.GUILD_ID);
    if (!guild) {
      throw new Error(`Guild with ID ${config.env.GUILD_ID} not found`);
    }
    
    const testChannel = guild.channels.cache.get(config.env.TEST_LOG_CHANNEL_ID) as TextChannel;
    if (!testChannel) {
      throw new Error(`Test channel with ID ${config.env.TEST_LOG_CHANNEL_ID} not found`);
    }
    
    console.log(`✅ Found test channel: ${testChannel.name}`);
    
    // Create a test registration message
    console.log('\nCreating test registration message...');
    
    const embed = new EmbedBuilder()
      .setTitle('Test Meal Registration')
      .setDescription(`Please react with the following emojis to register for meals:\n${config.json.emojis.breakfast} - Breakfast\n${config.json.emojis.dinner} - Dinner`)
      .setColor('#2ecc71')
      .setFooter({ text: 'This is a test message for reaction tracking' });
    
    const messageOptions: MessageCreateOptions = {
      content: '**TEST MESSAGE**: Please react to this message to test reaction tracking',
      embeds: [embed]
    };
    
    const message = await testChannel.send(messageOptions);
    console.log(`✅ Sent test message with ID: ${message.id}`);
    
    // Store the message in the database as an active registration
    const endTime = addDuration(getCurrentTime(), { minutes: 5 }).toMillis();
    
    activeRegistrations.add({
      message_id: message.id,
      channel_id: testChannel.id,
      registration_type: 'MEAL_REGISTRATION',
      end_timestamp: endTime,
      identifier_string: 'TEST_REGISTRATION'
    });
    
    console.log(`✅ Added message to active_registrations with end time in 5 minutes`);
    
    // Add reactions to the message
    console.log('\nAdding reactions to the message...');
    await message.react(config.json.emojis.breakfast);
    await message.react(config.json.emojis.dinner);
    console.log('✅ Added breakfast and dinner reactions to the message');
    
    // Wait for user to react to the message
    console.log('\n⚠️ Please react to the test message in Discord with the breakfast or dinner emoji');
    console.log('⚠️ The test will continue in 30 seconds or after you press Enter...');
    
    // Wait for user input or timeout
    await Promise.race([
      new Promise<void>(resolve => {
        process.stdin.once('data', () => resolve());
      }),
      new Promise<void>(resolve => setTimeout(resolve, 30000))
    ]);
    
    // Check if reactions were stored in the database
    console.log('\nChecking reactions in the database...');
    const storedReactions = reactionData.getByMessageId(message.id);
    console.log(`✅ Found ${storedReactions.length} reactions in the database`);
    
    if (storedReactions.length > 0) {
      console.log('Reaction details:');
      storedReactions.forEach(reaction => {
        console.log(`- User: ${reaction.user_id}, Emoji: ${reaction.reaction_type}, Removed: ${reaction.removed}`);
      });
    }
    
    // Clean up
    console.log('\nCleaning up...');
    await message.delete();
    activeRegistrations.remove(message.id);
    console.log('✅ Deleted test message and removed from active_registrations');
    
    console.log('\n=== Reaction Events Test Complete ===');
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
testReactionEvents().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
