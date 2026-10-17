import mongoose from 'mongoose';
import { env } from './env.js';

let mongodInstance = null;

export const connectDB = async () => {
  try {
    // Attempt standard connection first with 3 second timeout
    mongoose.set('strictQuery', false);
    
    // Test connection with short serverSelectionTimeoutMS
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    
    console.log(`[Database] Connected to external MongoDB at: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Could not connect to primary MongoDB URI (${env.MONGODB_URI}): ${err.message}`);
    console.log('[Database] Initializing isolated embedded MongoDB instance for seamless local operation...');
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const uri = mongodInstance.getUri();
      
      const conn = await mongoose.connect(uri);
      console.log(`[Database] Successfully started & connected to embedded MongoDB: ${uri}`);
      return conn;
    } catch (memErr) {
      console.error('[Database] Fatal: Failed to initialize embedded MongoDB:', memErr.message);
      throw memErr;
    }
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};
