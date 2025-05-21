// src/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

// Load environment variables - use path.resolve for better compatibility with Vercel
const envPath = path.resolve(process.cwd(), ".env");
config({ path: envPath });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Export the database connection
export const db = drizzle({ client: sql });

// Log successful database connection in non-production environments
if (process.env.NODE_ENV !== 'production') {
  console.log('Database connection established');
}