# Workout Logger

개인 운동 기록 관리 앱 — 월간 캘린더 중심 UX

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 목적 | 개인 운동 기록 관리 및 트래킹 |
| 타겟 | 루틴이 있는 중급자 이상 사용자 |
| 플랫폼 | iOS, Android (크로스 플랫폼) |
| 단계 | MVP → 점진적 확장 |

---

## 기술 스택

| 레이어 | 기술 | 버전 | 비고 |
|--------|------|------|------|
| Framework | Vue 3 | 3.4+ | Composition API + `<script setup>` |
| Language | TypeScript | 5.0+ | Strict mode |
| Build | Vite | 5.0+ | |
| UI | Ionic | 8.0+ | 모바일 네이티브 컴포넌트 |
| Native | Capacitor | 6.0+ | iOS/Android 빌드 |
| 상태관리 | Composables | - | Pinia 없이 시작, 필요시 추가 |
| Backend | Supabase | - | Auth + PostgreSQL (REST API, RLS 적용) |
| 날짜 | date-fns | 3.0+ | |

---

## 핵심 기능 (MVP)

### 1. 월간 캘린더 (메인 화면)

- 월 단위 캘린더 표시
- 운동 기록 있는 날짜에 요약 뱃지 표시
  - 최대 2개 카테고리 노출 (예: `등 · 하체`)
  - 초과 시 `외 n종목` 표시 (예: `가슴 · 등 외 2종목`)
- 날짜 탭 → 기록 모달 오픈
- 월 이동 (이전/다음)

### 2. 운동 기록 입력

- 하루에 여러 운동 기록 가능
- 입력 항목:
  - 운동 카테고리 (필터 버튼)
  - 운동 종목 (검색 가능)
  - 세트 정보: 세트 수, 무게(kg), 반복 횟수
  - 메모 (선택)
- 세트 단위 추가/삭제

### 3. 운동 종목 선택

- 카테고리 필터링 (기본: 전체 선택)
- 종목명 검색
- 자주 쓰는 종목 상단 노출 (확장)

---

## 운동 카테고리 & 종목

### 카테고리 (고정)

```
가슴 | 등 | 어깨 | 하체 | 이두 | 삼두 | 복근 | 전완 | 유산소
```

### 종목 예시

| 카테고리 | 종목 |
|----------|------|
| 가슴 | 벤치프레스, 인클라인 덤벨프레스, 케이블 크로스오버, 딥스, 펙덱 플라이 |
| 등 | 렛풀다운, 바벨로우, 시티드로우, 풀업, 원암 덤벨로우, 케이블 풀오버 |
| 어깨 | 오버헤드프레스, 사이드 레터럴 레이즈, 페이스풀, 리버스 펙덱 |
| 하체 | 스쿼트, 레그프레스, 레그익스텐션, 레그컬, 루마니안 데드리프트, 힙쓰러스트 |
| 이두 | 바벨컬, 덤벨컬, 해머컬, 프리처컬 |
| 삼두 | 트라이셉스 푸시다운, 오버헤드 익스텐션, 클로즈그립 벤치프레스 |
| 복근 | 크런치, 레그레이즈, 플랭크, 케이블 크런치 |
| 유산소 | 러닝, 사이클, 로잉머신, 스텝밀 |

---

## 데이터 모델

### ERD 개요

```
users (Supabase Auth)
  │
  ├── workout_logs (운동 기록)
  │     │
  │     └── workout_sets (세트 정보)
  │
  └── (확장) user_exercises (커스텀 종목)

exercises (운동 종목 마스터)
  │
  └── categories (카테고리)
```

### 테이블 설계

**categories**
```sql
id: uuid (PK)
name: text (unique)
sort_order: int
```

**exercises**
```sql
id: uuid (PK)
category_id: uuid (FK → categories)
name: text
is_custom: boolean (default: false)
created_by: uuid (FK → users, nullable)
```

**workout_logs**
```sql
id: uuid (PK)
user_id: uuid (FK → users)
date: date
exercise_id: uuid (FK → exercises)
memo: text (nullable)
created_at: timestamptz
```

**workout_sets**
```sql
id: uuid (PK)
workout_log_id: uuid (FK → workout_logs)
set_number: int
weight: decimal (nullable, kg)
reps: int (nullable)
duration_seconds: int (nullable, 유산소용)
```

### RLS 정책

모든 테이블은 `user_id` 기반 RLS 적용

```sql
-- workout_logs 예시
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own logs"
ON workout_logs FOR ALL
USING (auth.uid() = user_id);
```

---

## 인증

Supabase Auth 사용 (REST API)

- MVP: 이메일/비밀번호
- 확장: 소셜 로그인 (Google, Apple)

---

## 프로젝트 구조

```
src/
├── main.ts                          # 앱 엔트리포인트
├── env.d.ts
│
├── app/
│   ├── App.vue
│   └── router.ts
│
├── features/
│   ├── auth/
│   │   └── views/
│   │       ├── LoginView.vue
│   │       └── RegisterView.vue
│   │
│   ├── calendar/
│   │   ├── views/
│   │   │   └── CalendarView.vue
│   │   └── components/
│   │       ├── MonthGrid.vue
│   │       └── DayCell.vue
│   │
│   ├── workout-log/
│   │   └── components/
│   │       ├── WorkoutModal.vue
│   │       ├── WorkoutCard.vue
│   │       └── SetInputModal.vue
│   │
│   └── exercise-selector/
│       └── components/
│           └── ExerciseSelector.vue
│
├── entities/
│   └── workout/
│       └── types.ts
│
├── shared/
│   └── lib/
│       ├── supabase.ts
│       └── database.types.ts
│
└── composables/                     # 전역 composables
    ├── useAuth.ts
    └── useWorkout.ts
```

---

## 화면 흐름

```
[스플래시]
    │
    ▼
[로그인/회원가입]
    │
    ▼
[월간 캘린더] ◄─────────────────┐
    │                           │
    │ 날짜 탭                    │
    ▼                           │
[운동 기록 모달]                 │
    │                           │
    ├── 종목 추가 ──► [종목 선택 시트]
    │                           │
    ├── 세트 입력                │
    │                           │
    └── 저장 ───────────────────┘
```

---

## MVP 체크리스트

### Phase 1: 기반 구축
- [ ] 프로젝트 초기 설정 (Vite + Vue + Ionic + Capacitor)
- [ ] Supabase 프로젝트 생성 및 테이블 설계
- [ ] 인증 플로우 (회원가입/로그인/로그아웃)
- [ ] 라우터 및 인증 가드

### Phase 2: 핵심 기능
- [ ] 월간 캘린더 UI
- [ ] 날짜별 운동 기록 조회
- [ ] 운동 기록 입력 모달
- [ ] 운동 종목 선택 (카테고리 필터 + 검색)
- [ ] 세트 정보 입력

### Phase 3: 마무리
- [ ] 기록 수정/삭제
- [ ] 로딩/에러 상태 처리
- [ ] iOS/Android 빌드 테스트

---

## 확장 로드맵

### v1.1 - 편의성 개선
- 이전 기록 불러오기 (같은 종목 최근 세트 정보)
- 자주 쓰는 종목 즐겨찾기
- 커스텀 운동 종목 추가

### v1.2 - 통계 & 분석
- 출석률 (주간/월간 운동 일수)
- 카테고리별 빈도 (어떤 부위를 많이 하는지)
- 월별 운동 볼륨 추이
- 종목별 성장 추이 (무게 × 횟수 변화)
- 1RM 추정치 및 변화 그래프

### v1.3 - 루틴
- 루틴 템플릿 생성
- 루틴 기반 빠른 기록
- 루틴 공유 (확장)

### v2.0 - 소셜 (옵션)
- 운동 인증샷
- 친구 기능
- 챌린지

---

## 커밋 컨벤션

### 커밋 메시지 형식

```
<type>: <subject>
```

### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: 운동 기록 삭제 기능 추가` |
| `fix` | 버그 수정 | `fix: 로그인 시 토큰 만료 오류 수정` |
| `docs` | 문서 변경 (README 등) | `docs: API 사용법 문서 추가` |
| `style` | 코드 포맷팅, 세미콜론 등 (로직 변경 X) | `style: 코드 포맷팅 적용` |
| `refactor` | 코드 리팩토링 (기능 변경 X) | `refactor: 인증 로직 분리` |
| `test` | 테스트 코드 추가/수정 | `test: 로그인 단위 테스트 추가` |
| `chore` | 빌드 설정, 패키지 등 기타 변경 | `chore: ESLint 설정 추가` |
| `ci` | CI/CD 설정 변경 | `ci: GitHub Actions 배포 설정` |
| `perf` | 성능 개선 | `perf: 이미지 로딩 최적화` |

### 커밋 메시지 작성 규칙

1. **제목은 50자 이내**로 작성
2. **마침표 사용하지 않음**
3. **명령문으로 작성** (과거형 X)
   - `추가했습니다` (X) → `추가` (O)
   - `Fixed bug` (X) → `Fix bug` (O)
4. **한글/영어 혼용 가능** (일관성 유지)

### 예시

```bash
# 기능 추가
git commit -m "feat: 월간 캘린더 UI 구현"

# 버그 수정
git commit -m "fix: 날짜 선택 시 모달 미표시 오류 수정"

# 문서 수정
git commit -m "docs: README 커밋 컨벤션 추가"

# 설정 변경
git commit -m "chore: TypeScript strict 모드 활성화"

# 스타일 개선
git commit -m "style: 로그인 페이지 UI 개선"
```

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev

# 네이티브 빌드
npm run build
npx cap sync
npx cap open ios     # Xcode 실행
npx cap open android # Android Studio 실행
```

---

## 환경 변수

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 라이선스

MIT
