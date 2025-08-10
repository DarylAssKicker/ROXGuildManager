const { redisManager } = require('./redisManager');

// Format user information display
function formatUser(user, index) {
  const createdAt = new Date(user.createdAt).toLocaleString('zh-CN');
  const updatedAt = new Date(user.updatedAt).toLocaleString('zh-CN');
  const isAdmin = user.role === 'admin';
  const userIcon = isAdmin ? '👑' : '👤';
  const roleText = isAdmin ? '👑 Administrator' : '👤 Regular User';
  
  console.log(`\n${index + 1}. ${userIcon} ${user.username}`);
  console.log(`   📝 ID: ${user.id}`);
  console.log(`   👥 Role: ${roleText}`);
  console.log(`   📅 Created at: ${createdAt}`);
  console.log(`   🔄 Updated at: ${updatedAt}`);
}

// Main function
async function main() {
  try {
    console.log('📋 ROX Guild Manager - User List');
    console.log('==============================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      process.exit(1);
    }
    
    console.log('\n🔍 Getting user list...');
    
    // Get all users
    const users = await redisManager.getAllUsers();
    
    if (users.length === 0) {
      console.log('\n❌ No users found');
      console.log('💡 Tip: Use add_user.js script to add new users');
    } else {
      console.log(`\n✅ Found ${users.length} users:`);
      console.log('=' .repeat(50));
      
      // Sort by creation time
      users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Display user information
      users.forEach((user, index) => {
        formatUser(user, index);
      });
      
      // Count user types
      const adminCount = users.filter(user => user.role === 'admin').length;
      const userCount = users.filter(user => user.role === 'user').length;
      
      console.log('\n' + '=' .repeat(50));
       console.log(`📊 User Statistics:`);
       console.log(`   👑 Administrators: ${adminCount}`);
       console.log(`   👤 Regular Users: ${userCount}`);
       console.log(`   📈 Total: ${users.length} users`);
    }
    
  } catch (error) {
    console.error('❌ Program execution error:', error);
  } finally {
    // Disconnect
    await redisManager.disconnect();
  }
}

// Handle program exit
process.on('SIGINT', async () => {
  console.log('\n👋 Program exited');
  await redisManager.disconnect();
  process.exit(0);
});

// Start program
main();