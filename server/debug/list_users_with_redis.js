const { redisManager } = require('./redisManager');

async function listUsers() {
  try {
    console.log('🔄 Connecting to Redis database...');
    const connected = await redisManager.connect();
    if (!connected) {
      console.error('❌ Redis connection failed');
      process.exit(1);
    }

    console.log('🔍 Getting all users...');
    const users = await redisManager.getAllUsers();
    
    if (users.length === 0) {
      console.log('📝 No users found');
      return;
    }

    console.log(`📝 Found ${users.length} users:`);
    console.log('');
    
    // Sort by creation time
    users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created at: ${user.createdAt}`);
      console.log(`   Last updated: ${user.updatedAt || 'Unknown'}`);
      console.log(`   Last login: ${user.lastLoginAt || 'Never logged in'}`);
      console.log('');
    });

    // Statistics
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;
    
    console.log('📊 Statistics:');
    console.log(`   Administrators: ${adminCount}`);
    console.log(`   Regular users: ${userCount}`);
    console.log(`   Total: ${users.length}`);

  } catch (error) {
    console.error('❌ Failed to get user list:', error.message);
    process.exit(1);
  } finally {
    await redisManager.disconnect();
    process.exit(0);
  }
}

listUsers();