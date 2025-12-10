# 데이터 마이그레이션 가이드

이 문서는 Manus 플랫폼에서 Railway로 데이터를 마이그레이션하는 방법을 설명합니다.

## 📦 백업된 데이터

현재 Manus 데이터베이스의 모든 데이터가 백업되었습니다:

- **users**: 83개 (사용자 계정)
- **events**: 4개 (모임)
- **participants**: 6개 (참여자)

백업 파일: `backups/backup-2025-12-10T00-20-24-884Z.json`

---

## 🚀 마이그레이션 절차

### 1단계: Railway 프로젝트 생성 및 배포

**RAILWAY_DEPLOY.md** 문서를 참조하여:

1. Railway 계정 생성
2. GitHub 저장소 생성 및 푸시
3. Railway에서 프로젝트 생성
4. MySQL 데이터베이스 추가
5. 환경변수 설정
6. 배포 완료 대기

### 2단계: 데이터베이스 스키마 생성

Railway 배포 시 자동으로 스키마가 생성됩니다 (`pnpm db:push`).

다음 테이블들이 생성되어야 합니다:
- users
- events
- participants
- availableSlots
- passwordResets

**확인 방법:**

Railway 대시보드 → MySQL 서비스 → "Connect" 탭에서 연결 정보 확인 후:

```bash
mysql -h <host> -u <user> -p<password> <database>
```

```sql
SHOW TABLES;
```

### 3단계: 백업 파일 업로드

로컬 환경에서 Railway 프로젝트로 백업 파일을 복사합니다:

```bash
# 압축 해제
tar -xzf event-registration-export.tar.gz
cd event-registration

# backups 디렉토리 확인
ls -la backups/
```

### 4단계: 데이터 복원

Railway 환경변수에 `DATABASE_URL`이 설정되어 있는지 확인 후:

```bash
# Railway CLI 설치 (선택사항)
npm install -g @railway/cli

# Railway 로그인 및 프로젝트 연결
railway login
railway link

# 환경변수 확인
railway variables

# 데이터 복원 실행
railway run node scripts/restore-data.mjs backups/backup-2025-12-10T00-20-24-884Z.json
```

**또는 로컬에서 직접 복원:**

```bash
# .env 파일에 Railway DATABASE_URL 설정
echo "DATABASE_URL=mysql://user:password@host:port/database" > .env

# 복원 실행
node scripts/restore-data.mjs backups/backup-2025-12-10T00-20-24-884Z.json
```

### 5단계: 데이터 확인

Railway MySQL에 접속하여 데이터가 정상적으로 복원되었는지 확인:

```sql
-- 사용자 수 확인
SELECT COUNT(*) FROM users;

-- 모임 수 확인
SELECT COUNT(*) FROM events;

-- 참여자 수 확인
SELECT COUNT(*) FROM participants;

-- 관리자 계정 확인
SELECT id, email, name, role FROM users WHERE role = 'admin';
```

### 6단계: 로그인 테스트

Railway 배포된 URL로 접속하여:

1. 기존 계정으로 로그인 시도
2. 모임 목록 확인
3. 참여자 정보 확인
4. 관리자 대시보드 접근 (관리자 계정)

---

## 🔧 스크립트 사용법

### 백업 스크립트

**용도**: Manus 데이터베이스의 모든 데이터를 JSON 파일로 백업

```bash
# 실행
node scripts/backup-data.mjs

# 결과
# backups/backup-YYYY-MM-DDTHH-MM-SS-MMMZ.json 파일 생성
```

**출력 예시:**
```
📦 데이터베이스 백업 시작...
✅ 데이터베이스 연결 성공
📋 users 테이블 백업 중...
   → 83개 레코드 백업 완료
📋 events 테이블 백업 중...
   → 4개 레코드 백업 완료
📋 participants 테이블 백업 중...
   → 6개 레코드 백업 완료
✅ 백업 완료!
📁 백업 파일: /path/to/backups/backup-2025-12-10.json
```

### 복원 스크립트

**용도**: 백업된 JSON 파일을 Railway 데이터베이스로 복원

```bash
# 사용법
node scripts/restore-data.mjs <백업파일경로>

# 예시
node scripts/restore-data.mjs backups/backup-2025-12-10T00-20-24-884Z.json
```

**출력 예시:**
```
📦 데이터베이스 복원 시작...
📂 백업 파일 읽는 중...
✅ 백업 파일 로드 완료 (생성일: 2025-12-10T00:20:24.884Z)
✅ 데이터베이스 연결 성공
📋 users 테이블 복원 중...
   → 83개 레코드 복원 완료
📋 events 테이블 복원 중...
   → 4개 레코드 복원 완료
📋 participants 테이블 복원 중...
   → 6개 레코드 복원 완료
✅ 복원 완료!
```

---

## ⚠️ 주의사항

### 1. 비밀번호 해시

- 백업된 사용자의 비밀번호는 bcrypt 해시로 저장되어 있습니다
- Railway로 복원 후에도 동일한 비밀번호로 로그인 가능합니다
- **보안**: 백업 파일에는 비밀번호 해시가 포함되어 있으므로 안전하게 보관하세요

### 2. ID 충돌

- 복원 스크립트는 `ON DUPLICATE KEY UPDATE`를 사용하여 중복된 ID가 있으면 업데이트합니다
- 새로운 Railway 데이터베이스에 이미 데이터가 있다면 ID 충돌이 발생할 수 있습니다
- **권장**: 깨끗한 데이터베이스에 복원하세요

### 3. AUTO_INCREMENT

- 복원 후 AUTO_INCREMENT 값이 백업된 최대 ID보다 작을 수 있습니다
- 새로운 레코드 생성 시 ID 충돌을 방지하려면 다음 명령 실행:

```sql
-- users 테이블
ALTER TABLE users AUTO_INCREMENT = 100;

-- events 테이블
ALTER TABLE events AUTO_INCREMENT = 100;

-- participants 테이블
ALTER TABLE participants AUTO_INCREMENT = 100;
```

### 4. 외래키 제약 조건

- 복원 스크립트는 자동으로 외래키 제약 조건을 임시 비활성화합니다
- 복원 완료 후 자동으로 다시 활성화됩니다

### 5. 타임존

- 백업된 날짜/시간은 UTC 기준입니다
- Railway MySQL의 타임존 설정을 확인하세요:

```sql
SELECT @@global.time_zone, @@session.time_zone;
```

---

## 🔍 트러블슈팅

### 복원 실패: "Table doesn't exist"

**원인**: Railway 데이터베이스에 스키마가 생성되지 않았습니다.

**해결:**
```bash
# Railway 프로젝트에서 마이그레이션 실행
railway run pnpm db:push
```

### 복원 실패: "Duplicate entry"

**원인**: 이미 동일한 ID의 레코드가 존재합니다.

**해결:**
```sql
-- 기존 데이터 삭제 (주의: 모든 데이터가 삭제됩니다)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE participants;
TRUNCATE TABLE events;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```

그 후 복원 스크립트 재실행.

### 복원 실패: "Foreign key constraint fails"

**원인**: 외래키 제약 조건 위반 (예: 존재하지 않는 organizerId 참조)

**해결:**
1. 백업 파일 확인: 모든 테이블이 백업되었는지 확인
2. 복원 순서 확인: users → events → participants 순서로 복원
3. 스크립트는 자동으로 순서를 처리하므로, 백업 파일이 완전한지 확인

### DATABASE_URL 환경변수 오류

**원인**: Railway DATABASE_URL이 설정되지 않았습니다.

**해결:**
```bash
# Railway 대시보드에서 MySQL 서비스의 DATABASE_URL 복사
# .env 파일에 추가
echo "DATABASE_URL=mysql://..." > .env

# 또는 Railway CLI 사용
railway run node scripts/restore-data.mjs backups/backup-xxx.json
```

---

## 📊 백업 파일 구조

백업 파일은 다음과 같은 JSON 구조를 가집니다:

```json
{
  "exportDate": "2025-12-10T00:20:24.884Z",
  "tables": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "name": "홍길동",
        "phoneNumber": "010-1234-5678",
        "accountNumber": "123-456-789",
        "passwordHash": "$2b$10$...",
        "loginMethod": "local",
        "role": "user",
        "alwaysAvailable": true,
        "createdAt": "2025-12-01T00:00:00.000Z",
        "updatedAt": "2025-12-01T00:00:00.000Z"
      }
    ],
    "events": [...],
    "participants": [...],
    "availableSlots": [...],
    "passwordResets": [...]
  }
}
```

---

## 🎯 마이그레이션 체크리스트

- [ ] Railway 프로젝트 생성 완료
- [ ] MySQL 데이터베이스 추가 완료
- [ ] 환경변수 설정 완료
- [ ] Railway 배포 성공 확인
- [ ] 데이터베이스 스키마 생성 확인 (`SHOW TABLES`)
- [ ] 백업 파일 준비 (`backups/backup-xxx.json`)
- [ ] 복원 스크립트 실행 완료
- [ ] 데이터 복원 확인 (`SELECT COUNT(*)`)
- [ ] 로그인 테스트 완료
- [ ] 모임 목록 표시 확인
- [ ] 참여자 정보 확인
- [ ] 관리자 대시보드 접근 확인

---

## 📞 추가 지원

마이그레이션 과정에서 문제가 발생하면:

1. 이 문서의 트러블슈팅 섹션 확인
2. Railway 로그 확인: `railway logs`
3. MySQL 로그 확인: Railway 대시보드 → MySQL → "Logs"
4. GitHub Issues에 문의

---

**마이그레이션 완료 후 Manus 플랫폼의 데이터는 더 이상 사용되지 않으므로 안전하게 삭제할 수 있습니다.**
