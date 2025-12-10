#!/usr/bin/env node

/**
 * 데이터베이스 백업 스크립트
 * 현재 Manus 데이터베이스의 모든 데이터를 JSON 파일로 백업합니다.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수에서 DATABASE_URL 가져오기
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

console.log('📦 데이터베이스 백업 시작...\n');

async function backupData() {
  let connection;
  
  try {
    // MySQL 연결
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ 데이터베이스 연결 성공\n');

    const backup = {
      exportDate: new Date().toISOString(),
      tables: {}
    };

    // 1. users 테이블 백업
    console.log('📋 users 테이블 백업 중...');
    const [users] = await connection.query('SELECT * FROM users');
    backup.tables.users = users;
    console.log(`   → ${users.length}개 레코드 백업 완료`);

    // 2. events 테이블 백업
    console.log('📋 events 테이블 백업 중...');
    const [events] = await connection.query('SELECT * FROM events');
    backup.tables.events = events;
    console.log(`   → ${events.length}개 레코드 백업 완료`);

    // 3. participants 테이블 백업
    console.log('📋 participants 테이블 백업 중...');
    const [participants] = await connection.query('SELECT * FROM participants');
    backup.tables.participants = participants;
    console.log(`   → ${participants.length}개 레코드 백업 완료`);

    // 4. availableSlots 테이블 백업 (테이블이 없으면 건너뛰기)
    console.log('📋 availableSlots 테이블 백업 중...');
    try {
      const [availableSlots] = await connection.query('SELECT * FROM availableSlots');
      backup.tables.availableSlots = availableSlots;
      console.log(`   → ${availableSlots.length}개 레코드 백업 완료`);
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('   → 테이블이 존재하지 않음 (건너뛰기)');
        backup.tables.availableSlots = [];
      } else {
        throw error;
      }
    }

    // 5. passwordResets 테이블 백업 (선택사항)
    console.log('📋 passwordResets 테이블 백업 중...');
    try {
      const [passwordResets] = await connection.query('SELECT * FROM passwordResets');
      backup.tables.passwordResets = passwordResets;
      console.log(`   → ${passwordResets.length}개 레코드 백업 완료`);
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('   → 테이블이 존재하지 않음 (건너뛰기)');
        backup.tables.passwordResets = [];
      } else {
        throw error;
      }
    }

    // JSON 파일로 저장
    const backupDir = path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    
    console.log('\n✅ 백업 완료!');
    console.log(`📁 백업 파일: ${backupFile}`);
    console.log('\n📊 백업 요약:');
    console.log(`   - users: ${backup.tables.users.length}개`);
    console.log(`   - events: ${backup.tables.events.length}개`);
    console.log(`   - participants: ${backup.tables.participants.length}개`);
    console.log(`   - availableSlots: ${backup.tables.availableSlots.length}개`);
    console.log(`   - passwordResets: ${backup.tables.passwordResets.length}개`);

  } catch (error) {
    console.error('\n❌ 백업 실패:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

backupData();
