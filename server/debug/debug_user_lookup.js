const { redisManager } = require('./redisManager');

// Debug user lookup issues
async function debugUserLookup() {
  try {
    console.log('🔍 Debugging user lookup issues');
    console.log('================================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      process.exit(1);
    }
    
    const testUsername = 'test';
    
    console.log(`\n🔍 Looking up user: ${testUsername}`);
    
    // 1. Check if user exists (current method)
    console.log('\n1. Using userExists method:');
    const exists = await redisManager.userExists(testUsername);
    console.log(`   Result: ${exists}`);
    
    // 2. Try to get user (current method)
    console.log('\n2. Using getUserByUsername method:');
    const user = await redisManager.getUserByUsername(testUsername);
    console.log(`   Result: ${user ? 'User found' : 'User not found'}`);
    if (user) {
      console.log(`   User info:`, user);
    }
    
    // 3. Check actual key format
    console.log('\n3. Checking actual Redis keys:');
    const allKeys = await redisManager.keys('*');
    const userKeys = allKeys.filter(key => key.includes('user:') && !key.includes(':guild:') && !key.includes(':parties:'));
    console.log('   User-related keys:');
    userKeys.forEach(key => {
      console.log(`   - ${key}`);
    });
    
    // 4. Try direct lookup
    console.log('\n4. Trying different key formats:');
    const formats = [
      `user:${testUsername}`,
      `user:test`,
      `rox_guild:user:${testUsername}`,
      `rox_guild:user:test`
    ];
    
    for (const format of formats) {
      const exists = await redisManager.exists(format);
      console.log(`   ${format}: ${exists ? 'Exists' : 'Does not exist'}`);
    }
    
    // 5. Get all users and search
    console.log('\n5. Searching among all users:');
    const allUsers = await redisManager.getAllUsers();
    const targetUser = allUsers.find(u => u.username === testUsername);
    console.log(`   Searching for "${testUsername}" among ${allUsers.length} users:`);
    if (targetUser) {
      console.log(`   ✅ User found:`);
      console.log(`      ID: ${targetUser.id}`);
      console.log(`      Username: ${targetUser.username}`);
      console.log(`      Role: ${targetUser.role}`);
      
      // 6. Try lookup by ID
      console.log('\n6. Looking up by user ID:');
      const userById = await redisManager.getUserById(targetUser.id);
      console.log(`   Result: ${userById ? 'User found' : 'User not found'}`);
    } else {
      console.log(`   ❌ User not found`);
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await redisManager.disconnect();
  }
}

// Run debug
debugUserLookup();