const { redisManager } = require('./redisManager');

// Test admin features
async function testAdminFeatures() {
  try {
    console.log('🧪 Testing admin features');
    console.log('==================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      console.log('❌ Redis connection failed');
      return;
    }
    
    console.log('✅ Redis connection successful\n');
    
    // Get all users
    console.log('📋 Getting all users...');
    const allUsers = await redisManager.getAllUsers();
    console.log(`Found ${allUsers.length} users:\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.username}`);
      console.log(`   📝 ID: ${user.id}`);
      console.log(`   👥 Role: ${user.role}`);
      console.log(`   📅 Created at: ${user.createdAt}`);
      console.log('');
    });
    
    // Test admin check functionality
    console.log('🔍 Testing admin check functionality...');
    for (const user of allUsers) {
      const isAdmin = await redisManager.isUserAdmin(user.username);
      const adminStatus = isAdmin ? '👑 Administrator' : '👤 Regular User';
      console.log(`   ${user.username}: ${adminStatus}`);
    }
    console.log('');
    
    // Count administrators
    const adminCount = allUsers.filter(user => user.role === 'admin').length;
    const userCount = allUsers.filter(user => user.role === 'user').length;
    
    console.log('📊 User Statistics:');
    console.log(`   👑 Administrators: ${adminCount}`);
    console.log(`   👤 Regular Users: ${userCount}`);
    console.log(`   📈 Total: ${allUsers.length}`);
    console.log('');
    
    // Test user existence check
    console.log('🔍 Testing user existence check...');
    const testUsernames = ['admin', 'test', 'nonexistent'];
    
    for (const username of testUsernames) {
      const exists = await redisManager.userExists(username);
      const isAdmin = await redisManager.isUserAdmin(username);
      console.log(`   ${username}: ${exists ? '✅ Exists' : '❌ Does not exist'} ${exists && isAdmin ? '(Administrator)' : ''}`);
    }
    console.log('');
    
    console.log('✅ Admin features test completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await redisManager.disconnect();
  }
}

// Run test
testAdminFeatures();