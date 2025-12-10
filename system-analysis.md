# 전체 시스템 분석 체크리스트

## 1. 화면별 기능 확인

### 홈 화면 (Home.tsx)
- [ ] 승인된 모임만 표시 (listApproved API)
- [ ] 확정모임 / 미정모임 탭 구분
- [ ] 참여 인원 표시 (현재/최소)
- [ ] 개설자와 어드민만 수정/삭제 버튼 표시
- [ ] 로그인/로그아웃 버튼 표시
- [ ] 모임현황 버튼 표시
- [ ] 참여 신청 버튼 (로그인 필수)

### 모임 개설 페이지 (OrganizerPage.tsx)
- [ ] 사용 가능한 시간대 표시 (항상 가능 또는 시간대 목록)
- [ ] 유료/무료 선택
- [ ] 유료 선택 시 계좌번호 필수
- [ ] 최소/최대 인원 입력
- [ ] 본인도 참여 체크박스 (기본 체크됨)
- [ ] 내 모임 목록 표시
- [ ] 개설자만 자신의 모임 수정/삭제 가능

### 모임현황 페이지 (MyEvents.tsx)
- [ ] 내가 신청한 모임 목록
- [ ] 내가 개설한 모임 목록
- [ ] 각 모임의 참여자 수 표시

### 관리자 대시보드 (AdminDashboard.tsx)
- [ ] 승인 대기 모임 목록
- [ ] 모임 승인/거부 기능
- [ ] 사용 가능한 시간대 관리
- [ ] 항상 가능 체크박스

## 2. API 연동 확인

### 모임 관련 API
- [ ] events.listApproved - 승인된 모임 목록 (홈 화면)
- [ ] events.listMine - 내가 개설한 모임 (OrganizerPage, MyEvents)
- [ ] events.create - 모임 개설 (organizerParticipates 반영)
- [ ] events.update - 모임 수정
- [ ] events.delete - 모임 삭제
- [ ] events.myEvents - 내가 개설한 모임 (MyEvents)

### 참여 관련 API
- [ ] participants.register - 참여 신청
- [ ] participants.myRegistrations - 내가 신청한 모임 (MyEvents)

### 인증 관련 API
- [ ] localAuth.me - 현재 사용자 정보 (alwaysAvailable 포함)
- [ ] localAuth.login - 로그인
- [ ] localAuth.register - 회원가입 (phone 필수)
- [ ] localAuth.updateProfile - 프로필 수정 (accountNumber, alwaysAvailable)

## 3. 데이터 흐름 확인

### 모임 개설 흐름
1. 사용자가 모임 개설 폼 작성
2. organizerParticipates = true이면 개설자를 participants에 등록
3. 개설자를 registrations에 등록
4. 모임 상태는 pending으로 생성
5. 관리자가 승인하면 approved로 변경
6. 홈 화면에 표시

### 참여 신청 흐름
1. 로그인 필수
2. participants 테이블에 사용자 정보 등록 (userId 연결)
3. registrations 테이블에 참여 기록
4. 참여 인원 증가
5. 최소 인원 도달 시 confirmed = true

### 권한 확인 흐름
- [ ] 개설자: events.organizerId === user.id
- [ ] 슈퍼 어드민: user.role === 'admin' && user.email === 'loginheaven@gmail.com'
- [ ] 수정/삭제 버튼: 개설자 또는 슈퍼 어드민만 표시

## 4. 발견된 문제점

### 문제 1: 
- 설명:
- 영향:
- 해결 방법:

### 문제 2:
- 설명:
- 영향:
- 해결 방법:


## 발견된 문제 목록

### 문제 1: Home.tsx 수정/삭제 버튼 권한 확인 오류
- **위치**: client/src/pages/Home.tsx:318
- **현재 코드**: `{localUser?.role === "admin" ? (`
- **문제**: 슈퍼 어드민만 수정/삭제 버튼이 표시됨
- **설계**: 개설자와 슈퍼 어드민 모두 표시되어야 함
- **수정**: `{(localUser?.role === "admin" || event.organizerId === localUser?.id) ? (`
- **영향**: 개설자가 자신의 모임을 수정/삭제할 수 없음

### 문제 2: 
- **확인 중...**


### 문제 2: Home.tsx 모임 카드 중복 클릭 이벤트
- **위치**: client/src/pages/Home.tsx:263, 352
- **현재 코드**: 카드 전체에 `onClick={() => handleRegister(event.id)}`
- **문제**: 카드 클릭 시 바로 참여 신청이 실행되고, "참여 신청" 버튼도 별도로 존재
- **영향**: 
  - 사용자가 모임 정보를 확인하려고 카드를 클릭하면 바로 참여 신청됨
  - 수정/삭제 버튼 클릭 시 카드 클릭 이벤트가 함께 발생할 수 있음 (e.stopPropagation()으로 방지됨)
- **해결 방법 1**: 카드 클릭 시 모임 상세 페이지로 이동
- **해결 방법 2**: 카드 클릭 이벤트 제거, "참여 신청" 버튼만 사용
- **권장**: 해결 방법 2 (카드 클릭 이벤트 제거)

### 문제 3: localStorage 기반 참여자 정보 시스템 잔존
- **위치**: client/src/pages/Home.tsx:39-66, 101-142
- **현재 코드**: localStorage에서 참여자 정보 로드 및 저장
- **문제**: 로그인 시스템으로 통합했지만 localStorage 기반 코드가 여전히 남아있음
- **영향**: 
  - 불필요한 코드로 인한 복잡도 증가
  - 로그인 사용자와 localStorage 참여자 정보 간 충돌 가능성
- **해결 방법**: localStorage 기반 참여자 정보 시스템 완전 제거
- **확인 필요**: 이 코드가 아직 사용되는지 확인 후 제거


### 문제 4: participants.register API와 Home.tsx 간 데이터 타입 불일치 (중요!)
- **위치**: 
  - API: server/routers.ts:412-417
  - 호출: client/src/pages/Home.tsx:90-93
- **현재 코드**: 
  - API는 `participantId` (participants 테이블 ID) 기대
  - Home.tsx는 `localUser.id` (users 테이블 ID) 전달
- **문제**: 데이터 타입 불일치로 인한 참여 신청 실패 가능성
- **영향**: 로그인한 사용자가 모임에 참여할 수 없음
- **해결 방법**: 
  1. API를 `userId`를 받도록 수정
  2. API 내부에서 userId로 participant 찾거나 생성
  3. participant.id로 registration 등록
- **우선순위**: 높음 (핵심 기능 오류)


### 문제 5: participants.myRegistrations API 데이터 타입 불일치 (중요!)
- **위치**: 
  - API: server/routers.ts:485-487
  - DB 함수: server/db.ts:329-355
- **현재 코드**: 
  - API는 `ctx.user.id` (users 테이블 ID) 전달
  - DB 함수는 `participantId` (participants 테이블 ID) 기대
- **문제**: 데이터 타입 불일치로 인한 내 신청 내역 조회 실패
- **영향**: 모임현황 페이지에서 "내가 신청한 모임" 목록이 표시되지 않음
- **해결 방법**: 
  1. `getRegistrationsByParticipant` 함수를 수정하여 userId로 participant를 찾은 후 registrations 조회
  2. 또는 새로운 함수 `getRegistrationsByUserId` 생성
- **우선순위**: 높음 (핵심 기능 오류)
