import mongoose from 'mongoose';
import { seedKnowledgeIfNeeded } from './seedKnowledge';
import { syncClientsIfNeeded } from './syncClients';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-widget-admin';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;

    // Drop legacy unique index on clientToken (was unique, now just indexed)
    const db = cached.conn.connection.db;
    if (db) {
      db.collection('clients')
        .dropIndex('clientToken_1')
        .catch(() => {});
    }

    // Seed knowledge from JSON files if DB is empty for any client
    seedKnowledgeIfNeeded().catch((err) => console.warn('[Seed] Knowledge seed failed:', err));

    // Sync widget folders → Client records so widgets work immediately after deploy
    syncClientsIfNeeded().catch((err) => console.warn('[Sync] Client sync failed:', err));
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
