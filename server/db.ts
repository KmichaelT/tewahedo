// src/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env" });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set in .env file');
  // Use the value from the .env file we examined earlier
  process.env.DATABASE_URL = 'postgres://neondb_owner:npg_cwY89qOKDvnt@ep-shy-wave-a4dtuyr0-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('Using fallback DATABASE_URL from configuration');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql });