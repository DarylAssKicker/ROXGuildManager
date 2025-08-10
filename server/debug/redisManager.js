const dotenv = require('dotenv');
const Redis = require('ioredis');

// Load environment variables
dotenv.config();

class RedisManager {
  constructor() {
    this.redis = null;
    this.isConnected = false;
  }

  // Initialize Redis connection
  async connect() {
    try {
      console.log('🔌 Connecting to Redis...');
      console.log('REDIS_HOST:', process.env.REDIS_HOST);
      console.log('REDIS_PORT:', process.env.REDIS_PORT);
      console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD);
      console.log('REDIS_DB:', process.env.REDIS_DB);
      console.log('REDIS_KEY_PREFIX:', process.env.REDIS_KEY_PREFIX);

      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'rox_guild:',
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      // Test connection
      await this.redis.ping();
      this.isConnected = true;
      console.log('✅ Redis connection successful');
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Disconnect
  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
      console.log('👋 Redis connection disconnected');
    }
  }

  // Check connection status
  checkConnection() {
    if (!this.isConnected || !this.redis) {
      throw new Error('Redis not connected, please call connect() method first');
    }
  }

  // User-related operations
  async getUserByUsername(username) {
    this.checkConnection();
    try {
      // Get all users and find specified username
      const allUsers = await this.getAllUsers();
      const user = allUsers.find(u => u.username === username);
      return user || null;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  async getUserById(userId) {
    this.checkConnection();
    try {
      const userKey = `user:${userId}`;
      const userData = await this.redis.get(userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  async userExists(username) {
    this.checkConnection();
    try {
      // Get all users and check if specified username exists
      const allUsers = await this.getAllUsers();
      return allUsers.some(u => u.username === username);
    } catch (error) {
      console.error('Failed to check if user exists:', error);
      return false;
    }
  }

  async saveUser(user) {
    this.checkConnection();
    try {
      const userKey = `user:${user.username}`;
      const userByIdKey = `user:${user.id}`;
      const userData = JSON.stringify(user);
      
      await this.redis.set(userKey, userData);
      await this.redis.set(userByIdKey, userData);
      return true;
    } catch (error) {
      console.error('Failed to save user info:', error);
      return false;
    }
  }

  async deleteUser(username) {
    this.checkConnection();
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        return false;
      }

      const userKey = `user:${username}`;
      const userByIdKey = `user:${user.id}`;
      
      await this.redis.del(userKey);
      await this.redis.del(userByIdKey);
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  async isUserAdmin(username) {
    this.checkConnection();
    try {
      const user = await this.getUserByUsername(username);
      return user && user.role === 'admin';
    } catch (error) {
      console.error('Failed to check user admin privileges:', error);
      return false;
    }
  }

  async getAllUsers() {
    this.checkConnection();
    try {
      // Use '*' pattern to get all keys, since keyPrefix is already set
      const pattern = '*';
      const keys = await this.redis.keys(pattern);
      const users = [];
      
      for (const key of keys) {
        // Key name after removing keyPrefix
        const keyWithoutPrefix = key.replace(this.redis.options.keyPrefix || '', '');
        // Only get user data, format: user:{uuid}
        if (keyWithoutPrefix.startsWith('user:') && keyWithoutPrefix.match(/^user:[0-9a-f-]{36}$/)) {
          const userData = await this.redis.get(keyWithoutPrefix);
          if (userData) {
            const user = JSON.parse(userData);
            users.push(user);
          }
        }
      }
      
      return users;
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  }

  // Generic Redis operations
  async get(key) {
    this.checkConnection();
    return await this.redis.get(key);
  }

  async set(key, value, ttl = null) {
    this.checkConnection();
    if (ttl) {
      return await this.redis.setex(key, ttl, value);
    }
    return await this.redis.set(key, value);
  }

  async del(key) {
    this.checkConnection();
    return await this.redis.del(key);
  }

  async exists(key) {
    this.checkConnection();
    return await this.redis.exists(key);
  }

  async keys(pattern) {
    this.checkConnection();
    return await this.redis.keys(pattern);
  }

  async ping() {
    this.checkConnection();
    return await this.redis.ping();
  }

  // Get Redis instance (for advanced operations)
  getRedisInstance() {
    this.checkConnection();
    return this.redis;
  }

  // Batch operations
  async mget(keys) {
    this.checkConnection();
    return await this.redis.mget(keys);
  }

  async mset(keyValuePairs) {
    this.checkConnection();
    return await this.redis.mset(keyValuePairs);
  }

  // List operations
  async lpush(key, ...values) {
    this.checkConnection();
    return await this.redis.lpush(key, ...values);
  }

  async rpush(key, ...values) {
    this.checkConnection();
    return await this.redis.rpush(key, ...values);
  }

  async lpop(key) {
    this.checkConnection();
    return await this.redis.lpop(key);
  }

  async rpop(key) {
    this.checkConnection();
    return await this.redis.rpop(key);
  }

  async lrange(key, start, stop) {
    this.checkConnection();
    return await this.redis.lrange(key, start, stop);
  }

  // Hash operations
  async hget(key, field) {
    this.checkConnection();
    return await this.redis.hget(key, field);
  }

  async hset(key, field, value) {
    this.checkConnection();
    return await this.redis.hset(key, field, value);
  }

  async hgetall(key) {
    this.checkConnection();
    return await this.redis.hgetall(key);
  }

  async hdel(key, ...fields) {
    this.checkConnection();
    return await this.redis.hdel(key, ...fields);
  }

  // Set operations
  async sadd(key, ...members) {
    this.checkConnection();
    return await this.redis.sadd(key, ...members);
  }

  async smembers(key) {
    this.checkConnection();
    return await this.redis.smembers(key);
  }

  async srem(key, ...members) {
    this.checkConnection();
    return await this.redis.srem(key, ...members);
  }
}

// Create singleton instance
const redisManager = new RedisManager();

// Export instance and class
module.exports = {
  redisManager,
  RedisManager
};

// Automatically disconnect when program exits
process.on('SIGINT', async () => {
  await redisManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisManager.disconnect();
  process.exit(0);
});