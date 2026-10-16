import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server or root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veriqa',
  JWT_SECRET: process.env.JWT_SECRET || 'veriqa_super_secure_jwt_secret_key_2026_xyz',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '',
  LLM_MODEL: process.env.LLM_MODEL || 'gemini-1.5-flash',
  EVIDENCE_STORAGE_PATH: process.env.EVIDENCE_STORAGE_PATH || path.resolve(__dirname, '../../evidence'),
  MAX_CONCURRENT_RUNS: parseInt(process.env.MAX_CONCURRENT_RUNS || '3', 10),
  TEST_TIMEOUT_MS: parseInt(process.env.TEST_TIMEOUT_MS || '45000', 10),
  ALLOWED_TARGET_ORIGINS: process.env.ALLOWED_TARGET_ORIGINS ? process.env.ALLOWED_TARGET_ORIGINS.split(',').map(s => s.trim()) : [],
  ALLOW_LOCAL_TESTING: process.env.ALLOW_LOCAL_TESTING !== 'false', // Default to true in dev for demo sandbox app testing
};
