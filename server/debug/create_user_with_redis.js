const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { redisManager } = require('./redisManager');

async function createUser() {
  // Get user information from command line arguments
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node create_user_with_redis.js <username> <password> <role>');
    console.log('Example: node create_user_with_redis.js newuser password123 user');
    console.log('Role can be: user or admin');
    process.exit(1);
  }

  const [username, password, role] = args;

  if (!['user', 'admin'].includes(role)) {
    console.error('❌ Role must be user or admin');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to Redis database...');
    const connected = await redisManager.connect();
    if (!connected) {
      console.error('❌ Redis connection failed');
      process.exit(1);
    }

    // Check if user already exists
    console.log(`🔍 Checking if user ${username} already exists...`);
    const userExists = await redisManager.userExists(username);
    if (userExists) {
      console.error(`❌ User ${username} already exists`);
      process.exit(1);
    }

    // Create user object
    const userId = uuidv4();
    const currentTime = new Date().toISOString();
    
    console.log(`🔄 Generating password hash...`);
    const saltRounds = role === 'admin' ? 12 : 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = {
      id: userId,
      username,
      passwordHash,
      role,
      createdAt: currentTime,
      updatedAt: currentTime
    };

    console.log(`🔄 Saving user: ${username} (${role})`);
    const saved = await redisManager.saveUser(user);
    
    if (!saved) {
      console.error('❌ Failed to save user');
      process.exit(1);
    }

    console.log('✅ User created successfully!');
    console.log(`📝 User information:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created at: ${user.createdAt}`);

    // Initialize default data for new user (if needed)
    if (role === 'user') {
      console.log('🔄 Initializing user default data...');
      // Logic for initializing user data can be added here
      // Skip for now since we're using redisManager instead of new service
      console.log('ℹ️ User data initialization needs to be completed automatically after system login');
    }

  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  } finally {
    await redisManager.disconnect();
    process.exit(0);
  }
}

createUser();