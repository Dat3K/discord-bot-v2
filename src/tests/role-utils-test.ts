import { createClient, connectClient } from '../utils/client';
import { getMembersWithRole, hasRole, filterUsersByRole, invalidateRoleCache, getTrackedRoleId } from '../utils/roleUtils';
import { logger } from '../utils/logger';
import config from '../config';

// Main test function
async function testRoleUtils() {
  console.log('=== Role Utils Test ===');
  
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
    
    // Get the tracked role ID
    const trackedRoleId = getTrackedRoleId();
    console.log(`\nTracked Role ID: ${trackedRoleId}`);
    
    // Test getMembersWithRole
    console.log('\nTesting getMembersWithRole...');
    const members = await getMembersWithRole(client, trackedRoleId, true);
    if (members) {
      console.log(`✅ Found ${members.size} members with tracked role`);
      
      // Print first 5 members
      const firstFive = Array.from(members.values()).slice(0, 5);
      console.log('First 5 members:');
      firstFive.forEach(member => {
        console.log(`- ${member.user.tag} (${member.id})`);
      });
    } else {
      console.log('❌ Failed to get members with tracked role');
    }
    
    // Test cached getMembersWithRole
    console.log('\nTesting cached getMembersWithRole...');
    const cachedMembers = await getMembersWithRole(client, trackedRoleId);
    if (cachedMembers) {
      console.log(`✅ Found ${cachedMembers.size} members with tracked role (from cache)`);
    } else {
      console.log('❌ Failed to get cached members with tracked role');
    }
    
    // Test hasRole with a member that has the role
    if (members && members.size > 0) {
      const testMemberId = members.first()!.id;
      console.log(`\nTesting hasRole with member ${testMemberId}...`);
      const hasRoleResult = await hasRole(client, testMemberId, trackedRoleId);
      console.log(`✅ Member has role: ${hasRoleResult}`);
    }
    
    // Test hasRole with a member that doesn't have the role
    console.log('\nTesting hasRole with invalid member...');
    const hasRoleInvalidResult = await hasRole(client, '000000000000000000', trackedRoleId);
    console.log(`✅ Invalid member has role: ${hasRoleInvalidResult} (should be false)`);
    
    // Test filterUsersByRole
    if (members && members.size > 0) {
      const testMemberIds = Array.from(members.keys()).slice(0, 3);
      const invalidIds = ['000000000000000000', '111111111111111111'];
      const allIds = [...testMemberIds, ...invalidIds];
      
      console.log('\nTesting filterUsersByRole...');
      console.log(`Input IDs: ${allIds.join(', ')}`);
      
      const filteredIds = await filterUsersByRole(client, allIds, trackedRoleId);
      console.log(`✅ Filtered IDs: ${filteredIds.join(', ')}`);
      console.log(`✅ Filtered ${filteredIds.length} out of ${allIds.length} IDs`);
    }
    
    // Test invalidateRoleCache
    console.log('\nTesting invalidateRoleCache...');
    invalidateRoleCache(trackedRoleId);
    console.log('✅ Cache invalidated');
    
    // Test getMembersWithRole after cache invalidation
    console.log('\nTesting getMembersWithRole after cache invalidation...');
    const refreshedMembers = await getMembersWithRole(client, trackedRoleId);
    if (refreshedMembers) {
      console.log(`✅ Found ${refreshedMembers.size} members with tracked role (after cache invalidation)`);
    } else {
      console.log('❌ Failed to get members with tracked role after cache invalidation');
    }
    
    console.log('\n=== Role Utils Test Complete ===');
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
testRoleUtils().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
