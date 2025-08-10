const { redisManager } = require('./redisManager');

// Cleanup duplicate users script
async function cleanupDuplicateUsers() {
  try {
    console.log('🧹 Starting cleanup of duplicate users...');
    console.log('================================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      process.exit(1);
    }
    
    // Get all users
    const users = await redisManager.getAllUsers();
    console.log(`📊 Found ${users.length} users`);
    
    // Group by username
    const userGroups = {};
    users.forEach(user => {
      if (!userGroups[user.username]) {
        userGroups[user.username] = [];
      }
      userGroups[user.username].push(user);
    });
    
    // Find duplicate users
    const duplicateGroups = {};
    Object.keys(userGroups).forEach(username => {
      if (userGroups[username].length > 1) {
        duplicateGroups[username] = userGroups[username];
      }
    });
    
    if (Object.keys(duplicateGroups).length === 0) {
      console.log('✅ No duplicate users found');
      return;
    }
    
    console.log(`\n🔍 Found duplicate users:`);
    Object.keys(duplicateGroups).forEach(username => {
      console.log(`\n👤 Username: ${username} (${duplicateGroups[username].length} duplicates)`);
      duplicateGroups[username].forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}`);
        console.log(`     Created at: ${user.createdAt}`);
        console.log(`     Updated at: ${user.updatedAt || 'Not set'}`);
      });
    });
    
    console.log('\n🔧 Starting cleanup of duplicate users...');
    
    let cleanedCount = 0;
    
    // Clean up each duplicate user group
    for (const username of Object.keys(duplicateGroups)) {
      const duplicates = duplicateGroups[username];
      
      // Sort by creation time, keep the earliest created user
      duplicates.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const keepUser = duplicates[0]; // Keep the earliest
      const deleteUsers = duplicates.slice(1); // Delete the rest
      
      console.log(`\n👤 Processing user: ${username}`);
      console.log(`✅ Keeping: ID ${keepUser.id} (created at ${keepUser.createdAt})`);
      
      // Delete duplicate users
      for (const user of deleteUsers) {
        try {
          const success = await redisManager.deleteUser(user.username);
          if (success) {
            console.log(`❌ Deleted: ID ${user.id} (created at ${user.createdAt})`);
            cleanedCount++;
          } else {
            console.log(`⚠️  Failed to delete: ID ${user.id}`);
          }
        } catch (error) {
          console.error(`❌ Error deleting user ${user.id}:`, error);
        }
      }
    }
    
    console.log('\n🎉 Cleanup completed!');
    console.log(`📊 Cleaned up ${cleanedCount} duplicate users`);
    
    // Verify cleanup results
    const remainingUsers = await redisManager.getAllUsers();
    console.log(`📊 Remaining users: ${remainingUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await redisManager.disconnect();
  }
}

// Run cleanup script
cleanupDuplicateUsers();