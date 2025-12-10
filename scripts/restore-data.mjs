#!/usr/bin/env node

/**
 * 데이터베이스 복원 스크립트
 * 백업된 JSON 파일을 Railway 데이터베이스로 복원합니다.
 */

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

// 백업 파일 경로 (명령줄 인자로 받음)
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ 사용법: node restore-data.mjs <백업파일경로>');
  console.error('   예시: node restore-data.mjs ../backups/backup-2024-01-01.json');
  process.exit(1);
}

console.log('📦 데이터베이스 복원 시작...\n');

async function restoreData() {
  let connection;

  try {
    // 백업 파일 읽기
    console.log('📂 백업 파일 읽는 중...');
    const backupPath = path.resolve(process.cwd(), backupFile);
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    const backup = JSON.parse(backupContent);

    console.log(`✅ 백업 파일 로드 완료 (생성일: ${backup.exportDate})\n`);

    // MySQL 연결
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ 데이터베이스 연결 성공\n');

    // 외래키 제약 조건 임시 비활성화
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. users 테이블 복원
    console.log('📋 users 테이블 복원 중...');
    if (backup.tables.users && backup.tables.users.length > 0) {
      for (const user of backup.tables.users) {
        // 백업 필드 매핑
        const password = user.password || user.passwordHash;
        const phone = user.phone || user.phoneNumber;

        await connection.query(
          `INSERT INTO users (id, email, name, phone, accountNumber, password, loginMethod, role, alwaysAvailable, createdAt, updatedAt, lastSignedIn)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           email = VALUES(email),
           name = VALUES(name),
           phone = VALUES(phone),
           accountNumber = VALUES(accountNumber),
           password = VALUES(password),
           loginMethod = VALUES(loginMethod),
           role = VALUES(role),
           alwaysAvailable = VALUES(alwaysAvailable),
           updatedAt = VALUES(updatedAt),
           lastSignedIn = VALUES(lastSignedIn)`,
          [
            user.id,
            user.email,
            user.name,
            phone,
            user.accountNumber,
            password,
            user.loginMethod,
            user.role,
            user.alwaysAvailable ? 1 : 0,
            new Date(user.createdAt),
            new Date(user.updatedAt),
            user.lastSignedIn ? new Date(user.lastSignedIn) : new Date(user.updatedAt)
          ]
        );
      }
      console.log(`   → ${backup.tables.users.length}개 레코드 복원 완료`);
    }

    // 2. events 테이블 복원
    console.log('📋 events 테이블 복원 중...');
    if (backup.tables.events && backup.tables.events.length > 0) {
      for (const event of backup.tables.events) {
        // Event Status Calculation
        let eventStatus = 'scheduled';
        if (event.isProposal) {
          eventStatus = 'proposal';
        } else if (event.isConfirmed) {
          eventStatus = 'confirmed';
        }

        await connection.query(
          `INSERT INTO events (id, title, description, keywords, instructorName, organizerId, date, timeRange, minParticipants, maxParticipants, fee, status, isProposal, isConfirmed, eventStatus, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           description = VALUES(description),
           keywords = VALUES(keywords),
           instructorName = VALUES(instructorName),
           organizerId = VALUES(organizerId),
           date = VALUES(date),
           timeRange = VALUES(timeRange),
           minParticipants = VALUES(minParticipants),
           maxParticipants = VALUES(maxParticipants),
           fee = VALUES(fee),
           status = VALUES(status),
           isProposal = VALUES(isProposal),
           isConfirmed = VALUES(isConfirmed),
           eventStatus = VALUES(eventStatus),
           updatedAt = VALUES(updatedAt)`,
          [
            event.id,
            event.title,
            event.description,
            event.keywords,
            event.instructorName,
            event.organizerId,
            event.date,
            event.timeRange,
            event.minParticipants,
            event.maxParticipants,
            event.fee,
            event.status, // Approval Status
            event.isProposal,
            event.isConfirmed,
            eventStatus,
            new Date(event.createdAt),
            new Date(event.updatedAt)
          ]
        );
      }
      console.log(`   → ${backup.tables.events.length}개 레코드 복원 완료`);
    }

    // 3. participants 테이블 복원
    console.log('📋 participants 테이블 복원 중...');
    if (backup.tables.participants && backup.tables.participants.length > 0) {
      for (const participant of backup.tables.participants) {
        await connection.query(
          `INSERT INTO participants (id, userId, name, email, phone, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           userId = VALUES(userId),
           name = VALUES(name),
           email = VALUES(email),
           phone = VALUES(phone),
           updatedAt = VALUES(updatedAt)`,
          [
            participant.id,
            participant.userId,
            participant.name,
            participant.email,
            participant.phone,
            new Date(participant.createdAt),
            new Date(participant.updatedAt)
          ]
        );
      }
      console.log(`   → ${backup.tables.participants.length}개 레코드 복원 완료`);
    }

    // 4. availableSlots 테이블 복원
    console.log('📋 availableSlots 테이블 복원 중...');
    if (backup.tables.availableSlots && backup.tables.availableSlots.length > 0) {
      // Schema in code: date, startTime, endTime. No userId in schema?
      // Wait, schema.ts availableSlots: id, date, startTime, endTime, isAvailable.
      // Backup JSON availableSlots might have userId? 
      // backup has "availableSlots": [] so it's empty.
      // I'll skip implementation details if it's empty, but sticking to schema.
      // If backup HAS items, I need to match schema.
      // Schema.ts does NOT have userId. It assumes Global slots or managed by admin?
      // Backup has userId?
      // Since it's empty, I'll just check if it has entries.
    }
    if (backup.tables.availableSlots && backup.tables.availableSlots.length > 0) {
      console.log('   Warning: availableSlots data found but schema might differ. Skipping for safety.');
    } else {
      console.log('   → 0개 레코드 (데이터 없음)');
    }

    // 5. passwordResets 테이블 복원 - Skipping
    console.log('📋 passwordResets 테이블 건너뛰기');

    // 외래키 제약 조건 다시 활성화
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ 복원 완료!');
    console.log('\n📊 복원 요약:');
    console.log(`   - users: ${backup.tables.users?.length || 0}개`);
    console.log(`   - events: ${backup.tables.events?.length || 0}개`);
    console.log(`   - participants: ${backup.tables.participants?.length || 0}개`);

  } catch (error) {
    console.error('\n❌ 복원 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

restoreData();
