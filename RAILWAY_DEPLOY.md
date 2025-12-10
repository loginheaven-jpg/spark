# Railway 배포 가이드

이 문서는 SPARK 프로젝트를 Railway 플랫폼에 배포하는 방법을 설명합니다.

## Railway란?

Railway는 풀스택 웹 애플리케이션을 쉽게 배포할 수 있는 클라우드 플랫폼입니다.

**장점:**
- 데이터베이스 포함 (MySQL, PostgreSQL 등)
- GitHub 연동 자동 배포
- 환경변수 웹 UI 관리
- 무료 티어 제공 ($5 크레딧/월)

## 배포 절차

### 1. Railway 계정 생성

1. [Railway 웹사이트](https://railway.app/) 접속
2. "Start a New Project" 클릭
3. GitHub 계정으로 로그인

### 2. GitHub 저장소 생성

프로젝트를 GitHub에 업로드합니다:

```bash
cd event-registration

# Git 초기화
git init

# .gitignore 파일 확인 (node_modules, .env 등이 포함되어 있어야 함)
cat .gitignore

# 첫 커밋
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후 연결
git remote add origin https://github.com/your-username/event-registration.git
git branch -M main
git push -u origin main
```

### 3. Railway 프로젝트 생성

1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 방금 생성한 저장소 선택

### 4. MySQL 데이터베이스 추가

1. Railway 프로젝트 대시보드에서 "New" 클릭
2. "Database" → "Add MySQL" 선택
3. 데이터베이스가 생성되면 자동으로 `DATABASE_URL` 환경변수가 설정됨

### 5. 환경변수 설정

Railway 대시보드에서 서비스 클릭 → "Variables" 탭:

```env
# JWT 시크릿 (랜덤 문자열 생성)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 이메일 발송 설정 (선택사항)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# OAuth 설정 (Manus OAuth 사용 시, 선택사항)
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name

# 프론트엔드 URL (배포 후 자동 생성된 URL로 업데이트)
VITE_API_URL=${{RAILWAY_PUBLIC_DOMAIN}}
```

**중요:**
- `DATABASE_URL`은 MySQL 추가 시 자동으로 설정됩니다
- `JWT_SECRET`은 반드시 변경하세요
- `VITE_API_URL`은 Railway의 공개 도메인으로 자동 설정됩니다

### 6. 빌드 및 시작 명령 설정

Railway는 `package.json`의 스크립트를 자동으로 감지하지만, 명시적으로 설정할 수도 있습니다:

**Settings → Build & Deploy:**
- **Build Command**: `pnpm install && pnpm db:push && pnpm build`
- **Start Command**: `pnpm start`

### 7. 배포 확인

1. Railway가 자동으로 빌드 및 배포를 시작합니다
2. "Deployments" 탭에서 진행 상황 확인
3. 배포 완료 후 "View Logs"에서 에러 확인
4. "Settings" → "Networking"에서 공개 URL 확인

### 8. 데이터베이스 마이그레이션 확인

배포 후 데이터베이스 테이블이 생성되었는지 확인:

1. Railway 대시보드에서 MySQL 서비스 클릭
2. "Connect" 탭에서 연결 정보 확인
3. MySQL 클라이언트로 접속:

```bash
mysql -h <host> -u <user> -p<password> <database>
```

4. 테이블 확인:

```sql
SHOW TABLES;
```

다음 테이블들이 있어야 합니다:
- `users`
- `events`
- `participants`
- `availableSlots`
- `passwordResets`

### 9. 관리자 계정 생성

Railway MySQL에 접속하여 첫 사용자를 관리자로 설정:

```sql
-- 회원가입 후 해당 이메일의 role을 admin으로 변경
UPDATE users SET role = 'admin' WHERE email = 'loginheaven@gmail.com';
```

또는 Railway 대시보드의 "Data" 탭에서 직접 수정 가능합니다.

## 자동 배포 설정

GitHub에 푸시할 때마다 자동으로 배포되도록 설정:

1. Railway 프로젝트 → "Settings" → "Service"
2. "Source" 섹션에서 "Deploy on push" 활성화
3. 이제 `git push`만 하면 자동 배포됩니다

```bash
# 코드 수정 후
git add .
git commit -m "Update feature"
git push

# Railway가 자동으로 빌드 및 배포
```

## 커스텀 도메인 연결

Railway에서 제공하는 기본 도메인 대신 자신의 도메인을 사용하려면:

1. Railway 프로젝트 → "Settings" → "Networking"
2. "Custom Domain" 클릭
3. 도메인 입력 (예: `spark.yourdomain.com`)
4. DNS 설정에서 CNAME 레코드 추가:
   - Name: `spark`
   - Value: Railway에서 제공하는 CNAME 값

## 트러블슈팅

### 빌드 실패

**에러:** `Build failed`

**해결:**
1. Railway 로그 확인: "Deployments" → "View Logs"
2. 로컬에서 빌드 테스트:
   ```bash
   pnpm build
   ```
3. `package.json`의 `engines` 필드 확인:
   ```json
   "engines": {
     "node": ">=22.0.0",
     "pnpm": ">=9.0.0"
   }
   ```

### 데이터베이스 연결 실패

**에러:** `Error: connect ECONNREFUSED`

**해결:**
1. Railway MySQL 서비스가 실행 중인지 확인
2. `DATABASE_URL` 환경변수가 올바른지 확인
3. Railway MySQL의 "Connect" 탭에서 연결 정보 확인

### 환경변수 누락

**에러:** `JWT_SECRET is not defined`

**해결:**
1. Railway 대시보드 → "Variables" 탭
2. 필수 환경변수 추가
3. 재배포: "Deployments" → "Redeploy"

### 이메일 발송 실패

**에러:** 이메일이 발송되지 않음

**해결:**
1. 이메일 관련 환경변수 확인 (`EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD`)
2. Gmail 사용 시 "앱 비밀번호" 생성 필요
3. SMTP 서버 방화벽 설정 확인

### 포트 바인딩 오류

**에러:** `Error: Port already in use`

**해결:**
Railway는 자동으로 `PORT` 환경변수를 설정합니다. `server/_core/index.ts`에서 다음과 같이 설정되어 있는지 확인:

```typescript
const PORT = process.env.PORT || 3000;
```

## 비용 관리

Railway 무료 티어:
- $5 크레딧/월 제공
- 사용량 초과 시 자동 정지 (추가 요금 없음)

**비용 절감 팁:**
1. 개발/테스트 환경은 로컬에서 실행
2. 사용하지 않는 서비스는 "Sleep" 모드로 전환
3. Railway 대시보드에서 사용량 모니터링

## 모니터링 및 로그

### 로그 확인

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 실시간 로그 확인
railway logs
```

### 성능 모니터링

Railway 대시보드 → "Metrics" 탭에서 확인:
- CPU 사용률
- 메모리 사용률
- 네트워크 트래픽
- 응답 시간

## 다음 단계

- **로컬 개발**: `SETUP.md` 참조
- **시스템 아키텍처**: `ARCHITECTURE.md` 참조
- **Railway 공식 문서**: https://docs.railway.app/
