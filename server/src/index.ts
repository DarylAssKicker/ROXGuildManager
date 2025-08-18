import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config();

// Then import modules that depend on environment variables
import routes from './routes';
import { databaseService } from './services/databaseService';
import { initializeDefaultClasses } from './controllers/classController';
import { groupPartyService } from './services/groupPartyService';
import { authService } from './services/authService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware configuration
app.use(helmet()); // Security headers

// Enable gzip compression for all responses
app.use(compression({
  // Compression level (1-9, 9 is best compression but slowest)
  level: 6,
  // Only compress responses that are at least this many bytes
  threshold: 1024,
  // Enable compression for these content types
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter
    return compression.filter(req, res);
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file service - provide access to uploaded images
// Both development and production use client/public/images
// In production, Docker maps ./uploads/images to /app/client/public/images
app.use('/images', express.static(path.join(__dirname, '../../client/public/images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handling
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 ROX Guild Manager server started successfully`);
  console.log(`📍 Server address: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Show environment variable loading status
  console.log('🔧 Environment variables loading status:');
  console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || 'not set'}`);
  console.log(`  REDIS_PORT: ${process.env.REDIS_PORT || 'not set'}`);
  console.log(`  REDIS_DB: ${process.env.REDIS_DB || 'not set'}`);
  console.log(`  REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? 'set' : 'not set'}`);
  
  // Initialize database connection
  try {
    const dbConnected = await databaseService.initialize();
    if (dbConnected) {
      console.log(`✅ Database connection successful`);
      
      // Initialize default class data
      await initializeDefaultClasses();
      
      // Initialize default party data
      await groupPartyService.initializeDefaultData();
      
      // Initialize authentication service
      await authService.initialize();
    } else {
      console.log(`⚠️ Database connection failed, some features may be unavailable`);
    }
  } catch (error) {
    console.error(`❌ Database initialization failed:`, error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal, shutting down server...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal, shutting down server...');
  await databaseService.disconnect();
  process.exit(0);
});

export default app;