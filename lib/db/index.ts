import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Create database connection
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from "./schema";
