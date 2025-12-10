# 로컬 환경 설치 가이드

이 문서는 SPARK 프로젝트를 로컬 환경에서 실행하기 위한 상세 가이드입니다.

## 사전 요구사항

다음 소프트웨어가 설치되어 있어야 합니다:

- **Node.js**: v22.13.0 이상
- **pnpm**: v9 이상
- **MySQL**: v8.0 이상 (또는 TiDB, PlanetScale 등)

### Node.js 및 pnpm 설치

```bash
# Node.js 설치 (nvm 사용 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# pnpm 설치
npm install -g pnpm
```

### MySQL 설치

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

**Windows:**
[MySQL Installer](https://dev.mysql.com/downloads/installer/)를 다운로드하여 설치

## 프로젝트 설정

### 1. 프로젝트 압축 해제

다운로드한 `event-registration-export.tar.gz` 파일을 압축 해제합니다:

```bash
tar -xzf event-registration-export.tar.gz
cd event-registration
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 데이터베이스 생성

MySQL에 접속하여 데이터베이스를 생성합니다:

```bash
mysql -u root -p
```

MySQL 콘솔에서:
```sql
CREATE DATABASE event_registration CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spark_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON event_registration.* TO 'spark_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
touch .env
```

`.env` 파일에 다음 내용을 입력합니다:

```env
# 데이터베이스 연결 문자열
DATABASE_URL="mysql://spark_user:your_password_here@localhost:3306/event_registration"

# JWT 시크릿 (랜덤 문자열 생성 권장)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# OAuth 설정 (Manus OAuth 사용 시)
VITE_APP_ID="your-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://login.manus.im"
OWNER_OPEN_ID="your-owner-open-id"
OWNER_NAME="Your Name"

# 이메일 발송 설정 (선택사항)
# SMTP 서버를 사용하려면 server/email.ts 파일 수정 필요
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# 프론트엔드 URL (CORS 설정용)
VITE_API_URL="http://localhost:3000"

# Manus Built-in APIs (선택사항, Manus 플랫폼 외부에서는 불필요)
# BUILT_IN_FORGE_API_URL="https://forge-api.manus.im"
# BUILT_IN_FORGE_API_KEY="your-api-key"
# VITE_FRONTEND_FORGE_API_KEY="your-frontend-api-key"
# VITE_FRONTEND_FORGE_API_URL="https://forge-api.manus.im"
```

**중요:**
- `JWT_SECRET`은 반드시 변경하세요 (최소 32자 이상의 랜덤 문자열)
- `DATABASE_URL`의 비밀번호를 실제 MySQL 비밀번호로 변경하세요
- OAuth 설정은 Manus 플랫폼을 사용하지 않는 경우 로컬 인증만 사용됩니다

### JWT Secret 생성 방법

```bash
# Node.js를 사용하여 랜덤 문자열 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. 데이터베이스 마이그레이션

Drizzle ORM을 사용하여 데이터베이스 스키마를 생성합니다:

```bash
pnpm db:push
```

성공 메시지가 표시되면 데이터베이스 테이블이 생성된 것입니다.

### 6. 관리자 계정 생성

첫 번째 사용자를 관리자로 설정하려면 MySQL에 직접 접속하여 role을 변경합니다:

```bash
mysql -u spark_user -p event_registration
```

```sql
-- 회원가입 후 해당 이메일의 role을 admin으로 변경
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 7. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000` 접속

## 트러블슈팅

### 데이터베이스 연결 실패

**에러:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**해결:**
1. MySQL 서버가 실행 중인지 확인:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mysql
   ```

2. DATABASE_URL이 올바른지 확인
3. MySQL 포트가 3306인지 확인

### bcrypt 설치 오류

**에러:** `Error: Cannot find module 'bcrypt'`

**해결:**
```bash
pnpm add bcrypt
pnpm add -D @types/bcrypt
```

### 포트 충돌

**에러:** `Error: listen EADDRINUSE: address already in use :::3000`

**해결:**
1. 다른 프로세스가 3000 포트를 사용 중인지 확인:
   ```bash
   # macOS/Linux
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

2. 해당 프로세스를 종료하거나 다른 포트 사용:
   ```bash
   PORT=3001 pnpm dev
   ```

### 이메일 발송 실패

**에러:** 이메일이 발송되지 않음

**해결:**
1. `server/email.ts` 파일에서 SMTP 설정 확인
2. Gmail을 사용하는 경우 "앱 비밀번호" 생성 필요:
   - Google 계정 → 보안 → 2단계 인증 활성화
   - 앱 비밀번호 생성 → 생성된 비밀번호를 `.env`의 `EMAIL_PASSWORD`에 입력

## 다음 단계

- **Railway 배포**: `RAILWAY_DEPLOY.md` 참조
- **시스템 아키텍처**: `ARCHITECTURE.md` 참조
- **기능 추가**: `server/routers.ts`에서 tRPC 프로시저 추가
