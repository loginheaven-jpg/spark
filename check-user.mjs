import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "./drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

const result = await db.select().from(users).where(eq(users.email, "1@1.com")).limit(1);

if (result.length > 0) {
  console.log("User found:");
  console.log(JSON.stringify(result[0], null, 2));
} else {
  console.log("User not found");
}

process.exit(0);
