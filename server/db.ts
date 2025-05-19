import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Initialize PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create drizzle instance
export const db = drizzle(pool);