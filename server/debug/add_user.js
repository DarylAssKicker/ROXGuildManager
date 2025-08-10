const readline = require('readline');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { redisManager } = require('./redisManager');

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

// Hide password input
function askPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

// Check if user exists
async function checkUserExists(username) {
  return await redisManager.userExists(username);
}

// Create new user
async function createUser(username, password, role = 'user') {
  try {
    // Double check if user already exists (prevent concurrent creation)
    const userExists = await checkUserExists(username);
    if (userExists) {
      console.log('❌ Username already exists, please choose another username');
      console.log('💡 Tip: Run "node list_users.js" to view existing users');
      return false;
    }
    
    // Check again to prevent race conditions
    const doubleCheck = await checkUserExists(username);
    if (doubleCheck) {
      console.log('❌ Username already exists (double check), please choose another username');
      return false;
    }

    // Generate user ID
    const userId = uuidv4();
    
    // Encrypt password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user object
    const user = {
      id: userId,
      username: username,
      passwordHash: hashedPassword,
      role: role, // Use the passed role parameter
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save user to Redis
    const success = await redisManager.saveUser(user);
    if (!success) {
      console.log('❌ Failed to save user');
      return false;
    }
    
    console.log('✅ User created successfully!');
    console.log(`📝 User ID: ${userId}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔐 Password encrypted and saved`);
    console.log(`👥 Role: ${user.role}`);
    console.log(`📅 Created at: ${user.createdAt}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating user:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 ROX Guild Manager - Add New User');
    console.log('================================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      process.exit(1);
    }
    console.log('');
    
    // Get user input
    const username = await askQuestion('Please enter username: ');
    
    if (!username || username.trim().length < 3) {
      console.log('❌ Username must be at least 3 characters');
      process.exit(1);
    }
    
    // Validate username format (only allow letters, numbers, underscores)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username.trim())) {
      console.log('❌ Username can only contain letters, numbers and underscores');
      process.exit(1);
    }
    
    // Check if user already exists in advance
    const userExists = await checkUserExists(username.trim());
    if (userExists) {
      console.log('❌ Username already exists, please choose another username');
      console.log('💡 Tip: You can run "node list_users.js" to view existing users');
      process.exit(1);
    }
    
    const password = await askPassword('Please enter password: ');
    
    if (!password || password.length < 6) {
      console.log('❌ Password must be at least 6 characters');
      process.exit(1);
    }
    
    const confirmPassword = await askPassword('Please confirm password: ');
    
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      process.exit(1);
    }
    
    // Ask for user role
    console.log('');
    console.log('👥 Please select user role:');
    console.log('1. Regular User (user)');
    console.log('2. Administrator (admin)');
    
    const roleChoice = await askQuestion('Please select role (1-2, default is 1): ');
    let role = 'user';
    
    if (roleChoice.trim() === '2') {
      role = 'admin';
      console.log('⚠️  Warning: You are creating an administrator account with system management privileges');
      const confirmAdmin = await askQuestion('Confirm creating administrator account? (y/N): ');
      if (confirmAdmin.toLowerCase() !== 'y' && confirmAdmin.toLowerCase() !== 'yes') {
        console.log('❌ Administrator account creation cancelled');
        process.exit(1);
      }
    }
    
    console.log('');
    console.log(`Creating ${role === 'admin' ? 'administrator' : 'regular'} user...`);
    
    // Create user
    const success = await createUser(username.trim(), password, role);
    
    if (success) {
      console.log('');
      console.log('🎉 User added successfully!');
    } else {
      console.log('');
      console.log('❌ Failed to add user');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Program execution error:', error);
    process.exit(1);
  } finally {
    rl.close();
    await redisManager.disconnect();
  }
}

// Run main function
main();