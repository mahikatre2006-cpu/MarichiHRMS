import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Mask sensitive credentials in MongoDB connection string for safe logging
 */
function maskConnectionString(uri) {
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');
  } catch {
    return 'mongodb://******';
  }
}

let isConnected = false;

export async function connectDatabase(customUri = null) {
  const uri = customUri || env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Please set it in your environment or .env file.');
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    logger.info(`Connecting to MongoDB at ${maskConnectionString(uri)}...`);

    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected.');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true
    });

    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    logger.error(`Failed to connect to MongoDB (${maskConnectionString(uri)}):`, err);
    throw err;
  }
}

export async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connection closed.');
  }
}
