import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

await db.update(users)
  .set({ loginMethod: 'local' })
  .where(eq(users.email, 'loginheaven@gmail.com'));

console.log('✅ Admin loginMethod updated to: local');
await connection.end();
