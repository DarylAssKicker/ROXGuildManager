const readline = require('readline');
const bcrypt = require('bcryptjs');
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
          // Enter pressed
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          // Ctrl+C
          process.stdout.write('\n');
          process.exit();
          break;
        case '\u007f':
        case '\b':
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          // Normal character
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

// Get user information
async function getUser(username) {
  return await redisManager.getUserByUsername(username);
}

// Reset user password
async function resetUserPassword(username, newPassword) {
  try {
    // Check if user exists
    const userExists = await checkUserExists(username);
    if (!userExists) {
      console.log('❌ User does not exist, cannot reset password');
      return false;
    }

    // Get existing user information
    const user = await getUser(username);
    if (!user) {
      console.log('❌ Unable to get user information');
      return false;
    }
    
    // Encrypt new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user object
    const updatedUser = {
      ...user,
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated user to Redis
    const success = await redisManager.saveUser(updatedUser);
    if (!success) {
      console.log('❌ Failed to save user');
      return false;
    }
    
    console.log('✅ Password reset successful!');
    console.log(`👤 Username: ${username}`);
    console.log(`🔐 New password encrypted and saved`);
    console.log(`📅 Updated at: ${updatedUser.updatedAt}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    return false;
  }
}

// Validate password strength
function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
}

// Main function
async function main() {
  try {
    console.log('🔐 ROX Guild Manager - Reset User Password');
    console.log('==================================');
    
    // Connect to Redis
    const connected = await redisManager.connect();
    if (!connected) {
      process.exit(1);
    }
    
    // Get username
    const username = await askQuestion('Please enter the username to reset password: ');
    
    if (!username || username.trim() === '') {
      console.log('❌ Username cannot be empty');
      process.exit(1);
    }
    
    // Check if user exists
    const userExists = await checkUserExists(username.trim());
    if (!userExists) {
      console.log('❌ User does not exist');
      process.exit(1);
    }
    
    console.log('✅ User exists, password can be reset');
    
    // Get new password
    let newPassword;
    while (true) {
      newPassword = await askPassword('Please enter new password: ');
      
      if (!newPassword || newPassword.trim() === '') {
        console.log('❌ Password cannot be empty, please try again');
        continue;
      }
      
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        console.log(`❌ ${validation.message}, please try again`);
        continue;
      }
      
      // Confirm password
      const confirmPassword = await askPassword('Please confirm new password: ');
      
      if (newPassword !== confirmPassword) {
        console.log('❌ Passwords do not match, please try again');
        continue;
      }
      
      break;
    }
    
    // Reset password
    const success = await resetUserPassword(username.trim(), newPassword);
    
    if (success) {
      console.log('\n🎉 Password reset completed!');
    } else {
      console.log('\n❌ Password reset failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Program execution error:', error);
  } finally {
    // Close connections
    rl.close();
    await redisManager.disconnect();
  }
}

// Handle program exit
process.on('SIGINT', async () => {
  console.log('\n👋 Program exited');
  rl.close();
  await redisManager.disconnect();
  process.exit(0);
});

// Start program
main();