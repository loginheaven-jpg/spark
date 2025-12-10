# SPARK - 토론회/강연회 신청 시스템

## 프로젝트 개요

SPARK는 토론회, 강연회, 세미나 등의 모임을 개설하고 참여자를 관리할 수 있는 웹 애플리케이션입니다.

### 주요 기능

- **모임 개설**: 유료/무료 모임 생성, 키워드 태그, 강사 정보 입력
- **참여 신청**: 로그인 후 모임 참여 신청, 최소 인원 도달 시 자동 확정
- **관리자 승인**: 관리자가 모임 승인/거부
- **참여자 관리**: 참여자 목록, 연락처, 이메일 관리 (관리자만)
- **이메일 알림**: 모임 승인, 확정, 취소 시 자동 이메일 발송
- **비밀번호 재설정**: 이메일로 비밀번호 재설정 링크 발송
- **검색 기능**: 강사 이름, 제목, 설명, 키워드로 모임 검색
- **진행률 표시**: 최소 인원 대비 현재 참여자 수 진행률 바

### 기술 스택

**프론트엔드:**
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- tRPC Client
- Wouter (라우팅)

**백엔드:**
- Node.js
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB

**인증:**
- 로컬 인증 (이메일/비밀번호)
- bcrypt (비밀번호 해싱)
- JWT (세션 관리)

## 빠른 시작

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 필요한 환경변수를 설정합니다. (자세한 내용은 SETUP.md 참조)

### 3. 데이터베이스 마이그레이션

```bash
pnpm db:push
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000` 접속

## 배포

Railway, Vercel, Render 등 다양한 플랫폼에 배포 가능합니다.

자세한 배포 가이드는 다음 문서를 참조하세요:
- **Railway**: `RAILWAY_DEPLOY.md`
- **로컬 환경 설정**: `SETUP.md`
- **시스템 아키텍처**: `ARCHITECTURE.md`

## 프로젝트 구조

```
event-registration/
├── client/               # React 프론트엔드
│   ├── src/
│   │   ├── components/  # 재사용 가능한 UI 컴포넌트
│   │   ├── pages/       # 페이지 컴포넌트
│   │   ├── lib/         # tRPC 클라이언트 설정
│   │   └── App.tsx      # 라우팅 설정
│   └── index.html
├── server/              # Express 백엔드
│   ├── _core/          # 프레임워크 코어 (OAuth, 환경변수 등)
│   ├── routers.ts      # tRPC 라우터 (API 엔드포인트)
│   ├── db.ts           # 데이터베이스 쿼리 함수
│   └── email.ts        # 이메일 발송 함수
├── drizzle/            # 데이터베이스 스키마
│   └── schema.ts
├── shared/             # 공유 타입 및 상수
└── package.json

```

## 라이선스

MIT License

## 지원

문의사항이 있으시면 이슈를 등록해주세요.
