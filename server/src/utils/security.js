import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let argon2 = null;
try {
  argon2 = await import('argon2');
} catch {
  logger.warn('argon2 native module not available; using bcryptjs as primary password hasher.');
}

/**
 * Secure password hashing using Argon2id or bcryptjs
 */
export async function hashPassword(plainPassword) {
  if (argon2 && argon2.hash) {
    try {
      return await argon2.hash(plainPassword, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 1
      });
    } catch (err) {
      logger.warn('Argon2 hashing failed, falling back to bcrypt:', err.message);
    }
  }
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Verify password against stored hash (supports both Argon2 and bcrypt)
 */
export async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;

  // Argon2 hashes start with $argon2
  if (storedHash.startsWith('$argon2') && argon2 && argon2.verify) {
    try {
      return await argon2.verify(storedHash, plainPassword);
    } catch (err) {
      logger.error('Argon2 verify error:', err);
      return false;
    }
  }

  // Fallback or bcrypt hashes
  return bcrypt.compare(plainPassword, storedHash);
}

/**
 * Generate short-lived Access Token (JWT)
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN
  });
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Generate Refresh Token (JWT)
 */
export function generateRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN
  });
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Hash token using SHA-256 for secure session storage
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate secure random token (e.g. for session identifiers, OIDC state/nonce)
 */
export function generateRandomString(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
