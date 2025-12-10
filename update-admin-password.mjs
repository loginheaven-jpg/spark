import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const hashedPassword = await bcrypt.hash('1234qwer', 10);

await db.update(users)
  .set({ password: hashedPassword })
  .where(eq(users.email, 'loginheaven@gmail.com'));

console.log('✅ Admin password updated to: 1234qwer');
await connection.end();
