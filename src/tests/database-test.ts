import { activeRegistrations, reactionData, userRegistrations, ActiveRegistration, ReactionData, UserRegistration } from '../database';
import { getCurrentTime } from '../utils/timeUtils';

console.log('=== Database Test ===');

// Test active_registrations
console.log('\nTesting active_registrations:');
try {
  // Add a test registration
  const testRegistration: ActiveRegistration = {
    message_id: 'test-message-id',
    channel_id: 'test-channel-id',
    registration_type: 'MEAL_REGULAR',
    end_timestamp: getCurrentTime().plus({ hours: 1 }).toMillis(),
    identifier_string: 'Test Registration'
  };
  
  console.log('Adding test registration...');
  const addedRegistration = activeRegistrations.add(testRegistration);
  console.log('✅ Added registration:', addedRegistration.message_id);
  
  // Get the registration by message ID
  console.log('Getting registration by message ID...');
  const retrievedRegistration = activeRegistrations.getByMessageId(testRegistration.message_id);
  console.log('✅ Retrieved registration:', retrievedRegistration?.message_id);
  
  // Get all registrations
  console.log('Getting all registrations...');
  const allRegistrations = activeRegistrations.getAll();
  console.log(`✅ Retrieved ${allRegistrations.length} registrations`);
  
  // Get registrations by type
  console.log('Getting registrations by type...');
  const typeRegistrations = activeRegistrations.getByType('MEAL_REGULAR');
  console.log(`✅ Retrieved ${typeRegistrations.length} registrations of type MEAL_REGULAR`);
  
  // Update the registration
  console.log('Updating registration...');
  const updatedRegistration = {
    ...testRegistration,
    end_timestamp: getCurrentTime().plus({ hours: 2 }).toMillis()
  };
  activeRegistrations.update(updatedRegistration);
  const retrievedUpdatedRegistration = activeRegistrations.getByMessageId(testRegistration.message_id);
  console.log('✅ Updated registration end timestamp:', new Date(retrievedUpdatedRegistration!.end_timestamp).toISOString());
  
  // Remove the registration
  console.log('Removing registration...');
  const removed = activeRegistrations.remove(testRegistration.message_id);
  console.log('✅ Removed registration:', removed);
} catch (error) {
  console.error('❌ Error testing active_registrations:', error);
}

// Test reaction_data
console.log('\nTesting reaction_data:');
try {
  // Add a test reaction
  const testReaction: ReactionData = {
    user_id: 'test-user-id',
    message_id: 'test-message-id',
    reaction_type: '☀️',
    timestamp: getCurrentTime().toMillis(),
    removed: false
  };
  
  console.log('Adding test reaction...');
  const addedReaction = reactionData.add(testReaction);
  console.log('✅ Added reaction with ID:', addedReaction.id);
  
  // Get reactions by message ID
  console.log('Getting reactions by message ID...');
  const messageReactions = reactionData.getByMessageId(testReaction.message_id);
  console.log(`✅ Retrieved ${messageReactions.length} reactions for message`);
  
  // Get active reactions by message ID
  console.log('Getting active reactions by message ID...');
  const activeMessageReactions = reactionData.getActiveByMessageId(testReaction.message_id);
  console.log(`✅ Retrieved ${activeMessageReactions.length} active reactions for message`);
  
  // Get reactions by user ID
  console.log('Getting reactions by user ID...');
  const userReactions = reactionData.getByUserId(testReaction.user_id);
  console.log(`✅ Retrieved ${userReactions.length} reactions for user`);
  
  // Get specific reaction
  console.log('Getting specific reaction...');
  const specificReaction = reactionData.get(testReaction.user_id, testReaction.message_id, testReaction.reaction_type);
  console.log('✅ Retrieved specific reaction:', specificReaction?.id);
  
  // Mark reaction as removed
  console.log('Marking reaction as removed...');
  const marked = reactionData.markAsRemoved(
    testReaction.user_id,
    testReaction.message_id,
    testReaction.reaction_type,
    getCurrentTime().toMillis()
  );
  console.log('✅ Marked reaction as removed:', marked);
  
  // Verify reaction is marked as removed
  const removedReaction = reactionData.get(testReaction.user_id, testReaction.message_id, testReaction.reaction_type);
  console.log('✅ Reaction removed status:', removedReaction?.removed);
} catch (error) {
  console.error('❌ Error testing reaction_data:', error);
}

// Test user_registrations
console.log('\nTesting user_registrations:');
try {
  // Add a test user registration
  const testUserRegistration: UserRegistration = {
    user_id: 'test-user-id',
    message_id: 'test-message-id',
    registration_type: 'MEAL_REGULAR',
    meal_type: 'breakfast',
    timestamp: getCurrentTime().toMillis()
  };
  
  console.log('Adding test user registration...');
  const addedUserRegistration = userRegistrations.add(testUserRegistration);
  console.log('✅ Added user registration with ID:', addedUserRegistration.id);
  
  // Get user registrations by message ID
  console.log('Getting user registrations by message ID...');
  const messageUserRegistrations = userRegistrations.getByMessageId(testUserRegistration.message_id);
  console.log(`✅ Retrieved ${messageUserRegistrations.length} user registrations for message`);
  
  // Get user registrations by user ID
  console.log('Getting user registrations by user ID...');
  const userUserRegistrations = userRegistrations.getByUserId(testUserRegistration.user_id);
  console.log(`✅ Retrieved ${userUserRegistrations.length} user registrations for user`);
  
  // Get user registrations by type
  console.log('Getting user registrations by type...');
  const typeUserRegistrations = userRegistrations.getByType(testUserRegistration.registration_type);
  console.log(`✅ Retrieved ${typeUserRegistrations.length} user registrations of type ${testUserRegistration.registration_type}`);
  
  // Get user registrations by meal type
  console.log('Getting user registrations by meal type...');
  const mealTypeUserRegistrations = userRegistrations.getByMealType(testUserRegistration.meal_type);
  console.log(`✅ Retrieved ${mealTypeUserRegistrations.length} user registrations for meal type ${testUserRegistration.meal_type}`);
  
  // Remove the user registration
  console.log('Removing user registration...');
  const removed = userRegistrations.remove(
    testUserRegistration.user_id,
    testUserRegistration.message_id,
    testUserRegistration.meal_type
  );
  console.log('✅ Removed user registration:', removed);
  
  // Verify user registration is removed
  const removedUserRegistrations = userRegistrations.getByMessageId(testUserRegistration.message_id);
  console.log('✅ User registrations after removal:', removedUserRegistrations.length);
} catch (error) {
  console.error('❌ Error testing user_registrations:', error);
}

console.log('\n=== Database Test Complete ===');
