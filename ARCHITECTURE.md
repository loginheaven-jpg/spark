# SPARK - 시스템 아키텍처 및 개발 설계서

## 목차

1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [데이터베이스 설계](#데이터베이스-설계)
5. [API 명세](#api-명세)
6. [인증 및 권한](#인증-및-권한)
7. [주요 기능 흐름](#주요-기능-흐름)
8. [보안 고려사항](#보안-고려사항)

---

## 시스템 개요

SPARK는 토론회, 강연회, 세미나 등의 모임을 개설하고 참여자를 관리할 수 있는 풀스택 웹 애플리케이션입니다.

### 핵심 기능

1. **사용자 관리**
   - 로컬 인증 (이메일/비밀번호)
   - 비밀번호 재설정 (이메일 링크)
   - 사용자 프로필 관리 (이름, 전화번호, 계좌번호)

2. **모임 관리**
   - 모임 개설 (유료/무료, 키워드, 강사 정보)
   - 모임 승인/거부 (관리자)
   - 모임 검색 (강사, 제목, 설명, 키워드)
   - 확정/미정 모임 구분 표시

3. **참여 관리**
   - 참여 신청/취소
   - 최소 인원 도달 시 자동 확정
   - 참여자 목록 (역할별 정보 표시)
   - 진행률 표시 (최소 인원 기준)

4. **알림 시스템**
   - 모임 승인 시 주관자에게 이메일
   - 모임 확정 시 모든 참여자에게 이메일
   - 비밀번호 재설정 링크 이메일

---

## 기술 스택

### 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 라이브러리 |
| TypeScript | 5.x | 타입 안정성 |
| Tailwind CSS | 4.x | 스타일링 |
| shadcn/ui | latest | UI 컴포넌트 라이브러리 |
| Wouter | 3.x | 라우팅 |
| tRPC Client | 11.x | 타입 안전 API 클라이언트 |
| React Query | 5.x | 서버 상태 관리 (tRPC 내장) |

### 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 22.x | 런타임 |
| Express | 4.x | 웹 프레임워크 |
| tRPC | 11.x | 타입 안전 API |
| Drizzle ORM | latest | 데이터베이스 ORM |
| MySQL/TiDB | 8.x | 관계형 데이터베이스 |
| bcrypt | 5.x | 비밀번호 해싱 |
| jsonwebtoken | 9.x | JWT 토큰 생성/검증 |
| Nodemailer | 6.x | 이메일 발송 |

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React 19 + TypeScript + Tailwind CSS           │   │
│  │  - Wouter (Routing)                             │   │
│  │  - tRPC Client (API)                            │   │
│  │  - shadcn/ui (Components)                       │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/HTTPS
                     │ /api/trpc/* (tRPC)
                     │ /api/auth/* (Auth)
┌────────────────────▼────────────────────────────────────┐
│                  Server (Node.js)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Express 4 + tRPC 11                            │   │
│  │  - Context (User, Request)                      │   │
│  │  - Routers (API Endpoints)                      │   │
│  │  - Middleware (Auth, CORS)                      │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Business Logic                                  │   │
│  │  - db.ts (Database Queries)                     │   │
│  │  - email.ts (Email Service)                     │   │
│  │  - auth.ts (Authentication)                     │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ Drizzle ORM
┌────────────────────▼────────────────────────────────────┐
│                  MySQL/TiDB Database                     │
│  - users                                                 │
│  - events                                                │
│  - participants                                          │
│  - availableSlots                                        │
│  - passwordResets                                        │
└──────────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
event-registration/
├── client/                    # 프론트엔드
│   ├── src/
│   │   ├── components/       # 재사용 가능한 UI 컴포넌트
│   │   │   ├── ui/          # shadcn/ui 컴포넌트
│   │   │   ├── Header.tsx   # 공통 헤더
│   │   │   └── AuthModal.tsx # 로그인/회원가입 모달
│   │   ├── pages/           # 페이지 컴포넌트
│   │   │   ├── Home.tsx     # 메인 화면 (모임 리스트)
│   │   │   ├── EventDetailPage.tsx # 모임 상세
│   │   │   ├── OrganizerPage.tsx   # 모임 개설
│   │   │   ├── MyEvents.tsx        # 내 모임 현황
│   │   │   ├── ProfilePage.tsx     # 프로필 수정
│   │   │   ├── AdminDashboard.tsx  # 관리자 대시보드
│   │   │   └── ResetPasswordPage.tsx # 비밀번호 재설정
│   │   ├── lib/
│   │   │   └── trpc.ts      # tRPC 클라이언트 설정
│   │   ├── App.tsx          # 라우팅 설정
│   │   ├── main.tsx         # 엔트리 포인트
│   │   └── index.css        # 글로벌 스타일
│   └── index.html
├── server/                   # 백엔드
│   ├── _core/               # 프레임워크 코어
│   │   ├── index.ts        # Express 서버
│   │   ├── context.ts      # tRPC 컨텍스트
│   │   ├── env.ts          # 환경변수
│   │   └── sdk.ts          # 인증 SDK
│   ├── routers.ts          # tRPC 라우터 (API)
│   ├── db.ts               # 데이터베이스 쿼리
│   └── email.ts            # 이메일 발송
├── drizzle/                 # 데이터베이스
│   ├── schema.ts           # 스키마 정의
│   └── migrations/         # 마이그레이션 파일
├── shared/                  # 공유 코드
│   └── types.ts            # 공유 타입
└── package.json
```

---

## 데이터베이스 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────┐
│                         users                            │
├─────────────────────────────────────────────────────────┤
│ id (PK)                    INT AUTO_INCREMENT            │
│ email                      VARCHAR(255) UNIQUE NOT NULL  │
│ name                       VARCHAR(100)                  │
│ phoneNumber                VARCHAR(20)                   │
│ accountNumber              VARCHAR(50)                   │
│ passwordHash               VARCHAR(255)                  │
│ loginMethod                ENUM('local', 'oauth')        │
│ role                       ENUM('admin', 'user')         │
│ alwaysAvailable            BOOLEAN DEFAULT TRUE          │
│ createdAt                  TIMESTAMP                     │
│ updatedAt                  TIMESTAMP                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1:N (organizer)
                 │
┌────────────────▼────────────────────────────────────────┐
│                        events                            │
├─────────────────────────────────────────────────────────┤
│ id (PK)                    INT AUTO_INCREMENT            │
│ title                      VARCHAR(255) NOT NULL         │
│ description                TEXT                          │
│ keywords                   TEXT                          │
│ instructorName             VARCHAR(100)                  │
│ organizerId (FK)           INT NOT NULL                  │
│ date                       TIMESTAMP                     │
│ location                   VARCHAR(255)                  │
│ minParticipants            INT                           │
│ maxParticipants            INT                           │
│ fee                        INT DEFAULT 0                 │
│ isPaid                     BOOLEAN DEFAULT FALSE         │
│ status                     ENUM('pending', 'approved')   │
│ isConfirmed                BOOLEAN DEFAULT FALSE         │
│ organizerParticipates      BOOLEAN DEFAULT FALSE         │
│ createdAt                  TIMESTAMP                     │
│ updatedAt                  TIMESTAMP                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1:N
                 │
┌────────────────▼────────────────────────────────────────┐
│                     participants                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                    INT AUTO_INCREMENT            │
│ eventId (FK)               INT NOT NULL                  │
│ userId (FK)                INT NOT NULL                  │
│ createdAt                  TIMESTAMP                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   availableSlots                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                    INT AUTO_INCREMENT            │
│ userId (FK)                INT NOT NULL                  │
│ dayOfWeek                  INT (0-6)                     │
│ startTime                  VARCHAR(5) (HH:MM)            │
│ endTime                    VARCHAR(5) (HH:MM)            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   passwordResets                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                    INT AUTO_INCREMENT            │
│ userId (FK)                INT NOT NULL                  │
│ token                      VARCHAR(255) UNIQUE NOT NULL  │
│ expiresAt                  TIMESTAMP NOT NULL            │
│ createdAt                  TIMESTAMP                     │
└─────────────────────────────────────────────────────────┘
```

### 테이블 상세 설명

#### 1. users (사용자)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INT | 기본키 (자동 증가) |
| email | VARCHAR(255) | 이메일 (고유, 필수) |
| name | VARCHAR(100) | 이름 |
| phoneNumber | VARCHAR(20) | 전화번호 |
| accountNumber | VARCHAR(50) | 계좌번호 (유료 모임 개설 시 필요) |
| passwordHash | VARCHAR(255) | 비밀번호 해시 (bcrypt) |
| loginMethod | ENUM | 로그인 방식 ('local', 'oauth') |
| role | ENUM | 역할 ('admin', 'user') |
| alwaysAvailable | BOOLEAN | 항상 가능 여부 (기본: true) |
| createdAt | TIMESTAMP | 생성일시 |
| updatedAt | TIMESTAMP | 수정일시 |

**인덱스:**
- PRIMARY KEY: `id`
- UNIQUE: `email`

#### 2. events (모임)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INT | 기본키 (자동 증가) |
| title | VARCHAR(255) | 모임 제목 (필수) |
| description | TEXT | 모임 설명 |
| keywords | TEXT | 키워드 (쉼표로 구분) |
| instructorName | VARCHAR(100) | 강사 이름 |
| organizerId | INT | 주관자 ID (외래키) |
| date | TIMESTAMP | 모임 날짜/시간 |
| location | VARCHAR(255) | 장소 |
| minParticipants | INT | 최소 참여 인원 |
| maxParticipants | INT | 최대 참여 인원 (권장) |
| fee | INT | 참가비 (원) |
| isPaid | BOOLEAN | 유료 여부 |
| status | ENUM | 승인 상태 ('pending', 'approved') |
| isConfirmed | BOOLEAN | 확정 여부 (최소 인원 도달 시 true) |
| organizerParticipates | BOOLEAN | 개설자 참여 여부 |
| createdAt | TIMESTAMP | 생성일시 |
| updatedAt | TIMESTAMP | 수정일시 |

**인덱스:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `organizerId` → `users.id`
- INDEX: `status`, `isConfirmed`

#### 3. participants (참여자)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INT | 기본키 (자동 증가) |
| eventId | INT | 모임 ID (외래키) |
| userId | INT | 사용자 ID (외래키) |
| createdAt | TIMESTAMP | 신청일시 |

**인덱스:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `eventId` → `events.id`
- FOREIGN KEY: `userId` → `users.id`
- UNIQUE: `(eventId, userId)` (중복 참여 방지)

#### 4. availableSlots (사용 가능한 시간대)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INT | 기본키 (자동 증가) |
| userId | INT | 사용자 ID (외래키) |
| dayOfWeek | INT | 요일 (0=일요일, 6=토요일) |
| startTime | VARCHAR(5) | 시작 시간 (HH:MM) |
| endTime | VARCHAR(5) | 종료 시간 (HH:MM) |

**인덱스:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `userId` → `users.id`

#### 5. passwordResets (비밀번호 재설정)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INT | 기본키 (자동 증가) |
| userId | INT | 사용자 ID (외래키) |
| token | VARCHAR(255) | 재설정 토큰 (고유) |
| expiresAt | TIMESTAMP | 만료일시 |
| createdAt | TIMESTAMP | 생성일시 |

**인덱스:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `userId` → `users.id`
- UNIQUE: `token`

---

## API 명세

### tRPC 라우터 구조

```typescript
trpc
├── localAuth              # 로컬 인증
│   ├── register          # 회원가입
│   ├── login             # 로그인
│   ├── logout            # 로그아웃
│   ├── me                # 현재 사용자 정보
│   ├── updateProfile     # 프로필 수정
│   ├── requestPasswordReset  # 비밀번호 재설정 요청
│   ├── verifyResetToken      # 재설정 토큰 검증
│   └── resetPassword         # 비밀번호 재설정
├── events                 # 모임 관리
│   ├── list              # 모임 목록 조회
│   ├── getById           # 모임 상세 조회
│   ├── create            # 모임 개설
│   ├── update            # 모임 수정
│   ├── delete            # 모임 삭제
│   ├── myEvents          # 내가 개설한 모임
│   └── myParticipations  # 내가 참여한 모임
├── participants           # 참여 관리
│   ├── register          # 참여 신청
│   ├── unregister        # 참여 취소
│   └── list              # 참여자 목록
└── admin                  # 관리자 기능
    ├── pendingEvents     # 승인 대기 모임
    ├── approveEvent      # 모임 승인
    ├── rejectEvent       # 모임 거부
    └── allEvents         # 모든 모임 조회
```

### API 엔드포인트 상세

#### 1. localAuth (로컬 인증)

##### 1.1 회원가입

**Endpoint:** `trpc.localAuth.register.mutate()`

**Input:**
```typescript
{
  email: string;           // 이메일 (필수)
  password: string;        // 비밀번호 (필수, 최소 8자)
  name: string;            // 이름 (필수)
  phoneNumber: string;     // 전화번호 (필수)
  accountNumber?: string;  // 계좌번호 (선택)
  agreedToPrivacy: boolean; // 개인정보 동의 (필수)
}
```

**Output:**
```typescript
{
  success: boolean;
  userId: number;
}
```

**에러:**
- `CONFLICT`: 이미 존재하는 이메일
- `BAD_REQUEST`: 필수 필드 누락 또는 개인정보 동의 미체크

##### 1.2 로그인

**Endpoint:** `trpc.localAuth.login.mutate()`

**Input:**
```typescript
{
  email: string;
  password: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'user';
  };
}
```

**에러:**
- `UNAUTHORIZED`: 잘못된 이메일 또는 비밀번호

##### 1.3 현재 사용자 정보

**Endpoint:** `trpc.localAuth.me.useQuery()`

**Input:** 없음 (쿠키에서 자동 인증)

**Output:**
```typescript
{
  id: number;
  email: string;
  name: string;
  phoneNumber: string;
  accountNumber: string | null;
  role: 'admin' | 'user';
  alwaysAvailable: boolean;
}
```

**에러:**
- `UNAUTHORIZED`: 로그인 필요

##### 1.4 프로필 수정

**Endpoint:** `trpc.localAuth.updateProfile.mutate()`

**Input:**
```typescript
{
  name?: string;
  phoneNumber?: string;
  accountNumber?: string;
  alwaysAvailable?: boolean;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

##### 1.5 비밀번호 재설정 요청

**Endpoint:** `trpc.localAuth.requestPasswordReset.mutate()`

**Input:**
```typescript
{
  email: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
}
```

**동작:**
1. 이메일로 재설정 토큰 생성 (1시간 유효)
2. 재설정 링크 이메일 발송

##### 1.6 비밀번호 재설정

**Endpoint:** `trpc.localAuth.resetPassword.mutate()`

**Input:**
```typescript
{
  token: string;
  newPassword: string;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**에러:**
- `BAD_REQUEST`: 유효하지 않거나 만료된 토큰

#### 2. events (모임 관리)

##### 2.1 모임 목록 조회

**Endpoint:** `trpc.events.list.useQuery()`

**Input:**
```typescript
{
  search?: string;  // 검색어 (제목, 설명, 키워드, 강사 이름)
}
```

**Output:**
```typescript
Array<{
  id: number;
  title: string;
  description: string;
  keywords: string;
  instructorName: string | null;
  organizerId: number;
  organizerName: string;
  date: Date | null;
  location: string;
  minParticipants: number;
  maxParticipants: number;
  fee: number;
  isPaid: boolean;
  status: 'pending' | 'approved';
  isConfirmed: boolean;
  participantCount: number;
  createdAt: Date;
}>
```

##### 2.2 모임 상세 조회

**Endpoint:** `trpc.events.getById.useQuery()`

**Input:**
```typescript
{
  id: number;
}
```

**Output:**
```typescript
{
  id: number;
  title: string;
  description: string;
  keywords: string;
  instructorName: string | null;
  organizerId: number;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  date: Date | null;
  location: string;
  minParticipants: number;
  maxParticipants: number;
  fee: number;
  isPaid: boolean;
  status: 'pending' | 'approved';
  isConfirmed: boolean;
  participantCount: number;
  participants: Array<{
    id: number;
    name: string;
    email?: string;      // 관리자만
    phoneNumber?: string; // 관리자만
    createdAt: Date;
  }>;
}
```

##### 2.3 모임 개설

**Endpoint:** `trpc.events.create.mutate()`

**Input:**
```typescript
{
  title: string;
  description: string;
  keywords: string;
  instructorName?: string;
  date?: Date;
  location: string;
  minParticipants: number;
  maxParticipants?: number;
  fee: number;
  isPaid: boolean;
  organizerParticipates: boolean;
}
```

**Output:**
```typescript
{
  id: number;
  success: boolean;
}
```

**동작:**
1. 모임 생성 (status: 'pending')
2. organizerParticipates가 true면 개설자를 참여자로 자동 등록
3. 관리자 승인 대기

##### 2.4 모임 수정

**Endpoint:** `trpc.events.update.mutate()`

**Input:**
```typescript
{
  id: number;
  title?: string;
  description?: string;
  keywords?: string;
  instructorName?: string;
  date?: Date;
  location?: string;
  minParticipants?: number;
  maxParticipants?: number;
  fee?: number;
  isPaid?: boolean;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**권한:**
- 개설자 또는 관리자만 수정 가능

##### 2.5 모임 삭제

**Endpoint:** `trpc.events.delete.mutate()`

**Input:**
```typescript
{
  id: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**권한:**
- 개설자 또는 관리자만 삭제 가능

#### 3. participants (참여 관리)

##### 3.1 참여 신청

**Endpoint:** `trpc.participants.register.mutate()`

**Input:**
```typescript
{
  eventId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**동작:**
1. 참여자 등록
2. 참여자 수가 최소 인원에 도달하면:
   - `isConfirmed` → true
   - 모든 참여자와 주관자에게 확정 이메일 발송

**에러:**
- `BAD_REQUEST`: 이름 또는 전화번호 미입력
- `CONFLICT`: 이미 참여 중

##### 3.2 참여 취소

**Endpoint:** `trpc.participants.unregister.mutate()`

**Input:**
```typescript
{
  eventId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

##### 3.3 참여자 목록

**Endpoint:** `trpc.participants.list.useQuery()`

**Input:**
```typescript
{
  eventId: number;
}
```

**Output:**
```typescript
Array<{
  id: number;
  name: string;
  email?: string;      // 관리자만
  phoneNumber?: string; // 관리자만
  createdAt: Date;
}>
```

**권한:**
- 일반 사용자: 이름만 표시
- 관리자: 모든 정보 표시

#### 4. admin (관리자 기능)

##### 4.1 승인 대기 모임

**Endpoint:** `trpc.admin.pendingEvents.useQuery()`

**Output:**
```typescript
Array<{
  id: number;
  title: string;
  description: string;
  organizerName: string;
  date: Date | null;
  location: string;
  createdAt: Date;
}>
```

##### 4.2 모임 승인

**Endpoint:** `trpc.admin.approveEvent.mutate()`

**Input:**
```typescript
{
  id: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**동작:**
1. `status` → 'approved'
2. 주관자에게 승인 이메일 발송

##### 4.3 모임 거부

**Endpoint:** `trpc.admin.rejectEvent.mutate()`

**Input:**
```typescript
{
  id: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**동작:**
1. 모임 삭제
2. 주관자에게 거부 이메일 발송

---

## 인증 및 권한

### 인증 방식

1. **로컬 인증 (이메일/비밀번호)**
   - bcrypt로 비밀번호 해싱 (salt rounds: 10)
   - JWT 토큰을 HTTP-only 쿠키에 저장
   - 쿠키 이름: `local_user_id`
   - 쿠키 옵션: `httpOnly: true, sameSite: 'lax', maxAge: 7일`

2. **세션 관리**
   - JWT 토큰에 사용자 ID 저장
   - 모든 API 요청 시 쿠키에서 토큰 추출 및 검증
   - tRPC 컨텍스트에 `ctx.user` 주입

### 권한 체계

| 역할 | 권한 |
|------|------|
| **admin** | - 모든 모임 승인/거부<br>- 모든 모임 수정/삭제<br>- 모든 참여자 정보 조회<br>- 관리자 대시보드 접근 |
| **user** | - 모임 개설 (승인 필요)<br>- 모임 참여/취소<br>- 자신이 개설한 모임 수정/삭제<br>- 참여자 이름만 조회 |

### 보호된 라우트

**프론트엔드:**
- `/organizer`: 로그인 필요
- `/my-events`: 로그인 필요
- `/profile`: 로그인 필요
- `/admin`: 관리자 권한 필요

**백엔드:**
- `protectedProcedure`: 로그인 필요
- `adminProcedure`: 관리자 권한 필요

---

## 주요 기능 흐름

### 1. 회원가입 및 로그인

```
사용자 → 회원가입 폼 입력
  ↓
  - 이메일, 비밀번호, 이름, 전화번호, 개인정보 동의
  ↓
trpc.localAuth.register.mutate()
  ↓
  - 이메일 중복 확인
  - 비밀번호 해싱 (bcrypt)
  - users 테이블에 삽입
  ↓
자동 로그인
  ↓
  - JWT 토큰 생성
  - HTTP-only 쿠키 설정
  ↓
메인 화면으로 리다이렉트
```

### 2. 모임 개설

```
주관자 → 로그인 확인
  ↓
모임 개설 버튼 클릭
  ↓
모임 정보 입력 폼
  ↓
  - 제목, 설명, 키워드, 강사 이름
  - 날짜, 장소, 최소/최대 인원
  - 유료/무료, 참가비, 계좌번호
  - "본인도 참여" 체크박스
  ↓
trpc.events.create.mutate()
  ↓
  - events 테이블에 삽입 (status: 'pending')
  - organizerParticipates가 true면 participants 테이블에 삽입
  ↓
관리자 승인 대기
  ↓
관리자 → 승인/거부
  ↓
trpc.admin.approveEvent.mutate()
  ↓
  - status → 'approved'
  - 주관자에게 이메일 발송
  ↓
메인 화면에 모임 표시
```

### 3. 모임 참여

```
참여자 → 로그인 확인
  ↓
모임 카드 클릭 또는 참여 버튼 클릭
  ↓
필수 정보 확인 (이름, 전화번호)
  ↓
  - 미입력 시 프로필 수정 페이지로 리다이렉트
  ↓
trpc.participants.register.mutate()
  ↓
  - participants 테이블에 삽입
  - 참여자 수 확인
  ↓
최소 인원 도달?
  ↓ YES
  - isConfirmed → true
  - 모든 참여자에게 확정 이메일 발송
  - 주관자에게 확정 이메일 발송
  ↓ NO
  - 진행률 바 업데이트
  ↓
모임 상세 페이지 새로고침
```

### 4. 비밀번호 재설정

```
사용자 → 로그인 페이지에서 "비밀번호 찾기" 클릭
  ↓
이메일 입력
  ↓
trpc.localAuth.requestPasswordReset.mutate()
  ↓
  - 재설정 토큰 생성 (UUID)
  - passwordResets 테이블에 삽입 (1시간 유효)
  - 재설정 링크 이메일 발송
  ↓
사용자 → 이메일에서 링크 클릭
  ↓
비밀번호 재설정 페이지 (/reset-password?token=...)
  ↓
새 비밀번호 입력
  ↓
trpc.localAuth.resetPassword.mutate()
  ↓
  - 토큰 검증 (유효기간 확인)
  - 비밀번호 해싱
  - users 테이블 업데이트
  - passwordResets 테이블에서 토큰 삭제
  ↓
로그인 페이지로 리다이렉트
```

---

## 보안 고려사항

### 1. 비밀번호 보안

- **해싱**: bcrypt (salt rounds: 10)
- **최소 길이**: 8자 이상
- **저장**: 평문 비밀번호는 절대 저장하지 않음

### 2. 세션 관리

- **JWT 토큰**: HTTP-only 쿠키에 저장 (XSS 방지)
- **SameSite**: `lax` (CSRF 방지)
- **만료 시간**: 7일
- **시크릿 키**: 환경변수로 관리 (`JWT_SECRET`)

### 3. SQL Injection 방지

- **Drizzle ORM**: 파라미터화된 쿼리 자동 생성
- **입력 검증**: tRPC의 Zod 스키마로 입력 검증

### 4. XSS 방지

- **React**: 자동 이스케이프
- **Content Security Policy**: 추후 추가 권장

### 5. CSRF 방지

- **SameSite 쿠키**: `lax` 설정
- **CORS**: 프로덕션에서는 특정 도메인만 허용

### 6. 개인정보 보호

- **역할별 정보 표시**:
  - 일반 사용자: 참여자 이름만
  - 관리자: 이름, 이메일, 전화번호
- **개인정보 동의**: 회원가입 시 필수 체크

### 7. 이메일 보안

- **비밀번호 재설정 토큰**: UUID, 1시간 유효
- **일회용**: 사용 후 즉시 삭제
- **HTTPS**: 프로덕션에서는 HTTPS 필수

### 8. 환경변수 관리

- **민감 정보**: `.env` 파일에 저장
- **Git 제외**: `.gitignore`에 `.env` 추가
- **프로덕션**: Railway 환경변수로 관리

---

## 확장 가능성

### 1. 결제 시스템 통합

- Stripe, Toss Payments 등 결제 API 연동
- `payments` 테이블 추가
- 결제 완료 후 참여 신청 자동 처리

### 2. 실시간 알림

- WebSocket 또는 Server-Sent Events (SSE) 사용
- 모임 승인, 확정 시 실시간 알림

### 3. 파일 업로드

- S3, Cloudinary 등 스토리지 연동
- 모임 이미지, 자료 첨부 기능

### 4. 검색 고도화

- Elasticsearch 연동
- 전문 검색, 필터링, 정렬 기능 강화

### 5. 통계 및 분석

- 모임 참여율, 인기 키워드 분석
- 관리자 대시보드에 차트 추가

---

## 참고 문서

- **로컬 환경 설정**: `SETUP.md`
- **Railway 배포**: `RAILWAY_DEPLOY.md`
- **프로젝트 개요**: `README_DEPLOY.md`
- **tRPC 공식 문서**: https://trpc.io/
- **Drizzle ORM 공식 문서**: https://orm.drizzle.team/
- **Railway 공식 문서**: https://docs.railway.app/
