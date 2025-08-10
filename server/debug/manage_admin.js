const { redisManager } = require('./redisManager');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt user for input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Display user admin status
async function checkAdminStatus(username) {
  try {
    const isAdmin = await redisManager.isUserAdmin(username);
    const user = await redisManager.getUserByUsername(username);
    
    if (!user) {
      console.log(`❌ User "${username}" does not exist`);
      return false;
    }
    
    console.log(`\n👤 User Information:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Admin privileges: ${isAdmin ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created at: ${user.createdAt}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check admin status:', error);
    return false;
  }
}

// Set user as admin
async function setUserAdmin(username, isAdmin = true) {
  try {
    const user = await redisManager.getUserByUsername(username);
    
    if (!user) {
      console.log(`❌ User "${username}" does not exist`);
      return false;
    }
    
    const oldRole = user.role;
    user.role = isAdmin ? 'admin' : 'user';
    user.updatedAt = new Date().toISOString();
    
    const success = await redisManager.saveUser(user);
    
    if (success) {
      console.log(`✅ User "${username}" role updated`);
      console.log(`   ${oldRole} → ${user.role}`);
      console.log(`   Admin privileges: ${isAdmin ? '✅ Granted' : '❌ Removed'}`);
      return true;
    } else {
      console.log(`❌ Failed to update user role`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to set admin privileges:', error);
    return false;
  }
}

// List all administrators
async function listAdmins() {
  try {
    const allUsers = await redisManager.getAllUsers();
    const admins = allUsers.filter(user => user.role === 'admin');
    
    console.log(`\n👑 Administrator List (${admins.length}):`);
    console.log('================================');
    
    if (admins.length === 0) {
      console.log('❌ No administrators found');
      return;
    }
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. 👤 ${admin.username}`);
      console.log(`   📝 ID: ${admin.id}`);
      console.log(`   📅 Created at: ${admin.createdAt}`);
      if (admin.updatedAt) {
        console.log(`   🔄 Updated at: ${admin.updatedAt}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to get administrator list:', error);
  }
}

// Main menu
async function showMenu() {
  console.log('\n🔧 Administrator Privilege Management');
  console.log('==================');
  console.log('1. Check user admin status');
  console.log('2. Set user as administrator');
  console.log('3. Remove user admin privileges');
  console.log('4. List all administrators');
  console.log('5. List all users');
  console.log('0. Exit');
  console.log('');
}

// Main function
async function main() {
  try {
    console.log('👑 ROX Guild Manager - Administrator Privilege Management');
    console.log('=====================================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      process.exit(1);
    }
    
    while (true) {
      await showMenu();
      const choice = await askQuestion('Please select operation (0-5): ');
      
      switch (choice.trim()) {
        case '1':
          const checkUsername = await askQuestion('Please enter username to check: ');
          await checkAdminStatus(checkUsername.trim());
          break;
          
        case '2':
          const setAdminUsername = await askQuestion('Please enter username to set as administrator: ');
          await setUserAdmin(setAdminUsername.trim(), true);
          break;
          
        case '3':
          const removeAdminUsername = await askQuestion('Please enter username to remove admin privileges: ');
          await setUserAdmin(removeAdminUsername.trim(), false);
          break;
          
        case '4':
          await listAdmins();
          break;
          
        case '5':
          console.log('\n📋 All Users List:');
          console.log('================');
          const allUsers = await redisManager.getAllUsers();
          allUsers.forEach((user, index) => {
            const adminStatus = user.role === 'admin' ? '👑 Administrator' : '👤 Regular User';
            console.log(`${index + 1}. ${user.username} - ${adminStatus}`);
          });
          break;
          
        case '0':
          console.log('\n👋 Goodbye!');
          return;
          
        default:
          console.log('❌ Invalid selection, please try again');
      }
      
      // Wait for user to press enter to continue
      await askQuestion('\nPress Enter to continue...');
    }
    
  } catch (error) {
    console.error('❌ Program execution error:', error);
  } finally {
    rl.close();
    await redisManager.disconnect();
  }
}

// Handle program exit
process.on('SIGINT', async () => {
  console.log('\n\n👋 Program interrupted, cleaning up...');
  rl.close();
  await redisManager.disconnect();
  process.exit(0);
});

// Run main function
main();