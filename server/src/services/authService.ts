import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './databaseService';
import { groupPartyService } from './groupPartyService';
import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  JwtPayload, 
  CreateUserRequest,
  UpdateUserRequest,
  RefreshTokenRequest
} from '../types';

class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly JWT_REFRESH_EXPIRES_IN: string;
  private readonly SALT_ROUNDS = 12;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    if (this.JWT_SECRET === 'your-secret-key') {
      console.warn('⚠️ Using default JWT secret, please set JWT_SECRET environment variable in production');
    }
  }

  /**
   * Initialize authentication service, create default admin account
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing authentication service...');
      
      // Check if user already exists
      const users = await this.getAllUsers();
      if (users.length === 0) {
        // Create default admin account
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
        
        await this.createUser({
          username: defaultUsername,
          password: defaultPassword,
          role: 'admin'
        });
        
        console.log(`✅ Default admin account created: ${defaultUsername}`);
        console.log(`⚠️ Please change the default password promptly!`);
      }
      
      console.log('✅ Authentication service initialization completed');
    } catch (error) {
      console.error('❌ Authentication service initialization failed:', error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { username, password } = loginData;
    
    // Find user
    const user = await this.getUserByUsername(username);
    if (!user) {
      throw new Error('Username or password incorrect');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Username or password incorrect');
    }
    
    // Update last login time
    await this.updateUserLastLogin(user.id);
    
    // Initialize user data (if needed)
    await this.initializeUserData(user.id);
    
    // Generate token
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };
    
    const token = jwt.sign(payload, this.JWT_SECRET, { 
      expiresIn: this.JWT_EXPIRES_IN 
    } as jwt.SignOptions);
    
    const refreshToken = jwt.sign(payload, this.JWT_SECRET, { 
      expiresIn: this.JWT_REFRESH_EXPIRES_IN 
    } as jwt.SignOptions);
    
    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token,
      refreshToken,
      expiresIn: this.JWT_EXPIRES_IN
    };
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshData: RefreshTokenRequest): Promise<LoginResponse> {
    const { refreshToken } = refreshData;
    
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as JwtPayload;
      
      // Check if refresh token exists in storage
      const storedToken = await this.getRefreshToken(payload.userId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Get user info
      const user = await this.getUserById(payload.userId);
      if (!user) {
        throw new Error('User does not exist');
      }
      
      // Generate new token
      const newPayload: JwtPayload = {
        userId: user.id,
        username: user.username,
        role: user.role
      };
      
      const newToken = jwt.sign(newPayload, this.JWT_SECRET, { 
        expiresIn: this.JWT_EXPIRES_IN 
      } as jwt.SignOptions);
      
      const newRefreshToken = jwt.sign(newPayload, this.JWT_SECRET, { 
        expiresIn: this.JWT_REFRESH_EXPIRES_IN 
      } as jwt.SignOptions);
      
      // Update refresh token
      await this.storeRefreshToken(user.id, newRefreshToken);
      
      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: this.JWT_EXPIRES_IN
      };
    } catch (error) {
      throw new Error('Token is invalid or expired');
    }
  }

  /**
   * Verify token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      
      // Check if user still exists
      const user = await this.getUserById(payload.userId);
      if (!user) {
        throw new Error('User does not exist');
      }
      
      return payload;
    } catch (error) {
      throw new Error('Token is invalid or expired');
    }
  }

  /**
   * User logout
   */
  async logout(userId: string): Promise<void> {
    // Delete refresh token
    await this.removeRefreshToken(userId);
  }

  /**
   * Create user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const { username, password, role = 'user' } = userData;
    
    // Check if username already exists
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Encrypt password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    const user: User = {
      id: uuidv4(),
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await databaseService.setUser(user);
    
    // Initialize data for new user
    await this.initializeUserData(user.id);
    
    return user;
  }

  /**
   * Get user (by ID)
   */
  async getUserById(id: string): Promise<User | null> {
    return await databaseService.getUser(id);
  }

  /**
   * Get user (by username)
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getAllUsers();
    console.log('Get all users:', users);
    console.log('Search username:', username);

    return users.find(user => user.username === username) || null;
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return await databaseService.getUsers();
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User does not exist');
    }
    
    const updatedUser: User = {
      ...user,
      updatedAt: new Date().toISOString()
    };
    
    if (userData.password) {
      updatedUser.passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);
    }
    
    if (userData.role) {
      updatedUser.role = userData.role;
    }
    
    await databaseService.setUser(updatedUser);
    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User does not exist');
    }
    
    await databaseService.deleteUser(id);
    await this.removeRefreshToken(id);
  }

  /**
   * Update user's last login time
   */
  private async updateUserLastLogin(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      await databaseService.setUser(user);
    }
  }

  /**
   * Store refresh token
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await databaseService.setData(key, refreshToken, 7 * 24 * 60 * 60); // Expires in 7 days
  }

  /**
   * Get refresh token
   */
  private async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return await databaseService.getData(key);
  }

  /**
   * Delete refresh token
   */
  private async removeRefreshToken(userId: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await databaseService.deleteData(key);
  }

  /**
   * Initialize user data
   */
  private async initializeUserData(userId: string): Promise<void> {
    try {
      console.log(`🔄 Checking if user ${userId} needs data initialization...`);
      
      // Check if user already has guild member data
      const existingMembers = await databaseService.getGuildMembers(userId);
      if (existingMembers && existingMembers.length > 0) {
        console.log(`User ${userId} already has guild data, skipping initialization`);
        return;
      }
      
      // Check if user already has party data
      const existingParties = await databaseService.getParties(userId);
      if (existingParties && existingParties.length > 0) {
        console.log(`User ${userId} already has party data, skipping initialization`);
        return;
      }
      
      console.log(`🚀 Starting data initialization for user ${userId}...`);
      
      // Initialize party and group data
      await groupPartyService.initializeUserData(userId);
      
      // Initialize empty guild member list
      await databaseService.saveGuildMembers(userId, []);
      
      console.log(`✅ User ${userId} data initialization completed`);
    } catch (error) {
      console.error(`❌ User ${userId} data initialization failed:`, error);
      // Don't throw error to avoid affecting login flow
    }
  }
}

export const authService = new AuthService();