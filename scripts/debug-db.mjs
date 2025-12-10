import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경변수가 필요합니다.');
    process.exit(1);
}

async function debugAndFix() {
    let connection;
    try {
        connection = await mysql.createConnection(DATABASE_URL);
        console.log('✅ 데이터베이스 연결 성공');

        // 1. 데이터 개수 확인
        const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
        const [eventRows] = await connection.query('SELECT COUNT(*) as count FROM events');

        console.log(`📊 데이터 현황: 사용자 ${userRows[0].count}명, 모임 ${eventRows[0].count}개`);

        if (userRows[0].count === 0) {
            console.error('❌ 데이터가 비어있습니다! 복구가 제대로 되지 않았을 수 있습니다.');
        } else {
            console.log('✅ 데이터가 존재합니다.');
        }

        // 2. 관리자 계정 확인 및 비밀번호 리셋
        const targetEmail = 'loginheaven@gmail.com';
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [targetEmail]);

        if (users.length === 0) {
            console.error(`❌ ${targetEmail} 사용자를 찾을 수 없습니다.`);
        } else {
            const user = users[0];
            console.log(`👤 사용자 발견: ${user.name} (ID: ${user.id}, Role: ${user.role})`);

            // 비밀번호 강제 리셋 (1234qwer)
            const newPassword = '1234qwer';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
            console.log(`✅ 비밀번호가 '${newPassword}'로 재설정되었습니다.`);
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error);
    } finally {
        if (connection) await connection.end();
    }
}

debugAndFix();
