import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required.');
    process.exit(1);
}

async function findInvalidUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(DATABASE_URL);

        // Query for names that are NULL, empty, or consist only of numbers
        const [rows] = await connection.query(`
      SELECT id, name, email, phone, createdAt 
      FROM users 
      WHERE name IS NULL 
         OR name = '' 
         OR name REGEXP '^[0-9]+$'
    `);

        console.log(`🔍 Found ${rows.length} users with invalid names (null, empty, or numeric):\n`);

        if (rows.length > 0) {
            console.table(rows);
        } else {
            console.log("✅ No invalid user names found.");
        }

    } catch (error) {
        console.error('❌ Error executing query:', error);
    } finally {
        if (connection) await connection.end();
    }
}

findInvalidUsers();
