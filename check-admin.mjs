import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db.select().from(users).where(eq(users.email, 'loginheaven@gmail.com'));

if (result.length > 0) {
  console.log('✅ Admin account found:');
  console.log('Email:', result[0].email);
  console.log('Name:', result[0].name);
  console.log('Role:', result[0].role);
  console.log('Password hash:', result[0].password?.substring(0, 20) + '...');
} else {
  console.log('❌ Admin account NOT found');
}

await connection.end();
